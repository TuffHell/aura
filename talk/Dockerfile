# AURA talk — production image.
# Brain: Claude (set ANTHROPIC_API_KEY) — light + cheap for an always-on site.
# Speech: Whisper (STT) + Piper (TTS) run inside this container on CPU, so audio
# stays self-hosted. The Whisper model and the Piper voice are baked in at build.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    OMP_NUM_THREADS=2

# ffmpeg: decode browser audio + encode voice. espeak-ng: Piper phonemization.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg espeak-ng \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

# bake the Whisper model into the image so first request is fast (no runtime DL)
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base.en')"

# app code + the Piper voice (voices/en_US-amy-medium.onnx is in the build context)
COPY . .

EXPOSE 8600
# scale-to-zero hosts send SIGINT; uvicorn handles graceful shutdown
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8600"]
