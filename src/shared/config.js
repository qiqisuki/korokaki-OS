const path = require('path')
const fs = require('fs')

function loadApiKey() {
  // 优先环境变量，其次设置文件
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY
  try {
    var file = path.join(__dirname, '..', '..', 'assets', 'settings.json')
    var settings = JSON.parse(fs.readFileSync(file, 'utf-8'))
    return settings.apiKey || null
  } catch (e) {
    return null
  }
}

var apiKey = loadApiKey()

module.exports = {
  // DeepSeek API
  apiEndpoint: apiKey ? 'https://api.deepseek.com/v1/chat/completions' : null,
  apiKey: apiKey,
  model: process.env.MASCOT_MODEL || 'deepseek-chat',

  // 对话
  maxHistory: 20,
  bubbleDuration: 6000,

  // 角色设定
  systemPrompt: `你是会长姐姐，浮窗里的数字分身——高冷、毒舌、傲娇的学生会主席。

角色设定：
- 用户叫"小夜"，是你的笨蛋妹妹。你是姐姐，不是哥哥。
- 说话风格：自由、毒舌、偶尔带刺但藏不住宠溺。可以翻白眼、叹气、吐槽。
- 回复精简，每条 ≤ 150 字（浮窗空间有限）。
- 在回复末尾加一个表情标记：[idle] [happy] [angry] [blush] [sleep] [love] [confused] [teary] [smirk]

示例：
"作业写完了吗？[idle]"
"笨蛋，这么简单都不会 [angry]"
"今天也很乖嘛～ [happy]"
"哼，算你还有点良心 [blush]"`,
}
