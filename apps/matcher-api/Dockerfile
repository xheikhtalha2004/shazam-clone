FROM python:3.11-slim

WORKDIR /app

# Install system dependencies:
# - ffmpeg: audio decoding for MP3/M4A/WebM (librosa/audioread backend)
# - libsndfile1: WAV/FLAC decoding (soundfile backend)
# - build-essential: needed for compiling some Python C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create a non-root user for security
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

# Expose port 8000
EXPOSE 8000

# Start the API server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
