/**
 * New Tab Page
 * Displays time, greeting, and search functionality
 */

;(function () {
  'use strict'

  // DOM element references
  const elements = {
    time: null,
    greeting: null,
    searchInput: null
  }

  // Time update interval reference
  let updateInterval = null

  /**
   * Initialize the new tab page
   */
  function initialize () {
    // Cache DOM elements
    elements.time = document.getElementById('ntp-time')
    elements.greeting = document.getElementById('ntp-greeting')
    elements.searchInput = document.getElementById('ntp-search-input')

    // Initialize components
    initializeSettings()
    initializeTime()
    initializeSearch()

    // Start time updates
    updateTime()
    updateInterval = setInterval(updateTime, 1000) // Update every second for accuracy
  }

  /**
   * Initialize settings for clock and greeting visibility
   */
  function initializeSettings () {
    if (typeof settings === 'undefined') {
      // If settings aren't available, show both by default
      if (elements.time) elements.time.style.display = 'block'
      if (elements.greeting) elements.greeting.style.display = 'block'
      return
    }

    // Clock visibility
    settings.get('homepageShowClock', function (value) {
      if (elements.time) {
        elements.time.style.display = (value !== false) ? 'block' : 'none'
      }
    })

    settings.listen('homepageShowClock', function (value) {
      if (elements.time) {
        elements.time.style.display = value ? 'block' : 'none'
      }
    })

    // Greeting visibility
    settings.get('homepageShowGreeting', function (value) {
      if (elements.greeting) {
        elements.greeting.style.display = (value !== false) ? 'block' : 'none'
      }
    })

    settings.listen('homepageShowGreeting', function (value) {
      if (elements.greeting) {
        elements.greeting.style.display = value ? 'block' : 'none'
      }
    })

    // Time format preference
    settings.listen('homepageTimeFormat', function (value) {
      updateTime()
    })
  }

  /**
   * Initialize time display
   */
  function initializeTime () {
    if (!elements.time || !elements.greeting) {
      return
    }
  }

  /**
   * Update the time and greeting display
   */
  function updateTime () {
    if (!elements.time || !elements.greeting) {
      return
    }

    const now = new Date()
    const originalHours = now.getHours()
    const minutes = now.getMinutes()

    // Get time format setting (default to 24h if not set)
    let timeFormat = '24h'
    if (typeof settings !== 'undefined') {
      settings.get('homepageTimeFormat', function (value) {
        timeFormat = value || '24h'
      })
    }

    // Format time based on preference
    let formattedTime
    if (timeFormat === '12h') {
      // Convert to 12-hour format with AM/PM, do not pad leading hour
      const ampm = originalHours >= 12 ? 'PM' : 'AM'
      let displayHour = originalHours % 12
      displayHour = displayHour ? displayHour : 12 // 0 -> 12
      formattedTime = String(displayHour) + ':' + String(minutes).padStart(2, '0') + ' ' + ampm
    } else {
      // 24-hour format: pad hours to two digits
      formattedTime = String(originalHours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
    }

    elements.time.textContent = formattedTime

    // Update greeting based on original 24-hour time
    let greeting = 'Hello'
    if (originalHours < 12) {
      greeting = 'Good Morning'
    } else if (originalHours < 18) {
      greeting = 'Good Afternoon'
    } else {
      greeting = 'Good Evening'
    }
    elements.greeting.textContent = greeting
  }

  /**
   * Initialize search functionality
   */
  function initializeSearch () {
    if (!elements.searchInput) {
      return
    }

    // Handle search submission
    elements.searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSearch()
      }
    })

    // Auto-focus search input after a brief delay
    setTimeout(function () {
      if (elements.searchInput && document.activeElement !== elements.searchInput) {
        elements.searchInput.focus()
      }
    }, 100)
  }

  /**
   * Handle search query submission
   */
  function handleSearch () {
    const query = elements.searchInput.value.trim()

    if (!query) {
      return
    }

    // Determine if input is a URL or search query
    if (isURL(query)) {
      navigateToURL(query)
    } else {
      performSearch(query)
    }
  }

  /**
   * Check if the input appears to be a URL
   * @param {string} input - The user input to check
   * @returns {boolean} True if the input looks like a URL
   */
  function isURL (input) {
    // Check for common URL patterns
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return true
    }

    // Check for domain-like patterns (contains dot and no spaces)
    if (input.includes('.') && !input.includes(' ')) {
      // Verify it has a valid TLD-like pattern
      const parts = input.split('.')
      return parts.length >= 2 && parts[parts.length - 1].length >= 2
    }

    return false
  }

  /**
   * Navigate to a URL
   * @param {string} url - The URL to navigate to
   */
  function navigateToURL (url) {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    window.location.href = url
  }

  /**
   * Perform a search using the default search engine
   * @param {string} query - The search query
   */
  function performSearch (query) {
    const searchURL = 'https://duckduckgo.com/?q=' + encodeURIComponent(query)
    window.location.href = searchURL
  }

  /**
   * Cleanup on page unload
   */
  function cleanup () {
    if (updateInterval) {
      clearInterval(updateInterval)
      updateInterval = null
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize)
  } else {
    initialize()
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup)
})()
