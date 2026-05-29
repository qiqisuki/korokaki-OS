const { ipcRenderer } = require('electron')
const PIXI = require('pixi.js')
const { Live2DModel } = require('pixi-live2d-display/cubism4')
const { ChatUI } = require('./chat-ui')
const { IdleBehavior } = require('./behavior')
const { ReminderSystem } = require('./reminders')
const { MusicUI } = require('./music-ui')
const { PomodoroWidget } = require('./pomodoro')
const { WeatherWidget } = require('./weather')
const { DailyWords } = require('./daily-words')
const { Interactions } = require('./interactions')
const { StatusPanel } = require('./status-panel')
const { SettingsPanel } = require('./settings-panel')
const { ClockWidget } = require('./clock')
const { Ambience } = require('./ambience')
const { Mood } = require('./mood')
const { MiniGames } = require('./minigames')
const { TodoPanel } = require('./todo-panel')
const { Diary } = require('./diary')

Live2DModel.registerTicker(PIXI.Ticker)

const TARGET_WIDTH = 480
const TARGET_HEIGHT = 480

let app = null
let model = null
let expressionState = null
let chatUI = null

// ---- ExpressionState ----

const EXPRESSION_MAP = {
  happy: 'happy', love: 'love', teary: 'teary', cry: 'cry',
  angry: 'angry', confused: 'confused', sleep: 'sleep',
  music: 'music', work: 'work', waveR: 'waveR', waveL: 'waveL',
  dog: 'dog', catMouth: 'catMouth', tongue: 'tongue',
  shortHair1: 'shortHair1', shortHair2: 'shortHair2', smirk: 'smirk',
}

const STATE_CYCLE = ['idle', 'happy', 'love', 'angry', 'confused', 'teary', 'sleep', 'music', 'work', 'idle']

function ExpressionState(model) {
  this._model = model
  this._current = 'idle'
  this._cycleIndex = 0
  this._listeners = []
}

ExpressionState.prototype.onChange = function (fn) {
  this._listeners.push(fn)
}

ExpressionState.prototype.set = async function (name) {
  if (name === this._current) return
  if (name === 'idle') {
    try { await this._model.expression('idle') } catch (e) {}
  } else {
    const expId = EXPRESSION_MAP[name]
    if (expId) {
      try { await this._model.expression(expId) } catch (e) {}
    }
  }
  this._current = name
  for (var i = 0; i < this._listeners.length; i++) {
    this._listeners[i](name)
  }
}

ExpressionState.prototype.next = async function () {
  this._cycleIndex = (this._cycleIndex + 1) % STATE_CYCLE.length
  await this.set(STATE_CYCLE[this._cycleIndex])
}

ExpressionState.prototype.reset = async function () {
  await this.set('idle')
  this._cycleIndex = 0
}

Object.defineProperty(ExpressionState.prototype, 'current', {
  get: function () { return this._current }
})

// ---- Error display ----

function showError(title, detail, hint) {
  const div = document.createElement('div')
  div.className = 'error-overlay'
  div.innerHTML =
    '<div>' +
    '<p style="font-size:18px;margin-bottom:8px">' + title + '</p>' +
    '<p style="font-size:13px;opacity:0.7">' + detail + '</p>' +
    (hint ? '<p style="font-size:12px;margin-top:12px;opacity:0.6;line-height:1.6">' + hint + '</p>' : '') +
    '</div>'
  document.body.appendChild(div)
}

// ---- Init ----

function fitModel() {
  const bounds = model.getBounds()
  const scale = Math.min(
    TARGET_WIDTH / (bounds.width || TARGET_WIDTH),
    TARGET_HEIGHT / (bounds.height || TARGET_HEIGHT)
  ) * 1.15
  model.scale.set(scale)
  model.x = TARGET_WIDTH / 2
  model.y = TARGET_HEIGHT * 0.55
}

async function init() {
  if (typeof window.Live2DCubismCore === 'undefined') {
    showError(
      '缺少 Live2D Cubism Core',
      'SDK 运行时未加载',
      '请从 Live2D 官网下载 Cubism SDK for Web<br>解压后将 Core/live2dcubismcore.min.js 放到<br><code>assets/live2d/sdk/</code> 目录下'
    )
    return
  }

  const modelPath = await ipcRenderer.invoke('get-model-path')
  const canvas = document.getElementById('live2d-canvas')

  app = new PIXI.Application({
    view: canvas,
    width: TARGET_WIDTH,
    height: TARGET_HEIGHT,
    transparent: true,
    antialias: true,
    resolution: 1,
  })

  try {
    model = await Live2DModel.from(modelPath)
  } catch (err) {
    console.error('模型加载失败:', err)
    showError('模型加载失败', err.message,
      '确认模型文件完整：<br><code>assets/live2d/yumi/yumi.model3.json</code>')
    return
  }

  app.stage.addChild(model)
  fitModel()

  expressionState = new ExpressionState(model)
  var mood = new Mood(expressionState)
  var diary = new Diary(mood)

  chatUI = new ChatUI(model, expressionState, mood)
  var behavior = new IdleBehavior(model, expressionState, chatUI, mood)
  chatUI._behavior = behavior

  var reminders = new ReminderSystem(chatUI, expressionState)
  reminders.start()

  new MusicUI(chatUI, expressionState, mood)
  new PomodoroWidget(chatUI, expressionState)
  new WeatherWidget(chatUI)
  new DailyWords(chatUI)
  new Interactions(canvas, expressionState, chatUI, mood)
  new StatusPanel(chatUI, mood)
  new SettingsPanel()
  new ClockWidget()
  new Ambience(expressionState, mood)
  new MiniGames(expressionState, chatUI)
  new TodoPanel(chatUI)

  canvas.addEventListener('contextmenu', async (e) => {
    e.preventDefault()
    await expressionState.reset()
  })
}

init().catch(err => {
  console.error('[mascot] 初始化失败:', err)
  showError('初始化失败', err.message || String(err))
})
