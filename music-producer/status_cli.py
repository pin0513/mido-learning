#!/usr/bin/env python3
"""status_cli.py - Task status CLI wrapper.

stdin:  JSON { "task_id": "<uuid>" }
stdout: JSON status object
stderr: logging (ignored by .NET)
"""
import sys
import json
import os
from pathlib import Path

TASKS_DIR = Path(os.getenv("MUSIC_TASKS_DIR", "/tmp/music_tasks"))


def main():
    try:
        data = json.loads(sys.stdin.buffer.read())
        task_id = data.get("task_id", "")

        status_path = TASKS_DIR / task_id / "status.json"

        if not status_path.exists():
            print(json.dumps({"status": "not_found"}))
            sys.exit(0)

        status = json.loads(status_path.read_text())
        print(json.dumps(status))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        sys.exit(0)


if __name__ == "__main__":
    main()
