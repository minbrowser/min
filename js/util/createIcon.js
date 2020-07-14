module.exports = function (icon) {
  var el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  var data = Iconify.getSVGObject(icon)
  for (var key of Object.keys(data.attributes))
    el.setAttribute(key, data.attributes[key]) 
  el.innerHTML = data ? data.body : null
  return el
}
