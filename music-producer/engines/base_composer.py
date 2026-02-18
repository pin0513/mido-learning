from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Tuple, Optional


@dataclass
class CompositionRequest:
    key: str
    bpm: float
    style: str          # "pop" | "ballad" | "cpop"
    bars: int
    motif_notes: Optional[List[int]] = None
    motif_rhythm: Optional[List[float]] = None


@dataclass
class CompositionResult:
    melody: List[Tuple[int, float, float]]       # (pitch, start, duration)
    accompaniment: List[Tuple[int, float, float]]
    chord_symbols: List[str]
    log_steps: List[dict]


class BaseComposer(ABC):
    """All composer engines must inherit from this abstract base class."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Engine identifier, e.g. 'theory_v1'"""
        ...

    @property
    @abstractmethod
    def version(self) -> str:
        """Version string, e.g. '1.0.0'"""
        ...

    @property
    def description(self) -> str:
        """Engine description (optional override)."""
        return f"{self.name} v{self.version}"

    @abstractmethod
    def compose(self, req: CompositionRequest) -> CompositionResult:
        """Execute composition, return result."""
        ...
