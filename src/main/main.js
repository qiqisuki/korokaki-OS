const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen } = require('electron')
const { join } = require('path')
const os = require('os')

const ROOT = join(__dirname, '..', '..')

let splash = null
let win = null
let tray = null
let isQuitting = false
let apiServer = null
let ttsServer = null

function createTrayIcon() {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const x = i % size
    const y = Math.floor(i / size)
    const cx = 7.5, cy = 7.5, r = 6.5
    const dx = x + 0.5 - cx
    const dy = y + 0.5 - cy
    const inside = Math.sqrt(dx * dx + dy * dy) <= r
    buf[i * 4]     = 255
    buf[i * 4 + 1] = inside ? 105 : 0
    buf[i * 4 + 2] = inside ? 180 : 0
    buf[i * 4 + 3] = inside ? 255 : 0
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function createSplash() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const splashW = 520
  const splashH = 440

  splash = new BrowserWindow({
    width: splashW,
    height: splashH,
    x: Math.floor((screenW - splashW) / 2),
    y: Math.floor((screenH - splashH) / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  splash.loadFile(join(ROOT, 'src', 'renderer', 'splash.html'))

  splash.on('closed', () => {
    // 兜底：如果 splash 在发信号前被关闭，仍然启动主窗口
    if (splash) {
      splash = null
      if (!win) { createWindow(); createTray() }
    }
  })
}

function createWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
  const winW = 480
  const winH = 480

  win = new BrowserWindow({
    width: winW,
    height: winH,
    x: screenW - winW - 40,
    y: screenH - winH - 40,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  win.loadFile(join(ROOT, 'src', 'renderer', 'index.html'))
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true)

  if (app._startupOpacity) {
    win.setOpacity(app._startupOpacity)
    delete app._startupOpacity
  }

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      win.hide()
    }
  })
}

function createTray() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('会长姐姐')

  const menu = Menu.buildFromTemplate([
    { label: '显示姐姐', click: () => win?.show() },
    { label: '隐藏姐姐', click: () => win?.hide() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(menu)
  tray.on('double-click', () => win?.show())
}

ipcMain.handle('get-model-path', () => {
  return join(ROOT, 'assets', 'live2d', 'yumi', 'yumi.model3.json')
})

var splashVariant = Math.random() < 0.5 ? 0 : 1

ipcMain.handle('get-splash-image', () => {
  if (splashVariant === 1) {
    var extraPath = join(os.homedir(), 'Desktop', 'extra.jpg')
    if (require('fs').existsSync(extraPath)) return extraPath
  }
  return join(os.homedir(), 'Desktop', 'beginui.jpg')
})

ipcMain.handle('get-splash-variant', () => {
  return splashVariant
})

ipcMain.on('splash-size', (_e, size) => {
  if (!splash) return
  var sw = size.width
  var sh = size.height
  // 限制最大尺寸
  var maxW = screen.getPrimaryDisplay().workAreaSize.width * 0.75
  var maxH = screen.getPrimaryDisplay().workAreaSize.height * 0.75
  if (sw > maxW) { sh = sh * (maxW / sw); sw = maxW }
  if (sh > maxH) { sw = sw * (maxH / sh); sh = maxH }
  sw = Math.round(sw); sh = Math.round(sh)
  var scrW = screen.getPrimaryDisplay().workAreaSize.width
  var scrH = screen.getPrimaryDisplay().workAreaSize.height
  splash.setSize(sw, sh)
  splash.center()
})

ipcMain.on('set-auto-launch', (_e, enable) => {
  app.setLoginItemSettings({ openAtLogin: enable })
})

ipcMain.on('set-opacity', (_e, value) => {
  if (win) win.setOpacity(value)
})

ipcMain.on('shake-window', () => {
  if (!win) return
  var bounds = win.getBounds()
  var origX = bounds.x
  var intensity = 4
  var steps = [0, 1, -2, 3, -3, 2, -1, 0]
  var i = 0
  var timer = setInterval(function () {
    if (i >= steps.length) { clearInterval(timer); return }
    win.setPosition(origX + steps[i] * intensity, bounds.y)
    i++
  }, 30)
})

ipcMain.on('splash-done', () => {
  if (splash) { splash.close(); splash = null }
  createWindow()
  createTray()
})

function startApiServer() {
  var apiPath = join(ROOT, 'node_modules', 'NeteaseCloudMusicApi', 'app.js')
  if (!require('fs').existsSync(apiPath)) {
    // 打包后路径
    apiPath = join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'NeteaseCloudMusicApi', 'app.js')
  }
  if (!require('fs').existsSync(apiPath)) return

  // fork 在开发和打包环境都能正常工作
  apiServer = require('child_process').fork(apiPath, [], {
    silent: true,
    env: Object.assign({}, process.env, { PORT: '3000' }),
  })
  apiServer.on('error', function () { apiServer = null })
}

function startTtsServer() {
  var pythonPath = 'python'
  var fs = require('fs')

  // 使用 GPT-SoVITS 自带的 api.py
  var gptSovitsHome = process.env.GPT_SOVITS_HOME || join(os.homedir(), 'GPT-SoVITS')
  var scriptPath = join(gptSovitsHome, 'api.py')

  if (!fs.existsSync(scriptPath)) {
    console.warn('[tts] GPT-SoVITS api.py 不存在:', scriptPath)
    console.warn('[tts] 请克隆: git clone https://github.com/RVC-Boss/GPT-SoVITS.git ~/GPT-SoVITS')
    return
  }

  var settings = {}
  try {
    var settingsPath = join(ROOT, 'assets', 'settings.json')
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
  } catch (e) {}

  var modelPath = settings.ttsModelPath || join(os.homedir(), 'Desktop', 'mmk', 'mmkSS_e140_s2940.pth')
  var gptPath = settings.ttsGptPath || join(os.homedir(), 'Desktop', 'mmk', 'mmkSS-e30.ckpt')
  var refAudio = settings.ttsRefAudio || join(ROOT, 'assets', 'tts', 'ref.wav')

  var args = [
    scriptPath,
    '-s', modelPath,
    '-g', gptPath,
    '-d', 'cpu',
    '-p', '9880',
    '-a', '127.0.0.1',
  ]
  if (fs.existsSync(refAudio)) {
    args.push('-dr', refAudio, '-dt', '收到了，看，来自b站的千舰奖牌。', '-dl', 'zh')
  }

  try {
    ttsServer = require('child_process').spawn(pythonPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: gptSovitsHome,
    })
    ttsServer.stdout.on('data', function (d) {
      process.stdout.write('[tts] ' + d.toString())
    })
    ttsServer.stderr.on('data', function (d) {
      process.stderr.write('[tts] ' + d.toString())
    })
    ttsServer.on('error', function () { ttsServer = null })
    ttsServer.on('exit', function () { ttsServer = null })
    console.log('[tts] TTS 服务器启动中 (GPT-SoVITS)...')
  } catch (e) {
    console.warn('[tts] 无法启动 TTS 服务器:', e.message)
  }
}

app.whenReady().then(() => {
  // 读取设置中的开机自启 + 透明度
  try {
    var settingsPath = join(ROOT, 'assets', 'settings.json')
    var settings = JSON.parse(require('fs').readFileSync(settingsPath, 'utf-8'))
    if (settings.autoLaunch) app.setLoginItemSettings({ openAtLogin: true })
    if (settings.opacity != null) {
      var op = parseFloat(settings.opacity)
      if (op >= 0.4 && op <= 1.0) {
        // createWindow 之后才能应用，这里先存下来
        app._startupOpacity = op
      }
    }
  } catch (e) {}

  startApiServer()
  startTtsServer()
  createSplash()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  isQuitting = true
  if (apiServer) apiServer.kill()
  if (ttsServer) ttsServer.kill()
})
