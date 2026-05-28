const sound = require('./sound')

function Interactions(canvas, expressionState, chatUI) {
  this._canvas = canvas
  this._expressionState = expressionState
  this._chatUI = chatUI
  this._clickCount = 0
  this._clickTimer = null
  this._hoverTimer = null
  this._hoverTriggered = false
  this._dragActive = false
  this._rageCount = 0
  this._rageTimer = null
  this._init()
}

Interactions.prototype._init = function () {
  var self = this

  // ---- 连续点击 ----
  this._canvas.addEventListener('click', function (e) {
    // 右键不参与
    if (e.button !== 0) return
    self._clickCount++
    clearTimeout(self._clickTimer)
    if (self._clickCount >= 3) {
      self._clickCount = 0
      self._onTripleClick()
    } else {
      self._clickTimer = setTimeout(function () { self._clickCount = 0 }, 800)
    }
  })

  // ---- 摸头杀：鼠标在角色头部停留 ----
  this._canvas.addEventListener('mousemove', function (e) {
    var rect = self._canvas.getBoundingClientRect()
    var x = e.clientX - rect.left
    var y = e.clientY - rect.top
    var w = rect.width
    var h = rect.height

    // 头部区域：上半部分中间
    var inHead = y < h * 0.38 && x > w * 0.25 && x < w * 0.75

    if (inHead && !self._hoverTriggered) {
      if (!self._hoverTimer) {
        self._hoverTimer = setTimeout(function () {
          self._hoverTriggered = true
          self._onHeadHover()
        }, 2200)
      }
    } else if (!inHead) {
      clearTimeout(self._hoverTimer)
      self._hoverTimer = null
      if (self._hoverTriggered) {
        self._hoverTriggered = false
        self._expressionState.set('idle')
      }
    }
  })

  // ---- 拖文件到窗口 ----
  var dragTarget = document.body
  var dragCount = 0

  dragTarget.addEventListener('dragover', function (e) {
    e.preventDefault()
    if (!self._dragActive) {
      self._dragActive = true
      self._onDragEnter()
    }
    dragCount++
  })

  dragTarget.addEventListener('dragleave', function () {
    dragCount--
    if (dragCount <= 0) {
      dragCount = 0
      self._dragActive = false
      self._onDragLeave()
    }
  })

  dragTarget.addEventListener('drop', function (e) {
    e.preventDefault()
    dragCount = 0
    self._dragActive = false
    self._onDrop(e)
  })
}

// ---- 反应 ----

Interactions.prototype._onTripleClick = function () {
  sound.pat()

  // 怒气系统：连续戳会累积怒气
  clearTimeout(this._rageTimer)
  this._rageCount++
  var self = this
  this._rageTimer = setTimeout(function () { self._rageCount = 0 }, 12000)

  if (this._rageCount >= 7) {
    this._onRageExplode()
    return
  }
  if (this._rageCount >= 5) {
    this._onRageStomp()
    return
  }
  if (this._rageCount >= 3) {
    this._onRageWarning()
    return
  }

  var lines = [
    '笨、笨蛋！别一直点啦...... [tongue]',
    '呜...再戳就要生气了！ [angry]',
    '干嘛啦～姐姐会害羞的... [love]',
    '你是有多喜欢点姐姐呀... [smirk]',
  ]
  var msg = lines[Math.floor(Math.random() * lines.length)]
  this._chatUI.showBubble(msg, 3500)

  var exps = ['tongue', 'smirk', 'love', 'angry']
  var exp = exps[Math.floor(Math.random() * exps.length)]
  this._expressionState.set(exp)
  setTimeout(function () { self._expressionState.set('idle') }, 3000)
}

Interactions.prototype._onRageWarning = function () {
  this._chatUI.showBubble('你...你还在戳！！姐姐真的会生气的！ [angry]', 4000)
  this._expressionState.set('angry')
  var self = this
  setTimeout(function () { self._expressionState.set('idle') }, 3500)
}

Interactions.prototype._onRageStomp = function () {
  var self = this
  this._chatUI.showBubble('够了！！姐姐要跺脚了！！！ [angry]', 4000)

  // 跺脚：快速切换表情模拟
  var stompSeq = ['angry', 'cry', 'angry', 'cry', 'angry']
  var i = 0
  function stomp() {
    if (i >= stompSeq.length) {
      self._expressionState.set('idle')
      return
    }
    self._expressionState.set(stompSeq[i])
    i++
    setTimeout(stomp, 250)
  }
  stomp()
}

Interactions.prototype._onRageExplode = function () {
  var self = this
  this._chatUI.showBubble('啊啊啊啊啊！！！！姐姐炸了！！！💢💢💢 [angry]', 5000)

  // 暴走：更快更激烈的表情切换
  var explodeSeq = ['angry', 'teary', 'cry', 'angry', 'teary', 'cry', 'angry', 'teary', 'cry']
  var j = 0
  function explode() {
    if (j >= explodeSeq.length) {
      self._expressionState.set('sleep')
      setTimeout(function () { self._expressionState.set('idle') }, 2500)
      return
    }
    self._expressionState.set(explodeSeq[j])
    j++
    setTimeout(explode, 200)
  }
  explode()

  // 怒气归零
  this._rageCount = 0
}

Interactions.prototype._onHeadHover = function () {
  this._chatUI.showBubble('嗯？怎么一直看着姐姐... [love]', 3500)
  this._expressionState.set('love')
}

Interactions.prototype._onDragEnter = function () {
  this._chatUI.showBubble('诶？这是什么？ [confused]', 2500)
  this._expressionState.set('confused')
}

Interactions.prototype._onDragLeave = function () {
  this._expressionState.set('idle')
}

Interactions.prototype._onDrop = function (e) {
  this._expressionState.set('happy')
  var files = e.dataTransfer && e.dataTransfer.files
  var count = files ? files.length : 0
  if (count > 0) {
    var name = files[0].name
    if (count === 1) {
      this._chatUI.showBubble('「' + name + '」？要给姐姐看吗～ [happy]', 3500)
    } else {
      this._chatUI.showBubble('一下给姐姐这么多东西... [' + name + ' 等' + count + '个文件] [confused]', 3500)
    }
  } else {
    this._chatUI.showBubble('哇～是给姐姐的礼物吗？ [happy]', 3000)
  }
  var self = this
  setTimeout(function () { self._expressionState.set('idle') }, 3000)
}

module.exports = { Interactions }
