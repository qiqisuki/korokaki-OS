const http = require('http')
const fs = require('fs')
const path = require('path')

const BASE = 'http://localhost:3000'
const COOKIE_FILE = path.join(__dirname, '..', '..', 'assets', 'music-cookie.json')

var cookie = ''

// 加载持久化 cookie
try {
  var saved = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'))
  cookie = saved.cookie || ''
} catch (e) {}

function saveCookie(c) {
  cookie = c
  try {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify({ cookie: c }), 'utf-8')
  } catch (e) {}
}

function parseCookies(str) {
  var obj = {}
  if (!str) return obj
  str.split(';').forEach(function (pair) {
    var parts = pair.trim().split('=')
    if (parts.length >= 2) obj[parts[0]] = parts.slice(1).join('=')
  })
  return obj
}

function mergeAndSave(existingCookie, setCookieHeaders) {
  var existing = parseCookies(existingCookie)
  if (!setCookieHeaders) return
  var newPairs = setCookieHeaders.map(function (c) { return c.split(';')[0] }).join('; ')
  var incoming = parseCookies(newPairs)
  Object.keys(incoming).forEach(function (k) { existing[k] = incoming[k] })
  var merged = Object.keys(existing).map(function (k) { return k + '=' + existing[k] }).join('; ')
  saveCookie(merged)
}

function jsonRequest(urlPath) {
  return new Promise(function (resolve, reject) {
    var headers = {}
    if (cookie) headers.Cookie = cookie

    var url = BASE + urlPath
    http.get(url, { headers: headers }, function (res) {
      var data = ''
      res.on('data', function (chunk) { data += chunk })
      res.on('end', function () {
        mergeAndSave(cookie, res.headers['set-cookie'])
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

// ---- 基础 API ----

module.exports = {
  search: function (keywords) {
    return jsonRequest('/search?keywords=' + encodeURIComponent(keywords))
  },
  getSongUrl: function (id) {
    return jsonRequest('/song/url?id=' + id)
  },
  getLyric: function (id) {
    return jsonRequest('/lyric?id=' + id)
  },
  getSongDetail: function (ids) {
    return jsonRequest('/song/detail?ids=' + ids)
  },

  // ---- 登录 ----

  /** 获取二维码 key */
  loginQrKey: function () {
    return jsonRequest('/login/qr/key?timerstamp=' + Date.now())
  },

  /** 生成二维码 (返回 base64 图片) */
  loginQrCreate: function (key) {
    return jsonRequest('/login/qr/create?key=' + encodeURIComponent(key) + '&qrimg=true&timerstamp=' + Date.now())
  },

  /** 轮询扫码状态: 800=等待扫码, 801=等待确认, 803=登录成功 */
  loginQrCheck: function (key) {
    return jsonRequest('/login/qr/check?key=' + encodeURIComponent(key) + '&timerstamp=' + Date.now())
  },

  /** 获取当前登录状态 */
  loginStatus: function () {
    return jsonRequest('/login/status?timerstamp=' + Date.now())
  },

  /** 刷新登录 */
  loginRefresh: function () {
    return jsonRequest('/login/refresh?timerstamp=' + Date.now())
  },

  /** 获取 cookie (供 UI 判断登录状态) */
  getCookie: function () { return cookie },
  isLoggedIn: function () { return !!cookie },
  saveCookie: function (c) { saveCookie(c) },

  // ---- 用户歌单 ----

  /** 获取用户歌单列表 */
  userPlaylist: function (uid) {
    return jsonRequest('/user/playlist?uid=' + uid + '&timerstamp=' + Date.now())
  },

  /** 获取歌单详情 (包含歌曲列表) */
  playlistDetail: function (id) {
    return jsonRequest('/playlist/detail?id=' + id + '&timerstamp=' + Date.now())
  },

  /** 获取歌单全部歌曲 */
  playlistTrackAll: function (id) {
    return jsonRequest('/playlist/track/all?id=' + id + '&timerstamp=' + Date.now())
  },
}
