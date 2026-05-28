const fs = require('fs')
const path = require('path')
const state = require('./state')

function StatusPanel(chatUI) {
  this._chatUI = chatUI
  this._btn = null
  this._panel = null
  this._visible = false
  this._init()
}

StatusPanel.prototype._init = function () {
  var self = this

  // 触发按钮
  var btn = document.createElement('div')
  btn.className = 'status-trigger'
  btn.textContent = '📋'
  btn.addEventListener('click', function () { self._toggle() })
  document.body.appendChild(this._btn = btn)

  // 面板
  var panel = document.createElement('div')
  panel.className = 'status-panel'
  document.body.appendChild(this._panel = panel)
}

StatusPanel.prototype._toggle = function () {
  this._visible ? this._hide() : this._show()
}

StatusPanel.prototype._show = function () {
  this._visible = true
  this._btn.classList.add('active')
  this._render()
  this._panel.classList.add('visible')
}

StatusPanel.prototype._hide = function () {
  this._visible = false
  this._btn.classList.remove('active')
  this._panel.classList.remove('visible')
}

StatusPanel.prototype._render = function () {
  var w = state.weather
  var deadlines = this._loadDeadlines()
  var today = new Date()
  var dateStr = (today.getMonth() + 1) + '月' + today.getDate() + '日'

  var deadlineHtml = ''
  if (deadlines.length === 0) {
    deadlineHtml = '<div class="sp-deadline-empty">今天没有截止的任务～</div>'
  } else {
    for (var i = 0; i < deadlines.length; i++) {
      var d = deadlines[i]
      var due = new Date(d.date + 'T' + (d.time || '23:59')).getTime()
      var hoursLeft = (due - Date.now()) / (1000 * 60 * 60)
      var urgency = ''
      if (hoursLeft < 0) urgency = ' sp-urgent-over'
      else if (hoursLeft < 6) urgency = ' sp-urgent-soon'
      deadlineHtml +=
        '<div class="sp-deadline-item' + urgency + '">' +
          '<span class="sp-dl-task">' + d.task + '</span>' +
          '<span class="sp-dl-time">' + d.date + ' ' + (d.time || '23:59') + '</span>' +
        '</div>'
    }
  }

  var round = state.pomodoroRound || 0
  var pomoHtml = round > 0
    ? '今日已完成 <b>' + round + '</b> 轮番茄钟 🎉'
    : '今天还没有开始番茄钟哦'

  this._panel.innerHTML =
    '<div class="sp-header">' +
      '<span class="sp-title">📋 ' + dateStr + ' 小夜状态</span>' +
      '<button class="sp-close">✕</button>' +
    '</div>' +
    '<div class="sp-body">' +
      '<div class="sp-section">' +
        '<div class="sp-section-title">🌤️ 天气</div>' +
        '<div class="sp-weather">' +
          '<span class="sp-w-icon">' + w.icon + '</span>' +
          '<span class="sp-w-temp">' + w.temp + '°C</span>' +
          '<span class="sp-w-text">' + w.text + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="sp-section">' +
        '<div class="sp-section-title">⏰ 待办截止</div>' +
        deadlineHtml +
      '</div>' +
      '<div class="sp-section">' +
        '<div class="sp-section-title">🍅 专注</div>' +
        '<div class="sp-pomo">' + pomoHtml + '</div>' +
      '</div>' +
    '</div>'

  var self = this
  this._panel.querySelector('.sp-close').addEventListener('click', function () {
    self._hide()
  })
}

StatusPanel.prototype._loadDeadlines = function () {
  try {
    var file = path.join(__dirname, '..', '..', 'assets', 'deadlines.json')
    if (!fs.existsSync(file)) return []
    var raw = fs.readFileSync(file, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

module.exports = { StatusPanel }
