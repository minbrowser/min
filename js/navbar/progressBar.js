const progressBar = {
  create: function () {
    var pbContainer = document.createElement('div')
    pbContainer.className = 'progress-bar-container'

    var pb = document.createElement('div')
    pb.className = 'progress-bar p0'
    pb.hidden = true
    pbContainer.appendChild(pb)

    return pbContainer
  },
  update: function (bar, status) {
    if (status === 'start') {
      var loadID = Date.now().toString()
      bar.setAttribute('loading', loadID) // we need to use unique ID's to ensure that the same page that was loading initialy is the same page that is loading 4 seconds later
      setTimeout(function () {
        if (bar.getAttribute('loading') === loadID) {
          bar.hidden = false
          requestAnimationFrame(function () {
            bar.className = 'progress-bar p25'
          })
        }
      }, 4000)
    } else {
      bar.setAttribute('loading', 'false')
      if (bar.classList.contains('p25')) {
        bar.className = 'progress-bar p100'
        setTimeout(function () {
          bar.className = 'progress-bar p0'
          bar.hidden = true
        }, 500)
      }
    }
  }
}

module.exports = progressBar
