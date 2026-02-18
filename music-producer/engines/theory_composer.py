"""Deterministic theory-based melody composer.

Replaces the Markov chain approach with four rule layers:
  1. MotifDeveloper  -- transforms the recorded motif across sections
  2. TensionCurve    -- controls register / leap size per bar
  3. VoiceLeadingEngine -- smooths note-to-note motion
  4. CadenceFormula  -- places half/authentic cadences at structural points
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from .base_composer import BaseComposer, CompositionRequest, CompositionResult
from .theory import (
    NOTE_TO_SEMITONE, SCALES, STYLE_SCALE, RHYTHM_PATTERNS,
    get_scale_notes, get_key_root_midi,
)

logger = logging.getLogger(__name__)

# -- Tension curve --
# 8-bar tension values (repeating); higher = wider register, more leaps allowed
_TENSION_8 = [2, 3, 4, 5, 6, 7, 9, 2]


def _tension(bar: int) -> int:
    return _TENSION_8[bar % 8]


# -- MotifDeveloper --

class MotifDeveloper:
    """Transforms a seed motif through five development stages."""

    def __init__(self, motif: List[int], scale_notes: List[int]):
        self.motif = motif          # absolute MIDI pitches
        self.scale_notes = scale_notes

    # -- helpers --

    def _nearest_in_scale(self, pitch: int) -> int:
        if not self.scale_notes:
            return pitch
        return min(self.scale_notes, key=lambda p: abs(p - pitch))

    def _clamp_to_scale(self, pitches: List[int]) -> List[int]:
        return [self._nearest_in_scale(p) for p in pitches]

    # -- five development operations --

    def identity(self) -> List[int]:
        return list(self.motif)

    def transpose(self, semitones: int = 5) -> List[int]:
        """Exact transposition (stays diatonic if scale is chromatic)."""
        return self._clamp_to_scale([p + semitones for p in self.motif])

    def sequence_down(self, step: int = 2) -> List[int]:
        """Each note shifted down by `step` scale positions."""
        result = []
        for pitch in self.motif:
            idx = self._scale_index(pitch)
            result.append(self._scale_at(idx - step))
        return result

    def inversion(self) -> List[int]:
        """Mirror intervals around the first note."""
        if len(self.motif) < 2:
            return list(self.motif)
        root = self.motif[0]
        inverted = [root - (p - root) for p in self.motif]
        return self._clamp_to_scale(inverted)

    def resolution(self, tonic: int) -> List[int]:
        """Stepwise descent toward the tonic."""
        start = self.motif[-1] if self.motif else tonic
        result = []
        cur = self._nearest_in_scale(start)
        for _ in self.motif:
            result.append(cur)
            if cur > tonic:
                idx = self._scale_index(cur)
                cur = self._scale_at(idx - 1)
            elif cur < tonic:
                idx = self._scale_index(cur)
                cur = self._scale_at(idx + 1)
        return result

    # -- scale index helpers --

    def _scale_index(self, pitch: int) -> int:
        nearest = self._nearest_in_scale(pitch)
        try:
            return self.scale_notes.index(nearest)
        except ValueError:
            return len(self.scale_notes) // 2

    def _scale_at(self, idx: int) -> int:
        idx = max(0, min(len(self.scale_notes) - 1, idx))
        return self.scale_notes[idx]

    # -- development plan --

    def plan(self, bars: int, tonic: int) -> List[List[int]]:
        """
        Return a list of motif variants, one per group of bars.
        Groups: identity -> transpose -> sequence -> inversion -> resolution
        (cycles if bars > 5 groups)
        """
        stages = [
            self.identity(),
            self.transpose(5),
            self.sequence_down(2),
            self.inversion(),
            self.resolution(tonic),
        ]
        plan_out = []
        bars_per_stage = max(1, bars // len(stages))
        for bar in range(bars):
            stage_idx = min(bar // bars_per_stage, len(stages) - 1)
            plan_out.append(stages[stage_idx])
        return plan_out


# -- VoiceLeadingEngine --

class VoiceLeadingEngine:
    """Smooth note-to-note motion according to tonal voice-leading rules."""

    def __init__(self, scale_notes: List[int], root_midi: int):
        self.scale = scale_notes
        self.root = root_midi

    def _scale_idx(self, p: int) -> int:
        if not self.scale:
            return 0
        nearest = min(self.scale, key=lambda x: abs(x - p))
        try:
            return self.scale.index(nearest)
        except ValueError:
            return 0

    def smooth(self, pitches: List[int]) -> List[int]:
        if len(pitches) <= 1:
            return pitches
        out = [pitches[0]]
        for i in range(1, len(pitches)):
            prev = out[-1]
            cur = pitches[i]
            cur = self._apply_rules(prev, cur, i, len(pitches))
            out.append(cur)
        return out

    def _apply_rules(self, prev: int, cur: int, pos: int, total: int) -> int:
        # Rule 1: leading-tone resolution (B -> C in major, i.e. scale[6] -> root)
        if self.scale:
            leading = self.scale[6] if len(self.scale) >= 7 else None
            if leading and prev == leading:
                # Resolve upward to tonic octave nearest current pitch
                target = self.root
                while target < cur - 6:
                    target += 12
                while target > cur + 6:
                    target -= 12
                return target

        # Rule 2: after a large leap (>= major 6th = 9 semitones), step back
        leap = abs(cur - prev)
        if leap >= 9:
            direction = -1 if cur > prev else 1
            idx = self._scale_idx(cur)
            step_back = self.scale[max(0, min(len(self.scale)-1, idx + direction))] \
                if self.scale else cur
            return step_back

        # Rule 3: avoid augmented 2nd (3 semitones between consecutive scale steps)
        if self.scale:
            idx_prev = self._scale_idx(prev)
            idx_cur = self._scale_idx(cur)
            if abs(idx_cur - idx_prev) == 1 and abs(cur - prev) == 3:
                # Bridge via chromatic neighbour -> use scale step instead
                direction = 1 if cur > prev else -1
                idx_adj = max(0, min(len(self.scale)-1, idx_cur + direction))
                return self.scale[idx_adj]

        return cur


# -- CadenceFormula --

class CadenceFormula:
    """Injects cadential targets at structural bar positions."""

    def __init__(self, scale_notes: List[int], root_midi: int):
        self.scale = scale_notes
        self.root = root_midi

    def _dominant(self) -> int:
        """Scale degree V (index 4 in a 7-note scale, index 3 in pentatonic)."""
        if len(self.scale) >= 5:
            # Find the dominant in the appropriate register
            target_pc = (self.root + 7) % 12
            for p in self.scale:
                if p % 12 == target_pc and 57 <= p <= 79:
                    return p
        return self.root + 7

    def _tonic(self) -> int:
        """Root nearest to mid-register (C4-G5)."""
        for p in self.scale:
            if p % 12 == self.root % 12 and 60 <= p <= 72:
                return p
        return self.root

    def cadence_pitch(self, bar: int, total_bars: int) -> Optional[int]:
        """
        Return a cadential target pitch if `bar` is a structural boundary,
        else None.
        """
        half = total_bars // 2
        if bar == half - 1:          # half cadence -> land on V
            return self._dominant()
        if bar == total_bars - 1:    # authentic cadence -> land on I
            return self._tonic()
        return None


# -- MelodyComposer (inherits BaseComposer) --

@dataclass
class ComposedNote:
    pitch: int
    start: float   # seconds
    end: float     # seconds


class MelodyComposer(BaseComposer):
    """
    Deterministic melody composer driven by music-theory rules.

    compose_melody() returns List[Tuple[pitch, start_sec, end_sec]].
    """

    # Pitch register targets by tension level (MIDI range centres)
    _TENSION_CENTRE = {1: 60, 2: 62, 3: 64, 4: 65, 5: 67,
                       6: 69, 7: 71, 8: 72, 9: 74, 10: 76}

    @property
    def name(self) -> str:
        return "theory_v1"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def description(self) -> str:
        return "Deterministic theory-based melody composer with motif development"

    def compose(self, req: CompositionRequest) -> CompositionResult:
        """BaseComposer interface: compose from a CompositionRequest."""
        from ..audio_analyzer import AnalysisResult
        analysis = AnalysisResult(
            key=req.key,
            scale='major',
            bpm=req.bpm,
            motif_notes=req.motif_notes or [60, 62, 64, 65, 67],
            motif_rhythm=req.motif_rhythm or [0.5] * 5,
            confidence=0.0,
            source='request',
        )
        melody = self.compose_melody(analysis, req.bars, req.bpm, req.style)
        return CompositionResult(
            melody=melody,
            accompaniment=[],
            chord_symbols=[],
            log_steps=[],
        )

    def compose_melody(
        self,
        analysis,
        bars: int,
        bpm: float,
        style: str,
    ) -> List[Tuple[int, float, float]]:
        """
        Full pipeline:
          1. Build scale + root
          2. Initialise motif from analysis.motif_notes
          3. MotifDeveloper plans variants per bar
          4. CadenceFormula overrides final notes at boundaries
          5. VoiceLeadingEngine smooths the sequence
          6. Assign rhythm from style pattern
        """
        beat_sec = 60.0 / bpm
        beats_per_bar = 4
        bar_dur = beat_sec * beats_per_bar

        # -- 1. Scale --
        root_pc = NOTE_TO_SEMITONE.get(analysis.key, 0)
        root_midi = 60 + root_pc          # C4 + offset

        scale_name = STYLE_SCALE.get(style, analysis.scale)
        scale_notes = get_scale_notes(root_midi, scale_name, octaves=4)
        # Keep notes in vocal range A3-C6 (57-84)
        scale_notes = [p for p in scale_notes if 57 <= p <= 84]
        if not scale_notes:
            scale_notes = get_scale_notes(root_midi, 'major', octaves=4)

        # -- 2. Motif --
        motif = list(analysis.motif_notes) if analysis.motif_notes else [60, 62, 64, 65, 67]
        motif = motif[:8] or [60, 62, 64, 65]

        developer = MotifDeveloper(motif, scale_notes)
        vle = VoiceLeadingEngine(scale_notes, root_midi)
        cadence = CadenceFormula(scale_notes, root_midi)

        # -- 3. Bar-level motif plan --
        bar_motifs = developer.plan(bars, root_midi)

        # -- 4. Rhythm pattern --
        base_rhythm = RHYTHM_PATTERNS.get(style, RHYTHM_PATTERNS['pop'])
        motif_rhythm = list(analysis.motif_rhythm) if analysis.motif_rhythm else [0.5] * 8

        # -- 5. Build note sequence bar by bar --
        all_pitches: List[int] = []
        all_durations: List[float] = []  # in beats

        for bar in range(bars):
            tension = _tension(bar)
            centre = self._TENSION_CENTRE.get(tension, 65)

            bar_pitches = self._fit_to_register(bar_motifs[bar], scale_notes, centre)

            # Cadence override on last note of structural bars
            cad = cadence.cadence_pitch(bar, bars)
            if cad is not None and bar_pitches:
                bar_pitches[-1] = cad

            # Rhythm: use motif rhythm if available, else style pattern
            if motif_rhythm and len(motif_rhythm) >= len(bar_pitches):
                bar_dur_beats = sum(motif_rhythm[:len(bar_pitches)])
                scale_factor = beats_per_bar / max(bar_dur_beats, 0.01)
                bar_rhy = [d * scale_factor for d in motif_rhythm[:len(bar_pitches)]]
            else:
                bar_rhy = self._fit_rhythm(base_rhythm, len(bar_pitches), beats_per_bar)

            all_pitches.extend(bar_pitches)
            all_durations.extend(bar_rhy)

        # -- 6. Voice leading --
        all_pitches = vle.smooth(all_pitches)

        # -- 7. Assign timestamps --
        notes: List[Tuple[int, float, float]] = []
        t = 0.0
        for pitch, dur_beats in zip(all_pitches, all_durations):
            dur_sec = dur_beats * beat_sec
            notes.append((pitch, t, t + dur_sec))
            t += dur_sec

        logger.info('MelodyComposer: %d notes, %.1f s', len(notes), t)
        return notes

    # -- helpers --

    def _fit_to_register(
        self, pitches: List[int], scale: List[int], centre: int
    ) -> List[int]:
        """Transpose pitches so their mean is close to `centre`."""
        if not pitches or not scale:
            return pitches
        mean_p = sum(pitches) / len(pitches)
        shift = 0
        if mean_p < centre - 6:
            shift = 12
        elif mean_p > centre + 6:
            shift = -12
        shifted = [p + shift for p in pitches]
        return [min(scale, key=lambda s: abs(s - p)) for p in shifted]

    def _fit_rhythm(
        self, pattern: List[float], note_count: int, beats_per_bar: int
    ) -> List[float]:
        """Return a rhythm list of length `note_count` that sums to beats_per_bar."""
        if note_count <= 0:
            return []
        # Repeat / trim pattern to get note_count values
        extended = (pattern * ((note_count // len(pattern)) + 2))[:note_count]
        total = sum(extended)
        scale = beats_per_bar / max(total, 0.01)
        return [max(0.25, d * scale) for d in extended]
