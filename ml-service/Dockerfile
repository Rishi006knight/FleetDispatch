# ── Python ML Service ─────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system deps for opencv-headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (1000 is default for Hugging Face Spaces)
RUN useradd -m -u 1000 user

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY app/ ./app/

RUN chown -R user:user /app
USER user

# Hugging Face Spaces default port is 7860
EXPOSE 7860
ENV PORT=7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
