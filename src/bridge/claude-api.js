const https = require('https')
const { apiEndpoint, apiKey, model, systemPrompt } = require('../shared/config')
const session = require('./session')

function fallbackResponse(msg) {
  const replies = [
    { text: '嗯？想跟姐姐说什么~ [idle]', expr: 'idle' },
    { text: '笨蛋妹妹，作业写完了吗？ [happy]', expr: 'happy' },
    { text: '哼，又来找我幫忙...这种事情自己先想想啦 [confused]', expr: 'confused' },
    { text: '说重点，姐姐很忙的 [idle]', expr: 'idle' },
    { text: '知道了知道了，啰嗦 [smirk]', expr: 'smirk' },
    { text: '诶？难得你这么认真... [love]', expr: 'love' },
  ]
  const r = replies[Math.floor(Math.random() * replies.length)]
  session.addAssistantMessage(r.text)
  return r
}

function parseReply(text) {
  const exprMatch = text.match(/\[(idle|happy|angry|blush|sleep|love|confused|teary|smirk|cry)\]/i)
  const expr = exprMatch ? exprMatch[1].toLowerCase() : 'idle'
  return { text, expr }
}

async function chat(userMessage) {
  if (!apiKey || !apiEndpoint) {
    return fallbackResponse(userMessage)
  }

  session.addUserMessage(userMessage)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...session.getHistory(),
  ]

  const body = JSON.stringify({
    model,
    messages,
    max_tokens: 300,
    temperature: 0.8,
  })

  return new Promise((resolve) => {
    const url = new URL(apiEndpoint)
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.error) {
            console.error('[claude-api] API error:', json.error)
            resolve(fallbackResponse(userMessage))
            return
          }
          const reply = json.choices?.[0]?.message?.content || ''
          session.addAssistantMessage(reply)
          resolve(parseReply(reply))
        } catch (e) {
          console.error('[claude-api] Parse error:', e)
          resolve(fallbackResponse(userMessage))
        }
      })
    })
    req.on('error', (e) => {
      console.error('[claude-api] Request error:', e)
      resolve(fallbackResponse(userMessage))
    })
    req.write(body)
    req.end()
  })
}

module.exports = { chat }
