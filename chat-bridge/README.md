# 对话桥接模块

**Phase 2：能说**

## 职责
- 封装 Claude API（Anthropic SDK）
- 会话管理（session 持久化）
- System prompt 注入（会长姐姐角色）
- 回复格式化（表情标记提取）

## 输入
- 用户文本 → API 请求

## 输出
- Claude 回复文本 + 表情标记 → 渲染进程

## 依赖
- 无外部模块依赖，可独立测试（node claude-api.js "hello"）

## 状态
🔜 待开发
