# Stage 1: Build .NET
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["backend/MidoLearning.Api/MidoLearning.Api.csproj", "backend/MidoLearning.Api/"]
RUN dotnet restore "backend/MidoLearning.Api/MidoLearning.Api.csproj"

COPY backend/MidoLearning.Api/ backend/MidoLearning.Api/
RUN dotnet build "backend/MidoLearning.Api/MidoLearning.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "backend/MidoLearning.Api/MidoLearning.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Final (multi-language runtime)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install Python 3 + system dependencies for audio processing
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    libsndfile1 fluidsynth ffmpeg wget \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY music-producer/requirements.txt /app/music-producer/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /app/music-producer/requirements.txt

# Copy Python scripts
COPY music-producer/ /app/music-producer/

# Download SoundFont (non-fatal if network unavailable during build)
RUN mkdir -p /app/music-producer/soundfonts && \
    wget -q -O /app/music-producer/soundfonts/GeneralUser.sf2 \
    "https://github.com/mrbumpy409/GeneralUser-GS/raw/master/releases/GeneralUser%20GS%201.471.sf2" \
    || echo "SoundFont download skipped, MIDI rendering may be unavailable"

# Create task output directory (Cloud Run /tmp is in-memory, survives container lifetime)
RUN mkdir -p /tmp/music_tasks

# Copy .NET application
COPY --from=publish /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "MidoLearning.Api.dll"]
