const { ipcRenderer } = require('electron')
const store = require('../shared/settings-store')

function SettingsPanel() {
  this._btn = null
  this._panel = null
  this._visible = false
  this._init()
}

SettingsPanel.prototype._init = function () {
  var self = this

  var btn = document.createElement('div')
  btn.className = 'settings-trigger'
  btn.textContent = '⚙️'
  btn.addEventListener('click', function () { self._toggle() })
  document.body.appendChild(this._btn = btn)

  var panel = document.createElement('div')
  panel.className = 'settings-panel'
  document.body.appendChild(this._panel = panel)
}

SettingsPanel.prototype._toggle = function () {
  this._visible ? this._hide() : this._show()
}

SettingsPanel.prototype._show = function () {
  this._visible = true
  this._btn.classList.add('active')
  this._render()
  this._panel.classList.add('visible')
}

SettingsPanel.prototype._hide = function () {
  this._visible = false
  this._btn.classList.remove('active')
  this._panel.classList.remove('visible')
}

SettingsPanel.prototype._render = function () {
  var s = store.getAll()
  var self = this

  this._panel.innerHTML =
    '<div class="st-header">' +
      '<span class="st-title">⚙️ 设置</span>' +
      '<button class="st-close">✕</button>' +
    '</div>' +
    '<div class="st-body">' +
      // 城市
      '<div class="st-section">' +
        '<div class="st-section-title">🌤️ 天气城市</div>' +
        '<input type="text" class="st-input" id="stCity" value="' + (s.city && s.city.name || '北京') + '" placeholder="城市名">' +
        '<div class="st-hint">修改后天气会自动更新</div>' +
      '</div>' +
      // API Key
      '<div class="st-section">' +
        '<div class="st-section-title">🤖 DeepSeek API Key</div>' +
        '<input type="password" class="st-input" id="stApiKey" value="' + (s.apiKey || '') + '" placeholder="sk-...">' +
        '<div class="st-hint">用于 AI 聊天，获取地址：platform.deepseek.com</div>' +
      '</div>' +
      // 番茄钟
      '<div class="st-section">' +
        '<div class="st-section-title">🍅 番茄钟（分钟）</div>' +
        '<div class="st-row">' +
          '<label>专注 <input type="number" class="st-input-sm" id="stFocus" value="' + (s.pomodoro && s.pomodoro.focus || 25) + '" min="5" max="60"></label>' +
          '<label>短休 <input type="number" class="st-input-sm" id="stShort" value="' + (s.pomodoro && s.pomodoro.shortBreak || 5) + '" min="1" max="30"></label>' +
          '<label>长休 <input type="number" class="st-input-sm" id="stLong" value="' + (s.pomodoro && s.pomodoro.longBreak || 15) + '" min="5" max="60"></label>' +
        '</div>' +
      '</div>' +
      // 提醒
      '<div class="st-section">' +
        '<div class="st-section-title">⏰ 提醒间隔（分钟）</div>' +
        '<div class="st-row">' +
          '<label>喝水 <input type="number" class="st-input-sm" id="stWater" value="' + (s.reminders && s.reminders.water || 45) + '" min="10" max="120"></label>' +
          '<label>护眼 <input type="number" class="st-input-sm" id="stEye" value="' + (s.reminders && s.reminders.eye || 60) + '" min="10" max="120"></label>' +
        '</div>' +
      '</div>' +
      // 开机自启
      '<div class="st-section">' +
        '<label class="st-toggle">' +
          '<input type="checkbox" id="stAutoLaunch" ' + (s.autoLaunch ? 'checked' : '') + '>' +
          '<span>开机自动启动</span>' +
        '</label>' +
      '</div>' +
      // 透明度
      '<div class="st-section">' +
        '<div class="st-section-title">🔍 窗口透明度</div>' +
        '<div class="st-opacity-row">' +
          '<input type="range" class="st-opacity-slider" id="stOpacity" min="40" max="100" value="' + ((s.opacity || 1) * 100) + '">' +
          '<span class="st-opacity-value">' + Math.round((s.opacity || 1) * 100) + '%</span>' +
        '</div>' +
      '</div>' +
      // TTS 语音
      '<div class="st-section">' +
        '<div class="st-section-title">🔊 语音合成 (TTS)</div>' +
        '<label class="st-toggle">' +
          '<input type="checkbox" id="stTtsEnabled" ' + (s.ttsEnabled !== false ? 'checked' : '') + '>' +
          '<span>启用语音（AI 回复时说话）</span>' +
        '</label>' +
        '<div class="st-row" style="margin-top:10px">' +
          '<label>音量 <input type="range" class="st-opacity-slider" id="stTtsVolume" min="0" max="100" value="' + ((s.ttsVolume != null ? s.ttsVolume : 0.8) * 100) + '"></label>' +
          '<span class="st-opacity-value">' + Math.round((s.ttsVolume != null ? s.ttsVolume : 0.8) * 100) + '%</span>' +
        '</div>' +
        '<input type="text" class="st-input" id="stTtsModelPath" value="' + (s.ttsModelPath || '') + '" placeholder="模型路径 (默认: assets/tts/model.pth)" style="margin-top:8px">' +
        '<div class="st-hint">GPT-SoVITS 模型，需先 pip install torch flask + GPT-SoVITS</div>' +
      '</div>' +
      // 音乐音量
      '<div class="st-section">' +
        '<div class="st-section-title">🎵 音乐默认音量</div>' +
        '<div class="st-opacity-row">' +
          '<input type="range" class="st-opacity-slider" id="stMusicVolume" min="0" max="100" value="' + ((s.musicVolume != null ? s.musicVolume : 0.7) * 100) + '">' +
          '<span class="st-opacity-value">' + Math.round((s.musicVolume != null ? s.musicVolume : 0.7) * 100) + '%</span>' +
        '</div>' +
      '</div>' +
      // 保存
      '<div class="st-section">' +
        '<button class="st-save-btn">💾 保存设置</button>' +
      '</div>' +
    '</div>'

  // 透明度滑块实时预览
  var opacitySlider = this._panel.querySelector('#stOpacity')
  var opacityValue = this._panel.querySelector('.st-opacity-value')
  var self = this
  opacitySlider.addEventListener('input', function () {
    var val = parseInt(this.value) / 100
    opacityValue.textContent = Math.round(val * 100) + '%'
    ipcRenderer.send('set-opacity', val)
  })

  // TTS 音量滑块实时预览
  var ttsVolSlider = this._panel.querySelector('#stTtsVolume')
  ttsVolSlider.addEventListener('input', function () {
    var pct = this.value
    this.parentElement.nextElementSibling.textContent = pct + '%'
    self._ttsVolumePreview = parseInt(pct) / 100
  })

  // 音乐音量滑块实时预览
  var musicVolSlider = this._panel.querySelector('#stMusicVolume')
  musicVolSlider.addEventListener('input', function () {
    var pct = this.value
    this.nextElementSibling.textContent = pct + '%'
    self._musicVolumePreview = parseInt(pct) / 100
  })

  this._panel.querySelector('.st-close').addEventListener('click', function () {
    self._hide()
  })

  this._panel.querySelector('.st-save-btn').addEventListener('click', function () {
    self._save()
  })
}

SettingsPanel.prototype._save = function () {
  var cityName = this._panel.querySelector('#stCity').value.trim() || '北京'
  store.set('city', { name: cityName, lat: 39.9042, lon: 116.4074 })

  store.set('pomodoro', {
    focus: parseInt(this._panel.querySelector('#stFocus').value) || 25,
    shortBreak: parseInt(this._panel.querySelector('#stShort').value) || 5,
    longBreak: parseInt(this._panel.querySelector('#stLong').value) || 15,
  })

  store.set('reminders', {
    water: parseInt(this._panel.querySelector('#stWater').value) || 45,
    eye: parseInt(this._panel.querySelector('#stEye').value) || 60,
  })

  var autoLaunch = this._panel.querySelector('#stAutoLaunch').checked
  store.set('autoLaunch', autoLaunch)
  ipcRenderer.send('set-auto-launch', autoLaunch)

  var apiKey = this._panel.querySelector('#stApiKey').value.trim()
  if (apiKey) store.set('apiKey', apiKey)

  var opacity = parseInt(this._panel.querySelector('#stOpacity').value) / 100
  store.set('opacity', opacity)

  store.set('ttsEnabled', this._panel.querySelector('#stTtsEnabled').checked)
  store.set('ttsVolume', parseInt(this._panel.querySelector('#stTtsVolume').value) / 100)
  var ttsModelPath = this._panel.querySelector('#stTtsModelPath').value.trim()
  if (ttsModelPath) store.set('ttsModelPath', ttsModelPath)

  store.set('musicVolume', parseInt(this._panel.querySelector('#stMusicVolume').value) / 100)

  this._hide()
  // 提示需要重启生效
  var bubble = document.querySelector('.chat-bubble')
  if (bubble) {
    bubble.textContent = '设置已保存～部分修改重启后生效 [happy]'
    bubble.classList.add('visible')
    setTimeout(function () { bubble.classList.remove('visible') }, 3000)
  }
}

module.exports = { SettingsPanel }
