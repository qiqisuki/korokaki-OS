function Ambience(expressionState) {
  this._expressionState = expressionState
  this._statusEl = null
  this._signatureEl = null
  this._particleTimer = null
  this._signatureTimer = null
  this._init()
}

Ambience.prototype._init = function () {
  this._createStatus()
  this._createSignature()
  this._createParticleContainer()
  this._startParticles()

  var self = this
  if (this._expressionState && this._expressionState.onChange) {
    this._expressionState.onChange(function (name) {
      self._updateStatus(name)
    })
  }
}

// ---- 状态标签 ----

Ambience.prototype._createStatus = function () {
  var el = document.createElement('div')
  el.className = 'ambience-status'
  el.textContent = '发呆中...'
  document.body.appendChild(this._statusEl = el)
}

Ambience.prototype._updateStatus = function (exprName) {
  var map = {
    idle: '发呆中...',
    happy: '开心～',
    love: '害羞中...',
    angry: '生气了！！',
    confused: '困惑中...',
    teary: '有点想哭...',
    cry: '大哭中...',
    sleep: '困了...',
    music: '听歌中 🎵',
    work: '专注工作中...',
    tongue: '略略略～',
    smirk: '坏笑中...',
    waveR: '挥手手～',
    waveL: '挥手手～',
    dog: '汪汪！',
    catMouth: '喵～',
    shortHair1: '换发型了',
    shortHair2: '换发型了',
  }
  var text = map[exprName] || exprName
  this._statusEl.textContent = text
  this._statusEl.classList.add('changed')
  var self = this
  clearTimeout(this._statusChangeTimer)
  this._statusChangeTimer = setTimeout(function () {
    self._statusEl.classList.remove('changed')
  }, 1200)
}

// ---- 个性签名 ----

Ambience.prototype._createSignature = function () {
  var el = document.createElement('div')
  el.className = 'ambience-signature'
  document.body.appendChild(this._signatureEl = el)
  this._cycleSignature()
}

Ambience.prototype._cycleSignature = function () {
  var lines = [
    '今天也要加油哦 ✨',
    '小夜，姐姐在呢～',
    '累了就休息一下',
    '你是最棒的！',
    '记得喝水哦 💧',
    '每一天都值得珍惜',
    '努力的人会发光',
    '姐姐永远支持你',
    '做你自己就好',
    '今天天气不错呢',
    '别忘了微笑 :)',
    '慢慢来，不着急',
    '好想念小夜呀',
    '有我在，不孤单',
    '你是姐姐的骄傲',
  ]

  var self = this
  var el = this._signatureEl

  function showNext() {
    var idx = Math.floor(Math.random() * lines.length)
    el.textContent = lines[idx]
    el.classList.add('visible')

    self._signatureTimer = setTimeout(function () {
      el.classList.remove('visible')
      self._signatureTimer = setTimeout(function () {
        showNext()
      }, 8000 + Math.random() * 10000)
    }, 4000)
  }

  // 首次延迟
  this._signatureTimer = setTimeout(function () {
    showNext()
  }, 5000)
}

// ---- 漂浮粒子 ----

Ambience.prototype._createParticleContainer = function () {
  var container = document.createElement('div')
  container.className = 'ambience-particles'
  document.body.appendChild(this._particleContainer = container)
}

Ambience.prototype._startParticles = function () {
  var self = this
  function spawn() {
    self._spawnParticle()
    self._particleTimer = setTimeout(spawn, 1500 + Math.random() * 3000)
  }
  // 初始一次性生成几个
  for (var i = 0; i < 5; i++) {
    setTimeout(function () { self._spawnParticle() }, i * 400)
  }
  this._particleTimer = setTimeout(spawn, 3000)
}

Ambience.prototype._spawnParticle = function () {
  var el = document.createElement('div')
  var size = 2 + Math.random() * 4
  var left = 20 + Math.random() * 60 // 20%-80% 宽度
  var duration = 6 + Math.random() * 8
  var sway = -15 + Math.random() * 30 // 水平漂移范围
  var opacity = 0.15 + Math.random() * 0.25

  el.className = 'ambience-particle'
  el.style.left = left + '%'
  el.style.width = size + 'px'
  el.style.height = size + 'px'
  el.style.opacity = opacity
  el.style.setProperty('--sway', sway + 'px')
  el.style.animationDuration = duration + 's'
  el.style.animationDelay = '0s'

  this._particleContainer.appendChild(el)

  var self = this
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el)
  }, duration * 1000 + 500)
}

Ambience.prototype.destroy = function () {
  clearTimeout(this._particleTimer)
  clearTimeout(this._signatureTimer)
  clearTimeout(this._statusChangeTimer)
  if (this._statusEl) this._statusEl.remove()
  if (this._signatureEl) this._signatureEl.remove()
  if (this._particleContainer) this._particleContainer.remove()
}

module.exports = { Ambience }
