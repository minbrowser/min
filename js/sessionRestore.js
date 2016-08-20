var sessionRestore = {
  save: function () {
    var data = {
      version: 2,
      state: JSON.parse(JSON.stringify(tabState))
    }

    // save all tabs that aren't private

    for (var i = 0; i < data.state.tasks.length; i++) {
      data.state.tasks[i].tabs = data.state.tasks[i].tabs.filter(function (tab) {
        return !tab.private
      })
    }

    localStorage.setItem('sessionrestoredata', JSON.stringify(data))
  },
  restore: function () {
    var data = localStorage.getItem('sessionrestoredata')

    // first run, show the tour
    if (!data) {
      tasks.setSelected(tasks.add()) // create a new task

      var newTab = currentTask.tabs.add({
        url: 'https://palmeral.github.io/min/tour'
      })
      addTab(newTab, {
        enterEditMode: false
      })
      return
    }

    console.log(data)

    data = JSON.parse(data)

    localStorage.setItem('sessionrestoredata', '')

    // the data isn't restorable
    if ((data.version && data.version !== 2) || (data.state && data.state.tasks && data.state.tasks.length === 0)) {
      tasks.setSelected(tasks.add())

      addTab(currentTask.tabs.add(), {
        leaveEditMode: false // we know we aren't in edit mode yet, so we don't have to leave it
      })
      return
    }

    // add the saved tasks

    data.state.tasks.forEach(function (task) {
      // restore the task item
      tasks.add(task)
    })

    // switch to the previously selected tasks

    switchToTask(data.state.selectedTask)

    if (isEmpty(currentTask.tabs)) {
      enterEditMode(currentTask.tabs.getSelected())
    }
  }
}

// TODO make this a preference

sessionRestore.restore()

setInterval(sessionRestore.save, 12500)
