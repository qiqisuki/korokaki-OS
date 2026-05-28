const fs = require('fs')
const path = require('path')

var FILE = path.join(__dirname, '..', '..', 'assets', 'settings.json')
var data = {}

try {
  data = JSON.parse(fs.readFileSync(FILE, 'utf-8'))
} catch (e) {
  data = {}
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {}
}

module.exports = {
  get: function (key) {
    return data[key]
  },
  set: function (key, value) {
    data[key] = value
    save()
  },
  getAll: function () {
    return data
  },
}
