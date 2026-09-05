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

    total_raw = len(raw_alerts)

    # 1. Correlation & Noise Filtering
    uncategorized_incidents, noise_list = correlate_alerts(raw_alerts)

    # 2. Impact Prioritization
    prioritized_incidents = prioritize_incidents(uncategorized_incidents)

    # 3. RAG Evaluation & Escalation Packet Generation
    if rag_engine:
        for inc in prioritized_incidents:
            triage_evaluation = rag_engine.evaluate_incident(inc)
            inc["triage_evaluation"] = triage_evaluation

    noise_count = len(noise_list)
    noise_reduction_pct = round((noise_count / total_raw * 100), 1) if total_raw > 0 else 0.0
    critical_count = sum(1 for inc in prioritized_incidents if inc.get("severity") == "CRITICAL")

    triage_results["incidents"] = prioritized_incidents
    triage_results["noise"] = noise_list
    triage_results["total_raw_alerts"] = total_raw
    triage_results["noise_reduction_pct"] = noise_reduction_pct
    triage_results["critical_count"] = critical_count
    triage_results["last_run_at"] = os.popen("date /t").read().strip() if os.name == 'nt' else os.popen("date").read().strip()
    return triage_results

@app.post("/api/triage")
def trigger_triage(payload: Optional[List[Dict[str, Any]]] = Body(None)):
    """Triggers correlation, prioritization, and RAG evaluation."""
    results = run_triage_pipeline(payload)
    return {
        "status": "SUCCESS",
        "total_raw_alerts": results["total_raw_alerts"],
        "incidents_count": len(results["incidents"]),
        "noise_count": len(results["noise"]),
        "critical_count": results["critical_count"],
        "noise_reduction_pct": results["noise_reduction_pct"],
        "incidents": results["incidents"],
        "noise": results["noise"]
    }

@app.get("/api/incidents")
def get_incidents():
    """Returns grouped incidents with RAG recommendations and L2 escalation packets."""
    return {
        "count": len(triage_results["incidents"]),
        "total_raw_alerts": triage_results.get("total_raw_alerts", 0),
        "critical_count": triage_results.get("critical_count", 0),
        "noise_reduction_pct": triage_results.get("noise_reduction_pct", 0.0),
        "incidents": triage_results["incidents"]
    }

@app.get("/api/noise")
def get_noise():
    """Returns uncorroborated, low-severity noise alerts."""
    return {
        "count": len(triage_results["noise"]),
        "noise": triage_results["noise"]
    }

@app.post("/api/incidents/{incident_id}/dispatch-ticket")
def dispatch_servicenow_ticket(incident_id: str):
    """Simulates creating a ticket in ServiceNow/Jira with attached runbook steps."""
    inc = next((i for i in triage_results["incidents"] if i["incident_id"] == incident_id), None)
    if not inc:
        return JSONResponse(status_code=404, content={"error": "Incident not found"})
    
    ticket_id = f"INC-SNOW-{abs(hash(incident_id)) % 89999 + 10000}"
    return {
        "status": "SUCCESS",
        "ticket_id": ticket_id,
        "incident_id": incident_id,
        "dispatch_system": "ServiceNow ITSM",
        "assigned_group": "Tier-2 NOC Ops",
        "summary": f"Ticket {ticket_id} created for {inc['title']}. Playbook steps attached.",
        "dispatched_at": triage_results.get("last_run_at") or "2026-09-05T12:00:00Z"
    }

@app.post("/api/incidents/{incident_id}/demote-to-noise")
def demote_incident_to_noise(incident_id: str):
    """Demotes an incident and moves its alerts back to the noise pool."""
    inc_idx = next((idx for idx, i in enumerate(triage_results["incidents"]) if i["incident_id"] == incident_id), None)
    if inc_idx is None:
        return JSONResponse(status_code=404, content={"error": "Incident not found"})

    demoted_inc = triage_results["incidents"].pop(inc_idx)
    for alert in demoted_inc.get("alerts", []):
        alert["demoted_reason"] = "Operator Manual Demotion / False Positive"
        triage_results["noise"].append(alert)

    # Recalculate metrics
    total_raw = triage_results.get("total_raw_alerts", 1)
    noise_count = len(triage_results["noise"])
    triage_results["noise_reduction_pct"] = round((noise_count / total_raw * 100), 1) if total_raw > 0 else 0.0
    triage_results["critical_count"] = sum(1 for inc in triage_results["incidents"] if inc.get("severity") == "CRITICAL")

    return {
        "status": "SUCCESS",
        "incident_id": incident_id,
        "message": f"Incident {incident_id} demoted to noise pool successfully.",
        "remaining_incidents_count": len(triage_results["incidents"]),
        "noise_count": noise_count
    }

@app.get("/api/incidents/{incident_id}/download-dossier")
def download_escalation_dossier(incident_id: str):
    """Generates and downloads a structured Markdown Escalation Dossier."""
    inc = next((i for i in triage_results["incidents"] if i["incident_id"] == incident_id), None)
    if not inc:
        return JSONResponse(status_code=404, content={"error": "Incident not found"})

    eval_data = inc.get("triage_evaluation", {})
    dossier_content = f"""# L2 ESCALATION DOSSIER: {inc['incident_id']}
**Generated At**: {triage_results.get('last_run_at') or '2026-09-05T12:00:00Z'}
**System**: Telecom Network Incident Command (TRACK_ID=PS07)

---

## 1. INCIDENT OVERVIEW
- **Incident ID**: `{inc['incident_id']}`
- **Title**: {inc['title']}
- **Severity**: `{inc['severity']}`
- **Impact Score**: **{inc['impact_score']} / 100**
- **Site Location**: `{inc['site_id']}`
- **Affected Nodes**: {', '.join(inc['affected_nodes'])}

---

## 2. DETERMINISTIC CAUSAL EXPLAINABILITY
- **Temporal & Topology Rule**: `{inc.get('causal_rule_pill', 'N/A')}`
- **Dependency Cascade**: `{inc.get('topology_rule_pill', 'N/A')}`
- **Time Window Delta (\\Delta t)**: {inc.get('delta_t_seconds', 0)} seconds

---

## 3. RAG TRIAGE & ESCALATION REASON
- **Triage Mode**: `{eval_data.get('triage_mode', 'LEVEL_2_ESCALATION')}`
- **Hypothesized Root Cause Domain**: `{eval_data.get('hypothesized_domain', inc.get('domain', 'Network Infrastructure'))}`
- **Escalation Reason**: {eval_data.get('escalation_reason', 'RAG similarity score below threshold. Operator requested direct L2 Dossier.')}

---

## 4. AGGREGATED TELEMETRY TIMELINE ({len(inc['alerts'])} ALERTS)
"""
    for alert in inc.get('alerts', []):
        dossier_content += f"- `[{alert.get('timestamp')}]` **{alert.get('device_id')}** ({alert.get('alert_type')}): {alert.get('message')}\n"

    dossier_content += """
---
*Confidential Escalation Dossier - Automated Ops Dispatch Engine*
"""
    from fastapi.responses import Response
    return Response(
        content=dossier_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={incident_id}_escalation_dossier.md"}
    )

@app.post("/api/terminal/exec")
def execute_terminal_command(payload: Dict[str, Any] = Body(...)):
    """Simulates executing Cisco/Juniper CLI diagnostic commands in real time."""
    device_id = payload.get("device_id", "CORE-RTR-01")
    command = payload.get("command", "show ip bgp summary")

    cmd_lower = command.lower()
    if "bgp" in cmd_lower:
        cli_output = f"""Connecting to {device_id}.net.telecom.internal [10.240.12.1]...
Connected (SSHv2, AES-256-GCM). Authenticated as noc-ops.

{device_id}# {command}
BGP router identifier 10.240.12.1, local AS number 64512
BGP table version is 841029, main routing table version 841029
412809 network entries using 99074160 bytes

Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.240.12.2     4 64512  142091  142090   841029    0    0 00:01:14  Active (Neighbor Flapping)
10.240.12.5     4 65001   94120   94118   841029    0    0 42w1d    31204
10.240.12.9     4 65002  102941  102940   841029    0    0 12w4d    48102

[DIAGNOSTIC]: Neighbor 10.240.12.2 state is ACTIVE (BGP Session Flapping). 
[ACTION]: Check L1 optical transceiver power levels or reset BGP peer session via 'clear ip bgp 10.240.12.2 soft'.
"""
    elif "interface" in cmd_lower or "optical" in cmd_lower or "transceiver" in cmd_lower:
        cli_output = f"""Connecting to {device_id}.net.telecom.internal...
{device_id}# {command}
Interface ge-0/0/1 Optical Transceiver Diagnostic:
  Laser Bias Current      : 32.4 mA  [NORMAL]
  Tx Optical Power        : -2.10 dBm [NORMAL]
  Rx Optical Power        : -40.00 dBm [CRITICAL: LOSS OF SIGNAL (LOS)]
  Module Temperature      : 42.1 C   [NORMAL]
  Voltage                 : 3.29 V   [NORMAL]

Interface Error Statistics:
  Input Drops             : 45,210 pkts
  CRC Frame Errors        : 1,204
  Carrier Transitions     : 18

[DIAGNOSTIC]: Hard Loss of Signal (LOS) detected on Rx power. Fiber cut likely on Span 4.
"""
    else:
        cli_output = f"""Connecting to {device_id}.net.telecom.internal...
{device_id}# {command}
Device Operational Metrics:
  CPU Utilization (5-min avg) : 88.4% [ELEVATED]
  RAM Usage                   : 92.1% (3.68 GB / 4.00 GB)
  Active Flow Entries         : 184,209 flows
  Temperature Sensor 1        : 38 C (Normal)

System Uptime: 142 days, 06 hours, 22 mins
Last Config Modification: 2026-09-01 04:12:09 UTC by noc-admin
"""

    return {
        "status": "SUCCESS",
        "device_id": device_id,
        "command": command,
        "timestamp": triage_results.get("last_run_at") or "2026-09-05T12:00:00Z",
        "output": cli_output
    }


# Serve Static UI Frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
