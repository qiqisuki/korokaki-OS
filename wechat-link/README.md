# 微信联动模块

**Phase 5：灵魂**

## 职责
- 桥接 wechat-mcp/
- 手机微信消息 → 唤醒浮窗角色
- 浮窗状态同步到微信（"姐姐在桌面上看着你呢"）

## 复用
- `wechat-mcp/wechat-bridge.js` — 已有微信桥接
- `wechat-mcp/wechat-state.json` — 已有登录态
- iLink Bot API — 收发消息

## 通信方式
- IPC 或 WebSocket：wechat-link ↔ 浮窗主进程
- 手机发消息 → wechat-bridge 轮询 → IPC 通知浮窗 → 角色气泡显示

## 状态
🔜 待开发
