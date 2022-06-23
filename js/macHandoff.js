/* Handoff support for macOS */

module.exports = {
  initialize: function () {
    if (window.platformType === 'mac') {
      tasks.on('tab-selected', function (id) {
        if (tabs.get(id)) {
          if (tabs.get(id).private) {
            ipc.send('handoffUpdate', { url: '' })
          } else {
            ipc.send('handoffUpdate', { url: tabs.get(id).url })
          }
        }
      })
      tasks.on('tab-updated', function (id, key) {
        if (key === 'url' && tabs.getSelected() === id) {
          if (tabs.get(id).private) {
            ipc.send('handoffUpdate', { url: '' })
          } else {
            ipc.send('handoffUpdate', { url: tabs.get(id).url })
          }
        }
      })
    }
  }
}
