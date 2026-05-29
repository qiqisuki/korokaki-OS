const { ipcRenderer } = require('electron')
const fs = require('fs')
const path = require('path')
const sound = require('./sound')

function IdleBehavior(model, expressionState, chatUI, mood) {
  this._model = model
  this._expressionState = expressionState
  this._chatUI = chatUI
  this._mood = mood
  this._idleTimer = null
  this._idleDelay = 25000
  this._lastActivity = Date.now()

  this._scheduleGreeting()
  this._scheduleIdle()
}

IdleBehavior.prototype._scheduleIdle = function () {
  clearTimeout(this._idleTimer)
  this._idleDelay = 25000 + Math.random() * 30000
  this._idleTimer = setTimeout(() => this._onIdle(), this._idleDelay)
}

IdleBehavior.prototype._onIdle = function () {
  var gap = (Date.now() - this._lastActivity) / 1000 / 60 // 分钟
  var self = this

  // 检查傲娇敲门
  if (this._mood && this._mood.shouldKnock() && Math.random() < 0.5) {
    var ctx = this._mood.getKnockContext()
    if (ctx) {
      sound.knock()
      ipcRenderer.send('shake-window')
      this._chatUI.showBubble(ctx.text, ctx.duration)
      this._expressionState.set(ctx.expr)
      setTimeout(function () { self._expressionState.set('idle') }, ctx.duration)
      this._scheduleIdle()
      return
    }
  }

  if (gap > 45 && !this._mood && Math.random() < 0.4) {
    this._doKnocking(gap)
  } else {
    var actions
    if (gap > 60) {
      actions = ['thought', 'thought', 'expression', 'thought']
    } else {
      actions = ['expression', 'thought', 'expression', 'nothing', 'expression']
    }

    var pick = actions[Math.floor(Math.random() * actions.length)]

    if (pick === 'expression') {
      var exps = this._mood ? this._mood.suggestIdleExpressions() : ['confused', 'sleep', 'work', 'music', 'angry', 'tongue']
      var exp = exps[Math.floor(Math.random() * exps.length)]
      this._expressionState.set(exp)
      setTimeout(function () { self._expressionState.set('idle') }, 4000 + Math.random() * 3000)
    } else if (pick === 'thought') {
      var thought = this._mood ? this._mood.suggestIdleThought() : null
      this._chatUI.showBubble(thought || this._pickThought(gap), 4000)
    }
  }

  this._scheduleIdle()
}

IdleBehavior.prototype._doKnocking = function (gapMinutes) {
  var self = this

  sound.knock()
  ipcRenderer.send('shake-window')

  if (gapMinutes > 180) {
    this._chatUI.showBubble('（轻轻敲了敲屏幕）小夜......还在吗？姐姐好想你 [teary]', 6000)
  } else if (gapMinutes > 90) {
    this._chatUI.showBubble('咚咚咚！有人吗～姐姐无聊死了！ [angry]', 5000)
  } else {
    this._chatUI.showBubble('喂～别不理姐姐嘛... [confused]', 4500)
  }

  // 敲门表情序列：困惑 → 生气 → 委屈
  this._expressionState.set('confused')
  setTimeout(function () {
    self._expressionState.set('angry')
    setTimeout(function () {
      self._expressionState.set('teary')
      setTimeout(function () {
        self._expressionState.set('idle')
      }, 2000)
    }, 1500)
  }, 1500)
}

IdleBehavior.prototype._pickThought = function (gapMinutes) {
  var normal = [
    '小夜在干嘛呢...',
    '好无聊啊，这个笨蛋肯定又在摸鱼',
    '要不要去催催作业呢',
    '嗯...泡杯咖啡好了',
    '看看时间...该提醒她了吧',
    '文件还没整理完，唉',
  ]
  var long = [
    '终于回来了...姐姐等你好久了 [confused]',
    '这么久不理姐姐，生气了吗？ [teary]',
    '还以为你不要姐姐了呢... [sleep]',
  ]
  var veryLong = [
    '一天没见了...姐姐好想你 [teary]',
    '还知道回来啊笨蛋！ [angry]',
    '再不说话姐姐要发霉了 [sleep]',
  ]

  var pool
  if (gapMinutes > 180) pool = veryLong
  else if (gapMinutes > 60) pool = long.concat(normal)
  else pool = normal

  return pool[Math.floor(Math.random() * pool.length)]
}

IdleBehavior.prototype.notifyActivity = function () {
  this._lastActivity = Date.now()
  this._scheduleIdle()

  // 傲娇归来序列
  if (this._mood) {
    var self = this
    var step = this._mood.saveTsundereResponse()
    if (step) {
      this._runTsundereReturn(step)
    }
  }
}

IdleBehavior.prototype._runTsundereReturn = function (step) {
  var self = this
  if (!step) return

  if (step.text) {
    this._chatUI.showBubble(step.text, 5000)
  }
  this._expressionState.set(step.expr)

  var next = this._mood.stepTsundereReturn()
  if (next) {
    setTimeout(function () { self._runTsundereReturn(next) }, step.text ? 5000 : 2000)
  } else {
    setTimeout(function () { self._expressionState.set('idle') }, 3000)
  }
}

IdleBehavior.prototype._scheduleGreeting = function () {
  var self = this

  // 先检查节日 (mood)
  if (this._mood) {
    var holiday = this._mood.getHolidayGreeting()
    if (holiday) {
      setTimeout(function () {
        self._chatUI.showBubble(holiday.text.replace(/\[.*?\]/, '').trim(), holiday.duration || 6000)
        if (holiday.expr !== 'idle') {
          self._expressionState.set(holiday.expr)
          setTimeout(function () { self._expressionState.set('idle') }, 5000)
        }
      }, 2500)
      return
    }
  }

  // 兼容旧纪念日文件 (向后兼容)
  var ann = this._checkAnniversary()
  if (ann) {
    setTimeout(function () {
      self._chatUI.showBubble(ann.greeting.replace(/\[.*?\]/, '').trim(), 6000)
      if (ann.expr !== 'idle') {
        self._expressionState.set(ann.expr)
        setTimeout(function () { self._expressionState.set('idle') }, 5000)
      }
    }, 2500)
    return
  }

  var hour = new Date().getHours()
  var greeting
  if (hour < 6)      greeting = '这么晚了还不睡...姐姐陪你 [sleep]'
  else if (hour < 9) greeting = '早安小夜，今天也要加油哦 [happy]'
  else if (hour < 12) greeting = '上午好，别摸鱼了 [idle]'
  else if (hour < 14) greeting = '中午好，记得吃饭～ [happy]'
  else if (hour < 18) greeting = '下午好，作业进度怎么样？ [confused]'
  else if (hour < 22) greeting = '晚上好，今天过得开心吗？ [love]'
  else               greeting = '这么晚了，早点休息吧笨蛋 [sleep]'

  var exprMatch = greeting.match(/\[(idle|happy|angry|blush|sleep|love|confused|teary|smirk|cry)\]/i)
  var expr = exprMatch ? exprMatch[1].toLowerCase() : 'idle'
  var text = greeting.replace(/\[.*?\]/, '').trim()

  setTimeout(function () {
    self._chatUI.showBubble(text, 5000)
    if (expr !== 'idle') {
      self._expressionState.set(expr)
      setTimeout(function () { self._expressionState.set('idle') }, 4000)
    }
  }, 2500)
}

IdleBehavior.prototype._checkAnniversary = function () {
  try {
    var file = path.join(__dirname, '..', '..', 'assets', 'anniversaries.json')
    if (!fs.existsSync(file)) return null
    var list = JSON.parse(fs.readFileSync(file, 'utf-8'))
    var now = new Date()
    var today = ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2)
    for (var i = 0; i < list.length; i++) {
      if (list[i].date === today) return list[i]
    }
  } catch (e) {}
  return null
}

module.exports = { IdleBehavior }
