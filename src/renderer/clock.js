function ClockWidget() {
  this._el = null
  this._timeEl = null
  this._dateEl = null
  this._init()
}

ClockWidget.prototype._init = function () {
  var el = document.createElement('div')
  el.className = 'clock-widget'
  el.innerHTML =
    '<div class="clock-time"></div>' +
    '<div class="clock-date"></div>'
  document.body.appendChild(this._el = el)

  this._timeEl = el.querySelector('.clock-time')
  this._dateEl = el.querySelector('.clock-date')
  this._tick()
  var self = this
  setInterval(function () { self._tick() }, 1000)
}

ClockWidget.prototype._tick = function () {
  var now = new Date()
  var h = ('0' + now.getHours()).slice(-2)
  var m = ('0' + now.getMinutes()).slice(-2)
  this._timeEl.textContent = h + ':' + m

  var week = ['日', '一', '二', '三', '四', '五', '六']
  var month = now.getMonth() + 1
  var day = now.getDate()
  this._dateEl.textContent = month + '月' + day + '日 星期' + week[now.getDay()]
}

module.exports = { ClockWidget }
