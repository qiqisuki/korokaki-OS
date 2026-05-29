// 用 Web Audio API 合成音效，不依赖外部文件
var ctx = null

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  return ctx
}

function tone(freq, duration, type, vol, delay) {
  var c = getCtx()
  var t = c.currentTime + (delay || 0)
  var osc = c.createOscillator()
  var gain = c.createGain()
  osc.type = type || 'sine'
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(vol || 0.15, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(t)
  osc.stop(t + duration)
}

module.exports = {
  // 气泡弹出 — 轻快上扬
  bubble: function () {
    tone(880, 0.10, 'sine', 0.10, 0)
    tone(1100, 0.12, 'sine', 0.08, 0.06)
    tone(1320, 0.15, 'sine', 0.06, 0.10)
  },

  // 戳姐姐 — 俏皮短促
  pat: function () {
    tone(600, 0.06, 'square', 0.06, 0)
    tone(900, 0.08, 'square', 0.05, 0.04)
  },

  // 番茄钟到点 — 温和提醒
  pomodoro: function () {
    tone(660, 0.15, 'triangle', 0.12, 0)
    tone(880, 0.15, 'triangle', 0.12, 0.15)
    tone(1100, 0.20, 'triangle', 0.10, 0.30)
    tone(880, 0.15, 'triangle', 0.12, 0.50)
    tone(660, 0.15, 'triangle', 0.12, 0.65)
  },

  // 提醒 — 叮咚
  remind: function () {
    tone(1000, 0.12, 'sine', 0.10, 0)
    tone(1200, 0.15, 'sine', 0.08, 0.10)
    tone(1400, 0.10, 'sine', 0.06, 0.20)
  },

  // 开机 — 温暖三和弦
  startup: function () {
    tone(523, 0.4, 'sine', 0.10, 0)
    tone(659, 0.4, 'sine', 0.08, 0.10)
    tone(784, 0.5, 'sine', 0.07, 0.20)
  },

  // 启动画面 — 温暖旋律
  splashBg: function () {
    var notes = [
      { f: 523, d: 0.30, v: 0.22, t: 0 },
      { f: 659, d: 0.28, v: 0.19, t: 0.25 },
      { f: 784, d: 0.30, v: 0.22, t: 0.50 },
      { f: 659, d: 0.25, v: 0.16, t: 0.80 },
      { f: 880, d: 0.35, v: 0.25, t: 1.0 },
      { f: 784, d: 0.30, v: 0.19, t: 1.35 },
      { f: 1047, d: 0.45, v: 0.25, t: 1.6 },
      { f: 784, d: 0.50, v: 0.19, t: 2.1 },
      { f: 659, d: 0.40, v: 0.16, t: 2.5 },
      { f: 523, d: 0.60, v: 0.22, t: 2.85 },
    ]
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i]
      tone(n.f, n.d, 'sine', n.v, n.t)
    }
  },

  // 启动画面 — 暗系哥特 (精简)
  splashDark: function () {
    var t = 0
    tone(87, 3.5, 'sine', 0.10, t)
    tone(87, 3.5, 'triangle', 0.06, t + 0.05)

    var melody = [
      { f: 523, d: 0.35, v: 0.16 },
      { f: 494, d: 0.25, v: 0.14 },
      { f: 440, d: 0.40, v: 0.15 },
      { f: 370, d: 0.45, v: 0.16 },
      { f: 440, d: 0.25, v: 0.13 },
      { f: 494, d: 0.35, v: 0.15 },
      { f: 523, d: 0.55, v: 0.18 },
      { f: 440, d: 0.30, v: 0.14 },
      { f: 349, d: 0.50, v: 0.16 },
      { f: 523, d: 0.80, v: 0.18 },
    ]
    for (var i = 0; i < melody.length; i++) {
      var n = melody[i]
      tone(n.f, n.d, 'sine', n.v, t)
      tone(n.f / 2, n.d, 'triangle', n.v * 0.5, t + 0.03)
      tone(n.f * 1.5, n.d * 0.2, 'sine', n.v * 0.18, t + 0.05)
      t += n.d * 0.6
    }
  },

  // 音乐播放 — 轻快音符
  music: function () {
    tone(440, 0.10, 'triangle', 0.08, 0)
    tone(554, 0.10, 'triangle', 0.08, 0.08)
    tone(660, 0.12, 'triangle', 0.08, 0.16)
    tone(880, 0.15, 'triangle', 0.06, 0.24)
  },

  // 敲门 — 低沉短促×3
  knock: function () {
    for (var i = 0; i < 3; i++) {
      tone(180, 0.08, 'square', 0.12, i * 0.25)
      tone(150, 0.10, 'square', 0.10, i * 0.25 + 0.02)
    }
  },
}
