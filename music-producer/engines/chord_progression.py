"""Chord progression generator for commercial pop styles."""
import random
from typing import List, Tuple

import pretty_midi

from .theory import (
    PROGRESSIONS, STYLE_PROGRESSIONS, MAJOR_SCALE_CHORDS, SCALES,
    get_chord_notes, get_key_root_midi,
)


def get_progression(style: str) -> List[int]:
    """Select a chord progression appropriate for the given style."""
    choices = STYLE_PROGRESSIONS.get(style, list(PROGRESSIONS.values()))
    prog_name = random.choice(choices) if isinstance(choices[0], str) else None
    if prog_name:
        return PROGRESSIONS[prog_name]
    return random.choice(list(PROGRESSIONS.values()))


def build_chord_sequence(
    key: str,
    style: str,
    bars: int,
    bpm: float,
) -> List[Tuple[List[int], float, float]]:
    """
    Build list of (chord_notes, start_sec, end_sec) -- one chord per bar.
    Chord voicing is in the mid range (around C4).
    """
    root_midi = get_key_root_midi(key, octave=4)
    scale_intervals = SCALES['major']
    progression = get_progression(style)
    seconds_per_bar = (60.0 / bpm) * 4

    chords: List[Tuple[List[int], float, float]] = []
    for bar in range(bars):
        degree = progression[bar % len(progression)]
        chord_root = root_midi + scale_intervals[degree % 7]
        chord_type = MAJOR_SCALE_CHORDS[degree % 7]

        # Occasionally add 7th for colour
        if random.random() < 0.25 and chord_type in ('maj', 'min'):
            chord_type = 'maj7' if chord_type == 'maj' else 'min7'

        # Voicing: put chords one octave below middle to avoid clashing with melody
        notes = get_chord_notes(chord_root - 12, chord_type)
        start = bar * seconds_per_bar
        end = start + seconds_per_bar
        chords.append((notes, start, end))

    return chords


def chord_sequence_to_midi_instrument(
    chords: List[Tuple[List[int], float, float]],
    instrument_program: int = 0,
    pattern: str = 'block',
    velocity: int = 68,
    name: str = 'Chords',
) -> pretty_midi.Instrument:
    """
    Convert chord sequence to MIDI instrument.

    pattern options:
      'block'       -- all chord notes played simultaneously
      'arpeggiated' -- notes played one at a time ascending
      'broken'      -- Alberti-bass style (low, high, mid, high)
    """
    instrument = pretty_midi.Instrument(program=instrument_program, name=name)

    for notes, start, end in chords:
        duration = end - start
        sorted_notes = sorted(notes)

        if pattern == 'block':
            for pitch in sorted_notes:
                note = pretty_midi.Note(
                    velocity=velocity,
                    pitch=pitch,
                    start=start,
                    end=end - 0.05,
                )
                instrument.notes.append(note)

        elif pattern == 'arpeggiated':
            step = duration / max(len(sorted_notes), 1)
            for i, pitch in enumerate(sorted_notes):
                note = pretty_midi.Note(
                    velocity=velocity,
                    pitch=pitch,
                    start=start + i * step,
                    end=end - 0.05,
                )
                instrument.notes.append(note)

        elif pattern == 'broken':
            beat = duration / 4
            # Alberti pattern: low, high, mid, high
            if len(sorted_notes) >= 3:
                pattern_pitches = [sorted_notes[0], sorted_notes[-1], sorted_notes[1], sorted_notes[-1]]
            else:
                pattern_pitches = sorted_notes * 2
            for i, pitch in enumerate(pattern_pitches[:4]):
                note = pretty_midi.Note(
                    velocity=velocity - 5,
                    pitch=pitch,
                    start=start + i * beat,
                    end=start + (i + 1) * beat - 0.04,
                )
                instrument.notes.append(note)

    return instrument
