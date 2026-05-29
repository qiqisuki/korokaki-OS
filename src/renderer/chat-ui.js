const { chat } = require('../bridge/claude-api')
const { bubbleDuration } = require('../shared/config')
const sound = require('./sound')
const { TTSSpeaker } = require('./tts')
const { diary } = require('./diary')

function ChatUI(model, expressionState, mood) {
  this._model = model
  this._expressionState = expressionState
  this._mood = mood
  this._bubble = null
  this._input = null
  this._field = null
  this._btn = null
  this._bubbleTimer = null
  this._tts = new TTSSpeaker()
  this._init()
}

ChatUI.prototype._init = function () {
  this._bubble = document.createElement('div')
  this._bubble.className = 'chat-bubble'
  document.body.appendChild(this._bubble)

  this._btn = document.createElement('div')
  this._btn.className = 'chat-trigger'
  this._btn.textContent = '💬 戳我聊天'
  this._btn.addEventListener('click', () => this.showInput())
  document.body.appendChild(this._btn)

  this._input = document.createElement('div')
  this._input.className = 'chat-input-overlay'
  this._input.innerHTML = `
    <input type="text" class="chat-input-field" placeholder="跟姐姐说点什么...">
    <button class="chat-send-btn">发送</button>
  `
  document.body.appendChild(this._input)

  this._field = this._input.querySelector('.chat-input-field')
  const btn = this._input.querySelector('.chat-send-btn')

  this._field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') this._send()
  })
  btn.addEventListener('click', () => this._send())

  this._input.addEventListener('click', (e) => {
    if (e.target === this._input) this.hideInput()
  })
}

ChatUI.prototype.showInput = function () {
  if (this._behavior) this._behavior.notifyActivity()
  this._btn.classList.add('hidden')
  this._input.classList.add('visible')
  this._field.value = ''
  setTimeout(() => this._field.focus(), 100)
}

ChatUI.prototype.hideInput = function () {
  this._input.classList.remove('visible')
  this._btn.classList.remove('hidden')
}

ChatUI.prototype.showBubble = function (text, duration) {
  clearTimeout(this._bubbleTimer)
  this._bubble.textContent = text.replace(/\[(idle|happy|angry|blush|sleep|love|confused|teary|smirk|cry)\]/i, '').trim()
  this._bubble.classList.add('visible')
  sound.bubble()
  if (duration != null) {
    this._bubbleTimer = setTimeout(() => {
      this._bubble.classList.remove('visible')
    }, duration)
  }
}

ChatUI.prototype._send = async function () {
  var text = this._field.value.trim()
  if (!text) return

  this._field.value = ''
  this.hideInput()
  if (this._behavior) this._behavior.notifyActivity()
  if (this._mood) this._mood.onUserChat()
  diary.logChat()

  // 晚安模式：如果姐姐在睡觉，先醒来
  if (this._mood && this._mood.isAsleep()) {
    var wake = this._mood.wakeUp()
    if (wake) {
      this.showBubble(wake.text, 5000)
      if (wake.expr) this._expressionState.set(wake.expr)
      return
    }
  }

  // 检测晚安关键词
  if (this._mood && this._mood.trySleep(text)) {
    var replies = [
      '晚安哦笨蛋妹妹～姐姐会在梦里陪你的 [sleep]',
      '晚安～做个好梦，明天也要元气满满 [love]',
      '终于肯睡了！姐姐也休息一下...晚安 [sleep]',
    ]
    var pick = replies[Math.floor(Math.random() * replies.length)]
    this.showBubble(pick, 5000)
    this._expressionState.set('sleep')
    return
  }

  this.showBubble('...', 1500)

  try {
    const result = await chat(text)
    if (this._tts._enabled) {
      this.showBubble(result.text)
      if (result.expr && this._expressionState) {
        await this._expressionState.set(result.expr)
      }
      this._tts.speak(result.text, () => {
        this._bubble.classList.remove('visible')
      })
    } else {
      this.showBubble(result.text, bubbleDuration)
      if (result.expr && this._expressionState) {
        await this._expressionState.set(result.expr)
      }
    }
  } catch (e) {
    this.showBubble('嗯...信号不太好呢，等会再说 [idle]', 3000)
  }
}

module.exports = { ChatUI }
