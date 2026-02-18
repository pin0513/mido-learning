"""MIDI -> WAV/MP3 renderer via FluidSynth CLI + pydub mixer."""
import logging
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# -- SoundFont configuration --

SOUNDFONT_PATH = Path('soundfonts/GeneralUser.sf2')

# Ordered list of download URLs to try (GeneralUser GS - free license)
SOUNDFONT_DOWNLOAD_URLS = [
    # GitHub mirror of GeneralUser GS v1.471
    'https://github.com/nicowillis/nicowillis.github.io/raw/main/files/GeneralUser.sf2',
    # Alternative mirror
    'https://raw.githubusercontent.com/urish/cinto/master/media/GeneralUser%20GS%20Software%20Synth%20v1.44.sf2',
]

MIN_SF2_SIZE = 100 * 1024   # 100 KB sanity check (auto-download detection)


def download_soundfont(path: Path = SOUNDFONT_PATH) -> bool:
    """
    Download a SoundFont (.sf2) to *path* if it does not already exist.
    Returns True on success (file present with sane size).
    """
    if path.exists() and path.stat().st_size > MIN_SF2_SIZE:
        logger.info('SoundFont already present: %s (%.1f MB)',
                    path, path.stat().st_size / 1_000_000)
        return True

    path.parent.mkdir(parents=True, exist_ok=True)
    logger.info('SoundFont not found -- attempting download ...')

    try:
        import requests
    except ImportError:
        logger.error('`requests` not installed; cannot auto-download SoundFont.')
        return False

    for url in SOUNDFONT_DOWNLOAD_URLS:
        try:
            logger.info('Trying: %s', url)
            resp = requests.get(url, stream=True, timeout=90)
            if resp.status_code == 200:
                with path.open('wb') as fh:
                    for chunk in resp.iter_content(chunk_size=16_384):
                        fh.write(chunk)
                if path.stat().st_size > MIN_SF2_SIZE:
                    logger.info('SoundFont downloaded successfully -> %s (%.1f MB)',
                                path, path.stat().st_size / 1_000_000)
                    return True
                path.unlink(missing_ok=True)   # discard corrupt/partial file
        except Exception as exc:
            logger.warning('Download failed from %s: %s', url, exc)

    logger.error(
        'Could not download SoundFont automatically.\n'
        'Please place a .sf2 file at: %s\n'
        'Suggested source: https://schristiancollins.com/generaluser.php',
        path.resolve(),
    )
    return False


def check_fluidsynth() -> bool:
    """Return True if fluidsynth is available on PATH."""
    try:
        result = subprocess.run(
            ['fluidsynth', '--version'],
            capture_output=True, text=True, timeout=5,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


# -- MIDI rendering --

def midi_to_wav(
    midi_path: str,
    wav_path: str,
    soundfont: str = str(SOUNDFONT_PATH),
    sample_rate: int = 44100,
) -> bool:
    """
    Render *midi_path* -> *wav_path* using FluidSynth CLI.
    Returns True on success.
    """
    if not Path(soundfont).exists():
        logger.error('SoundFont not found: %s', soundfont)
        return False

    # FluidSynth 2.x: flags (-F, -r) must come BEFORE soundfont and midi arguments
    cmd = [
        'fluidsynth',
        '-ni',                  # no interactive mode
        '-F', wav_path,         # output file (must precede soundfont)
        '-r', str(sample_rate),
        soundfont,
        midi_path,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if result.returncode == 0 and Path(wav_path).exists() and Path(wav_path).stat().st_size > 0:
            logger.info('Rendered MIDI -> WAV: %s', wav_path)
            return True
        logger.error('FluidSynth error (rc=%d): %s', result.returncode, result.stderr[:400])
        return False
    except FileNotFoundError:
        logger.error('fluidsynth not found. Install: brew install fluidsynth')
        return False
    except subprocess.TimeoutExpired:
        logger.error('FluidSynth timed out for: %s', midi_path)
        return False


# -- Audio mixing --

def mix_wav_files(
    wav_files: List[str],
    output_path: str,
    db_offsets: Optional[List[float]] = None,
) -> bool:
    """
    Overlay multiple WAV files and export as MP3 192 kbps.
    *db_offsets* is a list of dB adjustments per track (0 = unchanged).
    Returns True on success.
    """
    try:
        from pydub import AudioSegment
    except ImportError:
        logger.error('pydub not installed. Run: pip install pydub')
        return False

    if not wav_files:
        logger.error('No WAV files to mix.')
        return False

    valid_wavs = [w for w in wav_files if Path(w).exists() and Path(w).stat().st_size > 0]
    if not valid_wavs:
        logger.error('No valid WAV files found.')
        return False

    try:
        mixed: AudioSegment = AudioSegment.from_wav(valid_wavs[0])
        if db_offsets and db_offsets[0] != 0:
            mixed = mixed + db_offsets[0]

        for i, wav_path in enumerate(valid_wavs[1:], start=1):
            seg = AudioSegment.from_wav(wav_path)
            if db_offsets and i < len(db_offsets) and db_offsets[i] != 0:
                seg = seg + db_offsets[i]
            # Pad shorter track to match length
            if len(seg) < len(mixed):
                seg = seg + AudioSegment.silent(duration=len(mixed) - len(seg))
            elif len(mixed) < len(seg):
                mixed = mixed + AudioSegment.silent(duration=len(seg) - len(mixed))
            mixed = mixed.overlay(seg)

        mixed.export(output_path, format='mp3', bitrate='192k')
        logger.info('Exported MP3: %s', output_path)
        return True

    except Exception as exc:
        logger.error('Mixing failed: %s', exc, exc_info=True)
        return False


# -- High-level render pipeline --

def render_all(
    main_midi_path: str,
    accomp_midi_path: str,
    output_dir: str,
    soundfont: str = str(SOUNDFONT_PATH),
) -> Dict[str, Optional[str]]:
    """
    Full render pipeline:
      1. MIDI -> WAV for each track
      2. Mix WAV tracks -> MP3

    Returns a dict of {label: file_path | None}.
    """
    os.makedirs(output_dir, exist_ok=True)
    results: Dict[str, Optional[str]] = {
        'main_wav':   None,
        'accomp_wav': None,
        'mp3':        None,
    }

    wav_files: List[str] = []
    db_offsets: List[float] = []

    # Render main melody
    main_wav = os.path.join(output_dir, 'main.wav')
    if midi_to_wav(main_midi_path, main_wav, soundfont):
        results['main_wav'] = main_wav
        wav_files.append(main_wav)
        db_offsets.append(0.0)

    # Render accompaniment
    accomp_wav = os.path.join(output_dir, 'accompaniment.wav')
    if midi_to_wav(accomp_midi_path, accomp_wav, soundfont):
        results['accomp_wav'] = accomp_wav
        wav_files.append(accomp_wav)
        db_offsets.append(-3.0)   # -3 dB -- slightly behind melody

    # Mix everything to MP3
    if wav_files:
        mp3_path = os.path.join(output_dir, 'output.mp3')
        if mix_wav_files(wav_files, mp3_path, db_offsets):
            results['mp3'] = mp3_path

    return results
