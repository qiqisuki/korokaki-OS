var EXPRESSION_MAP = {
  happy:     'happy',
  love:      'love',
  teary:     'teary',
  cry:       'cry',
  angry:     'angry',
  confused:  'confused',
  sleep:     'sleep',
  music:     'music',
  work:      'work',
  waveR:     'waveR',
  waveL:     'waveL',
  dog:       'dog',
  catMouth:  'catMouth',
  tongue:    'tongue',
  shortHair1: 'shortHair1',
  shortHair2: 'shortHair2',
  smirk:     'smirk',
}

var STATE_CYCLE = ['idle', 'happy', 'love', 'angry', 'confused', 'teary', 'sleep', 'music', 'work', 'idle']

function ExpressionState(model) {
  this._model = model
  this._current = 'idle'
  this._cycleIndex = 0
}

ExpressionState.prototype.set = async function (name) {
  if (name === this._current) return

  if (name === 'idle') {
    try { await this._model.expression('idle') } catch (e) {}
  } else {
    var expId = EXPRESSION_MAP[name]
    if (expId) {
      try { await this._model.expression(expId) } catch (e) {}
    }
  }

  this._current = name
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
