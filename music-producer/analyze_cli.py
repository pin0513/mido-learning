#!/usr/bin/env python3
"""analyze_cli.py - Audio analysis CLI wrapper.

stdin:  JSON { "audio_b64": "<base64>", "suffix": ".webm" }
stdout: JSON analysis result
stderr: logging (ignored by .NET)
"""
import sys
import json
import base64
import tempfile
import os

def main():
    try:
        data = json.loads(sys.stdin.buffer.read())
        audio_bytes = base64.b64decode(data["audio_b64"])
        suffix = data.get("suffix", ".webm")

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
            f.write(audio_bytes)
            path = f.name

        try:
            from audio_analyzer import AudioAnalyst, default_analysis
            analyst = AudioAnalyst()
            result = analyst.analyze(path)
            output = {
                "key": result.key,
                "scale": result.scale,
                "bpm": result.bpm,
                "motif_notes": result.motif_notes,
                "motif_rhythm": result.motif_rhythm,
                "confidence": result.confidence,
            }
        except Exception as e:
            from audio_analyzer import default_analysis
            fallback = default_analysis()
            output = {
                "key": fallback.key,
                "scale": fallback.scale,
                "bpm": fallback.bpm,
                "motif_notes": fallback.motif_notes,
                "motif_rhythm": fallback.motif_rhythm,
                "confidence": 0.0,
                "error": str(e),
            }
        finally:
            try:
                os.unlink(path)
            except Exception:
                pass

        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"error": str(e), "key": "C", "scale": "major", "bpm": 120.0,
                          "motif_notes": [], "motif_rhythm": [], "confidence": 0.0}))
        sys.exit(0)


if __name__ == "__main__":
    main()
