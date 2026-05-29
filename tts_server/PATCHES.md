# GPT-SoVITS 兼容性补丁记录
# 日期: 2026-05-28
# 目的: 让新版 GPT-SoVITS api.py 兼容旧版 v2 模型 (list config 格式)

## 环境
- Python 3.12.8
- PyTorch 2.6+ CPU
- GPT-SoVITS @ commit 08d627c

## 额外安装的 pip 包
pip install torchcodec onnxruntime opencc g2p_en
# NLTK 数据 (需要关闭 SSL 验证):
python -c "import nltk, ssl; ssl._create_default_https_context = ssl._create_unverified_context; nltk.download('averaged_perceptron_tagger_eng')"

## 需要创建的目录
mkdir -p GPT_SoVITS/pretrained_models/chinese-hubert-base
mkdir -p GPT_SoVITS/pretrained_models/fast_langdetect

## 需要下载的预训练模型 (放到 GPT_SoVITS/pretrained_models/)
1. chinese-roberta-wwm-ext-large/ → HF: hfl/chinese-roberta-wwm-ext-large
2. chinese-hubert-base/ → HF: lj1995/GPT-SoVITS (chinese-hubert-base 子目录)
3. s1bert25hz-2kh-longer-epoch=68e-step=50232.ckpt → HF: lj1995/GPT-SoVITS

## GPT-SoVITS 源码修改

### 1. api.py — config list → dict 兼容 (约 line 396)
旧版 v2 模型将 config 存为 list 而非 dict。
在 `hps = DictToAttrRecursive(hps)` 前加入 list→dict 转换逻辑。

### 2. api.py — 音频加载改用 soundfile (约 line 677)
`torchaudio.load()` 依赖 torchcodec DLL，改用 `soundfile.read()`。
新增 `load_audio()` 函数。

### 3. api.py — BERT/HuBERT 模型 float() 转换 (约 line 1327)
CPU 推理时需显式 `.float().to(device)`，否则 fp16 权重与 fp32 输入不匹配。

### 4. api.py — 调试日志 (约 line 499)
`change_gpt_sovits_weights` 异常捕获中增加 `logger.exception()`。

### 5. module/models.py — SynthesizerTrn flow n_layers 3→4 (约 line 909)
旧版 v2 模型的 ResidualCouplingBlock 使用 n_layers=3，新版代码为 4。
改为 3 以兼容旧权重。

### 6. module/models.py — TextEncoder ge_proj (约 line 201)
非 v2pro 模型的 ge 维度为 256 (gin_channels)，但 MRTE 期望 512。
新增 `self.ge_proj = nn.Conv1d(256, 512, 1)` 并在 forward 中投影。

### 7. module/core_vq.py — 单机推理兼容 (约 line 157)
`init_embed_` 函数无条件调用 `dist.get_rank()` 等分布式操作。
用 `dist.is_initialized()` 包裹，单机 CPU 直接执行 kmeans。

## 模型文件约定
- SoVITS 模型: desktop-mascot/assets/tts/model.pth (55MB)
- 模型索引: desktop-mascot/assets/tts/model.index (83MB)  
- 参考音频: desktop-mascot/assets/tts/ref.wav (5-10s 清晰语音)
- 参考文本: 必须与参考音频内容完全一致
