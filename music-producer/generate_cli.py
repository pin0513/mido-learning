#!/usr/bin/env python3
"""generate_cli.py - Music generation CLI wrapper.

stdin:  JSON { "engine": "theory_v1", "key": "C", "bpm": 120, "style": "pop", "bars": 8, "recording_id": null }
stdout: JSON { "task_id": "<uuid>" }
stderr: logging (ignored by .NET)

The generation runs in a background thread. Results are written to:
  /tmp/music_tasks/<task_id>/status.json
  /tmp/music_tasks/<task_id>/<files>
"""
import sys
import json
import uuid
import threading
import os
from pathlib import Path

TASKS_DIR = Path(os.getenv("MUSIC_TASKS_DIR", "/tmp/music_tasks"))


def _write_status(task_id: str, data: dict) -> None:
    task_dir = TASKS_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    status_path = task_dir / "status.json"
    current = {}
    if status_path.exists():
        try:
            current = json.loads(status_path.read_text())
        except Exception:
            pass
    current.update(data)
    status_path.write_text(json.dumps(current))


def _run_generation(task_id: str, engine: str, key: str, bpm: float,
                    style: str, bars: int, recording_id) -> None:
    try:
        _write_status(task_id, {"status": "processing", "progress": 10, "production_log": []})

        from production_team import MusicDirector
        director = MusicDirector(engine_name=engine if engine else "theory_v1")

        _write_status(task_id, {"progress": 20})

        task_out_dir = TASKS_DIR / task_id
        task_out_dir.mkdir(parents=True, exist_ok=True)

        result = director.produce(
            key=key,
            bpm=bpm,
            style=style,
            bars=bars,
            analysis=None,
            out_dir=str(task_out_dir),
        )

        _write_status(task_id, {
            "status": "completed",
            "progress": 100,
            "production_log": result.get("log", []),
            "has_audio": result.get("has_audio", False),
            "files": result.get("files", {}),
            "out_dir": str(task_out_dir),
        })

    except Exception as e:
        _write_status(task_id, {
            "status": "failed",
            "error": str(e),
            "progress": 0,
        })


def main():
    try:
        data = json.loads(sys.stdin.buffer.read())
        engine = data.get("engine", "theory_v1")
        key = data.get("key", "C")
        bpm = float(data.get("bpm", 120.0))
        style = data.get("style", "pop")
        bars = int(data.get("bars", 8))
        recording_id = data.get("recording_id")

        task_id = str(uuid.uuid4())

        TASKS_DIR.mkdir(parents=True, exist_ok=True)
        _write_status(task_id, {
            "status": "pending",
            "progress": 0,
            "production_log": [],
            "has_audio": False,
            "files": {},
        })

        thread = threading.Thread(
            target=_run_generation,
            args=(task_id, engine, key, bpm, style, bars, recording_id),
            daemon=True,
        )
        thread.start()

        print(json.dumps({"task_id": task_id}))
        sys.stdout.flush()

        # Wait for thread so container doesn't exit before write
        thread.join(timeout=300)
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
