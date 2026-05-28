const words = require('../../assets/daily-words.json')
const sound = require('./sound')

function DailyWords(chatUI) {
  this._chatUI = chatUI
  this._init()
}

DailyWords.prototype._init = function () {
  var self = this
  // 等 splash + 初始化完成后再打招呼
  setTimeout(function () { self._greet() }, 5000)
}

DailyWords.prototype._greet = function () {
  var hour = new Date().getHours()
  var category = hour < 11 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  // 70% 时段问候 + 30% 鼓励/名言
  var pick
  if (Math.random() < 0.7) {
    pick = this._pick(category)
  } else if (Math.random() < 0.5) {
    pick = this._pick('encourage')
  } else {
    pick = this._pick('quote')
  }

  if (pick) { sound.startup(); this._chatUI.showBubble(pick, 6000) }
}

DailyWords.prototype._pick = function (category) {
  var list = words[category]
  if (!list || !list.length) return ''
  return list[Math.floor(Math.random() * list.length)]
}

module.exports = { DailyWords }
