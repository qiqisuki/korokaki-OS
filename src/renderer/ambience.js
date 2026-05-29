function Ambience(expressionState, mood) {
  this._expressionState = expressionState
  this._mood = mood || null
  this._currentExpr = 'idle'
  this._statusEl = null
  this._signatureEl = null
  this._particleTimer = null
  this._signatureTimer = null
  this._holidayParticleTimer = null
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
      self._currentExpr = name
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
  // 节日特效粒子 (30% 概率)
  if (this._mood && this._mood.isHolidayActive()) {
    if (Math.random() < 0.3) {
      var h = this._mood._activeHoliday
      var ptype = _holidayParticleType(h && h.name)
      if (ptype === 'heart') { this._spawnHeart(); return }
      if (ptype === 'snow')  { this._spawnSnow(); return }
      if (ptype === 'sakura') { this._spawnSakura(); return }
      if (ptype === 'firework') { this._spawnFirework(); return }
    }
  }

  var el = document.createElement('div')
  var size = 3 + Math.random() * 5
  var left = 20 + Math.random() * 60
  var duration = 6 + Math.random() * 8
  var sway = -15 + Math.random() * 30
  var opacity = 0.25 + Math.random() * 0.3
  var color = _exprColor(this._currentExpr)

  el.className = 'ambience-particle'
  el.style.left = left + '%'
  el.style.width = size + 'px'
  el.style.height = size + 'px'
  el.style.opacity = opacity
  el.style.background = color
  el.style.boxShadow = '0 0 ' + (size * 2) + 'px ' + color
  el.style.setProperty('--sway', sway + 'px')
  el.style.animationDuration = duration + 's'
  el.style.animationDelay = '0s'

  this._particleContainer.appendChild(el)

  var self = this
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el)
  }, duration * 1000 + 500)
}

Ambience.prototype._spawnHeart = function () {
  var el = document.createElement('div')
  el.className = 'ambience-heart'
  el.textContent = '💕'
  el.style.left = (20 + Math.random() * 60) + '%'
  el.style.fontSize = (10 + Math.random() * 16) + 'px'
  el.style.animationDuration = (4 + Math.random() * 5) + 's'
  this._particleContainer.appendChild(el)
  var self = this
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 10000)
}

Ambience.prototype._spawnSnow = function () {
  var el = document.createElement('div')
  el.className = 'ambience-snow'
  el.textContent = '❄️'
  el.style.left = (5 + Math.random() * 90) + '%'
  el.style.fontSize = (8 + Math.random() * 14) + 'px'
  el.style.animationDuration = (5 + Math.random() * 7) + 's'
  this._particleContainer.appendChild(el)
  var self = this
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 13000)
}

Ambience.prototype._spawnSakura = function () {
  var el = document.createElement('div')
  el.className = 'ambience-sakura'
  el.textContent = '🌸'
  el.style.left = (5 + Math.random() * 90) + '%'
  el.style.fontSize = (10 + Math.random() * 14) + 'px'
  el.style.animationDuration = (5 + Math.random() * 6) + 's'
  this._particleContainer.appendChild(el)
  var self = this
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 12000)
}

Ambience.prototype._spawnFirework = function () {
  var el = document.createElement('div')
  el.className = 'ambience-firework'
  el.textContent = '🎆'
  el.style.left = (10 + Math.random() * 80) + '%'
  el.style.top = (10 + Math.random() * 40) + '%'
  el.style.fontSize = (18 + Math.random() * 24) + 'px'
  this._particleContainer.appendChild(el)
  var self = this
  setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el) }, 1500)
}

function _holidayParticleType(name) {
  if (!name) return 'snow'
  if (name === '情人节' || name === '七夕') return 'heart'
  if (name === '圣诞节') return 'snow'
  if (name === '春节' || name === '除夕' || name === '元旦') return 'firework'
  if (name === '初遇日') return 'sakura'
  return 'snow'
}

function _exprColor(expr) {
  var map = {
    idle: 'rgba(255,255,255,0.55)',
    happy: 'rgba(255,215,0,0.7)',
    love: 'rgba(255,105,180,0.7)',
    angry: 'rgba(255,50,50,0.7)',
    confused: 'rgba(100,180,255,0.7)',
    teary: 'rgba(80,160,255,0.7)',
    cry: 'rgba(50,140,255,0.7)',
    sleep: 'rgba(160,120,240,0.7)',
    music: 'rgba(80,200,120,0.7)',
    work: 'rgba(255,170,50,0.7)',
    tongue: 'rgba(255,140,0,0.7)',
    smirk: 'rgba(255,150,30,0.7)',
    waveR: 'rgba(255,255,255,0.55)',
    waveL: 'rgba(255,255,255,0.55)',
  }
  return map[expr] || 'rgba(255,255,255,0.55)'
}

Ambience.prototype.destroy = function () {
  clearTimeout(this._particleTimer)
  clearTimeout(this._holidayParticleTimer)
  clearTimeout(this._signatureTimer)
  clearTimeout(this._statusChangeTimer)
  if (this._statusEl) this._statusEl.remove()
  if (this._signatureEl) this._signatureEl.remove()
  if (this._particleContainer) this._particleContainer.remove()
}

module.exports = { Ambience }
