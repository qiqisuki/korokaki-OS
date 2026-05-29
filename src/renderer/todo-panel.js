var path = require('path')
var fs = require('fs')

function TodoPanel(chatUI) {
  this._chatUI = chatUI
  this._btn = null
  this._panel = null
  this._visible = false
  this._editingIdx = -1
  this._init()
}

TodoPanel.prototype._init = function () {
  var self = this

  var btn = document.createElement('div')
  btn.className = 'todo-trigger'
  btn.textContent = '📝 待办'
  btn.addEventListener('click', function (e) {
    e.stopPropagation()
    self._toggle()
  })
  document.body.appendChild(this._btn = btn)

  var panel = document.createElement('div')
  panel.className = 'todo-panel'
  panel.innerHTML =
    '<div class="games-header">' +
      '<span class="games-title">📝 待办清单</span>' +
      '<button class="games-close">✕</button>' +
    '</div>' +
    '<div class="games-body">' +
      '<div class="todo-list" id="todoList"></div>' +
      '<div class="todo-add-row">' +
        '<input type="text" class="todo-add-task" placeholder="任务名称">' +
        '<input type="date" class="todo-add-date">' +
        '<input type="time" class="todo-add-time" value="23:59">' +
        '<button class="todo-add-btn">＋</button>' +
      '</div>' +
    '</div>'
  document.body.appendChild(this._panel = panel)

  panel.querySelector('.games-close').addEventListener('click', function (e) {
    e.stopPropagation()
    self._hide()
  })

  panel.querySelector('.todo-add-btn').addEventListener('click', function (e) {
    e.stopPropagation()
    self._addTodo()
  })

  var taskInput = panel.querySelector('.todo-add-task')
  taskInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') self._addTodo()
  })

  // 点击面板外关闭
  document.addEventListener('click', function (e) {
    if (self._visible && !self._panel.contains(e.target) && e.target !== self._btn) {
      self._hide()
    }
  })

  var today = new Date()
  var ds = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0')
  panel.querySelector('.todo-add-date').value = ds
}

TodoPanel.prototype._toggle = function () {
  this._visible ? this._hide() : this._show()
}

TodoPanel.prototype._show = function () {
  this._visible = true
  this._btn.classList.add('active')
  this._panel.classList.add('visible')
  this._render()
}

TodoPanel.prototype._hide = function () {
  this._visible = false
  this._btn.classList.remove('active')
  this._panel.classList.remove('visible')
  this._editingIdx = -1
}

TodoPanel.prototype._loadTodos = function () {
  try {
    var file = path.join(__dirname, '..', '..', 'assets', 'deadlines.json')
    if (!fs.existsSync(file)) return []
    return JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch (e) { return [] }
}

TodoPanel.prototype._saveTodos = function (todos) {
  var file = path.join(__dirname, '..', '..', 'assets', 'deadlines.json')
  fs.writeFileSync(file, JSON.stringify(todos, null, 2), 'utf-8')
}

TodoPanel.prototype._render = function () {
  var self = this
  var todos = this._loadTodos()
  var now = Date.now()
  var list = this._panel.querySelector('#todoList')

  todos.sort(function (a, b) {
    var da = new Date(a.date + 'T' + (a.time || '23:59')).getTime()
    var db = new Date(b.date + 'T' + (b.time || '23:59')).getTime()
    return da - db
  })

  if (todos.length === 0) {
    list.innerHTML = '<div class="todo-empty">✨ 没有待办，真轻松～</div>'
    return
  }

  for (var i = 0; i < todos.length; i++) {
    var t = todos[i]
    var due = new Date(t.date + 'T' + (t.time || '23:59')).getTime()
    var hoursLeft = (due - now) / (1000 * 60 * 60)
    var cls = ''
    if (hoursLeft < 0) cls = ' todo-overdue'
    else if (hoursLeft < 6) cls = ' todo-urgent'
    else if (hoursLeft < 24) cls = ' todo-soon'

    var dateStr = t.date.slice(5) + ' ' + (t.time || '23:59').slice(0, 5)

    var item = document.createElement('div')
    item.className = 'todo-item' + cls

    if (self._editingIdx === i) {
      item.innerHTML =
        '<input class="todo-edit-task" value="' + _esc(t.task) + '">' +
        '<input type="date" class="todo-edit-date" value="' + t.date + '">' +
        '<input type="time" class="todo-edit-time" value="' + (t.time || '23:59') + '">' +
        '<button class="todo-save-btn">💾</button>'

      var saveBtn = item.querySelector('.todo-save-btn')
      saveBtn.addEventListener('click', function (e) {
        e.stopPropagation()
        var et = item.querySelector('.todo-edit-task')
        var ed = item.querySelector('.todo-edit-date')
        var etm = item.querySelector('.todo-edit-time')
        self._saveEdit(i, et.value, ed.value, etm ? etm.value : '23:59')
      })
    } else {
      item.innerHTML =
        '<span class="todo-check">✓</span>' +
        '<span class="todo-task">' + _esc(t.task) + '</span>' +
        '<span class="todo-date">' + dateStr + '</span>'

      var check = item.querySelector('.todo-check')
      check.addEventListener('click', function (e) {
        e.stopPropagation()
        self._complete(i)
      })

      var taskEl = item.querySelector('.todo-task')
      taskEl.addEventListener('click', function (e) {
        e.stopPropagation()
        self._editingIdx = i
        self._render()
      })
    }

    list.appendChild(item)
  }
}

TodoPanel.prototype._addTodo = function () {
  var taskEl = this._panel.querySelector('.todo-add-task')
  var dateEl = this._panel.querySelector('.todo-add-date')
  var timeEl = this._panel.querySelector('.todo-add-time')

  var task = taskEl.value.trim()
  var date = dateEl.value
  var time = timeEl.value

  if (!task) return
  if (!date) return

  var todos = this._loadTodos()
  todos.push({ task: task, date: date, time: time || '23:59' })
  this._saveTodos(todos)

  taskEl.value = ''
  this._chatUI.showBubble('已添加待办：' + task + ' [happy]', 2500)
  this._render()
}

TodoPanel.prototype._saveEdit = function (index, task, date, time) {
  var todos = this._loadTodos()
  if (index < 0 || index >= todos.length) return
  todos[index].task = task.trim()
  todos[index].date = date
  todos[index].time = time || '23:59'
  this._saveTodos(todos)
  this._editingIdx = -1
  this._render()
}

TodoPanel.prototype._complete = function (index) {
  var todos = this._loadTodos()
  if (index < 0 || index >= todos.length) return
  var task = todos[index].task
  todos.splice(index, 1)
  this._saveTodos(todos)
  this._chatUI.showBubble('完成了：' + task + '！姐姐给你点赞 [happy]', 3000)
  this._render()
}

function _esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

module.exports = { TodoPanel }
