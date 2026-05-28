const store = require('../shared/settings-store')

function TTSSpeaker() {
  this._enabled = store.get('ttsEnabled') !== false   // 默认开启
  this._speed = store.get('ttsSpeed') || 1.0
  this._current = null
}

TTSSpeaker.prototype.setEnabled = function (val) {
  this._enabled = val
}

TTSSpeaker.prototype.setSpeed = function (val) {
  this._speed = val
}

TTSSpeaker.prototype.speak = function (text) {
  if (!this._enabled) return
  if (!text || !text.trim()) return

  // 去除表情标记 [xxx]
  var clean = text.replace(/\[[^\]]+\]/g, '').trim()
  if (!clean) return

  var self = this

  // 打断当前播放
  this.stop()

  var url = 'http://127.0.0.1:9880/tts?text=' + encodeURIComponent(clean) + '&speed=' + this._speed

  fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('TTS server returned ' + res.status)
      return res.blob()
    })
    .then(function (blob) {
      var blobUrl = URL.createObjectURL(blob)
      var Howl = require('howler').Howl
      var howl = new Howl({
        src: [blobUrl],
        format: ['wav'],
        html5: true,
        onend: function () {
          URL.revokeObjectURL(blobUrl)
          self._current = null
        },
        onloaderror: function () {
          URL.revokeObjectURL(blobUrl)
          self._current = null
        },
      })
      self._current = howl
      howl.play()
    })
    .catch(function (err) {
      // 静默降级 — TTS 服务不可用不影响聊天
      console.warn('[tts] 语音合成失败:', err.message)
    })
}

TTSSpeaker.prototype.stop = function () {
  if (this._current) {
    this._current.unload()
    this._current = null
  }
}

module.exports = { TTSSpeaker }
