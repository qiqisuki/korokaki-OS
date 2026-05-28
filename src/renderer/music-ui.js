const netease = require('../music/netease-api')
const { Player } = require('../music/player')

function MusicUI(chatUI, expressionState) {
  this._chatUI = chatUI
  this._expressionState = expressionState
  this._player = new Player()
  this._panel = null
  this._results = null
  this._playerCard = null
  this._lyricEl = null
  this._lyricData = null
  this._lyricTimer = null
  this._init()
}

MusicUI.prototype._init = function () {
  var self = this

  // 音乐按钮
  var btn = document.createElement('div')
  btn.className = 'music-trigger'
  btn.textContent = '🎵 音乐'
  btn.addEventListener('click', function () { self._togglePanel() })
  document.body.appendChild(this._btn = btn)

  // 播放器卡片 (播放时才显示)
  var card = document.createElement('div')
  card.className = 'player-card'
  card.innerHTML =
    '<button class="player-card-close">✕</button>' +
    '<img class="player-cover" src="" alt="">' +
    '<div class="player-info">' +
      '<div class="player-title"></div>' +
      '<div class="player-artist"></div>' +
      '<div class="player-controls">' +
        '<button class="player-ctrl-btn" data-action="prev">⏮</button>' +
        '<button class="player-ctrl-btn player-ctrl-play" data-action="toggle">▶</button>' +
        '<button class="player-ctrl-btn" data-action="next">⏭</button>' +
      '</div>' +
      '<div class="player-volume">' +
        '<span class="player-volume-icon">🔊</span>' +
        '<input type="range" class="player-volume-slider" min="0" max="100" value="70">' +
      '</div>' +
    '</div>' +
    '<div class="player-lyrics">' +
      '<div class="player-lyrics-prev"></div>' +
      '<div class="player-lyrics-curr"></div>' +
      '<div class="player-lyrics-next"></div>' +
    '</div>'
  document.body.appendChild(this._playerCard = card)

  this._lyricCurr = card.querySelector('.player-lyrics-curr')
  this._lyricPrev = card.querySelector('.player-lyrics-prev')
  this._lyricNext = card.querySelector('.player-lyrics-next')
  this._coverEl = card.querySelector('.player-cover')
  this._titleEl = card.querySelector('.player-title')
  this._artistEl = card.querySelector('.player-artist')
  this._playBtn = card.querySelector('.player-ctrl-play')

  // 播放器控件事件
  card.querySelector('[data-action="prev"]').addEventListener('click', function () {
    self._player.prev(function (id) { return netease.getSongUrl(id) })
  })
  card.querySelector('[data-action="toggle"]').addEventListener('click', function () {
    self._togglePlay()
  })
  card.querySelector('[data-action="next"]').addEventListener('click', function () {
    self._player.next(function (id) { return netease.getSongUrl(id) })
  })

  var volumeSlider = card.querySelector('.player-volume-slider')
  volumeSlider.addEventListener('input', function () {
    self._player.volume(this.value / 100)
  })

  card.querySelector('.player-card-close').addEventListener('click', function () {
    self._player.stop()
  })

  // 搜索面板
  var panel = document.createElement('div')
  panel.className = 'music-panel'
  panel.innerHTML =
    '<div class="music-panel-tabs">' +
      '<button class="music-tab active" data-tab="search">搜索</button>' +
      '<button class="music-tab" data-tab="playlist">列表</button>' +
      '<button class="music-tab" data-tab="user">歌单</button>' +
    '</div>' +
    '<div class="music-panel-header">' +
      '<input type="text" class="music-search-field" placeholder="搜歌名或歌手...">' +
      '<button class="music-panel-close">✕</button>' +
    '</div>' +
    '<div class="music-results"></div>' +
    '<div class="music-playlist" style="display:none"></div>' +
    '<div class="music-user-area" style="display:none"></div>'
  document.body.appendChild(this._panel = panel)

  this._results = panel.querySelector('.music-results')
  this._playlistEl = panel.querySelector('.music-playlist')
  this._userArea = panel.querySelector('.music-user-area')
  var field = panel.querySelector('.music-search-field')
  var closeBtn = panel.querySelector('.music-panel-close')

  field.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') self._search(this.value)
  })
  closeBtn.addEventListener('click', function () { self._hidePanel() })

  // 标签切换
  var tabs = panel.querySelectorAll('.music-tab')
  var headerEl = panel.querySelector('.music-panel-header')
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function () {
      var tab = this.dataset.tab
      for (var j = 0; j < tabs.length; j++) { tabs[j].classList.remove('active') }
      this.classList.add('active')
      self._results.style.display = tab === 'search' ? '' : 'none'
      self._playlistEl.style.display = tab === 'playlist' ? '' : 'none'
      self._userArea.style.display = tab === 'user' ? '' : 'none'
      headerEl.style.display = tab === 'user' ? 'none' : ''
      if (tab === 'playlist') self._renderPlaylist()
      if (tab === 'user') self._showUserArea()
    })
  }

  // 播放器状态
  this._player._onStateChange = function (state) {
    self._updatePlayerCard(state)
  }
}

// ---- 播放器卡片 ----

MusicUI.prototype._updatePlayerCard = function (state) {
  if (state.playing && state.song) {
    this._playerCard.classList.add('visible')
    document.body.classList.add('music-active')
    this._playBtn.textContent = '⏸'
    this._titleEl.textContent = state.song.name
    this._artistEl.textContent = state.song.artist
    this._coverEl.src = state.song.cover || ''
    this._startLyrics(state.song.id)
    if (this._expressionState) {
      this._expressionState.set('music')
    }
  } else if (state.song) {
    this._playerCard.classList.add('visible')
    document.body.classList.add('music-active')
    this._playBtn.textContent = '▶'
    this._titleEl.textContent = state.song.name
    this._artistEl.textContent = state.song.artist
    this._stopLyrics()
    if (this._expressionState) {
      this._expressionState.set('idle')
    }
  } else {
    this._playerCard.classList.remove('visible')
    document.body.classList.remove('music-active')
    this._stopLyrics()
    if (this._expressionState) {
      this._expressionState.set('idle')
    }
  }
}

MusicUI.prototype._togglePlay = function () {
  if (this._player._isPlaying) {
    this._player.pause()
  } else {
    this._player.play()
    if (this._expressionState) this._expressionState.set('music')
  }
}

// ---- 歌词 ----

MusicUI.prototype._startLyrics = async function (songId) {
  this._stopLyrics()
  try {
    var data = await netease.getLyric(songId)
    var lrc = (data.lrc && data.lrc.lyric) || ''
    this._lyricData = this._parseLrc(lrc)
    this._lyricCurr.textContent = ''
    this._lyricPrev.textContent = ''
    this._lyricNext.textContent = ''
    this._tickLyrics()
    var self = this
    this._lyricTimer = setInterval(function () { self._tickLyrics() }, 300)
  } catch (e) {
    this._lyricCurr.textContent = ''
    this._lyricPrev.textContent = ''
    this._lyricNext.textContent = ''
  }
}

MusicUI.prototype._stopLyrics = function () {
  clearInterval(this._lyricTimer)
  this._lyricTimer = null
  this._lyricData = null
  this._lyricCurr.textContent = ''
  this._lyricPrev.textContent = ''
  this._lyricNext.textContent = ''
}

MusicUI.prototype._parseLrc = function (lrc) {
  var lines = []
  var re = /\[(\d+):(\d+(?:\.\d+)?)\](.*)/g
  var match
  while ((match = re.exec(lrc)) !== null) {
    var min = parseInt(match[1], 10)
    var sec = parseFloat(match[2])
    lines.push({ time: min * 60 + sec, text: match[3].trim() })
  }
  return lines
}

MusicUI.prototype._tickLyrics = function () {
  if (!this._lyricData || !this._lyricData.length) return
  var pos = this._player.seek()
  var currIdx = -1
  for (var i = this._lyricData.length - 1; i >= 0; i--) {
    if (pos >= this._lyricData[i].time) { currIdx = i; break }
  }
  var prev = currIdx > 0 ? this._lyricData[currIdx - 1].text : ''
  var curr = currIdx >= 0 ? this._lyricData[currIdx].text : ''
  var next = currIdx >= 0 && currIdx < this._lyricData.length - 1 ? this._lyricData[currIdx + 1].text : ''
  if (this._lyricPrev.textContent !== prev) this._lyricPrev.textContent = prev
  if (this._lyricCurr.textContent !== curr) this._lyricCurr.textContent = curr
  if (this._lyricNext.textContent !== next) this._lyricNext.textContent = next
}

// ---- 搜索面板 ----

MusicUI.prototype._togglePanel = function () {
  this._panel.classList.contains('visible') ? this._hidePanel() : this._showPanel()
}

MusicUI.prototype._showPanel = function () {
  this._panel.classList.add('visible')
  var field = this._panel.querySelector('.music-search-field')
  field.value = ''
  setTimeout(function () { field.focus() }, 100)
  this._results.style.display = ''
  this._playlistEl.style.display = 'none'
  this._userArea.style.display = 'none'
  this._panel.querySelector('.music-panel-header').style.display = ''
  var tabs = this._panel.querySelectorAll('.music-tab')
  tabs[0].classList.add('active')
  tabs[1].classList.remove('active')
  tabs[2].classList.remove('active')
}

MusicUI.prototype._hidePanel = function () {
  this._panel.classList.remove('visible')
}

MusicUI.prototype._search = async function (keywords) {
  if (!keywords.trim()) return
  this._results.innerHTML = '<div class="music-loading">搜索中...</div>'

  try {
    var data = await netease.search(keywords)
    var songs = (data.result && data.result.songs) || []
    this._renderResults(songs)
  } catch (e) {
    this._results.innerHTML = '<div class="music-loading">搜索失败，确认网易云 API 已启动</div>'
  }
}

MusicUI.prototype._renderResults = function (songs) {
  var self = this
  if (!songs.length) {
    this._results.innerHTML = '<div class="music-loading">没有找到歌曲</div>'
    return
  }

  var html = ''
  for (var i = 0; i < Math.min(songs.length, 20); i++) {
    var s = songs[i]
    var artists = s.artists || s.ar || []
    var artistName = artists.map(function (a) { return a.name }).join('/')
    html +=
      '<div class="music-result-item" data-id="' + s.id + '">' +
        '<span class="music-result-name">' + s.name + '</span>' +
        '<span class="music-result-artist">' + artistName + '</span>' +
        '<button class="music-result-add">+</button>' +
      '</div>'
  }
  this._results.innerHTML = html

  var items = this._results.querySelectorAll('.music-result-item')
  for (var j = 0; j < items.length; j++) {
    ;(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.classList.contains('music-result-add')) return
        self._addAndPlay({
          id: item.dataset.id,
          name: item.querySelector('.music-result-name').textContent,
          artist: item.querySelector('.music-result-artist').textContent,
          cover: '',
        })
      })
      item.querySelector('.music-result-add').addEventListener('click', function (e) {
        e.stopPropagation()
        var song = {
          id: item.dataset.id,
          name: item.querySelector('.music-result-name').textContent,
          artist: item.querySelector('.music-result-artist').textContent,
          cover: '',
        }
        self._player.addToPlaylist(song)
        self._chatUI.showBubble('已加入列表：' + song.name + ' [happy]', 2000)
      })
    })(items[j])
  }
}

// ---- 播放列表 ----

MusicUI.prototype._renderPlaylist = function () {
  var playlist = this._player.getPlaylist()
  var self = this
  if (!playlist.length) {
    this._playlistEl.innerHTML = '<div class="music-loading">列表为空，去搜索添加吧</div>'
    return
  }

  var html = ''
  for (var i = 0; i < playlist.length; i++) {
    var s = playlist[i]
    var active = i === this._player._index ? ' playing' : ''
    html +=
      '<div class="music-playlist-item' + active + '" data-index="' + i + '">' +
        '<span class="music-playlist-idx">' + (i + 1) + '</span>' +
        '<span class="music-playlist-name">' + s.name + '</span>' +
        '<span class="music-playlist-artist">' + s.artist + '</span>' +
        '<button class="music-playlist-remove">✕</button>' +
      '</div>'
  }
  this._playlistEl.innerHTML = html

  var items = this._playlistEl.querySelectorAll('.music-playlist-item')
  for (var j = 0; j < items.length; j++) {
    ;(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.classList.contains('music-playlist-remove')) return
        self._player.playIndex(parseInt(item.dataset.index), function (id) { return netease.getSongUrl(id) })
        self._hidePanel()
      })
      item.querySelector('.music-playlist-remove').addEventListener('click', function (e) {
        e.stopPropagation()
        self._player.removeFromPlaylist(parseInt(item.dataset.index))
        self._renderPlaylist()
      })
    })(items[j])
  }
}

// ---- 播放 ----

MusicUI.prototype._addAndPlay = async function (song) {
  try {
    // 获取封面
    var detail = await netease.getSongDetail(song.id)
    var s = detail.songs && detail.songs[0]
    if (s && s.al && s.al.picUrl) {
      song.cover = s.al.picUrl + '?param=120y120'
    }

    this._player.addToPlaylist(song)
    // 找到索引并播放
    var list = this._player.getPlaylist()
    var idx = list.length - 1
    var ok = await this._player.playIndex(idx, function (id) { return netease.getSongUrl(id) })
    if (ok) {
      this._hidePanel()
      this._chatUI.showBubble('🎶 ' + song.name + ' [music]', 2500)
    } else {
      this._chatUI.showBubble('这首歌没有版权... [confused]', 3000)
    }
  } catch (e) {
    this._chatUI.showBubble('播放失败了... [confused]', 3000)
  }
}

// ---- 用户歌单 & 登录 ----

MusicUI.prototype._showUserArea = function () {
  var self = this
  if (netease.isLoggedIn()) {
    this._renderUserPlaylists()
  } else {
    this._renderLogin()
  }
}

MusicUI.prototype._renderLogin = function () {
  var self = this
  this._userArea.innerHTML =
    '<div class="music-login">' +
      '<div class="music-login-title">网易云扫码登录</div>' +
      '<div class="music-login-qr-wrap">' +
        '<div class="music-login-loading">获取二维码中...</div>' +
      '</div>' +
      '<div class="music-login-tip">打开网易云音乐 APP 扫描二维码</div>' +
      '<button class="music-login-refresh">刷新二维码</button>' +
    '</div>'

  this._userArea.querySelector('.music-login-refresh').addEventListener('click', function () {
    self._doQrLogin()
  })

  this._doQrLogin()
}

MusicUI.prototype._doQrLogin = async function () {
  var self = this
  var qrWrap = this._userArea.querySelector('.music-login-qr-wrap')
  if (!qrWrap) return

  try {
    var keyRes = await netease.loginQrKey()
    var key = keyRes.data && keyRes.data.unikey
    if (!key) {
      qrWrap.innerHTML = '<div class="music-login-loading">获取二维码失败</div>'
      return
    }

    var qrRes = await netease.loginQrCreate(key)
    var qrimg = qrRes.data && qrRes.data.qrimg
    if (!qrimg) {
      qrWrap.innerHTML = '<div class="music-login-loading">生成二维码失败</div>'
      return
    }

    qrWrap.innerHTML = '<img class="music-login-qr" src="' + qrimg + '" alt="QR">'
    self._pollQrLogin(key)
  } catch (e) {
    qrWrap.innerHTML = '<div class="music-login-loading">连接失败，确认网易云 API 已启动</div>'
  }
}

MusicUI.prototype._pollQrLogin = async function (key) {
  var self = this
  var tip = this._userArea.querySelector('.music-login-tip')
  var statusEl = this._userArea.querySelector('.music-login-status')

  for (var i = 0; i < 120; i++) {
    try {
      var res = await netease.loginQrCheck(key)
      var code = res.code
      if (code === 800) {
        // 等待扫码
        await sleep(2000)
      } else if (code === 801) {
        if (tip) tip.textContent = '已扫描，请在手机上确认登录'
        await sleep(1500)
      } else if (code === 803) {
        if (tip) tip.textContent = '登录成功！'
        if (statusEl) statusEl.textContent = '✅ 已登录'
        setTimeout(function () { self._renderUserPlaylists() }, 600)
        return
      } else if (code === 802) {
        if (tip) tip.textContent = '二维码已过期，点击刷新'
        return
      } else {
        await sleep(2000)
      }
    } catch (e) {
      await sleep(2000)
    }
  }
  if (tip) tip.textContent = '二维码已过期，点击刷新'
}

MusicUI.prototype._renderUserPlaylists = async function () {
  var self = this
  this._userArea.innerHTML = '<div class="music-loading">加载歌单中...</div>'

  try {
    var status = await netease.loginStatus()
    var profile = (status.data && status.data.profile) || {}
    var uid = profile.userId

    if (!uid) {
      // 尝试刷新登录
      var refreshRes = await netease.loginRefresh()
      if (refreshRes.code !== 200) {
        this._userArea.innerHTML =
          '<div class="music-login">' +
            '<div class="music-login-tip" style="margin-bottom:12px">登录已过期，请重新扫码</div>' +
            '<button class="music-login-refresh">重新登录</button>' +
          '</div>'
        this._userArea.querySelector('.music-login-refresh').addEventListener('click', function () {
          self._renderLogin()
        })
        return
      }
      // 刷新成功，重试
      status = await netease.loginStatus()
      profile = (status.data && status.data.profile) || {}
      uid = profile.userId
    }

    var data = await netease.userPlaylist(uid)
    var playlists = (data.playlist) || []

    var html = '<div class="music-user-header">' +
      '<span class="music-user-nickname">' + (profile.nickname || '用户') + ' 的歌单</span>' +
      '<button class="music-user-logout">退出登录</button>' +
      '</div>' +
      '<div class="music-user-playlists">'

    for (var i = 0; i < playlists.length; i++) {
      var pl = playlists[i]
      var cover = (pl.coverImgUrl || '') + '?param=80y80'
      html +=
        '<div class="music-user-pl-item" data-id="' + pl.id + '">' +
          '<img class="music-user-pl-cover" src="' + cover + '" alt="">' +
          '<div class="music-user-pl-info">' +
            '<div class="music-user-pl-name">' + pl.name + '</div>' +
            '<div class="music-user-pl-count">' + (pl.trackCount || 0) + ' 首</div>' +
          '</div>' +
        '</div>'
    }
    html += '</div>'

    this._userArea.innerHTML = html

    // 退出登录
    this._userArea.querySelector('.music-user-logout').addEventListener('click', function () {
      netease.saveCookie('')
      self._renderLogin()
    })

    // 点击歌单
    var items = this._userArea.querySelectorAll('.music-user-pl-item')
    for (var j = 0; j < items.length; j++) {
      ;(function (item) {
        item.addEventListener('click', function () {
          self._loadPlaylistSongs(item.dataset.id, item.querySelector('.music-user-pl-name').textContent)
        })
      })(items[j])
    }
  } catch (e) {
    this._userArea.innerHTML = '<div class="music-loading">加载失败，请重试</div>'
  }
}

MusicUI.prototype._loadPlaylistSongs = async function (playlistId, playlistName) {
  var self = this
  this._userArea.innerHTML = '<div class="music-loading">加载歌曲中...</div>'

  try {
    var data = await netease.playlistTrackAll(playlistId)
    var tracks = (data.songs) || []

    var html = '<div class="music-user-header">' +
      '<button class="music-user-back">← 返回</button>' +
      '<span class="music-user-pl-title">' + playlistName + '</span>' +
      '</div>' +
      '<div class="music-user-songs">'

    for (var i = 0; i < tracks.length; i++) {
      var t = tracks[i]
      var artists = t.ar || []
      var artistName = artists.map(function (a) { return a.name }).join('/')
      var cover = ''
      if (t.al && t.al.picUrl) cover = t.al.picUrl + '?param=40y40'
      html +=
        '<div class="music-user-song-item" data-id="' + t.id + '">' +
          (cover ? '<img class="music-user-song-cover" src="' + cover + '" alt="">' : '') +
          '<span class="music-user-song-name">' + t.name + '</span>' +
          '<span class="music-user-song-artist">' + artistName + '</span>' +
          '<button class="music-user-song-add">+</button>' +
        '</div>'
    }
    html += '</div>'

    this._userArea.innerHTML = html

    // 返回按钮
    this._userArea.querySelector('.music-user-back').addEventListener('click', function () {
      self._renderUserPlaylists()
    })

    // 预构建所有歌曲数据，供整单循环播放
    var allSongs = []
    for (var k = 0; k < tracks.length; k++) {
      var tk = tracks[k]
      var ta = tk.ar || []
      var taName = ta.map(function (a) { return a.name }).join('/')
      var tc = ''
      if (tk.al && tk.al.picUrl) tc = tk.al.picUrl + '?param=120y120'
      allSongs.push({
        id: tk.id,
        name: tk.name,
        artist: taName,
        cover: tc,
      })
    }

    // 点击歌曲: 整张歌单加入队列并循环播放
    var items = this._userArea.querySelectorAll('.music-user-song-item')
    for (var j = 0; j < items.length; j++) {
      ;(function (item, songIdx) {
        item.addEventListener('click', function (e) {
          if (e.target.classList.contains('music-user-song-add')) return
          self._playAllSongs(allSongs, songIdx)
        })
        item.querySelector('.music-user-song-add').addEventListener('click', function (e) {
          e.stopPropagation()
          self._player.addToPlaylist(allSongs[songIdx])
          self._chatUI.showBubble('已加入列表：' + allSongs[songIdx].name + ' [happy]', 2000)
        })
      })(items[j], j)
    }
  } catch (e) {
    this._userArea.innerHTML = '<div class="music-loading">加载失败，请重试</div>'
  }
}

// ---- 整单循环播放 ----

MusicUI.prototype._playAllSongs = async function (songs, startIdx) {
  var self = this
  this._player.stop()

  // 清空队列并加入全部歌曲
  this._player._playlist = []
  this._player._index = -1
  for (var i = 0; i < songs.length; i++) {
    this._player.addToPlaylist(songs[i])
  }

  var ok = await this._player.playIndex(startIdx, function (id) { return netease.getSongUrl(id) })
  if (ok) {
    this._hidePanel()
    this._chatUI.showBubble('🎶 ' + songs[startIdx].name + ' [music]', 2500)
  } else {
    this._chatUI.showBubble('这首歌没有版权... [confused]', 3000)
  }
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms) })
}

module.exports = { MusicUI }
