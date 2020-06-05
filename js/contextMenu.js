const remoteMenu = require('remoteMenuRenderer.js')

module.exports = {
  initialize: function () {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      e.stopPropagation()

      var inputMenu = [
        [
          {
            label: l('undo'),
            role: 'undo'
          },
          {
            label: l('redo'),
            role: 'redo'
          }
        ],
        [
          {
            label: l('cut'),
            role: 'cut'
          },
          {
            label: l('copy'),
            role: 'copy'
          },
          {
            label: l('paste'),
            role: 'paste'
          }
        ],
        [
          {
            label: l('selectAll'),
            role: 'selectall'
          }
        ]
      ]

      let node = e.target

      while (node) {
        if (node.nodeName.match(/^(input|textarea)$/i) || node.isContentEditable) {
          remoteMenu.open(inputMenu)
          break
        }
        node = node.parentNode
      }
    })
  }
}
