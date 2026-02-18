#!/usr/bin/env python3
"""engines_cli.py - Available engines list CLI wrapper.

stdin:  (nothing)
stdout: JSON array of engine objects
stderr: logging (ignored by .NET)
"""
import sys
import json

ENGINES_REGISTRY = {
    "theory_v1": {
        "version": "1.0.0",
        "description": "Theory-based melody composer",
    },
}


def main():
    try:
        from engines.theory_composer import MelodyComposer
        engine_instance = MelodyComposer()
        engines = []
        for name, meta in ENGINES_REGISTRY.items():
            engines.append({
                "name": name,
                "version": getattr(engine_instance, "version", meta["version"]),
                "description": getattr(engine_instance, "description", meta["description"]),
            })
        print(json.dumps(engines))
        sys.exit(0)
    except Exception as e:
        # Fallback: return static list
        engines = [
            {
                "name": name,
                "version": meta["version"],
                "description": meta["description"],
            }
            for name, meta in ENGINES_REGISTRY.items()
        ]
        print(json.dumps(engines))
        sys.exit(0)


if __name__ == "__main__":
    main()
