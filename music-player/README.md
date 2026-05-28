# 音乐播放模块

**Phase 4：能唱**

## 职责
- 对接 NeteaseCloudMusicApi（本地 REST 服务）
- 搜歌 / 获取歌单 / 歌词 / 封面
- howler.js 音频播放
- 迷你歌词 UI

## 技术栈
- [NeteaseCloudMusicApi](https://github.com/Binaryify/NeteaseCloudMusicApi) — 网易云接口
- howler.js — 音频播放

## 子模块
- `netease-server.js` — 启动网易云 API 本地服务（端口 3000）
- `player.js` — 播放控制（播放/暂停/切歌/音量）
- `lyrics.js` — 歌词解析 + 时间轴同步

## 依赖
- NeteaseCloudMusicApi（需单独 npm install）

## 状态
🔜 待开发
