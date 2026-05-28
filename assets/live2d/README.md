// assets/live2d/ — Live2D 模型与 SDK
//
// 目录结构：
//   yumi/          ← 会长姐姐的 Live2D Cubism 3 模型（17 种表情 + 物理 + 动作）
//   sdk/           ← Live2D Cubism SDK for Web 核心运行时（需手动下载）
//
// ## 获取 SDK Core
//
// 1. 打开 https://www.live2d.com/download/cubism-sdk/
// 2. 下载 "Cubism SDK for Web"（最新版本）
// 3. 解压后找到 Core/live2dcubismcore.min.js
// 4. 复制到 assets/live2d/sdk/live2dcubismcore.min.js
//
// 不需要 SDK 中的 Framework 源码 — pixi-live2d-display 已集成框架层。
//
// ## 模型信息
//
// - 格式：Cubism 3.0 (.moc3)
// - 贴图：8192×8192 (yumi.8192/texture_00.png)
// - 物理：完整（头发、耳朵、衣服、手臂）
// - 参数：200+ 可驱动参数
// - 表情：17 种 .exp3.json
// - 动作：wave.motion3.json, tear.motion3.json
