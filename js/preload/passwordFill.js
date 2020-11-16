/**
Simple username/password field detector and auto-filler.

When page is loaded, we try to find any input fields with specific name
attributes. If we find something useful, we dispatch an IPC event
'password-autofill' to signal that we want to check if there is auto-fill data
available.

When we receive back an IPC event 'password-autofill-match' with auto-fill
data, we do one of two things:

- If there's a single credentials match, we fill the input fields with that
  data.

- If there's more than one match, we add a focus event listener on the
  username/email fields that will display a small overlay div with available
  options. When user selects one of the options, we fill the input fields with
  credentials data from the selection.

This code doesn't work with JS-based forms. We don't listen to all DOM changes,
we expect the login form to be present in the HTML code at page load. We can
add a MutationObserver to the document, or DOMNodeInserted listener, but I
wanted to keep it lightweight and not impact browser performace too much.
*/

// "carbon:password"
const keyIcon = '<svg width="22px" height="22px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="1em" height="1em" style="vertical-align: -0.125em;-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 32 32"><path d="M21 2a9 9 0 0 0-9 9a8.87 8.87 0 0 0 .39 2.61L2 24v6h6l10.39-10.39A9 9 0 0 0 30 11.74a8.77 8.77 0 0 0-1.65-6A9 9 0 0 0 21 2zm0 16a7 7 0 0 1-2-.3l-1.15-.35l-.85.85l-3.18 3.18L12.41 20L11 21.41l1.38 1.38l-1.59 1.59L9.41 23L8 24.41l1.38 1.38L7.17 28H4v-3.17L13.8 15l.85-.85l-.29-.95a7.14 7.14 0 0 1 3.4-8.44a7 7 0 0 1 10.24 6a6.69 6.69 0 0 1-1.09 4A7 7 0 0 1 21 18z" fill="currentColor"/><circle cx="22" cy="10" r="2" fill="currentColor"/></svg>'

// Ref to added unlock button.
var currentUnlockButton = null
var currentAutocompleteList = null

// Creates an unlock button element.
//
// - input: Input element to 'attach' unlock button to.
function createUnlockButton (input) {
  var inputRect = input.getBoundingClientRect()

  // Container.
  var unlockDiv = document.createElement('div')

  // Style.
  unlockDiv.style.width = '20px'
  unlockDiv.style.height = '20px'
  unlockDiv.style.zIndex = 999999999999999

  // Position.
  unlockDiv.style.position = 'absolute'
  unlockDiv.style.left = (window.scrollX + (inputRect.left + inputRect.width - 20 - 10)) + 'px'
  unlockDiv.style.top = (window.scrollY + (inputRect.top + (inputRect.height - 20) / 2.0)) + 'px'

  // Button.
  var button = document.createElement('div')

  // Button style.
  button.style.width = '20px'
  button.style.height = '20px'
  button.style.opacity = 0.7
  button.style.color = window.getComputedStyle(input).color
  button.style.transition = '0.1s color'
  button.innerHTML = keyIcon

  // Button hover.
  button.addEventListener('mouseenter', (event) => {
    button.style.opacity = 1.0
  })
  button.addEventListener('mouseleave', (event) => {
    button.style.opacity = 0.7
  })

  // Click event.
  button.addEventListener('mousedown', (event) => {
    event.preventDefault()
    checkInputs()
  })

  unlockDiv.appendChild(button)

  return unlockDiv
}

// Tries to find if an element has a specific attribute value that contains at
// least one of the values from 'matches' array.
function checkAttribute (element, attribute, matches) {
  const value = element.getAttribute(attribute)
  if (value == null) { return false }
  return matches.some(match => value.toLowerCase().includes(match))
}

// Gets all input fields on a page that contain at least one of the provided
// strings in their name attribute.
function getInputs (names, types) {
  const allFields = document.getElementsByTagName('input')

  const matchedFields = []
  for (const field of allFields) {
    // checkAttribute won't work here because type can be a property but not an attribute
    if (!types.includes(field.type)) {
      continue
    }

    // We expect the field to have either 'name', 'formcontrolname' or 'id' attribute
    // that we can use to identify it as a login form input field.
    if (checkAttribute(field, 'name', names) ||
        checkAttribute(field, 'formcontrolname', names) ||
        checkAttribute(field, 'id', names)) {
      matchedFields.push(field)
    }
  }

  return matchedFields
}

// Shortcut to get username fields from a page.
function getUsernameFields () {
  return getInputs(['user', 'name', 'mail', 'login', 'auth', 'identifier'], ['text', 'email'])
}

// Shortcut to get password fields from a page.
function getPasswordFields () {
  return getInputs(['pass'], ['password'])
}

// Removes credentials list overlay.
function removeAutocompleteList () {
  if (currentAutocompleteList && currentAutocompleteList.parentNode) {
    currentAutocompleteList.parentNode.removeChild(currentAutocompleteList)
  }
}

// Populates username/password fields with provided credentials.
function fillCredentials (credentials) {
  const { username, password } = credentials
  const inputEvents = ['keydown', 'keypress', 'keyup', 'input', 'change']

  for (const field of getUsernameFields()) {
    field.value = username
    for (const event of inputEvents) {
      field.dispatchEvent(new Event(event, { bubbles: true }))
    }
  }

  for (const field of getPasswordFields()) {
    field.value = password
    for (const event of inputEvents) {
      field.dispatchEvent(new Event(event, { bubbles: true }))
    }
  }
}

// Setup a focus/click listener on the username input fields.
//
// When those events happen, we add a small overlay with a list of matching
// credentials. Clicking on an item in a list populates the input fields with
// selected username/password pair.
//
// - element: input field to add a listener to
// - credentials: an array of { username, password } objects
function addFocusListener (element, credentials) {
  const inputRect = element.getBoundingClientRect()
  // Creates an options list container.
  function buildContainer () {
    const suggestionsDiv = document.createElement('div')
    suggestionsDiv.style = 'position: absolute; border: 1px solid #d4d4d4; z-index: 999999; border-bottom: none; background: #FFFFFF; transform: scale(0); opacity: 0; transform-origin: top left; transition: 0.15s; color: #000000;'
    suggestionsDiv.style.top = (inputRect.y + inputRect.height) + 'px'
    suggestionsDiv.style.left = (inputRect.x) + 'px'
    suggestionsDiv.id = 'password-autocomplete-list'
    requestAnimationFrame(function () {
      suggestionsDiv.style.opacity = '1'
      suggestionsDiv.style.transform = 'scale(1)'
    })
    return suggestionsDiv
  }

  // Adds an option row to the list container.
  function addOption (parent, username) {
    const suggestionItem = document.createElement('div')
    suggestionItem.innerHTML = username
    suggestionItem.style = 'padding: 10px; cursor: pointer; background-color: #fff; border-bottom: 1px solid #d4d4d4;'

    // Hover.
    suggestionItem.addEventListener('mouseenter', (event) => {
      suggestionItem.style.backgroundColor = '#e4e4e4'
    })
    suggestionItem.addEventListener('mouseleave', (event) => {
      suggestionItem.style.backgroundColor = '#fff'
    })

    // When user clicks on the suggestion, we populate the form inputs with selected credentials.
    suggestionItem.addEventListener('click', function (e) {
      const selectedCredentials = credentials.filter(el => { return el.username === username })[0]
      fillCredentials(selectedCredentials)
      removeAutocompleteList()
      element.focus()
    })

    parent.appendChild(suggestionItem)
  }

  // Creates autocomplete list and adds it below the activated field.
  function showAutocompleteList (e) {
    removeAutocompleteList()
    const container = buildContainer()
    for (const cred of credentials) {
      addOption(container, cred.username)
    }
    document.body.appendChild(container)
    currentAutocompleteList = container
  }

  element.addEventListener('focus', showAutocompleteList)
  element.addEventListener('click', showAutocompleteList)

  // Hide options overlay when user clicks out of the input field.
  document.addEventListener('click', function (e) {
    if (e.target !== element) {
      removeAutocompleteList()
    }
  })

  // Show the autocomplete list right away if field is already focused.
  // Userful for login pages which auto-focus the input field on page load.
  if (element === document.activeElement) {
    showAutocompleteList()
  }
}

function checkInputs () {
  if (getUsernameFields().length > 0 && getPasswordFields().length > 0) {
    ipc.send('password-autofill', document.location.hostname)
  }
}

function maybeAddUnlockButton (target) {
  // require both a username and a password field to reduce the false-positive rate
  if (getUsernameFields().length > 0 && getPasswordFields().length > 0) {
    if (getUsernameFields().includes(target) || getPasswordFields().includes(target)) {
      const unlockButton = createUnlockButton(target)
      document.body.appendChild(unlockButton)

      currentUnlockButton = unlockButton
    }
  }
}

function checkInitialFocus () {
  maybeAddUnlockButton(document.activeElement)
}

function handleFocus (event) {
  maybeAddUnlockButton(event.target)
}

function handleBlur (event) {
  if (currentUnlockButton !== null && currentUnlockButton.parentElement != null) {
    currentUnlockButton.parentElement.removeChild(currentUnlockButton)
    currentUnlockButton = null
  }
}

// Handle credentials fetched from the backend. Credentials are expected to be
// an array of { username, password, manager } objects.
ipc.on('password-autofill-match', (event, data) => {
  if (data.hostname !== window.location.hostname) {
    throw new Error('password origin must match current page origin')
  }

  if (data.credentials.length === 0) {
    if (currentUnlockButton && currentUnlockButton.children.length > 0) {
      currentUnlockButton.children[0].style.color = 'rgb(180, 0, 0)'
    }
  } else if (data.credentials.length === 1) {
    fillCredentials(data.credentials[0])
  } else {
    const firstField = getUsernameFields().filter(field => field.type !== 'hidden')[0]
    addFocusListener(firstField, data.credentials)
    firstField.focus()
  }
})

// Trigger autofill check from keyboard shortcut.
ipc.on('password-autofill-shortcut', (event) => {
  checkInputs(true)
})

// Autofill enabled event handler. Initializes focus listeners for input fields.
ipc.on('password-autofill-enabled', (event) => {
  checkInitialFocus()

  // Add default focus event listeners.
  window.addEventListener('blur', handleBlur, true)
  window.addEventListener('focus', handleFocus, true)
})

// Check if password autofill is configured.
window.addEventListener('load', function (event) {
  ipc.send('password-autofill-check')
})

// send passwords back to the main process so they can be saved to storage
function handleFormSubmit () {
  var usernameValues = getUsernameFields().map(f => f.value)
  var passwordValues = getPasswordFields().map(f => f.value)

  if (usernameValues.some(v => v.length > 0) || passwordValues.some(v => v.length > 0)) {
    ipc.send('password-form-filled', [window.location.hostname, usernameValues, passwordValues])
  }
}

window.addEventListener('submit', handleFormSubmit)

electron.webFrame.executeJavaScript(`
var origSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function () {
  window.postMessage({message: 'formSubmit'})
  origSubmit.apply(this, arguments)
}
`)

window.addEventListener('message', function (e) {
  if (e.data && e.data.message && e.data.message === 'formSubmit') {
    handleFormSubmit()
  }
})
