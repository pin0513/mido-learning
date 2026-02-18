#!/usr/bin/env python3
"""download_cli.py - File download CLI wrapper.

stdin:  JSON { "task_id": "<uuid>", "type": "midi|midi_accomp|mp3|wav" }
stdout: JSON { "data": "<base64>" }
stderr: logging (ignored by .NET)
"""
import sys
import json
import base64
import os
from pathlib import Path

TASKS_DIR = Path(os.getenv("MUSIC_TASKS_DIR", "/tmp/music_tasks"))

FILE_TYPE_MAP = {
    "midi": "melody_midi",
    "midi_accomp": "accomp_midi",
    "mp3": "mp3",
    "wav": "wav",
}


def main():
    try:
        data = json.loads(sys.stdin.buffer.read())
        task_id = data.get("task_id", "")
        file_type = data.get("type", "")

        status_path = TASKS_DIR / task_id / "status.json"

        if not status_path.exists():
            print(json.dumps({"error": "Task not found"}))
            sys.exit(1)

        status = json.loads(status_path.read_text())

        if status.get("status") != "completed":
            print(json.dumps({"error": "Task not completed"}))
            sys.exit(1)

        file_key = FILE_TYPE_MAP.get(file_type)
        if not file_key:
            print(json.dumps({"error": f"Unknown file type: {file_type}"}))
            sys.exit(1)

        files = status.get("files", {})
        file_path = files.get(file_key)

        if not file_path or not os.path.exists(file_path):
            print(json.dumps({"error": f"File '{file_type}' not available"}))
            sys.exit(1)

        with open(file_path, "rb") as f:
            file_bytes = f.read()

        encoded = base64.b64encode(file_bytes).decode("utf-8")
        print(json.dumps({"data": encoded}))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
