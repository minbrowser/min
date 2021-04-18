let isModalMode = false

const overlay = document.getElementById('overlay')

const modalMode = {
  onDismiss: null,
  enabled: function () {
    return isModalMode
  },
  toggle: function (enabled, listeners = {}) {
    if (enabled && listeners.onDismiss) {
      modalMode.onDismiss = listeners.onDismiss
    }

    if (!enabled) {
      modalMode.onDismiss = null
    }

    isModalMode = enabled
    if (enabled) {
      document.body.classList.add('is-modal-mode')
    } else {
      document.body.classList.remove('is-modal-mode')
    }
  }
}

overlay.addEventListener('click', function () {
  if (modalMode.onDismiss) {
    modalMode.onDismiss()
    modalMode.onDismiss = null
  }
})

module.exports = modalMode
