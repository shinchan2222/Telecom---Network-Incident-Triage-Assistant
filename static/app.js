let state = {
  incidents: [],
  noise: [],
  selectedIncident: null
};

document.addEventListener('DOMContentLoaded', () => {
  fetchTriageData();

  document.getElementById('btn-triage').addEventListener('click', async () => {
    const btn = document.getElementById('btn-triage');
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Stream...`;
    
    try {
      const res = await fetch('/api/triage', { method: 'POST' });
      const data = await res.json();
      state.incidents = data.incidents || [];
      state.noise = data.noise || [];
      renderAll();
    } catch (err) {
      console.error('Triage error:', err);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Run Triage Simulation`;
    }
  });
});

async function fetchTriageData() {
  try {
    const [incRes, noiseRes] = await Promise.all([
      fetch('/api/incidents'),
      fetch('/api/noise')
    ]);
    const incData = await incRes.json();
    const noiseData = await noiseRes.json();

    state.incidents = incData.incidents || [];
    state.noise = noiseData.noise || [];

    if (state.incidents.length > 0 && !state.selectedIncident) {
      state.selectedIncident = state.incidents[0];
    }

    renderAll();
  } catch (err) {
    console.error('Failed to load initial triage data:', err);
  }
}

function renderAll() {
  renderIncidents();
  renderDetailPanel();
  renderNoise();
}

function renderIncidents() {
  const container = document.getElementById('incident-list');
  document.getElementById('inc-count').textContent = state.incidents.length;

  if (state.incidents.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-500">No active incidents detected.</div>`;
    return;
  }

  container.innerHTML = state.incidents.map(inc => {
    const isSelected = state.selectedIncident?.incident_id === inc.incident_id;
    const evalData = inc.triage_evaluation || {};
    const isEscalated = evalData.triage_mode === 'LEVEL_2_ESCALATION';

    const sevClass = inc.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning';
    
    return `
      <div 
        onclick="selectIncident('${inc.incident_id}')"
        class="glass-card ${isSelected ? 'glass-active' : ''} rounded-xl p-4 cursor-pointer flex flex-col gap-2"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${sevClass}">${inc.severity}</span>
            <span class="font-mono text-xs text-cyan-400 font-semibold">${inc.incident_id}</span>
            ${isEscalated ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold badge-escalated"><i class="fa-solid fa-triangle-exclamation"></i> L2 ESCALATED</span>` : ''}
          </div>
          <div class="flex items-center gap-1 text-slate-400 font-mono text-xs font-bold">
            <i class="fa-solid fa-chart-line text-cyan-400"></i> Impact: ${inc.impact_score}
          </div>
        </div>

        <h3 class="font-bold text-sm text-slate-100 line-clamp-1">${inc.title}</h3>
        <p class="text-xs text-slate-400 line-clamp-2">${inc.summary}</p>

        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
          <span><i class="fa-solid fa-network-wired text-slate-400"></i> ${inc.affected_nodes.length} Nodes</span>
          <span><i class="fa-solid fa-bell text-slate-400"></i> ${inc.alerts_count} Alerts</span>
          <span><i class="fa-solid fa-location-dot text-slate-400"></i> ${inc.site_id}</span>
        </div>
      </div>
    `;
  }).join('');
}

function selectIncident(id) {
  state.selectedIncident = state.incidents.find(i => i.incident_id === id) || null;
  renderIncidents();
  renderDetailPanel();
}

function renderDetailPanel() {
  const panel = document.getElementById('detail-panel');
  const inc = state.selectedIncident;

  if (!inc) {
    panel.innerHTML = `<div class="text-center text-slate-500 my-auto"><p>Select an incident to view triage evaluation.</p></div>`;
    return;
  }

  const evalData = inc.triage_evaluation || {};
  const isEscalated = evalData.triage_mode === 'LEVEL_2_ESCALATION';

  if (isEscalated) {
    // Level-2 Escalation Packet View
    panel.innerHTML = `
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-purple-900/50 pb-3">
          <div>
            <span class="px-2.5 py-1 rounded text-xs font-bold badge-escalated flex items-center gap-1.5 w-fit mb-1">
              <i class="fa-solid fa-triangle-exclamation"></i> LEVEL-2 ESCALATION PACKET
            </span>
            <h3 class="font-bold text-base text-white">${inc.title}</h3>
          </div>
        </div>

        <div class="bg-purple-950/30 border border-purple-900/50 rounded-lg p-3 text-xs text-purple-200">
          <strong class="text-purple-400 uppercase font-bold block mb-1">Escalation Reason:</strong>
          ${evalData.escalation_reason}
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Hypothesized Domain</h4>
          <div class="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300">
            ${evalData.hypothesized_domain}
          </div>
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Timeline of Events (${evalData.timeline_of_events?.length || 0})</h4>
          <div class="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px] flex flex-col gap-1.5">
            ${(evalData.timeline_of_events || []).map(t => `<div class="text-slate-300">${t}</div>`).join('')}
          </div>
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Evaluated Runbook Matches</h4>
          <div class="flex flex-col gap-1.5">
            ${(evalData.eval_matches || []).map(m => `
              <div class="flex items-center justify-between text-xs p-2 rounded bg-slate-900/70 border border-slate-800">
                <span class="font-mono text-slate-300">${m.filename}</span>
                <span class="font-mono text-slate-400">Score: ${m.similarity_score}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else {
    // Runbook Matched View
    panel.innerHTML = `
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <span class="px-2.5 py-1 rounded text-xs font-bold badge-cited flex items-center gap-1.5 w-fit mb-1">
              <i class="fa-solid fa-book-bookmark"></i> ${evalData.citation}
            </span>
            <h3 class="font-bold text-base text-white">${inc.title}</h3>
          </div>
        </div>

        <div class="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-lg text-xs">
          <span class="text-slate-400">Similarity Confidence:</span>
          <span class="font-mono font-bold text-emerald-400">${(evalData.confidence_score * 100).toFixed(1)}% Match</span>
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Recommended Triage Actions</h4>
          <div class="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-2 text-xs">
            ${(evalData.recommended_actions || []).map(act => `
              <div class="flex items-start gap-2 text-slate-200">
                <i class="fa-solid fa-chevron-right text-cyan-400 mt-0.5 text-[10px]"></i>
                <div class="whitespace-pre-line">${act}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Aggregated Alerts Timeline</h4>
          <div class="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-36 overflow-y-auto font-mono text-[11px] flex flex-col gap-1.5">
            ${inc.alerts.map(a => `
              <div class="text-slate-300">
                <span class="text-slate-500">${a.timestamp}</span> 
                <span class="text-cyan-400 font-bold">[${a.device_id}]</span> 
                <span>${a.message}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}

function renderNoise() {
  const container = document.getElementById('noise-list');
  document.getElementById('noise-count').textContent = state.noise.length;

  if (state.noise.length === 0) {
    container.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">No noise alerts filtered.</div>`;
    return;
  }

  container.innerHTML = state.noise.map(n => `
    <div class="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs flex flex-col gap-1">
      <div class="flex items-center justify-between">
        <span class="font-mono text-[10px] text-amber-400">${n.alert_id}</span>
        <span class="text-[10px] text-slate-500">${n.timestamp}</span>
      </div>
      <div class="font-bold text-slate-300 text-[11px]">${n.alert_type}</div>
      <p class="text-[11px] text-slate-400 line-clamp-1">${n.message}</p>
    </div>
  `).join('');
}


