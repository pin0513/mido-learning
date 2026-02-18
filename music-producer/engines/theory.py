"""Music theory constants and utilities for commercial pop production."""
from typing import List, Dict

# Note names to semitone offsets from C
NOTE_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'Db': 1,
    'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4,
    'F': 5, 'F#': 6, 'Gb': 6,
    'G': 7, 'G#': 8, 'Ab': 8,
    'A': 9, 'A#': 10, 'Bb': 10,
    'B': 11,
}

# Scale intervals (semitones from root)
SCALES = {
    'major':            [0, 2, 4, 5, 7, 9, 11],
    'minor':            [0, 2, 3, 5, 7, 8, 10],
    'pentatonic_major': [0, 2, 4, 7, 9],
    'pentatonic_minor': [0, 3, 5, 7, 10],
    'cpop':             [0, 2, 4, 7, 9],   # Major pentatonic, very common in C-pop
}

# Style -> scale mapping
STYLE_SCALE = {
    'ballad': 'major',
    'pop':    'major',
    'cpop':   'cpop',
}

# Chord intervals from root
CHORD_TYPES: Dict[str, List[int]] = {
    'maj':  [0, 4, 7],
    'min':  [0, 3, 7],
    'dim':  [0, 3, 6],
    'aug':  [0, 4, 8],
    'maj7': [0, 4, 7, 11],
    'min7': [0, 3, 7, 10],
    'dom7': [0, 4, 7, 10],
    'sus4': [0, 5, 7],
}

# Chord quality for each degree in major scale (0-indexed, I ii iii IV V vi vii)
MAJOR_SCALE_CHORDS = ['maj', 'min', 'min', 'maj', 'dom7', 'min', 'dim']

# Common chord progressions (scale degrees, 0-indexed)
PROGRESSIONS: Dict[str, List[int]] = {
    'I_V_vi_IV':  [0, 4, 5, 3],   # Most popular pop
    'vi_IV_I_V':  [5, 3, 0, 4],   # Emotional / ballad
    'I_IV_vi_V':  [0, 3, 5, 4],   # C-pop common
    'I_vi_IV_V':  [0, 5, 3, 4],   # Classic pop
    'I_IV_V_I':   [0, 3, 4, 0],   # Simple cadence
}

# Progressions preferred per style
STYLE_PROGRESSIONS = {
    'ballad': ['vi_IV_I_V', 'I_V_vi_IV'],
    'cpop':   ['I_IV_vi_V', 'I_V_vi_IV', 'vi_IV_I_V'],
    'pop':    ['I_V_vi_IV', 'vi_IV_I_V', 'I_IV_vi_V', 'I_vi_IV_V', 'I_IV_V_I'],
}

# Rhythm patterns: durations in beats (quarter note = 1.0)
RHYTHM_PATTERNS: Dict[str, List[float]] = {
    'ballad': [2.0, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 2.0],
    'pop':    [0.5, 0.5, 1.0, 0.5, 0.5, 0.5, 0.5, 1.0, 0.5, 0.5, 1.0, 0.5, 0.5],
    'cpop':   [1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, 1.0],
}

# General MIDI instrument programs
INSTRUMENTS = {
    'piano':          0,    # Acoustic Grand Piano
    'bright_piano':   1,    # Bright Acoustic Piano
    'electric_piano': 4,    # Electric Piano 1
    'strings':        48,   # String Ensemble 1
    'slow_strings':   49,   # String Ensemble 2
    'pad':            89,   # Pad 2 (warm)
    'choir':          52,   # Choir Aahs
    'voice':          53,   # Voice Oohs
    'bass_acoustic':  32,   # Acoustic Bass
    'bass_electric':  33,   # Electric Bass (finger)
    'bass_picked':    34,   # Electric Bass (pick)
    'synth_bass':     38,   # Synth Bass 1
    'drums':          0,    # (channel 9 is always drums in GM)
}

# General MIDI drum note numbers
DRUM_NOTES = {
    'kick':         36,
    'snare':        38,
    'hihat_closed': 42,
    'hihat_open':   46,
    'crash':        49,
    'ride':         51,
    'tom_low':      41,
    'tom_mid':      43,
    'tom_high':     50,
    'clap':         39,
    'rimshot':      37,
}


def note_name_to_midi(note: str, octave: int = 4) -> int:
    """Convert note name + octave to MIDI number. Middle C (C4) = 60."""
    semitone = NOTE_TO_SEMITONE.get(note, 0)
    return (octave + 1) * 12 + semitone


def get_scale_notes(root_midi: int, scale_name: str, octaves: int = 4) -> List[int]:
    """Return all MIDI pitches in a scale across multiple octaves."""
    intervals = SCALES.get(scale_name, SCALES['major'])
    notes: List[int] = []
    for oct_offset in range(-2, octaves):
        for interval in intervals:
            midi = root_midi + interval + oct_offset * 12
            if 0 <= midi <= 127:
                notes.append(midi)
    return sorted(set(notes))


def get_chord_notes(root_midi: int, chord_type: str, inversion: int = 0) -> List[int]:
    """Return MIDI pitches for a chord with optional inversion."""
    intervals = CHORD_TYPES.get(chord_type, [0, 4, 7])
    notes = [root_midi + i for i in intervals]
    for _ in range(inversion % len(notes)):
        notes[0] += 12
        notes = notes[1:] + [notes[0]]
    return notes


def get_key_root_midi(key: str, octave: int = 4) -> int:
    """Get MIDI pitch for the root of a given key in the specified octave."""
    return note_name_to_midi(key, octave)
