import os
import json
import uvicorn
from fastapi import FastAPI, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from src.correlation import correlate_alerts
from src.prioritization import prioritize_incidents
from src.rag_engine import RAGEngine

from contextlib import asynccontextmanager

# Global In-Memory State
ALERTS_DATA_PATH = "data/alerts.json"
rag_engine: Optional[RAGEngine] = None

triage_results = {
    "incidents": [],
    "noise": [],
    "last_run_at": None
}

def load_alerts(file_path: str = ALERTS_DATA_PATH) -> List[Dict[str, Any]]:
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@asynccontextmanager
async def lifespan(app: FastAPI):
    global rag_engine
    print("[SERVER] Initializing RAG Embedding Index...")
    rag_engine = RAGEngine(runbooks_dir="data/runbooks")
    print("[SERVER] Running initial triage pipeline...")
    run_triage_pipeline()
    print("[SERVER] Ready at http://localhost:8000")
    yield

# Initialize FastAPI App
app = FastAPI(
    title="Network Incident Triage Assistant (PS07)",
    description="Production-ready Network Incident Triage Engine for Track PS07",
    version="1.0.0",
    lifespan=lifespan
)

def run_triage_pipeline(raw_alerts: Optional[List[Dict[str, Any]]] = None):
    global triage_results, rag_engine
    if raw_alerts is None:
        raw_alerts = load_alerts()

    # 1. Correlation & Noise Filtering
    uncategorized_incidents, noise_list = correlate_alerts(raw_alerts)

    # 2. Impact Prioritization
    prioritized_incidents = prioritize_incidents(uncategorized_incidents)

    # 3. RAG Evaluation & Escalation Packet Generation
    if rag_engine:
        for inc in prioritized_incidents:
            triage_evaluation = rag_engine.evaluate_incident(inc)
            inc["triage_evaluation"] = triage_evaluation

    triage_results["incidents"] = prioritized_incidents
    triage_results["noise"] = noise_list
    triage_results["last_run_at"] = os.popen("date /t").read().strip() if os.name == 'nt' else os.popen("date").read().strip()
    return triage_results

@app.post("/api/triage")
def trigger_triage(payload: Optional[List[Dict[str, Any]]] = Body(None)):
    """Triggers correlation, prioritization, and RAG evaluation."""
    results = run_triage_pipeline(payload)
    return {
        "status": "SUCCESS",
        "incidents_count": len(results["incidents"]),
        "noise_count": len(results["noise"]),
        "incidents": results["incidents"],
        "noise": results["noise"]
    }

@app.get("/api/incidents")
def get_incidents():
    """Returns grouped incidents with RAG recommendations and L2 escalation packets."""
    return {
        "count": len(triage_results["incidents"]),
        "incidents": triage_results["incidents"]
    }

@app.get("/api/noise")
def get_noise():
    """Returns uncorroborated, low-severity noise alerts."""
    return {
        "count": len(triage_results["noise"]),
        "noise": triage_results["noise"]
    }


# Serve Static UI Frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
