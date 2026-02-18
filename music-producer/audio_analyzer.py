"""Audio recording analyzer.

Extracts musical information from a recorded audio file:
  - Key (Krumhansl-Schmuckler algorithm)
  - BPM (librosa beat tracker)
  - Melodic motif (first distinctive pitch sequence)
  - Confidence score
"""
import logging
import os
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# -- Krumhansl-Schmuckler Key Profiles --
# Source: Krumhansl (1990), Cognitive Foundations of Musical Pitch
# Values represent perceptual stability of each pitch class in the key.

_KS_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09,
                       2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_KS_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53,
                       2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F',
              'F#', 'G', 'G#', 'A', 'A#', 'B']

# Which scale name to use for each detected mode
SCALE_FOR_MODE = {
    'major': 'major',
    'minor': 'minor',
}


def _pearson(a: np.ndarray, b: np.ndarray) -> float:
    """Pearson correlation between two arrays."""
    ma, mb = a.mean(), b.mean()
    num = np.sum((a - ma) * (b - mb))
    den = np.sqrt(np.sum((a - ma) ** 2) * np.sum((b - mb) ** 2))
    if den == 0:
        return 0.0
    return float(num / den)


def detect_key_ks(pitch_class_histogram: np.ndarray) -> Tuple[str, str, float]:
    """
    Apply Krumhansl-Schmuckler algorithm to a 12-element pitch-class histogram.

    Returns (note_name, mode, confidence) where confidence is the best
    Pearson correlation value [0, 1].
    """
    hist = pitch_class_histogram.copy()
    if hist.sum() == 0:
        return 'C', 'major', 0.0

    best_r = -2.0
    best_pc = 0
    best_mode = 'major'

    for pc in range(12):
        # Rotate the histogram so 'pc' aligns with the profile's root
        rotated = np.roll(hist, -pc)

        r_major = _pearson(rotated, _KS_MAJOR)
        r_minor = _pearson(rotated, _KS_MINOR)

        if r_major > best_r:
            best_r, best_pc, best_mode = r_major, pc, 'major'
        if r_minor > best_r:
            best_r, best_pc, best_mode = r_minor, pc, 'minor'

    # Normalize correlation to 0-1 confidence
    confidence = max(0.0, min(1.0, (best_r + 1) / 2))
    return NOTE_NAMES[best_pc], best_mode, confidence


# -- AnalysisResult dataclass --

@dataclass
class AnalysisResult:
    key: str                          # e.g. "G"
    scale: str                        # "major" | "minor" | "pentatonic_major"
    bpm: float                        # detected tempo
    motif_notes: List[int]            # MIDI pitch values of motif
    motif_rhythm: List[float]         # beat durations for each motif note
    confidence: float                 # key-detection confidence 0-1
    source: str = 'recording'         # "recording" | "default"
    analysis_notes: str = ''          # human-readable summary


# -- Default fallback --

def default_analysis(key: str = 'C', bpm: float = 120.0, style: str = 'pop') -> AnalysisResult:
    """Return a default AnalysisResult when no recording is provided."""
    # Style-specific default motif contours (in scale steps from root, octave 4)
    MOTIF_TEMPLATES = {
        'ballad': [60, 62, 64, 62, 60, 59, 57, 60],      # gentle stepwise
        'pop':    [60, 64, 65, 67, 65, 64, 62, 60],      # arching phrase
        'cpop':   [60, 62, 64, 67, 69, 67, 64, 62],      # pentatonic rise
    }
    from engines.theory import NOTE_TO_SEMITONE
    root_offset = NOTE_TO_SEMITONE.get(key, 0)
    base_motif = MOTIF_TEMPLATES.get(style, MOTIF_TEMPLATES['pop'])
    motif = [(n + root_offset) % 128 for n in base_motif]
    return AnalysisResult(
        key=key, scale='major', bpm=bpm,
        motif_notes=motif,
        motif_rhythm=[0.5] * len(motif),
        confidence=0.0,
        source='default',
        analysis_notes=f'Default motif template (style: {style})',
    )


# -- AudioAnalyst --

class AudioAnalyst:
    """Analyzes an audio file and returns an AnalysisResult."""

    MIN_CONFIDENCE = 0.4   # Below this we mark the source as 'low_confidence'

    def analyze(self, audio_path: str) -> AnalysisResult:
        """
        Full analysis pipeline:
          1. Load audio with librosa
          2. Extract pitch contour (pyin)
          3. Build pitch-class histogram -> Key (KS)
          4. Beat tracking -> BPM
          5. Extract motif from pitched segments
        """
        try:
            import librosa
            import librosa.feature
        except ImportError:
            logger.error('librosa not installed. Run: pip install librosa soundfile')
            raise

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f'Audio file not found: {audio_path}')

        logger.info('AudioAnalyst: loading %s', audio_path)
        y, sr = librosa.load(audio_path, sr=22050, mono=True, duration=30.0)

        # -- 1. Pitch extraction (pyin) --
        f0, voiced_flag, _ = librosa.pyin(
            y, sr=sr,
            fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7'),
            frame_length=2048,
        )
        # Filter to voiced frames only
        voiced_f0 = f0[voiced_flag]
        if len(voiced_f0) == 0:
            logger.warning('No pitched frames detected -- using default')
            return AnalysisResult(
                key='C', scale='major', bpm=120.0,
                motif_notes=[60, 62, 64, 65, 67],
                motif_rhythm=[0.5] * 5,
                confidence=0.0,
                source='no_pitch',
                analysis_notes='No pitch detected, using defaults',
            )

        # -- 2. Pitch-class histogram for Key detection --
        midi_pitches = np.round(librosa.hz_to_midi(voiced_f0)).astype(int)
        pc_histogram = np.zeros(12)
        for mp in midi_pitches:
            pc_histogram[mp % 12] += 1

        key_name, mode, confidence = detect_key_ks(pc_histogram)
        scale = SCALE_FOR_MODE.get(mode, 'major')
        # Prefer pentatonic for low-confidence detection or cpop context
        if confidence < 0.55:
            scale = 'pentatonic_major'

        # -- 3. BPM --
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(np.atleast_1d(tempo)[0])
        # Clamp to sensible range
        while bpm < 60:
            bpm *= 2
        while bpm > 160:
            bpm /= 2
        bpm = max(60.0, min(140.0, round(bpm, 1)))

        # -- 4. Motif extraction --
        motif_notes, motif_rhythm = self._extract_motif(f0, voiced_flag, sr)

        notes_str = ', '.join([f'{NOTE_NAMES[m % 12]}{m // 12 - 1}' for m in motif_notes])
        source = 'recording' if confidence >= self.MIN_CONFIDENCE else 'low_confidence'
        analysis_notes = (
            f'Key: {key_name} {mode} (confidence {confidence:.0%}), '
            f'BPM: {bpm}, motif: {notes_str}'
        )
        logger.info('AudioAnalyst: %s', analysis_notes)

        return AnalysisResult(
            key=key_name,
            scale=scale,
            bpm=bpm,
            motif_notes=motif_notes,
            motif_rhythm=motif_rhythm,
            confidence=confidence,
            source=source,
            analysis_notes=analysis_notes,
        )

    def _extract_motif(
        self,
        f0: np.ndarray,
        voiced_flag: np.ndarray,
        sr: int,
    ) -> Tuple[List[int], List[float]]:
        """
        Extract a motif: the first 4-8 distinct sustained pitched notes.
        Groups consecutive voiced frames at the same pitch into note events.
        """
        try:
            import librosa
        except ImportError:
            return [60, 62, 64, 65], [0.5, 0.5, 0.5, 0.5]

        hop_length = 512
        frame_dur = hop_length / sr   # seconds per frame

        notes: List[Tuple[int, float]] = []   # (midi_pitch, duration_beats)
        current_pitch: Optional[int] = None
        current_dur = 0.0

        for i, (voiced, freq) in enumerate(zip(voiced_flag, f0)):
            if voiced and freq is not None and not np.isnan(freq):
                midi = int(round(librosa.hz_to_midi(freq)))
                if midi == current_pitch:
                    current_dur += frame_dur
                else:
                    if current_pitch is not None and current_dur >= 0.1:
                        notes.append((current_pitch, current_dur))
                    current_pitch = midi
                    current_dur = frame_dur
            else:
                if current_pitch is not None and current_dur >= 0.1:
                    notes.append((current_pitch, current_dur))
                current_pitch = None
                current_dur = 0.0

        if current_pitch is not None and current_dur >= 0.1:
            notes.append((current_pitch, current_dur))

        # Take the first 4-8 most prominent notes
        notes = notes[:8] if len(notes) >= 4 else (notes * 2)[:8]
        if not notes:
            return [60, 62, 64, 65], [0.5, 0.5, 0.5, 0.5]

        # Normalise durations to beat fractions (quarter = 1.0)
        max_dur = max(d for _, d in notes)
        beat_scale = 1.0 / max(max_dur, 0.25)
        pitches = [p for p, _ in notes]
        rhythms = [min(2.0, max(0.25, round(d * beat_scale * 4) / 4))
                   for _, d in notes]

        return pitches, rhythms
