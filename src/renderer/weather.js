const http = require('http')
const state = require('./state')
const store = require('../shared/settings-store')

var WEATHER_CODE = {
  0:  { icon: '☀️', text: '晴' },
  1:  { icon: '🌤️', text: '少云' },
  2:  { icon: '⛅', text: '多云' },
  3:  { icon: '☁️', text: '阴' },
  45: { icon: '🌫️', text: '雾' },
  48: { icon: '🌫️', text: '雾凇' },
  51: { icon: '🌦️', text: '小雨' },
  53: { icon: '🌦️', text: '小雨' },
  55: { icon: '🌧️', text: '中雨' },
  61: { icon: '🌧️', text: '雨' },
  63: { icon: '🌧️', text: '大雨' },
  65: { icon: '🌧️', text: '暴雨' },
  71: { icon: '🌨️', text: '小雪' },
  73: { icon: '🌨️', text: '中雪' },
  75: { icon: '❄️', text: '大雪' },
  80: { icon: '🌧️', text: '阵雨' },
  95: { icon: '⛈️', text: '雷暴' },
}

function WeatherWidget(chatUI) {
  this._chatUI = chatUI
  this._el = null
  this._temp = null
  this._icon = null
  this._greeting = null
  this._init()
  this._fetch()
}

WeatherWidget.prototype._init = function () {
  var el = document.createElement('div')
  el.className = 'weather-widget'
  el.innerHTML =
    '<div class="weather-main">' +
      '<span class="weather-icon"></span>' +
      '<span class="weather-temp"></span>' +
    '</div>' +
    '<div class="weather-greeting"></div>'
  document.body.appendChild(this._el = el)

  this._icon = el.querySelector('.weather-icon')
  this._temp = el.querySelector('.weather-temp')
  this._greeting = el.querySelector('.weather-greeting')

  var self = this
  el.addEventListener('click', function () { self._refresh() })
}

WeatherWidget.prototype._fetch = function () {
  var self = this
  var city = store.get('city') || { lat: 39.9042, lon: 116.4074 }
  var path = '/v1/forecast?latitude=' + city.lat + '&longitude=' + city.lon +
    '&current=temperature_2m,weather_code&timezone=auto'

  var req = http.get({
    hostname: 'api.open-meteo.com',
    path: path,
    headers: { 'User-Agent': 'desktop-mascot' },
  }, function (res) {
    var data = ''
    res.on('data', function (c) { data += c })
    res.on('end', function () {
      try {
        var json = JSON.parse(data)
        var temp = Math.round(json.current.temperature_2m)
        var code = json.current.weather_code
        var w = WEATHER_CODE[code] || { icon: '🌡️', text: '未知' }
        self._update(temp, w)
      } catch (e) {}
    })
  })
  req.on('error', function () {})
  req.end()

  // 每 10 分钟刷新
  setTimeout(function () { self._fetch() }, 10 * 60 * 1000)
}

WeatherWidget.prototype._refresh = function () {
  this._icon.textContent = '⏳'
  this._fetch()
}

WeatherWidget.prototype._update = function (temp, w) {
  this._icon.textContent = w.icon
  this._temp.textContent = temp + '°C'
  this._greeting.textContent = this._weatherGreeting(temp, w.text)
  state.weather = { temp: temp, icon: w.icon, text: w.text }

  // 启动时显示天气问候（只显示一次）
  if (!this._greeted) {
    this._greeted = true
    var self = this
    setTimeout(function () {
      self._chatUI.showBubble(self._greeting.textContent + ' [idle]', 4000)
    }, 6000)
  }
}

WeatherWidget.prototype._weatherGreeting = function (temp, text) {
  if (text === '晴' && temp >= 25) return '大晴天，适合出去走走～'
  if (text === '晴' && temp < 10)  return '晴天但冷，多穿点别感冒'
  if (text.indexOf('雨') >= 0)     return '下雨了，记得带伞出门'
  if (text.indexOf('雪') >= 0)     return '下雪啦！穿厚点，路滑小心'
  if (text.indexOf('雷') >= 0)     return '打雷了，别出门乖乖待着'
  if (text.indexOf('雾') >= 0)     return '雾天能见度低，注意安全'
  if (text.indexOf('云') >= 0 || text.indexOf('阴') >= 0) return '阴天，心情也要好好的'
  if (temp >= 35) return '好热！记得开空调多喝水'
  if (temp <= 0)  return '零下了，秋裤秋衣安排上'
  return '天气还不错～'
}

module.exports = { WeatherWidget }
