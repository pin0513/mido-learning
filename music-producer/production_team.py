"""Music production team coordinator.

MusicDirector orchestrates:
  AudioAnalyst -> MelodyComposer -> Arranger (accompaniment) -> Producer (mix)
Each step appends to ProductionLog for display in the frontend.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import pretty_midi

from audio_analyzer import AnalysisResult, AudioAnalyst, default_analysis
from engines.theory_composer import MelodyComposer
from engines.accompaniment import build_full_accompaniment
from renderer import render_all

logger = logging.getLogger(__name__)


# -- ProductionLog --

@dataclass
class LogStep:
    member: str         # e.g. "Audio Analyst"
    icon: str           # emoji
    action: str         # what was done
    result: str         # outcome summary
    bars_affected: str = 'all'


@dataclass
class ProductionLog:
    steps: List[LogStep] = field(default_factory=list)

    def add(self, member: str, icon: str, action: str, result: str,
            bars_affected: str = 'all') -> None:
        step = LogStep(member=member, icon=icon, action=action,
                       result=result, bars_affected=bars_affected)
        self.steps.append(step)
        logger.info('[%s] %s -> %s', member, action, result)

    def to_list(self) -> List[Dict[str, str]]:
        return [
            {
                'member': s.member,
                'icon': s.icon,
                'action': s.action,
                'result': s.result,
                'bars_affected': s.bars_affected,
            }
            for s in self.steps
        ]


# -- ProductionResult --

@dataclass
class ProductionResult:
    files: Dict[str, str]          # file_type -> absolute path
    analysis: AnalysisResult
    log: ProductionLog


# -- MusicDirector --

class MusicDirector:
    """Coordinates the full music production pipeline."""

    MIN_CONFIDENCE = 0.4

    def __init__(self, engine_name: str = 'theory_v1'):
        self.engine_name = engine_name

    def produce(
        self,
        key: str,
        bpm: float,
        style: str,
        bars: int,
        analysis: Optional[AnalysisResult] = None,
        recording_path: Optional[str] = None,
        out_dir: Optional[str] = None,
        output_dir: Optional[str] = None,
        soundfont: str = 'soundfonts/GeneralUser.sf2',
        on_progress: Optional[Callable[[int, List[Dict[str, str]]], None]] = None,
    ) -> Dict[str, Any]:
        """Run full production pipeline and return result dict.

        on_progress(progress_pct, log_steps) is called after each step so the
        caller can push incremental updates to the task store without waiting
        for the whole pipeline to finish.
        """
        # Support both out_dir and output_dir parameter names
        final_output_dir = out_dir or output_dir or '/app/output/default'

        log = ProductionLog()
        Path(final_output_dir).mkdir(parents=True, exist_ok=True)

        def _notify(pct: int) -> None:
            if on_progress:
                try:
                    on_progress(pct, log.to_list())
                except Exception as exc:
                    logger.warning('on_progress callback error: %s', exc)

        # -- Step 1: Audio Analysis (10 → 25 %) --
        _notify(10)
        if analysis is None:
            analysis = self._analyse(recording_path, key, bpm, style, log)
        _notify(25)

        # Override with UI params when analysis not confident
        if analysis.source in ('default', 'no_pitch', 'low_confidence'):
            analysis.bpm = bpm
            if analysis.source in ('default', 'no_pitch'):
                analysis.key = key

        effective_bpm = analysis.bpm if analysis.source == 'recording' else bpm
        effective_key = analysis.key

        # -- Step 2: Melody composition (25 → 45 %) --
        melody_notes = self._compose_melody(analysis, bars, effective_bpm, style, log)
        _notify(45)

        # -- Step 3: Arrangement (accompaniment) (45 → 60 %) --
        accomp_midi, chord_seq = self._arrange(effective_key, style, bars, effective_bpm, log)
        _notify(60)

        # -- Step 4: Build main melody MIDI (60 → 65 %) --
        main_midi = self._build_main_midi(melody_notes, effective_bpm)
        _notify(65)

        # -- Step 5: Producer mix decisions (65 → 70 %) --
        db_offsets = self._producer_mix(bars, style, analysis, log)
        _notify(70)

        # -- Step 6: Render (70 → 95 %) — slowest step (FluidSynth) --
        logger.info('Starting render (FluidSynth MIDI→WAV→MP3) — this may take 10-60 s ...')
        files = self._render(
            main_midi, accomp_midi,
            final_output_dir, soundfont, db_offsets, log,
        )
        _notify(95)

        return {
            'files': files,
            'log': log.to_list(),
            'has_audio': bool(files.get('mp3') or files.get('main_wav')),
            'analysis': {
                'key': analysis.key,
                'scale': analysis.scale,
                'bpm': analysis.bpm,
                'confidence': analysis.confidence,
            },
        }

    # -- pipeline steps --

    def _analyse(
        self,
        recording_path: Optional[str],
        key: str,
        bpm: float,
        style: str,
        log: ProductionLog,
    ) -> AnalysisResult:
        if recording_path and os.path.exists(recording_path):
            try:
                analyst = AudioAnalyst()
                result = analyst.analyze(recording_path)
                conf_pct = f'{result.confidence:.0%}'
                if result.confidence >= self.MIN_CONFIDENCE:
                    log.add(
                        'Audio Analyst', '🎙️',
                        'Analyze recording',
                        f'Detected {result.key} {result.scale}, '
                        f'BPM {result.bpm}, confidence {conf_pct}',
                    )
                else:
                    log.add(
                        'Audio Analyst', '🎙️',
                        'Analyze recording (low confidence)',
                        f'Detected {result.key} {result.scale}, confidence {conf_pct}, '
                        f'using default key {key}',
                    )
                return result
            except Exception as exc:
                logger.warning('AudioAnalyst failed: %s', exc)
                log.add(
                    'Audio Analyst', '🎙️',
                    'Recording analysis failed',
                    f'Error: {exc}; using UI settings ({key} {bpm} BPM)',
                )
        else:
            log.add(
                'Audio Analyst', '🎙️',
                'No recording input',
                f'Using UI settings: {key} major, {bpm} BPM, style {style}',
            )

        return default_analysis(key=key, bpm=bpm, style=style)

    def _compose_melody(
        self,
        analysis: AnalysisResult,
        bars: int,
        bpm: float,
        style: str,
        log: ProductionLog,
    ) -> List[Tuple[int, float, float]]:
        composer = MelodyComposer()
        notes = composer.compose_melody(analysis, bars, bpm, style)

        # Describe motif development stages used
        half = bars // 2
        stages_desc = (
            f'Original motif (bars 1-{bars//5}) -> '
            f'Transpose up 4th (bars {bars//5+1}-{half}) -> '
            f'Sequence down (bars {half+1}-{bars*3//4}) -> '
            f'Inversion (bars {bars*3//4+1}-{bars-1}) -> '
            f'Resolution (bar {bars})'
        )
        log.add(
            'Melody Composer', '🎵',
            f'Theory-based composition {bars} bars',
            f'{stages_desc}; half cadence bar {half}; authentic cadence bar {bars}',
            bars_affected=f'1-{bars}',
        )
        return notes

    def _arrange(
        self,
        key: str,
        style: str,
        bars: int,
        bpm: float,
        log: ProductionLog,
    ) -> Tuple[pretty_midi.PrettyMIDI, Any]:
        accomp_midi, chord_seq = build_full_accompaniment(key, style, bars, bpm)

        log.add(
            'Arranger', '🎸',
            'Multi-track accompaniment',
            f'Piano / Strings / Bass / Drums; style {style}; {bars} bars',
            bars_affected=f'1-{bars}',
        )
        return accomp_midi, chord_seq

    def _build_main_midi(
        self,
        melody_notes: List[Tuple[int, float, float]],
        bpm: float,
    ) -> pretty_midi.PrettyMIDI:
        midi = pretty_midi.PrettyMIDI(initial_tempo=bpm)
        inst = pretty_midi.Instrument(program=0, name='Lead Melody')
        for pitch, start, end in melody_notes:
            if end > start:
                inst.notes.append(
                    pretty_midi.Note(
                        velocity=80,
                        pitch=max(0, min(127, pitch)),
                        start=start,
                        end=end,
                    )
                )
        midi.instruments.append(inst)
        return midi

    def _producer_mix(
        self,
        bars: int,
        style: str,
        analysis: AnalysisResult,
        log: ProductionLog,
    ) -> Dict[str, float]:
        """Decide dB offsets for each stem."""
        # Melody is reference (0 dB); accompaniment slightly lower
        melody_db = 0.0
        accomp_db = -3.0 if style == 'ballad' else -2.0

        # If recording had high confidence, push melody up slightly
        if analysis.confidence >= 0.7:
            melody_db = 1.0

        peak_bar = bars * 3 // 4
        log.add(
            'Producer', '🎚️',
            'Mix decisions',
            f'Melody {melody_db:+.0f} dB, Accompaniment {accomp_db:+.0f} dB; '
            f'dynamic peak bar {peak_bar}',
        )
        return {'melody': melody_db, 'accompaniment': accomp_db}

    def _render(
        self,
        main_midi: pretty_midi.PrettyMIDI,
        accomp_midi: pretty_midi.PrettyMIDI,
        output_dir: str,
        soundfont: str,
        db_offsets: Dict[str, float],
        log: ProductionLog,
    ) -> Dict[str, str]:
        out = Path(output_dir)

        # Write MIDI files to disk first
        main_path = str(out / 'main.mid')
        accomp_path = str(out / 'accompaniment.mid')

        main_midi.write(main_path)
        accomp_midi.write(accomp_path)

        # Log before the slow FluidSynth step so users see progress
        log.add(
            'Render Engineer', '🔊',
            'MIDI → WAV → MP3（渲染中，最多需 60 秒）',
            'FluidSynth 正在將 MIDI 轉換為音訊，請耐心等待...',
        )

        render_results = render_all(
            main_midi_path=main_path,
            accomp_midi_path=accomp_path,
            output_dir=output_dir,
            soundfont=soundfont,
        )

        files: Dict[str, str] = {
            'melody_midi': main_path,
            'accomp_midi': accomp_path,
            'task_dir': output_dir,
        }
        files.update({k: v for k, v in render_results.items() if v})

        # Update log with completion status
        has_mp3 = bool(render_results.get('mp3'))
        log.add(
            'Render Engineer', '✅',
            'MIDI -> WAV -> MP3 完成',
            f'FluidSynth render, 192 kbps MP3, output to {out.name}/ — '
            f'{"MP3 已生成" if has_mp3 else "僅生成 WAV（MP3 轉檔失敗）"}',
        )
        return files
