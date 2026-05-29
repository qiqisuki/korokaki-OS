var sound = require('./sound')

function MiniGames(expressionState, chatUI) {
  this._expr = expressionState
  this._chatUI = chatUI
  this._btn = null
  this._panel = null
  this._visible = false
  this._currentGame = null
  this._rpsWins = 0
  this._rpsLosses = 0
  this._guessTarget = 0
  this._guessCount = 0
  this._rpsReady = false
  this._init()
}

MiniGames.prototype._init = function () {
  var self = this

  var btn = document.createElement('div')
  btn.className = 'games-trigger'
  btn.textContent = '🎮 游戏'
  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    self._toggle()
  })
  document.body.appendChild(this._btn = btn)

  var panel = document.createElement('div')
  panel.className = 'games-panel'
  panel.innerHTML =
    '<div class="games-header">' +
      '<span class="games-title">🎮 小游戏</span>' +
      '<button class="games-close">✕</button>' +
    '</div>' +
    '<div class="games-body">' +
      '<div class="games-menu" id="gamesMenu"></div>' +
      '<div class="games-area" id="gameRps" style="display:none"></div>' +
      '<div class="games-area" id="gameGuess" style="display:none"></div>' +
      '<div class="games-area" id="gameFortune" style="display:none"></div>' +
    '</div>'
  document.body.appendChild(this._panel = panel)

  this._menuEl = panel.querySelector('#gamesMenu')
  this._buildMenu()

  panel.querySelector('.games-close').addEventListener('click', function (e) {
    e.stopPropagation()
    self._hide()
  })

  // 点击面板外关闭
  document.addEventListener('click', function (e) {
    if (self._visible && !self._panel.contains(e.target) && e.target !== self._btn) {
      self._hide()
    }
  })
}

MiniGames.prototype._buildMenu = function () {
  var self = this
  this._menuEl.innerHTML = ''
  var games = [
    { id: 'rps', label: '✊ 🖐️ ✌️ 石头剪刀布' },
    { id: 'guess', label: '🔢 猜数字' },
    { id: 'fortune', label: '🔮 每日运势' },
  ]
  for (var i = 0; i < games.length; i++) {
    var item = document.createElement('button')
    item.className = 'games-menu-btn'
    item.textContent = games[i].label
    item.setAttribute('data-game', games[i].id)
    item.addEventListener('click', function () {
      self._startGame(this.getAttribute('data-game'))
    })
    this._menuEl.appendChild(item)
  }
}

MiniGames.prototype._toggle = function () {
  this._visible ? this._hide() : this._show()
}

MiniGames.prototype._show = function () {
  this._visible = true
  this._btn.classList.add('active')
  this._panel.classList.add('visible')
}

MiniGames.prototype._hide = function () {
  this._visible = false
  this._btn.classList.remove('active')
  this._panel.classList.remove('visible')
  this._currentGame = null
  var areas = this._panel.querySelectorAll('.games-area')
  for (var i = 0; i < areas.length; i++) { areas[i].style.display = 'none' }
  this._panel.querySelector('#gamesMenu').style.display = ''
  var backBtn = this._panel.querySelector('.games-back')
  if (backBtn) backBtn.remove()
}

MiniGames.prototype._startGame = function (name) {
  this._currentGame = name
  this._panel.querySelector('#gamesMenu').style.display = 'none'
  var areas = this._panel.querySelectorAll('.games-area')
  for (var i = 0; i < areas.length; i++) { areas[i].style.display = 'none' }

  if (name === 'rps') {
    this._panel.querySelector('#gameRps').style.display = ''
    this._ensureRps()
  } else if (name === 'guess') {
    this._panel.querySelector('#gameGuess').style.display = ''
    this._renderGuess()
  } else if (name === 'fortune') {
    this._panel.querySelector('#gameFortune').style.display = ''
    this._renderFortune()
  }

  var self = this
  var header = this._panel.querySelector('.games-header')
  var existingBack = header.querySelector('.games-back')
  if (existingBack) existingBack.remove()

  var backBtn = document.createElement('button')
  backBtn.className = 'games-back'
  backBtn.textContent = '←'
  backBtn.addEventListener('click', function (e) {
    e.stopPropagation()
    self._currentGame = null
    self._panel.querySelector('#gamesMenu').style.display = ''
    for (var j = 0; j < areas.length; j++) { areas[j].style.display = 'none' }
    backBtn.remove()
  })
  header.insertBefore(backBtn, header.firstChild)
}

// ==================== 石头剪刀布 ====================

MiniGames.prototype._ensureRps = function () {
  if (this._rpsReady) return
  this._rpsReady = true
  this._renderRps()
}

MiniGames.prototype._renderRps = function () {
  var self = this
  var area = this._panel.querySelector('#gameRps')
  area.innerHTML =
    '<div class="game-title">✊ 🖐️ ✌️ 石头剪刀布</div>' +
    '<div class="rps-score">胜 ' + this._rpsWins + ' · 负 ' + this._rpsLosses + '</div>' +
    '<div class="rps-choices">' +
      '<button class="rps-btn" data-choice="0">✊</button>' +
      '<button class="rps-btn" data-choice="1">🖐️</button>' +
      '<button class="rps-btn" data-choice="2">✌️</button>' +
    '</div>' +
    '<div class="rps-result"></div>'

  var buttons = area.querySelectorAll('.rps-btn')
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function (e) {
      e.stopPropagation()
      self._playRps(parseInt(this.getAttribute('data-choice')))
    })
  }
}

MiniGames.prototype._playRps = function (userPick) {
  var choices = ['✊', '🖐️', '✌️']
  var sister = Math.floor(Math.random() * 3)
  var diff = (userPick - sister + 3) % 3
  var result

  if (diff === 0) {
    result = '平局！姐姐出了 ' + choices[sister] + '，不分上下呢～'
    this._expr.set('happy')
  } else if (diff === 1) {
    result = '你赢了！姐姐出了 ' + choices[sister] + '，哼，运气好而已 [angry]'
    this._rpsWins++
    this._expr.set('angry')
  } else {
    result = '姐姐赢了！出了 ' + choices[sister] + '，笨蛋妹妹还嫩着呢 [smirk]'
    this._rpsLosses++
    this._expr.set('smirk')
  }

  if (this._rpsWins >= 3 && diff === 1) {
    result = '你赢了！姐姐出了 ' + choices[sister] + '...等等，你作弊！重来重来！ [tongue]'
    this._expr.set('tongue')
  }

  sound.pat()
  var area = this._panel.querySelector('#gameRps')
  area.querySelector('.rps-result').textContent = result
  area.querySelector('.rps-score').textContent = '胜 ' + this._rpsWins + ' · 负 ' + this._rpsLosses
}

// ==================== 猜数字 ====================

MiniGames.prototype._renderGuess = function () {
  var self = this
  this._guessTarget = Math.floor(Math.random() * 100) + 1
  this._guessCount = 0

  var area = this._panel.querySelector('#gameGuess')
  area.innerHTML =
    '<div class="game-title">🔢 猜数字 1-100</div>' +
    '<div class="guess-hint">姐姐想了一个数字...你猜是多少？</div>' +
    '<div class="guess-input-row">' +
      '<input type="number" class="guess-input" min="1" max="100" placeholder="1-100">' +
      '<button class="guess-btn">猜！</button>' +
    '</div>' +
    '<div class="guess-result"></div>' +
    '<div class="guess-history"></div>'

  var input = area.querySelector('.guess-input')
  var btn = area.querySelector('.guess-btn')

  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    self._doGuess(input)
  })
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.stopPropagation(); self._doGuess(input) }
  })
}

MiniGames.prototype._doGuess = function (input) {
  var n = parseInt(input.value)
  if (isNaN(n) || n < 1 || n > 100) {
    this._panel.querySelector('#gameGuess .guess-result').textContent = '请输入 1-100 之间的数字啦！'
    return
  }

  this._guessCount++
  var result
  if (n === this._guessTarget) {
    var comment = this._guessCount <= 3 ? '天才！' : this._guessCount <= 6 ? '不错嘛～' : '终于猜对了！'
    result = comment + '就是 ' + n + '！用了 ' + this._guessCount + ' 步。'
    this._expr.set('happy')
    sound.music()
    var self = this
    setTimeout(function () { self._renderGuess() }, 2500)
  } else if (n < this._guessTarget) {
    result = n + '？太小啦！往上猜～'
    this._expr.set('smirk')
  } else {
    result = n + '？太大啦！往下猜～'
    this._expr.set('confused')
  }

  var area = this._panel.querySelector('#gameGuess')
  area.querySelector('.guess-result').textContent = result
  area.querySelector('.guess-history').textContent = '已猜 ' + this._guessCount + ' 次'
  input.value = ''
  input.focus()
  sound.pat()
}

// ==================== 每日运势 ====================

var FORTUNE_TABLE = [
  { level: '大吉', weight: 10, icon: '🌟', expr: 'happy', color: '#ffd700',
    msgs: ['今天做什么都会顺利！姐姐也替你开心～', '运气爆棚！去买张彩票试试？', '好事连连的一天，有什么计划吗？'] },
  { level: '中吉', weight: 20, icon: '✨', expr: 'happy', color: '#ffcc80',
    msgs: ['不错不错，今天顺风顺水呢', '运气不错，加油的话会有意外收获～', '今天认真做的话，会有好结果哦'] },
  { level: '小吉', weight: 35, icon: '🍀', expr: 'smirk', color: '#90caf9',
    msgs: ['平平淡淡才是真，今天放松心情就好', '小幸运的一天，记得多笑笑', '还行吧～努力的话会更好的'] },
  { level: '末吉', weight: 25, icon: '🌥️', expr: 'confused', color: '#a0a0a0',
    msgs: ['嗯...今天运势一般，小心做事哦', '不算差但也别太冒险，稳一点好', '普普通通的一天，不过明天会更好～'] },
  { level: '凶', weight: 10, icon: '💀', expr: 'teary', color: '#ef5350',
    msgs: ['今天不适合出门...还是乖乖待着吧', '遇事冷静，凡事三思而后行！', '别担心，姐姐帮你挡灾！明天就是大吉！'] },
]

MiniGames.prototype._renderFortune = function () {
  var self = this
  var today = new Date()
  var seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  var rng = _seededRandom(seed)

  var total = 0
  for (var i = 0; i < FORTUNE_TABLE.length; i++) { total += FORTUNE_TABLE[i].weight }
  var roll = rng * total
  var fortune = FORTUNE_TABLE[0]
  var acc = 0
  for (var j = 0; j < FORTUNE_TABLE.length; j++) {
    acc += FORTUNE_TABLE[j].weight
    if (roll <= acc) { fortune = FORTUNE_TABLE[j]; break }
  }

  var msg = fortune.msgs[Math.floor(rng * fortune.msgs.length)]
  var dateStr = (today.getMonth() + 1) + '月' + today.getDate() + '日'

  var area = this._panel.querySelector('#gameFortune')
  area.innerHTML =
    '<div class="game-title">🔮 ' + dateStr + ' 每日运势</div>' +
    '<div class="fortune-card" style="border-color:' + fortune.color + '">' +
      '<div class="fortune-icon">' + fortune.icon + '</div>' +
      '<div class="fortune-level" style="color:' + fortune.color + '">' + fortune.level + '</div>' +
      '<div class="fortune-msg">' + msg + '</div>' +
    '</div>' +
    '<div class="fortune-footer">明天再来抽签吧～</div>'

  this._expr.set(fortune.expr)
  sound.startup()
}

function _seededRandom(seed) {
  var x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

module.exports = { MiniGames }
