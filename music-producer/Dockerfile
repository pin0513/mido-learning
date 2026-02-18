FROM python:3.11-slim

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    fluidsynth \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create output directory
RUN mkdir -p /app/output /app/soundfonts

# Download GeneralUser GS SoundFont (lightweight)
RUN wget -q -O /app/soundfonts/GeneralUser.sf2 \
    https://github.com/mrbumpy409/GeneralUser-GS/raw/master/releases/GeneralUser%20GS%201.471.sf2 \
    || echo "SoundFont download failed, will use fallback"

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
