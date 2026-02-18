"""Full accompaniment arranger: piano, strings, bass, drums."""
import random
from typing import List, Tuple

import pretty_midi

from .theory import INSTRUMENTS, DRUM_NOTES, get_key_root_midi, get_scale_notes
from .chord_progression import build_chord_sequence, chord_sequence_to_midi_instrument


# -- Bass line --

def create_bass_line(
    chords: List[Tuple[List[int], float, float]],
    style: str,
    bpm: float,
) -> pretty_midi.Instrument:
    """Build a bass line that follows chord roots."""
    bass = pretty_midi.Instrument(
        program=INSTRUMENTS['bass_electric'],
        name='Bass',
    )
    spb = 60.0 / bpm          # seconds per beat
    half_bar = spb * 2

    for chord_notes, start, end in chords:
        root = min(chord_notes) - 12   # one octave below chord voicing
        fifth = root + 7

        if style == 'ballad':
            # Simple whole-bar root
            bass.notes.append(pretty_midi.Note(
                velocity=75, pitch=root, start=start, end=end - 0.1,
            ))

        elif style == 'cpop':
            # Root + 5th split at half-bar
            bass.notes.append(pretty_midi.Note(
                velocity=82, pitch=root, start=start, end=start + half_bar - 0.05,
            ))
            bass.notes.append(pretty_midi.Note(
                velocity=72, pitch=fifth, start=start + half_bar, end=end - 0.05,
            ))

        else:  # pop
            # Beat 1: root, beat 3 (or 2.5): root/5th
            bass.notes.append(pretty_midi.Note(
                velocity=85, pitch=root, start=start, end=start + spb - 0.05,
            ))
            beat2_5_start = start + spb * 2.5
            bass.notes.append(pretty_midi.Note(
                velocity=72,
                pitch=fifth if random.random() > 0.35 else root,
                start=beat2_5_start,
                end=beat2_5_start + spb - 0.05,
            ))

    return bass


# -- Drum pattern --

def create_drum_pattern(bars: int, bpm: float, style: str) -> pretty_midi.Instrument:
    """Create a drum part using General MIDI drum map."""
    drums = pretty_midi.Instrument(program=0, is_drum=True, name='Drums')
    spb = 60.0 / bpm
    eighth = spb / 2
    sixteenth = spb / 4

    def dn(note_num: int, time: float, velocity: int):
        drums.notes.append(
            pretty_midi.Note(velocity=velocity, pitch=note_num,
                             start=time, end=time + 0.08)
        )

    for bar in range(bars):
        bs = bar * spb * 4   # bar start

        if style == 'ballad':
            # Soft: kick on 1, snare on 2&4, light 8th hats
            dn(DRUM_NOTES['kick'],  bs, 75)
            dn(DRUM_NOTES['snare'], bs + spb, 60)
            dn(DRUM_NOTES['snare'], bs + spb * 3, 65)
            for i in range(8):
                dn(DRUM_NOTES['hihat_closed'], bs + i * eighth, 40)
            if bar % 4 == 0:
                dn(DRUM_NOTES['crash'], bs, 80)

        elif style == 'cpop':
            # C-pop: double kick, strong snare, 16th hats
            dn(DRUM_NOTES['kick'],  bs, 90)
            dn(DRUM_NOTES['kick'],  bs + spb * 2, 80)
            dn(DRUM_NOTES['snare'], bs + spb, 78)
            dn(DRUM_NOTES['snare'], bs + spb * 3, 82)
            for i in range(16):
                vel = 55 if i % 2 == 0 else 38
                dn(DRUM_NOTES['hihat_closed'], bs + i * sixteenth, vel)
            if bar % 4 == 0:
                dn(DRUM_NOTES['crash'], bs, 90)

        else:  # pop
            # Standard pop + syncopated kick
            dn(DRUM_NOTES['kick'],  bs, 92)
            dn(DRUM_NOTES['kick'],  bs + spb * 2.5, 75)   # syncopation
            dn(DRUM_NOTES['snare'], bs + spb, 82)
            dn(DRUM_NOTES['snare'], bs + spb * 3, 85)
            for i in range(8):
                vel = 62 if i % 2 == 0 else 48
                dn(DRUM_NOTES['hihat_closed'], bs + i * eighth, vel)
            if bar % 2 == 1:   # open hat on up-beat of bar 2, 4, ...
                dn(DRUM_NOTES['hihat_open'], bs + spb * 1.5, 50)
            if bar % 4 == 0:
                dn(DRUM_NOTES['crash'], bs, 88)

    return drums


# -- Strings pad --

def create_strings_pad(
    chords: List[Tuple[List[int], float, float]],
    style: str,
) -> pretty_midi.Instrument:
    """Sustained string pad an octave above chord voicing."""
    strings = pretty_midi.Instrument(program=INSTRUMENTS['strings'], name='Strings')
    base_vel = 50 if style == 'ballad' else 42

    for chord_notes, start, end in chords:
        for pitch in chord_notes:
            upper = pitch + 12
            if upper <= 84:
                strings.notes.append(pretty_midi.Note(
                    velocity=base_vel,
                    pitch=upper,
                    start=start + 0.15,   # slight attack delay
                    end=end - 0.08,
                ))
    return strings


# -- Full arrangement builder --

def build_full_accompaniment(
    key: str,
    style: str,
    bars: int,
    bpm: float,
) -> Tuple[pretty_midi.PrettyMIDI, List[Tuple[List[int], float, float]]]:
    """
    Assemble complete accompaniment MIDI with four tracks:
      Piano   -- Ch.1 (broken or arpeggiated chords)
      Strings -- Ch.2 (sustained pad)
      Bass    -- Ch.3 (root-based bass line)
      Drums   -- Ch.10 (GM drum channel)

    Returns (PrettyMIDI, chord_sequence).
    """
    midi = pretty_midi.PrettyMIDI(initial_tempo=bpm)

    chords = build_chord_sequence(key, style, bars, bpm)

    # Piano
    piano_pattern = 'broken' if style == 'ballad' else 'arpeggiated'
    piano = chord_sequence_to_midi_instrument(
        chords,
        instrument_program=INSTRUMENTS['piano'],
        pattern=piano_pattern,
        velocity=62,
        name='Piano',
    )
    midi.instruments.append(piano)

    # Strings
    strings = create_strings_pad(chords, style)
    midi.instruments.append(strings)

    # Bass
    bass = create_bass_line(chords, style, bpm)
    midi.instruments.append(bass)

    # Drums
    drums = create_drum_pattern(bars, bpm, style)
    midi.instruments.append(drums)

    return midi, chords
