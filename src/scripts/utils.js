function dateInRange(target, range) {
  const targetDate = new Date(target)
  const startDate = range[0] ? new Date(range[0]) : new Date(1800, 0)
  const endDate = range[1] ? new Date(range[1]) : Date.now()

  if (startDate <= targetDate && targetDate <= endDate) return true

  return false
}

function arraysHaveMatch(arr1, arr2) {
  return arr1.some(item => arr2.includes(item))
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const locale = 'en-US'
  const dateOpts = { month: 'short', day: 'numeric', year: 'numeric' }

  return date.toLocaleDateString(locale, dateOpts)
}

export { dateInRange, arraysHaveMatch, formatDate }
