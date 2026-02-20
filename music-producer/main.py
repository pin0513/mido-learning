"""Music Producer Sidecar - FastAPI Entry Point"""
import asyncio
import logging
import os
import tempfile
import uuid
from pathlib import Path
from typing import Dict, Optional

from fastapi import BackgroundTasks, FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from audio_analyzer import AudioAnalyst, default_analysis
from production_team import MusicDirector
from engines.base_composer import CompositionRequest
from engines.theory_composer import MelodyComposer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Music Producer Sidecar", version="1.0.0")

# -- Engine Registry --
ENGINES: Dict[str, MelodyComposer] = {
    "theory_v1": MelodyComposer(),
    # Add new engines here
}

# -- Task Store (dual-mode: Firestore on Cloud Run, in-memory locally) --
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")

if GCP_PROJECT_ID:
    from google.cloud import firestore as _firestore
    _db = _firestore.Client(project=GCP_PROJECT_ID)
    _TASK_COLLECTION = "music_tasks"

    def _task_set(task_id: str, data: dict) -> None:
        _db.collection(_TASK_COLLECTION).document(task_id).set(data)

    def _task_update(task_id: str, data: dict) -> None:
        _db.collection(_TASK_COLLECTION).document(task_id).update(data)

    def _task_get(task_id: str) -> Optional[dict]:
        doc = _db.collection(_TASK_COLLECTION).document(task_id).get()
        return doc.to_dict() if doc.exists else None

    logger.info(f"Task store: Firestore (project={GCP_PROJECT_ID})")
else:
    _mem: Dict[str, dict] = {}

    def _task_set(task_id: str, data: dict) -> None:
        _mem[task_id] = data

    def _task_update(task_id: str, data: dict) -> None:
        if task_id in _mem:
            _mem[task_id].update(data)

    def _task_get(task_id: str) -> Optional[dict]:
        return _mem.get(task_id)

    logger.info("Task store: in-memory (local dev mode)")

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/app/output"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# -- Pydantic Models --
class GenerateRequest(BaseModel):
    engine: str = "theory_v1"
    key: str = "C"
    bpm: float = 120.0
    style: str = "pop"
    bars: int = 8
    recording_id: Optional[str] = None


# -- Background Task --
async def run_generation(task_id: str, req: GenerateRequest):
    """Background task: runs music generation with incremental progress updates."""
    try:
        _task_update(task_id, {"status": "processing", "progress": 5})

        # Select engine
        engine_name = req.engine if req.engine in ENGINES else "theory_v1"
        director = MusicDirector(engine_name=engine_name)

        # Callback called from the worker thread after each pipeline step.
        # _task_update is thread-safe for both in-memory and Firestore modes.
        def on_progress(pct: int, log_steps: list) -> None:
            _task_update(task_id, {
                "progress": pct,
                "production_log": log_steps,
            })
            logger.info(f"Task {task_id}: {pct}% — {len(log_steps)} step(s) logged")

        # Run generation in a thread executor so the event loop stays free.
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: director.produce(
                key=req.key,
                bpm=req.bpm,
                style=req.style,
                bars=req.bars,
                analysis=None,
                out_dir=str(OUTPUT_DIR / task_id),
                on_progress=on_progress,
            )
        )

        task_out_dir = OUTPUT_DIR / task_id
        task_out_dir.mkdir(parents=True, exist_ok=True)

        _task_update(task_id, {
            "status": "completed",
            "progress": 100,
            "production_log": result.get("log", []),
            "has_audio": result.get("has_audio", False),
            "files": result.get("files", {}),
            "out_dir": str(task_out_dir),
        })
        logger.info(f"Task {task_id} completed")

    except Exception as e:
        logger.error(f"Task {task_id} failed: {e}", exc_info=True)
        _task_update(task_id, {
            "status": "failed",
            "error": str(e),
        })


# -- Endpoints --
@app.get("/health")
def health():
    return {"status": "ok", "engines": list(ENGINES.keys())}


@app.get("/engines")
def list_engines():
    return [
        {
            "name": name,
            "version": engine.version if hasattr(engine, "version") else "1.0.0",
            "description": engine.description if hasattr(engine, "description") else name,
        }
        for name, engine in ENGINES.items()
    ]


@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """Analyze uploaded audio file, return key/bpm/motif"""
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        analyst = AudioAnalyst()
        result = analyst.analyze(tmp_path)
        os.unlink(tmp_path)

        return {
            "key": result.key,
            "scale": result.scale,
            "bpm": result.bpm,
            "motif_notes": result.motif_notes,
            "motif_rhythm": result.motif_rhythm,
            "confidence": result.confidence,
        }
    except Exception as e:
        logger.warning(f"Analysis failed, using defaults: {e}")
        result = default_analysis()
        return {
            "key": result.key,
            "scale": result.scale,
            "bpm": result.bpm,
            "motif_notes": result.motif_notes,
            "motif_rhythm": result.motif_rhythm,
            "confidence": 0.0,
        }


@app.post("/generate")
async def generate_music(req: GenerateRequest, background_tasks: BackgroundTasks):
    """Start async music generation, return task_id immediately"""
    if req.engine not in ENGINES:
        req.engine = "theory_v1"

    task_id = str(uuid.uuid4())
    _task_set(task_id, {
        "status": "pending",
        "progress": 0,
        "production_log": [],
        "has_audio": False,
        "files": {},
    })

    background_tasks.add_task(run_generation, task_id, req)
    return {"task_id": task_id}


@app.get("/status/{task_id}")
def get_status(task_id: str):
    """Get task status"""
    task = _task_get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/download/{task_id}/{file_type}")
def download_file(task_id: str, file_type: str):
    """Download generated file (midi | midi_accomp | mp3 | wav)"""
    task = _task_get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task["status"] != "completed":
        raise HTTPException(status_code=400, detail="Task not completed")

    files = task.get("files", {})
    file_type_map = {
        "midi": "melody_midi",
        "midi_accomp": "accomp_midi",
        "mp3": "mp3",
        "wav": "wav",
    }

    file_key = file_type_map.get(file_type)
    if not file_key or file_key not in files:
        raise HTTPException(status_code=404, detail=f"File type '{file_type}' not available")

    file_path = files[file_key]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(file_path, filename=f"{task_id}_{file_type}.{file_type.split('_')[0]}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
