TRACK_ID=PS07

# Network Incident Triage Assistant & AI NOC Command Center (PS07)

An intelligent, production-ready Network Incident Triage Assistant for telecom and enterprise networks. It ingests high-volume synthetic alert streams, correlates cascading events, filters out low-severity noise, ranks incidents by impact score, and matches root causes against local markdown runbooks using Gemini RAG embeddings with deterministic L2 escalation fallback.

---

## 🌟 Enterprise Features & System Architecture

- **Correlation Engine (`src/correlation.py`)**: Groups cascading alerts using temporal sliding windows (5-min default) and site/device role proximity while isolating non-actionable jitter into a dedicated `Noise` list. Attaches deterministic causal rules (e.g. `Rule: Temporal Co-occurrence (Δt = 94s < 180s) + Shared L2 Upstream Interface (ge-0/0/1)`).
- **Prioritization (`src/prioritization.py`)**: Ranks incidents using weighted impact scoring:
  $$\text{Impact Score} = (\text{Severity Weight} \times 0.4) + (\text{Affected Nodes} \times 0.4) + (\text{Tier Weight} \times 0.2)$$
- **RAG & Escalation Engine (`src/rag_engine.py`)**: Embeds local runbooks with `gemini-embedding-001` (plus fallback offline vectorizer). Uses cosine similarity threshold $\ge 0.70$ for runbook matching with exact section citations, or generates a structured **L2 Escalation Packet** when similarity is $< 0.70$.
- **Interactive Blast-Radius Topology Visualizer**: SVG Canvas modal rendering root cause device at center, connected transit switches, and outer noise nodes outside the blast perimeter.
- **Interactive NOC CLI Simulator**: Dark-mode terminal window streaming Cisco/Juniper diagnostic CLI outputs (`show interface ge-0/0/1 diagnostics`, `show ip bgp summary`).
- **Human-in-the-Loop Action Toolbar**: 1-click **[Approve & Dispatch Ticket]**, **[Mark False Positive]**, and **[Force L2 Escalation Dossier]** markdown downloader.
- **FastAPI Core & Dashboard (`app.py`, `static/`)**: Single-command startup serving REST endpoints and Modern Clean Light Mode NOC dashboard UI on port 8000.

---

## 🚀 Quick Start (Single Command)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set Gemini API Key (Optional; offline fallback RAG vectorizer included)
export GEMINI_API_KEY="your_api_key_here"  # Linux/macOS
$env:GEMINI_API_KEY="your_api_key_here"     # Windows PowerShell

# 3. Launch App & NOC Dashboard
python app.py
```

Access the NOC Dashboard in your browser at: **`http://localhost:8000`**

---

## 📡 REST API Endpoints

- `POST /api/triage` - Run alert correlation, scoring, and RAG triage.
- `GET /api/incidents` - Retrieve correlated incidents, runbook citations, and L2 escalation packets.
- `GET /api/noise` - Retrieve uncorroborated, low-severity noise alerts.
- `POST /api/incidents/{incident_id}/dispatch-ticket` - Simulate ServiceNow/Jira ticket creation.
- `POST /api/incidents/{incident_id}/demote-to-noise` - Reclassify an alert to the noise pool.
- `GET /api/incidents/{incident_id}/download-dossier` - Download Markdown Escalation Dossier.
- `POST /api/terminal/exec` - Execute simulated Cisco/Juniper CLI commands.
- `GET /` - Serve static NOC dashboard UI.