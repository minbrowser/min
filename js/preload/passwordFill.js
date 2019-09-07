/**
Simple username/password field detector and auto-filler.
 
When page is loaded, we try to find any input fields with specific name 
attributes. If we find something useful, we dispatch an IPC event 
'password-autofill' to signal that we want to check if there is auto-fill data
available.

We can send an additional 'force' parameters in the event args to indicate that
we want to unlock password manager if it's locked. Otherwise the search will
be done only if manager is already unlocked.

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

// Tries to find if an element has a specific attribute value that contains at 
// least one of the values from 'matches' array.
function checkAttribute(element, attribute, matches) {
  let value = element.getAttribute(attribute)
  if (value == null) { return false }
  return matches.filter(match => value.toLowerCase().includes(match)).length > 0
}

// Gets all input fields on a page that contain at least one of the provided
// strings in their name attribute.
function getInputs(names, types) {
  let allFields = document.getElementsByTagName('input')

  let matchedFields = []
  for (let field of allFields) {

    if (!checkAttribute(field, 'type', types)) {
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
function getUsernameFields() {
  return getInputs(['user', 'email', 'login', 'auth'], ['text', 'email'])
}

// Shortcut to get password fields from a page.
function getPasswordFields() {
  return getInputs(['pass'], ['password'])
}

// Removes credentials list overlay.
function removeAutocompleteList() {
  let list = document.getElementById('password-autocomplete-list')
  if (list != null) {
    list.parentNode.removeChild(list)
  }
}

// Populates username/password fields with provided credentials.
function fillCredentials(credentials) {
    const { username, password } = credentials
    
    for (let field of getUsernameFields()) {
      field.value = username
    }

    for (let field of getPasswordFields()) {
      field.value = password
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
function addFocusListener(element, credentials) {

  // Creates an options list container.
  function buildContainer() {
    let suggestionsDiv = document.createElement('div')
    suggestionsDiv.style = 'position: absolute; border: 1px solid #d4d4d4; z-index: 1; border-bottom: none; background: #FFFFFF;'
    suggestionsDiv.id = 'password-autocomplete-list'
    return suggestionsDiv
  }

  // Adds an option row to the list container.
  function addOption(parent, username) {
    let suggestionItem = document.createElement('div')
    suggestionItem.innerHTML = username
    suggestionItem.style = 'padding: 10px; cursor: pointer; background-color: #fff; border-bottom: 1px solid #d4d4d4;'

    // When user clicks on the suggestion, we populate the form inputs with selected credentials.
    suggestionItem.addEventListener('click', function(e) {
      let selectedCredentials = credentials.filter(el => { return el.username === username })[0]
      fillCredentials(selectedCredentials)
      removeAutocompleteList()
      element.focus()
    })

    parent.appendChild(suggestionItem)
  }

  // Creates autocomplete list and adds it below the activated field.
  function showAutocompleteList(e) {
    removeAutocompleteList()
    let container = buildContainer()
    for (cred of credentials) {
      addOption(container, cred.username)
    }
    element.parentNode.insertBefore(container, element.nextSibling)
  }

  element.addEventListener('focus', showAutocompleteList)
  element.addEventListener('click', showAutocompleteList)

  // Hide options overlay when user clicks out of the input field.
  document.addEventListener("click", function (e) {
    if (e.target != element) {
      removeAutocompleteList()
    }
  })

  // Show the autocomplete list right away if field is already focused.
  // Userful for login pages which auto-focus the input field on page load.
  if (element === document.activeElement) {
    showAutocompleteList()
  }
}

function checkInputs(force) {
  if (getUsernameFields().length + getPasswordFields().length > 0) {
    ipc.send('password-autofill', { force: force })
  }
}

// Check for username/password fields on page load.
document.addEventListener('DOMContentLoaded', () => checkInputs(false))
window.addEventListener('load', () => checkInputs(false))

// Handle credentials fetched from the backend. Credentials are expected to be 
// an array of { username, password, manager } objects.
ipc.on('password-autofill-match', (event, credentials) => {
  if (credentials.length == 1) {
    fillCredentials(credentials[0])
  } else {
    let firstField = getUsernameFields().filter(field => field.type != 'hidden')[0]
    addFocusListener(firstField, credentials)
    firstField.focus()
  }
})

ipc.on('password-autofill-shortcut', (event) => {
  checkInputs(true)
})
