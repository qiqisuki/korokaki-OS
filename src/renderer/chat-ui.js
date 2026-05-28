const { chat } = require('../bridge/claude-api')
const { bubbleDuration } = require('../shared/config')
const sound = require('./sound')

function ChatUI(model, expressionState, behavior) {
  this._model = model
  this._expressionState = expressionState
  this._behavior = behavior
  this._bubble = null
  this._input = null
  this._field = null
  this._btn = null
  this._bubbleTimer = null
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
  this._bubbleTimer = setTimeout(() => {
    this._bubble.classList.remove('visible')
  }, duration || bubbleDuration)
}

ChatUI.prototype._send = async function () {
  const text = this._field.value.trim()
  if (!text) return

  this._field.value = ''
  this.hideInput()
  if (this._behavior) this._behavior.notifyActivity()

  this.showBubble('...', 1500)

  try {
    const result = await chat(text)
    this.showBubble(result.text)
    if (result.expr && this._expressionState) {
      await this._expressionState.set(result.expr)
    }
  } catch (e) {
    this.showBubble('嗯...信号不太好呢，等会再说 [idle]', 3000)
  }
}

module.exports = { ChatUI }
