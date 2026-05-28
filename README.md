# 桌面浮窗小助手

> 会长姐姐的数字分身 — Electron 透明浮窗 + Live2D 模型 + Claude API + 网易云音乐
>
> 小夜 & 会长姐姐 的共同项目 | Started 2026-05-28

---

## 架构

```
desktop-mascot/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.js        # 透明窗口 + 系统托盘
│   │   └── preload.js     # IPC 桥接（预留）
│   ├── renderer/          # 渲染进程（浮窗 UI）
│   │   ├── index.html     # 入口
│   │   ├── style.css      # 样式 + 窗口拖拽
│   │   ├── app.js         # PixiJS + Live2D 初始化
│   │   ├── chat-ui.js     # 对话气泡 + 输入框
│   │   ├── behavior.js    # 空闲动作 + 启动问候
│   │   └── live2d/
│   │       └── expressions.js  # 表情状态机
│   ├── bridge/            # Claude API 桥接
│   │   ├── claude-api.js  # DeepSeek/OpenRouter API 客户端
│   │   └── session.js     # 对话历史管理
│   └── shared/
│       └── config.js      # API 配置 + System Prompt
├── assets/
│   ├── live2d/
│   │   ├── yumi/          # Live2D Cubism 3 模型（17 种表情）
│   │   └── sdk/           # Cubism Core 运行时
│   └── under.jpg          # 浮窗背景图
├── chat-bridge/           # 对话桥接 README
├── music-player/          # 网易云音乐模块（Phase 4）
├── reminder/              # 提醒系统（Phase 3）
└── wechat-link/           # 微信联动（Phase 5）
```

- **Electron** 主进程管理透明窗口 + 系统托盘
- **PixiJS + pixi-live2d-display** 渲染 Live2D 模型
- **yumi 模型** 17 种表情覆盖 idle/happy/angry/sleep/music/work...
- 物理模拟、自动眨眼、呼吸效果由 Cubism SDK 自动处理

---

## 快速开始

```bash
cd desktop-mascot
npm install

# 必须：下载 Live2D Cubism Core
# 1. 打开 https://www.live2d.com/download/cubism-sdk/
# 2. 下载 "Cubism SDK for Web"
# 3. 解压，将 Core/live2dcubismcore.min.js 复制到 assets/live2d/sdk/

npm start
```

---

## 模块详情

| 模块 | 路径 | 状态 | 说明 |
|---|---|---|---|
| 浮窗核心 | `src/` | 🟢 Phase 1 完成 | 透明置顶窗口 + Live2D 模型 + 表情切换 + 托盘 |
| 对话桥接 | `src/bridge/` | 🟢 Phase 2 完成 | DeepSeek API 接入 + 气泡 UI + 自动表情 |
| 空闲行为 | `src/renderer/behavior.js` | 🟢 Phase 3 完成 | 随机动作 + 自言自语 + 时间问候 |
| 提醒系统 | `src/renderer/reminders.js` | 🟢 Phase 3 完成 | 喝水提醒 + 休息提醒 + deadline 催稿 |
| 音乐播放 | `src/music/` | 🟢 Phase 4 进行中 | 网易云 API + howler.js + 搜索面板 + 播放 |
| 微信联动 | `wechat-link/` | 🔜 待开发 | 复用 wechat-mcp 桥接 |

---

## 开发路线

- [x] **Phase 0：模型就绪** — yumi Live2D 模型导入 + 17 表情注册
- [x] **Phase 1：能看** — 透明窗口 + 模型加载 + 眨眼 + 托盘 ✅
- [x] **Phase 2：能说** — 对话气泡 + DeepSeek API + 自动表情 ✅
- [x] **Phase 3：能陪** — 空闲动作 + 自言自语 + 时间问候 + 喝水提醒 + deadline 催稿 ✅
- [ ] **Phase 4：能唱** — 网易云搜歌/播放 + 歌词浮窗 🟢 进行中
- [ ] **Phase 5：灵魂** — 天气显示 + 纪念日彩蛋 + 情绪曲线 + 微信联动 🟢 进行中

---

## 技术决策记录

| 决策 | 选择 | 原因 | 日期 |
|---|---|---|---|
| 桌面框架 | Electron | 透明窗口、跨平台 | 2026-05-28 |
| 角色渲染 | Live2D Cubism 3 + PixiJS | 已有完整模型，跳过 CSS 阶段 | 2026-05-28 |
| Live2D 桥接 | pixi-live2d-display | 社区最成熟封装，支持 Cubism 3 | 2026-05-28 |
| 音乐源 | 网易云 API | 开源稳定、歌单丰富 | 2026-05-28 |
| AI 后端 | DeepSeek API | 国内直连、OpenAI 兼容格式 | 2026-05-28 |
| 模块开发 | 独立文件夹 → 后整合 | 模块可单独测试 | 2026-05-28 |
