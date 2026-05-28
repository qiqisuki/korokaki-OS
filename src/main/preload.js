const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('mascotAPI', {
  getModelPath: () => ipcRenderer.invoke('get-model-path'),
  getSdkPath: () => ipcRenderer.invoke('get-sdk-path'),
  onExpressionChange: (cb) => {
    ipcRenderer.on('set-expression', (_e, expr) => cb(expr))
  },
})
