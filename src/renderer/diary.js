var path = require('path')
var fs = require('fs')
var store = require('../shared/settings-store')

var _instance = null

function Diary(mood) {
  this._mood = mood
  _instance = this
  this._btn = null
  this._panel = null
  this._visible = false
  this._todayChats = 0
  this._todayMusic = []
  this._init()
}

Diary.prototype._init = function () {
  var self = this

  var btn = document.createElement('div')
  btn.className = 'diary-trigger'
  btn.textContent = '📔 日记'
  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    self._toggle()
  })
  document.body.appendChild(this._btn = btn)

  var panel = document.createElement('div')
  panel.className = 'diary-panel'
  panel.innerHTML =
    '<div class="games-header">' +
      '<span class="games-title">📔 心情日记</span>' +
      '<button class="games-close">✕</button>' +
    '</div>' +
    '<div class="games-body">' +
      '<div class="diary-tabs">' +
        '<button class="diary-tab active" data-tab="today">今天</button>' +
        '<button class="diary-tab" data-tab="week">本周</button>' +
        '<button class="diary-tab" data-tab="month">本月</button>' +
      '</div>' +
      '<div class="diary-content"></div>' +
    '</div>'
  document.body.appendChild(this._panel = panel)

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

  // Tab 切换
  var tabs = panel.querySelectorAll('.diary-tab')
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      for (var j = 0; j < tabs.length; j++) { tabs[j].classList.remove('active') }
      this.classList.add('active')
      self._renderTab(this.dataset.tab)
    })
  }

  // 每天结束时自动保存
  this._autoSave()
}

Diary.prototype._toggle = function () {
  this._visible ? this._hide() : this._show()
}

Diary.prototype._show = function () {
  this._visible = true
  this._btn.classList.add('active')
  this._panel.classList.add('visible')
  this._renderTab('today')
}

Diary.prototype._hide = function () {
  this._visible = false
  this._btn.classList.remove('active')
  this._panel.classList.remove('visible')
}

// ---- 记录事件 ----

Diary.prototype.logChat = function () {
  this._todayChats++
}

Diary.prototype.logMusic = function (name) {
  if (this._todayMusic.indexOf(name) < 0) {
    this._todayMusic.push(name)
  }
}

// ---- 数据读写 ----

Diary.prototype._todayKey = function () {
  var d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

Diary.prototype._loadAll = function () {
  try {
    var file = path.join(__dirname, '..', '..', 'assets', 'diary.json')
    if (!fs.existsSync(file)) return {}
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (e) { return {} }
}

Diary.prototype._saveAll = function (data) {
  var file = path.join(__dirname, '..', '..', 'assets', 'diary.json')
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

Diary.prototype._autoSave = function () {
  var self = this
  // 每 30 分钟保存一次当天快照
  setInterval(function () {
    self._saveTodaySnapshot()
  }, 30 * 60 * 1000)
}

Diary.prototype._saveTodaySnapshot = function () {
  var key = this._todayKey()
  var all = this._loadAll()

  var entry = all[key] || {}
  entry.chats = this._todayChats
  entry.musicPlayed = this._todayMusic.slice()
  if (this._mood) {
    entry.affection = this._mood.getAffection()
    entry.affectionLevel = this._mood.getAffectionLevel()
  }
  // 记录天气
  var state = require('./state')
  if (state.weather) {
    entry.weather = state.weather.icon + ' ' + state.weather.temp + '°C ' + state.weather.text
  }
  all[key] = entry
  this._saveAll(all)
}

// ---- 渲染 ----

Diary.prototype._renderTab = function (tab) {
  if (tab === 'today') this._renderToday()
  else if (tab === 'week') this._renderWeek()
  else if (tab === 'month') this._renderMonth()
}

Diary.prototype._renderToday = function () {
  var self = this
  this._saveTodaySnapshot()
  var all = this._loadAll()
  var key = this._todayKey()
  var entry = all[key] || {}

  var stats = this._mood ? this._mood.getStats() : {}
  var html =
    '<div class="diary-card">' +
      '<div class="diary-date">📅 ' + key + '</div>' +
      '<div class="diary-stat">💬 聊天: <b>' + (entry.chats || 0) + '</b> 次</div>' +
      '<div class="diary-stat">💕 好感度: <b>' + (entry.affection || 0) + '</b> (' + (entry.affectionLevel || '未知') + ')</div>'

  if (entry.musicPlayed && entry.musicPlayed.length > 0) {
    html += '<div class="diary-stat">🎵 听过: ' + entry.musicPlayed.map(function (m) { return '<span class="diary-tag">' + m + '</span>' }).join(' ') + '</div>'
  }
  if (entry.weather) {
    html += '<div class="diary-stat">🌤️ ' + entry.weather + '</div>'
  }

  html += '</div>'

  // 如果有昨天的数据，对比
  var yesterday = _yesterdayKey()
  var yesterdayEntry = all[yesterday]
  if (yesterdayEntry) {
    var diff = (entry.affection || 0) - (yesterdayEntry.affection || 0)
    var diffStr = diff >= 0 ? '+' + diff : '' + diff
    html += '<div class="diary-compare">📈 较昨日好感度变化: <b>' + diffStr + '</b></div>'
  }

  this._panel.querySelector('.diary-content').innerHTML = html
}

Diary.prototype._renderWeek = function () {
  var all = this._loadAll()
  var self = this
  var today = new Date()
  var startDate = new Date(today)
  startDate.setDate(today.getDate() - today.getDay()) // 本周一

  var entries = []
  for (var d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    var key = _formatDate(d)
    var entry = all[key]
    entries.push({ key: key, entry: entry })
  }

  var weekChats = 0
  var weekMusic = 0
  var affStart = 0
  var affEnd = 0
  var hasStart = false
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].entry) {
      weekChats += entries[i].entry.chats || 0
      weekMusic += (entries[i].entry.musicPlayed || []).length
      if (!hasStart) { affStart = entries[i].entry.affection || 0; hasStart = true }
      affEnd = entries[i].entry.affection || affEnd
    }
  }

  var html =
    '<div class="diary-card">' +
      '<div class="diary-date">📅 ' + _formatDate(startDate) + ' ~ ' + _formatDate(today) + '</div>' +
      '<div class="diary-stat">💬 总聊天: <b>' + weekChats + '</b> 次</div>' +
      '<div class="diary-stat">🎵 听歌: <b>' + weekMusic + '</b> 首</div>' +
      '<div class="diary-stat">💕 好感度: ' + affStart + ' → ' + affEnd + ' (' + (affEnd >= affStart ? '+' + (affEnd - affStart) : '' + (affEnd - affStart)) + ')</div>' +
    '</div>'

  // 每日列表
  html += '<div class="diary-week-list">'
  for (var j = 0; j < entries.length; j++) {
    var e = entries[j]
    var dot = e.entry ? '🟢' : '⚪'
    var chats = e.entry ? e.entry.chats + '次' : '无记录'
    var affIcon = ' '
    if (e.entry && e.entry.affectionLevel === 'devoted') affIcon = '❤️'
    else if (e.entry && e.entry.affectionLevel === 'intimate') affIcon = '💛'
    else if (e.entry && e.entry.affectionLevel === 'warm') affIcon = '💚'
    html += '<div class="diary-week-item">' +
      dot + ' ' + e.key.slice(5) + ' — ' + chats + ' ' + affIcon +
      '</div>'
  }
  html += '</div>'

  this._panel.querySelector('.diary-content').innerHTML = html
}

Diary.prototype._renderMonth = function () {
  var all = this._loadAll()
  var today = new Date()
  var startDate = new Date(today.getFullYear(), today.getMonth(), 1)

  var entries = []
  var monthChats = 0
  var monthMusic = 0
  var affStart = 0
  var affEnd = 0
  var hasStart = false

  for (var d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    var key = _formatDate(d)
    var entry = all[key]
    if (entry) {
      monthChats += entry.chats || 0
      monthMusic += (entry.musicPlayed || []).length
      if (!hasStart) { affStart = entry.affection || 0; hasStart = true }
      affEnd = entry.affection || affEnd
      entries.push({ key: key, entry: entry })
    }
  }

  var html =
    '<div class="diary-card">' +
      '<div class="diary-date">📅 ' + _formatDate(startDate) + ' ~ ' + _formatDate(today) + '</div>' +
      '<div class="diary-stat">💬 总聊天: <b>' + monthChats + '</b> 次</div>' +
      '<div class="diary-stat">🎵 听歌: <b>' + monthMusic + '</b> 首</div>' +
      '<div class="diary-stat">💕 好感度: ' + affStart + ' → ' + affEnd + ' (+' + (affEnd - affStart) + ')</div>' +
      '<div class="diary-stat">📊 活跃天数: <b>' + entries.length + '</b> 天</div>' +
    '</div>'

  // 最高光的一天
  if (entries.length > 0) {
    var best = entries[0]
    for (var i = 1; i < entries.length; i++) {
      if ((entries[i].entry.chats || 0) > (best.entry.chats || 0)) best = entries[i]
    }
    html += '<div class="diary-highlight">🌟 最活跃: ' + best.key + ' — ' + best.entry.chats + ' 次聊天</div>'
  }

  this._panel.querySelector('.diary-content').innerHTML = html
}

// ---- 工具 ----

function _formatDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function _yesterdayKey() {
  var d = new Date()
  d.setDate(d.getDate() - 1)
  return _formatDate(d)
}

module.exports = { Diary: Diary, diary: { logChat: function () { if (_instance) _instance.logChat() }, logMusic: function (n) { if (_instance) _instance.logMusic(n) } } }
