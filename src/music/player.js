const { Howl } = require('howler')

function Player() {
  this._howl = null
  this._current = null
  this._playlist = []
  this._index = -1
  this._isPlaying = false
  this._onStateChange = null
  this._errorCount = 0
}

Player.prototype.addToPlaylist = function (song) {
  // 避免重复
  for (var i = 0; i < this._playlist.length; i++) {
    if (this._playlist[i].id === song.id) return
  }
  this._playlist.push(song)
}

Player.prototype.removeFromPlaylist = function (index) {
  if (index < this._index) this._index--
  else if (index === this._index) {
    this.stop()
    this._playlist.splice(index, 1)
    this._index = -1
    return
  }
  this._playlist.splice(index, 1)
}

Player.prototype.getPlaylist = function () {
  return this._playlist
}

Player.prototype.playIndex = async function (index, getUrl) {
  if (index < 0 || index >= this._playlist.length) return false
  var song = this._playlist[index]

  try {
    var urlData = await getUrl(song.id)
    var url = urlData.data && urlData.data[0] && urlData.data[0].url
    if (!url) return false

    this.stop()
    this._index = index
    this._current = song
    var self = this
    this._howl = new Howl({
      src: [url],
      html5: true,
      format: ['mp3'],
      onend: function () { self.next(getUrl) },
      onloaderror: function () { self._skipError(getUrl) },
    })
    this._howl.play()
    this._isPlaying = true
    this._errorCount = 0
    this._emit()
    return true
  } catch (e) {
    return false
  }
}

Player.prototype._skipError = async function (getUrl) {
  this._isPlaying = false
  this._emit()
  this._errorCount++
  // 最多尝试整张列表的长度次，避免无限循环
  if (this._errorCount > this._playlist.length) {
    this._current = null
    this._errorCount = 0
    this._emit()
    return
  }
  await this.next(getUrl)
}

Player.prototype.next = async function (getUrl) {
  if (this._playlist.length === 0) return
  // 列表末尾则循环到开头
  var nextIdx = this._index + 1
  if (nextIdx >= this._playlist.length) nextIdx = 0
  var ok = await this.playIndex(nextIdx, getUrl)
  // 当前这首加载失败则继续尝试下一首
  if (!ok && nextIdx < this._playlist.length - 1) {
    this._index = nextIdx
    await this.next(getUrl)
  }
}

Player.prototype.prev = async function (getUrl) {
  if (this._playlist.length === 0) return
  var prevIdx = this._index <= 0 ? this._playlist.length - 1 : this._index - 1
  await this.playIndex(prevIdx, getUrl)
}

Player.prototype.play = function () {
  if (this._howl) { this._howl.play(); this._isPlaying = true; this._emit() }
}

Player.prototype.pause = function () {
  if (this._howl) { this._howl.pause(); this._isPlaying = false; this._emit() }
}

Player.prototype.toggle = function () {
  this._isPlaying ? this.pause() : this.play()
}

Player.prototype.stop = function () {
  if (this._howl) { this._howl.unload(); this._howl = null }
  this._isPlaying = false
  this._current = null
  this._emit()
}

Player.prototype.volume = function (v) {
  if (v !== undefined && this._howl) { this._howl.volume(v) }
  return this._howl ? this._howl.volume() : 0.7
}

Player.prototype.seek = function () {
  return this._howl ? this._howl.seek() : 0
}

Player.prototype.duration = function () {
  return this._howl ? this._howl.duration() : 0
}

Player.prototype._emit = function () {
  if (this._onStateChange) {
    this._onStateChange({
      playing: this._isPlaying,
      song: this._current,
      index: this._index,
      playlist: this._playlist,
    })
  }
}

module.exports = { Player }
