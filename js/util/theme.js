var hours = new Date().getHours();

settings.get('darkMode', function(value) {
  if (value === true || (hours > 21 || hours < 6)) {
      document.body.classList.add('dark-mode')
    window.isDarkMode = true
  }
})
