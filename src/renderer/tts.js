const store = require('../shared/settings-store')

function TTSSpeaker() {
  this._enabled = store.get('ttsEnabled') !== false
  this._current = null
}

TTSSpeaker.prototype.setEnabled = function (val) {
  this._enabled = val
}

TTSSpeaker.prototype.speak = function (text, onend) {
  if (!this._enabled) { if (onend) onend(); return }
  if (!text || !text.trim()) { if (onend) onend(); return }

  var clean = text.replace(/\[[^\]]+\]/g, '').trim()
  if (!clean) { if (onend) onend(); return }

  var self = this
  this.stop()

  var vol = store.get('ttsVolume')
  if (vol == null) vol = 0.8

  var url = 'http://127.0.0.1:9880/?text=' + encodeURIComponent(clean) + '&text_language=zh'

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
        volume: vol,
        onend: function () {
          URL.revokeObjectURL(blobUrl)
          self._current = null
          if (onend) onend()
        },
        onloaderror: function () {
          URL.revokeObjectURL(blobUrl)
          self._current = null
          if (onend) onend()
        },
      })
      self._current = howl
      howl.play()
    })
    .catch(function (err) {
      console.warn('[tts] 语音合成失败:', err.message)
      if (onend) setTimeout(onend, 6000)
    })
}

TTSSpeaker.prototype.stop = function () {
  if (this._current) {
    this._current.unload()
    this._current = null
  }
}

module.exports = { TTSSpeaker }
