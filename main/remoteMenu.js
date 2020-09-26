ipc.on('open-context-menu', function (e, data) {
  var menu = new Menu()

  data.template.forEach(function (section) {
    section.forEach(function (item) {
      var id = item.click
      item.click = function () {
        e.sender.send('context-menu-item-selected', { menuId: data.id, itemId: id })
      }
      menu.append(new MenuItem(item))
    })
    menu.append(new MenuItem({ type: 'separator' }))
  })
  menu.on('menu-will-close', function () {
    e.sender.send('context-menu-will-close', {menuId: data.id})
  })
  menu.popup({ x: data.x, y: data.y })
})
