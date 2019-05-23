document.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  e.stopPropagation()

  Menu = remote.Menu

  InputMenu = Menu.buildFromTemplate([{
    label: l('undo'),
    role: 'undo'
  }, {
    label: l('redo'),
    role: 'redo'
  }, {
    type: 'separator'
  }, {
    label: l('cut'),
    role: 'cut'
  }, {
    label: l('copy'),
    role: 'copy'
  }, {
    label: l('paste'),
    role: 'paste'
  }, {
    type: 'separator'
  }, {
    label: l('selectAll'),
    role: 'selectall'
  }
  ])

  let node = e.target

  while (node) {
    if (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable) {
      InputMenu.popup(remote.getCurrentWindow())
      break
    }
    node = node.parentNode
  }
})
