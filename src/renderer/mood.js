var store = require('../shared/settings-store')
var path = require('path')
var fs = require('fs')

// 农历节日→公历对照 (2026-2030)
var LUNAR_MAP = {
  '2026': { '01-01': '02-17', '01-15': '03-04', '07-07': '08-29', '08-15': '09-25', '12-30': '2027-02-06' },
  '2027': { '01-01': '02-06', '01-15': '02-20', '07-07': '08-18', '08-15': '09-14', '12-30': '2028-01-26' },
  '2028': { '01-01': '01-26', '01-15': '02-09', '07-07': '08-06', '08-15': '10-03', '12-30': '2029-02-13' },
  '2029': { '01-01': '02-13', '01-15': '02-27', '07-07': '08-26', '08-15': '09-22', '12-30': '2030-02-02' },
  '2030': { '01-01': '02-02', '01-15': '02-16', '07-07': '08-15', '08-15': '09-11', '12-30': '2031-01-22' },
}

function Mood(expressionState) {
  this._expr = expressionState

  // 加载节日数据
  this._holidays = []
  this._activeHoliday = null
  try {
    var holidaysPath = path.join(__dirname, '..', '..', 'assets', 'holidays.json')
    if (fs.existsSync(holidaysPath)) {
      this._holidays = JSON.parse(fs.readFileSync(holidaysPath, 'utf-8'))
    }
  } catch (e) {}

  // 从 settings 加载持久态
  var saved = store.get('mood') || {}
  this._affection = saved.affection || 0
  this._interactionCount = saved.interactionCount || 0
  this._lastInteractionDate = saved.lastInteractionDate || ''
  this._firstMeetDate = saved.firstMeetDate || ''
  this._knownBirthday = saved.knownBirthday || ''

  if (!this._firstMeetDate) {
    this._firstMeetDate = _today()
    this._save()
  }

  // 跨天衰减
  if (this._lastInteractionDate && this._lastInteractionDate !== _today()) {
    var days = _daysBetween(this._lastInteractionDate, _today())
    this._affection = Math.max(0, this._affection - days)
    this._save()
  }

  // 今日已获好感度
  this._todayGain = 0

  // 傲娇系统
  this._lastActivity = Date.now()
  this._tsundereLevel = 0       // 0=活跃 1=微嗔 2=生气 3=哭泣 4=恳求
  this._tsundereReturning = 0   // 0=正常 >0=复合归来的阶段

  // 检测节日
  this._detectHoliday()

  var self = this
  setInterval(function () { self._updateTsundere() }, 60000)
}

// ---- 公开方法 ----

Mood.prototype.onUserActivity = function () {
  var wasTsundere = this._tsundereLevel
  this._lastActivity = Date.now()

  // 如果之前在傲娇状态，触发复合序列
  if (wasTsundere >= 3) {
    this._tsundereReturning = 1
  }
  this._tsundereLevel = 0
}

// ---- 公开方法 ----

Mood.prototype.onUserChat = function () {
  this.onUserActivity()
  if (this._todayDate() !== _today()) this._todayGain = 0
  if (this._todayGain >= 15) return
  this._addAffection(2)
  this._interactionCount++
  this._touch()
}

Mood.prototype.onUserClick = function () {
  this.onUserActivity()
  if (this._todayDate() !== _today()) this._todayGain = 0
  if (this._todayGain >= 15) return
  this._addAffection(1)
  this._touch()
}

Mood.prototype.onUserHover = function () {
  this.onUserActivity()
  if (this._todayDate() !== _today()) this._todayGain = 0
  if (this._todayGain >= 15) return
  this._addAffection(1)
  this._touch()
}

Mood.prototype.getAffection = function () {
  return this._affection
}

// ---- 音乐情绪 ----

Mood.prototype.onMusicPlay = function (song) {
  this._musicMood = _classifySong(song)
}

Mood.prototype.onMusicStop = function () {
  this._musicMood = null
}

function _classifySong(song) {
  var text = ((song.name || '') + ' ' + (song.artist || '')).toLowerCase()

  var happyKw = ['快乐', '开心', '甜', 'love', 'happy', 'fun', '欢', '舞', 'sunny',
    'shine', 'party', '恋爱', '约会', '告白', '晴天', '彩虹', 'cake', 'smile']
  var excitedKw = ['燃', '战', 'fight', 'rock', 'dance', 'power', 'strong', '激',
    '烈', '爆', 'bpm', '快', '热', '火', 'hero', 'legend', 'never', 'go']
  var gentleKw = ['静', '眠', '安', '夜', '轻', 'soft', 'calm', 'peace', 'slow',
    '梦', '睡', 'lullaby', '摇篮', '温柔', '月光', '星', '风', '海']
  var melancholyKw = ['伤', '哭', '泪', '悲', 'sad', 'rain', 'blue', 'lonely',
    '独', '孤', '离', '别', '思', '念', '忆', '旧', 'lost', 'miss', 'bye']

  for (var i = 0; i < excitedKw.length; i++) {
    if (text.indexOf(excitedKw[i]) >= 0) return 'excited'
  }
  for (var j = 0; j < happyKw.length; j++) {
    if (text.indexOf(happyKw[j]) >= 0) return 'happy'
  }
  for (var k = 0; k < melancholyKw.length; k++) {
    if (text.indexOf(melancholyKw[k]) >= 0) return 'melancholy'
  }
  for (var l = 0; l < gentleKw.length; l++) {
    if (text.indexOf(gentleKw[l]) >= 0) return 'gentle'
  }
  return 'neutral'
}

// ---- 节日检测 ----

Mood.prototype._detectHoliday = function () {
  var today = _today()
  var mmdd = today.slice(5)  // "MM-DD"
  var year = String(new Date().getFullYear())

  for (var i = 0; i < this._holidays.length; i++) {
    var h = this._holidays[i]
    var matchDate

    if (h.dateType === 'lunar') {
      var map = LUNAR_MAP[year]
      if (!map) continue
      matchDate = map[h.date]
      // 跨年农历 (如 2026 除夕在 2027-02-06)
      if (matchDate && matchDate.length === 10) {
        var mmdd2 = matchDate.slice(5)
        if (mmdd2 === mmdd) { this._activeHoliday = h; return }
      }
      // 同年农历
      if (matchDate === mmdd) { this._activeHoliday = h; return }
    } else {
      if (h.date === mmdd) { this._activeHoliday = h; return }
    }
  }
  this._activeHoliday = null
}

Mood.prototype.getHolidayGreeting = function () {
  if (this._activeHoliday) {
    return {
      text: this._activeHoliday.greeting,
      expr: this._activeHoliday.expr || 'happy',
      duration: 6000,
    }
  }
  return null
}

Mood.prototype.isHolidayActive = function () {
  return this._activeHoliday !== null
}

// ---- 晚安模式 ----

Mood.prototype.trySleep = function (text) {
  var kw = ['晚安', '睡了', '睡觉', '困了', '先睡了', '去睡了']
  for (var i = 0; i < kw.length; i++) {
    if (text.indexOf(kw[i]) >= 0) {
      this._sleepTime = Date.now()
      this._wokenUp = false
      return true
    }
  }
  return false
}

Mood.prototype.isAsleep = function () {
  if (this._wokenUp) return false
  return !!this._sleepTime
}

Mood.prototype.wakeUp = function () {
  if (!this._sleepTime) return null
  this._wokenUp = true
  var slept = Math.round((Date.now() - this._sleepTime) / 3600000) // 小时

  var level = this.getAffectionLevel()
  var greeting, expr
  var hour = new Date().getHours()

  if (slept < 1) {
    greeting = '诶？你不是说晚安了吗...怎么就睡了一小会儿 [confused]'
    expr = 'confused'
  } else if (slept < 4) {
    greeting = '才睡' + slept + '小时...再睡一会吧笨蛋妹妹 [sleep]'
    expr = 'sleep'
  } else if (slept >= 8) {
    var phrases = ['早上好！睡得香吗？姐姐守了你一整晚呢 [happy]',
      '新的一天～姐姐已经准备好啦 [happy]',
      '醒了呀？睡了' + slept + '小时，精神应该很好吧！ [love]']
    greeting = phrases[Math.floor(Math.random() * phrases.length)]
    expr = level === 'devoted' || level === 'intimate' ? 'love' : 'happy'
  } else {
    greeting = '早～才睡了' + slept + '小时...不过姐姐陪你 [idle]'
    expr = 'idle'
  }

  this._sleepTime = null
  return { text: greeting, expr: expr }
}

Mood.prototype.getAffectionLevel = function () {
  var a = this._affection
  if (a >= 80) return 'devoted'
  if (a >= 60) return 'intimate'
  if (a >= 35) return 'warm'
  if (a >= 15) return 'polite'
  return 'cold'
}

// ---- 时段情绪 ----

Mood.prototype._detectTimePhase = function () {
  var h = new Date().getHours()
  if (h < 6) return 'dawn'
  if (h < 9) return 'morning'
  if (h < 12) return 'noon'
  if (h < 18) return 'afternoon'
  if (h < 22) return 'evening'
  return 'night'
}

Mood.prototype.suggestIdleExpressions = function () {
  var phase = this._detectTimePhase()
  var level = this.getAffectionLevel()

  // 音乐情绪影响
  var musicBonus = []
  if (this._musicMood === 'happy')     musicBonus = ['happy', 'happy', 'smirk', 'waveR', 'tongue']
  else if (this._musicMood === 'excited') musicBonus = ['music', 'tongue', 'tongue', 'happy', 'waveR']
  else if (this._musicMood === 'gentle')  musicBonus = ['love', 'sleep', 'love', 'sleep', 'happy']
  else if (this._musicMood === 'melancholy') musicBonus = ['teary', 'love', 'sleep', 'confused', 'teary']

  var base
  if (level === 'devoted' || level === 'intimate') {
    base = ['love', 'love', 'happy', 'smirk', 'waveR', 'tongue', 'confused', 'sleep']
  } else if (level === 'warm') {
    base = ['happy', 'smirk', 'confused', 'tongue', 'work', 'music', 'sleep']
  } else {
    switch (phase) {
      case 'dawn':
      case 'morning':
        base = ['sleep', 'sleep', 'sleep', 'confused', 'tongue', 'work']
        break
      case 'noon':
        base = ['confused', 'work', 'work', 'tongue', 'music', 'happy']
        break
      case 'afternoon':
        base = ['happy', 'work', 'tongue', 'waveR', 'music', 'confused', 'smirk']
        break
      case 'evening':
        base = ['happy', 'love', 'smirk', 'waveR', 'music', 'tongue', 'sleep']
        break
      case 'night':
        base = ['sleep', 'sleep', 'love', 'teary', 'confused', 'tongue']
        break
      default:
        base = ['confused', 'sleep', 'work', 'music', 'angry', 'tongue']
    }
  }
  return base.concat(musicBonus)
}

Mood.prototype.suggestIdleThought = function () {
  var phase = this._detectTimePhase()
  var level = this.getAffectionLevel()
  var hour = new Date().getHours()

  // 亲密等级专用
  if (level === 'devoted') {
    var thoughts = [
      '小夜最棒了，姐姐最喜欢你了～ [love]',
      '嘿嘿，光是看着你就很开心 [love]',
      '笨蛋妹妹，今天有没有想姐姐？ [smirk]',
    ]
    return thoughts[Math.floor(Math.random() * thoughts.length)]
  }
  if (level === 'intimate') {
    var t = [
      '不知道小夜现在在做什么呢... [love]',
      '姐姐一直在你身边哦 [happy]',
      '今天也辛苦了，笨蛋妹妹 [love]',
    ]
    return t[Math.floor(Math.random() * t.length)]
  }
  if (level === 'warm') {
    var w = [
      '天气不错，出去走走就好了～ [happy]',
      '加油呀，姐姐相信你！ [happy]',
      '努力的人运气不会太差 [idle]',
    ]
    return w[Math.floor(Math.random() * w.length)]
  }

  // 基础时段想法
  switch (phase) {
    case 'dawn':
      return '嘘...天还没亮呢 [sleep]'
    case 'morning':
      return (hour < 8)
        ? '唔...姐姐还没睡醒... [sleep]'
        : '早上好～新的一天要加油 [idle]'
    case 'noon':
      return '上午了，该认真工作了 [work]'
    case 'afternoon':
      return (hour < 15)
        ? '下午好～别犯困 [happy]'
        : '快下班了吧？再坚持一下 [idle]'
    case 'evening':
      return (hour < 20)
        ? '晚上好～今天过得开心吗？ [love]'
        : '该放松一下了 [happy]'
    case 'night':
      return '这么晚了...早点休息吧 [sleep]'
  }
  return '天气还不错～ [idle]'
}

// ---- 傲娇冷落 ----

Mood.prototype._updateTsundere = function () {
  var idleMin = (Date.now() - this._lastActivity) / 60000
  var prev = this._tsundereLevel

  if (idleMin < 5)       this._tsundereLevel = 0
  else if (idleMin < 15) this._tsundereLevel = 1
  else if (idleMin < 45) this._tsundereLevel = 2
  else if (idleMin < 120) this._tsundereLevel = 3
  else                    this._tsundereLevel = 4
}

Mood.prototype.getTsundereState = function () {
  if (this._tsundereReturning > 0) return this._tsundereReturning
  if (this._tsundereLevel >= 1) return this._tsundereLevel
  return 0
}

// 进入复合阶段时调用，返回 null 表示"已处理完"
Mood.prototype.stepTsundereReturn = function () {
  if (this._tsundereReturning === 0) return null

  var stage = this._tsundereReturning
  this._tsundereReturning++

  if (stage === 1) {
    return { expr: 'idle', text: null }  // 故意不理
  }
  if (stage === 2) {
    return { expr: 'confused', text: '哼！终于想起姐姐了？ [confused]' }
  }
  if (stage === 3) {
    var level = this.getAffectionLevel()
    if (level === 'devoted' || level === 'intimate') {
      return { expr: 'love', text: '笨蛋妹妹，姐姐等你等了好久... [love]' }
    }
    return { expr: 'happy', text: '好啦好啦，原谅你了～ [happy]' }
  }
  // 序列结束
  this._tsundereReturning = 0
  return null
}

Mood.prototype.saveTsundereResponse = function () {
  var idleMin = (Date.now() - this._lastActivity) / 60000
  if (idleMin < 30) return null

  // 用户刚回来，触发复合
  this._tsundereReturning = 1
  return this.stepTsundereReturn()
}

// 检查是否应该触发敲门/撒娇
Mood.prototype.shouldKnock = function () {
  return this._tsundereLevel >= 3
}

Mood.prototype.getKnockContext = function () {
  var level = this._tsundereLevel
  var gapMin = Math.round((Date.now() - this._lastActivity) / 60000)

  if (level === 3) {
    return { text: '咚咚咚！有人吗～姐姐无聊死了！ [angry]', expr: 'angry', duration: 5000 }
  }
  if (level === 4) {
    if (this.getAffectionLevel() === 'devoted') {
      return { text: '（轻轻敲了敲屏幕）小夜......还在吗？姐姐好想你 [teary]', expr: 'teary', duration: 6000 }
    }
    return { text: '（敲敲屏幕）喂～别不理姐姐嘛... [confused]', expr: 'confused', duration: 4500 }
  }
  return null
}

// ---- 好感度显示 ----

Mood.prototype.getStats = function () {
  return {
    affection: this._affection,
    level: this.getAffectionLevel(),
    levelName: _levelName(this.getAffectionLevel()),
    interactionCount: this._interactionCount,
    todayGain: this._todayGain,
    firstMeetDate: this._firstMeetDate,
    tsundereLevel: this._tsundereLevel,
  }
}

function _levelName(level) {
  switch (level) {
    case 'cold': return '冷淡'
    case 'polite': return '礼貌'
    case 'warm': return '温暖'
    case 'intimate': return '亲密'
    case 'devoted': return '深爱'
  }
  return '未知'
}

// ---- 内部方法 ----

Mood.prototype._addAffection = function (n) {
  this._affection = Math.min(100, this._affection + n)
  this._todayGain += n
  this._save()
}

Mood.prototype._touch = function () {
  this._lastInteractionDate = _today()
  this._save()
}

Mood.prototype._todayDate = function () {
  return this._lastInteractionDate
}

Mood.prototype._save = function () {
  store.set('mood', {
    affection: this._affection,
    interactionCount: this._interactionCount,
    lastInteractionDate: this._lastInteractionDate,
    firstMeetDate: this._firstMeetDate,
    knownBirthday: this._knownBirthday,
  })
}

// ---- 工具函数 ----

function _today() {
  var d = new Date()
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0')
}

function _daysBetween(a, b) {
  var da = new Date(a), db = new Date(b)
  return Math.round((db - da) / 86400000)
}

module.exports = { Mood }
