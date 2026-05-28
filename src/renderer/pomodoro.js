const sound = require('./sound')
const state = require('./state')
const store = require('../shared/settings-store')

function PomodoroWidget(chatUI, expressionState) {
  this._chatUI = chatUI
  this._expressionState = expressionState
  this._isRunning = false
  this._isBreak = false
  this._minutes = 0
  this._seconds = 0
  this._round = 0
  this._timer = null
  this._btn = null
  this._init()
}

PomodoroWidget.prototype._init = function () {
  var self = this

  var btn = document.createElement('div')
  btn.className = 'pomodoro-trigger'
  btn.textContent = '🍅 专注'
  btn.addEventListener('click', function () { self._toggle() })
  document.body.appendChild(this._btn = btn)
}

PomodoroWidget.prototype._toggle = function () {
  if (this._isRunning) {
    this._cancel()
  } else {
    this._startFocus()
  }
}

PomodoroWidget.prototype._startFocus = function () {
  var cfg = store.get('pomodoro') || {}
  this._isRunning = true
  this._isBreak = false
  this._minutes = cfg.focus || 25
  this._seconds = 0
  this._btn.classList.add('active')
  this._btn.textContent = '🍅 25:00'
  if (this._expressionState) this._expressionState.set('work')

  var self = this
  this._timer = setInterval(function () { self._tick() }, 1000)
}

PomodoroWidget.prototype._startBreak = function () {
  var cfg = store.get('pomodoro') || {}
  this._isRunning = true
  this._isBreak = true
  this._round++
  state.pomodoroRound = this._round
  var isLong = this._round > 0 && this._round % 4 === 0
  this._minutes = isLong ? (cfg.longBreak || 15) : (cfg.shortBreak || 5)
  this._seconds = 0
  this._btn.classList.add('break')
  this._btn.textContent = '☕ ' + this._minutes + ':00'
  if (this._expressionState) this._expressionState.set('idle')

  var msg = isLong
    ? '四轮了！休息 15 分钟吧，起来走走～ [happy]'
    : '25 分钟到啦～休息 5 分钟！ [happy]'
  this._chatUI.showBubble(msg, 5000)

  var self = this
  this._timer = setInterval(function () { self._tick() }, 1000)
}

PomodoroWidget.prototype._tick = function () {
  if (this._seconds === 0) {
    if (this._minutes === 0) {
      this._finish()
      return
    }
    this._minutes--
    this._seconds = 59
  } else {
    this._seconds--
  }

  var m = ('0' + this._minutes).slice(-2)
  var s = ('0' + this._seconds).slice(-2)
  this._btn.textContent = (this._isBreak ? '☕ ' : '🍅 ') + m + ':' + s
}

PomodoroWidget.prototype._finish = function () {
  sound.pomodoro()
  clearInterval(this._timer)
  this._timer = null

  if (this._isBreak) {
    // 休息结束
    this._isRunning = false
    this._isBreak = false
    this._btn.classList.remove('active', 'break')
    this._btn.textContent = '🍅 专注'
    if (this._expressionState) this._expressionState.set('idle')
    this._chatUI.showBubble('休息结束！准备好开始下一轮了吗？ [happy]', 4000)
  } else {
    // 专注结束 → 进入休息
    this._startBreak()
  }
}

PomodoroWidget.prototype._cancel = function () {
  clearInterval(this._timer)
  this._timer = null
  this._isRunning = false
  this._isBreak = false
  this._minutes = 0
  this._seconds = 0
  this._btn.classList.remove('active', 'break')
  this._btn.textContent = '🍅 专注'
  if (this._expressionState) this._expressionState.set('idle')
  this._chatUI.showBubble('番茄钟已取消 [idle]', 2000)
}

module.exports = { PomodoroWidget }
