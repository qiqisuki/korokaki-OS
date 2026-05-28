const { Howl } = require('howler')

function Player() {
  this._howl = null
  this._current = null
  this._playlist = []
  this._index = -1
  this._isPlaying = false
  this._onStateChange = null
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
    this._howl = new Howl({
      src: [url],
      html5: true,
      format: ['mp3'],
      onend: () => this.next(getUrl),
      onloaderror: () => { this._isPlaying = false; this._emit() },
    })
    this._howl.play()
    this._isPlaying = true
    this._emit()
    return true
  } catch (e) {
    return false
  }
}

Player.prototype.next = async function (getUrl) {
  if (this._playlist.length === 0) return
  var nextIdx = (this._index + 1) % this._playlist.length
  await this.playIndex(nextIdx, getUrl)
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
