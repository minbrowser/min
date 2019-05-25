function formatRelativeDate (date) {
  var currentTime = Date.now()
  var startOfToday = new Date()
  startOfToday.setHours(0)
  startOfToday.setMinutes(0)
  startOfToday.setSeconds(0)
  var timeElapsedToday = currentTime - startOfToday.getTime()
  var msPerDay = (24 * 60 * 60 * 1000)

  var relativeDateRanges = [
    [0, 60000, l('timeRangeJustNow')],
    [60000, 300000, l('timeRangeMinutes')],
    [300000, 3600000, l('timeRangeHour')],
    [3600000, timeElapsedToday, l('timeRangeToday')],
    [timeElapsedToday, timeElapsedToday + msPerDay, l('timeRangeYesterday')],
    [timeElapsedToday + msPerDay, 604800000, l('timeRangeWeek')],
    [604800000, 2592000000, l('timeRangeMonth')],
    [2592000000, 31104000000, l('timeRangeYear')],
    [31104000000, Infinity, l('timeRangeLongerAgo')]
  ]

  var diff = Date.now() - date
  for (var i = 0; i < relativeDateRanges.length; i++) {
    if (relativeDateRanges[i][0] <= diff && relativeDateRanges[i][1] >= diff) {
      return relativeDateRanges[i][2]
    }
  }
  return null
}

module.exports = formatRelativeDate
