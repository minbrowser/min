module.exports = function (icon, className = '') {
  var el = document.createElement('span')
  el.className = 'iconify ' + className
  el.dataset.icon = icon
  el.dataset.inline = 'false'
  return el
}
