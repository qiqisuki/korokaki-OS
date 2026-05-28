const fs = require('fs')
const path = require('path')
const sound = require('./sound')
const store = require('../shared/settings-store')

function ReminderSystem(chatUI, expressionState) {
  this._chatUI = chatUI
  this._expressionState = expressionState
  this._timers = []
  this._started = false
}

ReminderSystem.prototype.start = function () {
  if (this._started) return
  this._started = true

  // 启动时检查一次 deadline
  this._checkDeadlines()

  var cfg = store.get('reminders') || {}
  // 喝水提醒
  this._addInterval(function () {
    this._showReminder('该喝水了！起来接杯水活动一下 [happy]', 'happy')
  }.bind(this), (cfg.water || 45) * 60 * 1000)

  // 休息眼睛
  this._addInterval(function () {
    this._showReminder('眼睛该休息了，看看远处放松五分钟 [sleep]', 'sleep')
  }.bind(this), (cfg.eye || 60) * 60 * 1000)

  // 检查 deadline — 每 15 分钟
  this._addInterval(function () {
    this._checkDeadlines()
  }.bind(this), 15 * 60 * 1000)
}

ReminderSystem.prototype._addInterval = function (fn, delay) {
  // 首次触发加一些随机偏移，避免多个提醒同时触发
  var firstDelay = delay + Math.random() * 120000
  var id = setTimeout(function run() {
    fn()
    this._timers.push(setTimeout(run, delay))
  }.bind(this), firstDelay)
  this._timers.push(id)
}

ReminderSystem.prototype._showReminder = function (text, expr) {
  sound.remind()
  this._chatUI.showBubble(text, 5000)
  if (expr && expr !== 'idle') {
    var self = this
    this._expressionState.set(expr)
    setTimeout(function () { self._expressionState.set('idle') }, 4000)
  }
}

ReminderSystem.prototype._checkDeadlines = function () {
  var deadlines = this._loadDeadlines()
  if (!deadlines.length) return

  var now = Date.now()
  var urgent = []

  for (var i = 0; i < deadlines.length; i++) {
    var d = deadlines[i]
    var due = new Date(d.date + 'T' + (d.time || '23:59')).getTime()
    var hoursLeft = (due - now) / (1000 * 60 * 60)

    if (hoursLeft < 0) {
      urgent.push({ task: d.task, text: d.task + ' 已经过期了！！快去处理 [angry]', expr: 'angry' })
    } else if (hoursLeft < 1) {
      urgent.push({ task: d.task, text: d.task + ' 只剩 ' + Math.round(hoursLeft * 60) + ' 分钟了！赶紧！ [angry]', expr: 'angry' })
    } else if (hoursLeft < 6) {
      urgent.push({ task: d.task, text: d.task + ' 还剩 ' + Math.round(hoursLeft) + ' 小时，抓紧哦 [confused]', expr: 'confused' })
    } else if (hoursLeft < 24) {
      urgent.push({ task: d.task, text: '提醒一下：' + d.task + ' 明天 ' + d.time + ' 截止 [idle]', expr: 'idle' })
    }
  }

  if (urgent.length > 0) {
    var pick = urgent[0]
    this._showReminder(pick.text, pick.expr)
  }
}

ReminderSystem.prototype._loadDeadlines = function () {
  try {
    var root = path.join(__dirname, '..', '..', 'assets')
    var file = path.join(root, 'deadlines.json')
    if (!fs.existsSync(file)) return []
    var raw = fs.readFileSync(file, 'utf-8')
    return JSON.parse(raw)
  } catch (e) {
    return []
  }
}

ReminderSystem.prototype.destroy = function () {
  for (var i = 0; i < this._timers.length; i++) {
    clearTimeout(this._timers[i])
  }
  this._timers = []
}

module.exports = { ReminderSystem }
