var isModalMode = false

module.exports = {
  enabled: function () {
    return isModalMode
  },
  toggle: function (enabled) {
    isModalMode = enabled
    if (enabled) {
      document.body.classList.add('is-modal-mode')
    } else {
      document.body.classList.remove('is-modal-mode')
    }
  }
}
