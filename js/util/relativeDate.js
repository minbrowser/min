var relativeDateRanges = [
  [0, 15000, l('timeRangeJustNow')],
  [15000, 300000, l('timeRangeMinutes')],
  [300000, 3600000, l('timeRangeHour')],
  [3600000, 86400000, l('timeRangeDay')],
  [86400000, 604800000, l('timeRangeWeek')],
  [604800000, 2592000000, l('timeRangeMonth')],
  [2592000000, 31104000000, l('timeRangeYear')],
  [31104000000, Infinity, l('timeRangeLongerAgo')]
]

function formatRelativeDate (date) {
  var diff = Date.now() - date
  for (var i = 0; i < relativeDateRanges.length; i++) {
    if (relativeDateRanges[i][0] <= diff && relativeDateRanges[i][1] >= diff) {
      return relativeDateRanges[i][2]
    }
  }
  return null
}

module.exports = formatRelativeDate
