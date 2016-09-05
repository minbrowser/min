var hours = new Date().getHours();

settings.get('darkMode', function(value) {
  if (value === true || (hours > 21 || hours < 6)) {
    if (document.body.contains(document.getElementById('browser-view'))) {
      document.getElementById('task-overlay').classList.add('dark-mode')
      document.getElementById('top-bar').classList.add('dark-mode')
    }
    else {
      document.body.classList.add('dark-mode')
    }
    window.isDarkMode = true
  }
})
