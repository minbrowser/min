const windowSync = {

  pendingEvents: [],
  syncTimeout: null,
  sendEvents: function () {
    console.log(windowSync.pendingEvents)
    ipc.send('tab-state-change', windowSync.pendingEvents)
    windowSync.pendingEvents = []
    windowSync.syncTimeout = null
  },
  initialize: function () {
    tasks.on('*', function (...data) {
      if (window.sessionRestoreComplete) {
        windowSync.pendingEvents.push(data)
        if (!windowSync.syncTimeout) {
          windowSync.syncTimeout = setTimeout(windowSync.sendEvents, 0)
        }
      }
    })

    ipc.on('tab-state-change-receive', function (e, events) {
      events.forEach(function (event) {
        console.log(event)
        switch (event[0]) {
          case 'task-added':
            tasks.add(event[2], event[3], false)
            break
          case 'task-selected':
            // tasks.setSelected(event[1], false)
            break
          case 'task-destroyed':
            tasks.destroy(event[1], false)
            break
          case 'tab-added':
            tasks.get(event[4]).tabs.add(event[2], event[3], false)
            break
          case 'tab-updated':
            var obj = {}
            obj[event[2]] = event[3]
            tasks.get(event[4]).tabs.update(event[1], obj, false)
            break
          case 'tab-selected':
            tasks.get(event[2]).tabs.setSelected(event[1], false)
            break
          case 'tab-destroyed':
            tasks.get(event[2]).tabs.destroy(event[1], false)
            break
          default:
            console.warn(arguments)
            throw new Error('unimplemented event')
        }
      })
    })
  }
}
module.exports = windowSync
