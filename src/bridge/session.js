const fs = require('fs')
const path = require('path')
const { maxHistory } = require('../shared/config')

var FILE = path.join(__dirname, '..', '..', 'assets', 'chat-history.json')
var messages = []

// 加载历史
try {
  if (fs.existsSync(FILE)) {
    messages = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
  }
} catch (e) {
  messages = []
}

function save() {
  try {
    // 只保留最近 maxHistory 条
    var recent = messages.slice(-maxHistory)
    fs.writeFileSync(FILE, JSON.stringify(recent, 'utf-8'))
  } catch (e) {}
}

function addUserMessage(text) {
  messages.push({ role: 'user', content: text })
  while (messages.length > maxHistory) messages.shift()
  save()
}

function addAssistantMessage(text) {
  messages.push({ role: 'assistant', content: text })
  while (messages.length > maxHistory) messages.shift()
  save()
}

function getHistory() {
  return [...messages]
}

function clear() {
  messages = []
  save()
}

module.exports = { addUserMessage, addAssistantMessage, getHistory, clear }
