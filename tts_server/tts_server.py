"""
korokaki OS — TTS 语音服务器
GPT-SoVITS 推理服务，Flask HTTP API
用法: python tts_server.py --model_path model.pth --port 9880
"""

import argparse
import io
import logging
import os
import sys

from flask import Flask, request, Response, jsonify

logging.basicConfig(level=logging.INFO, format="[tts] %(levelname)s %(message)s")
log = logging.getLogger("tts")

app = Flask(__name__)

# 全局模型实例
_tts = None
_ref_audio = None


def load_model(model_path: str, gpt_path: str = None, ref_audio_path: str = None):
    """加载 GPT-SoVITS 模型"""
    global _tts, _ref_audio

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"模型文件不存在: {model_path}")

    log.info("加载模型: %s", model_path)

    # 尝试 GPT-SoVITS v2/v3 导入
    try:
        from GPT_SoVITS.TTS_infer_pack.TTS import TTS

        # v2/v3 使用 TTS 类
        _tts = TTS(
            sovits_path=model_path,
            gpt_path=gpt_path or model_path,  # 部分模型合并了 GPT + SoVITS
            device="cpu",
            is_half=False,
        )
        log.info("GPT-SoVITS v2/v3 模型加载成功 (TTS 类)")
    except ImportError:
        pass
    except Exception as e:
        log.warning("TTS 类加载失败: %s, 尝试 v1 API", e)
        _tts = None

    # 回退: GPT-SoVITS v1 inference_webui
    if _tts is None:
        try:
            import GPT_SoVITS.inference_webui as infer

            # v1 通过全局变量配置
            infer.change_sovits_weights(model_path)
            if gpt_path:
                infer.change_gpt_weights(gpt_path)
            _tts = infer
            log.info("GPT-SoVITS v1 模型加载成功 (inference_webui)")
        except ImportError:
            raise RuntimeError(
                "无法导入 GPT-SoVITS。请确保已安装:\n"
                "  pip install GPT-SoVITS\n"
                "或从源码安装: https://github.com/RVC-Boss/GPT-SoVITS"
            )

    # 加载参考音频
    if ref_audio_path and os.path.exists(ref_audio_path):
        _ref_audio = ref_audio_path
        log.info("参考音频: %s", ref_audio_path)
    else:
        log.warning("未提供参考音频，音色可能不稳定")


def synthesize(text: str, speed: float = 1.0) -> bytes:
    """调用 GPT-SoVITS 合成语音，返回 WAV 字节"""
    global _tts, _ref_audio

    if _tts is None:
        raise RuntimeError("模型未加载")

    # 根据加载的 API 类型调用
    tts_type = type(_tts).__name__

    if tts_type == "TTS":
        # GPT-SoVITS v2/v3 TTS 类
        sample_rate, audio = _tts.infer(
            text=text,
            ref_audio_path=_ref_audio,
            speed=speed,
        )
        # 转换为 WAV 字节
        import numpy as np
        import struct
        import wave

        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            audio_int16 = (audio * 32767).astype(np.int16)
            wf.writeframes(audio_int16.tobytes())
        return buf.getvalue()

    elif hasattr(_tts, "get_tts_wav"):
        # v1 inference_webui
        import torch

        with torch.no_grad():
            result = _tts.get_tts_wav(
                text=text,
                text_language="zh",
                speed=speed,
                ref_audio_path=_ref_audio,
            )
        # result 是 (sample_rate, audio_numpy) 或 bytes
        if isinstance(result, tuple):
            sample_rate, audio = result
            import numpy as np
            import struct
            import wave

            buf = io.BytesIO()
            with wave.open(buf, "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(sample_rate)
                audio_int16 = (audio * 32767).astype(np.int16)
                wf.writeframes(audio_int16.tobytes())
            return buf.getvalue()
        return result

    else:
        raise RuntimeError(f"未知的 TTS API 类型: {tts_type}")


# ---- Flask 路由 ----

@app.route("/health")
def health():
    if _tts is None:
        return jsonify({"status": "loading"}), 503
    return jsonify({"status": "ok"})


@app.route("/tts")
def tts():
    text = request.args.get("text", "").strip()
    if not text:
        return jsonify({"error": "缺少 text 参数"}), 400
    if len(text) > 300:
        text = text[:300]

    speed = request.args.get("speed", "1.0")
    try:
        speed = float(speed)
        speed = max(0.5, min(2.0, speed))
    except ValueError:
        speed = 1.0

    try:
        wav_bytes = synthesize(text, speed)
        return Response(wav_bytes, mimetype="audio/wav")
    except Exception as e:
        log.exception("合成失败: %s", text)
        return jsonify({"error": str(e)}), 500


def main():
    parser = argparse.ArgumentParser(description="korokaki TTS Server")
    parser.add_argument("--model_path", default="assets/tts/model.pth", help="SoVITS 模型路径")
    parser.add_argument("--gpt_path", default=None, help="GPT 模型路径（可选，部分模型合并）")
    parser.add_argument("--ref_audio", default="assets/tts/ref.wav", help="参考音频路径")
    parser.add_argument("--port", type=int, default=9880, help="服务端口")
    args = parser.parse_args()

    # 路径相对于项目根目录
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    model_path = os.path.join(root, args.model_path) if not os.path.isabs(args.model_path) else args.model_path
    ref_audio = os.path.join(root, args.ref_audio) if args.ref_audio and not os.path.isabs(args.ref_audio) else args.ref_audio

    log.info("启动 TTS 服务器...")
    log.info("模型: %s", model_path)
    log.info("端口: %s", args.port)

    try:
        load_model(model_path, args.gpt_path, ref_audio)
    except Exception as e:
        log.error("模型加载失败: %s", e)
        log.warning("服务器继续运行 (GET /tts 将返回 500)")
        # 不退出——让 Electron 知道服务器在运行但模型有问题

    app.run(host="127.0.0.1", port=args.port, debug=False)


if __name__ == "__main__":
    main()
