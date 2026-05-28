# 提醒系统模块

**Phase 3：能陪**

## 职责
- 读取 deadlines.json → 临近 deadline 轰炸式催稿
- 定时提醒（喝水、久坐、休息）
- 早安/晚安问候调度
- 空闲随机动作触发

## 数据源
- `~/.claude-to-im/data/deadlines.json`
- 本地 `schedule.json` — 定时提醒配置

## 子模块
- `scheduler.js` — 定时任务调度
- `deadline-checker.js` — deadline 检查 + 催稿
- `idle-actions.js` — 空闲动作池（叹气、看表、翻文件）

## 依赖
- 复用 wechat-mcp 的 deadline 文件格式

## 状态
🔜 待开发
