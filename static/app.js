let state = {
  incidents: [],
  noise: [],
  filteredIncidents: [],
  selectedIncident: null,
  activeTab: 'incidents',
  stats: {
    totalAlerts: 10,
    incidentsCount: 4,
    criticalCount: 2,
    noiseReductionPct: 60.0
  }
};

document.addEventListener('DOMContentLoaded', () => {
  fetchTriageData();

  // Attach run triage button listener
  document.getElementById('btn-triage').addEventListener('click', runTriageSimulation);
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
    
    state.stats.totalAlerts = incData.total_raw_alerts || (state.incidents.length + state.noise.length);
    state.stats.criticalCount = incData.critical_count || state.incidents.filter(i => i.severity === 'CRITICAL').length;
    state.stats.noiseReductionPct = incData.noise_reduction_pct || (state.noise.length > 0 ? ((state.noise.length / state.stats.totalAlerts) * 100).toFixed(1) : 0);

    if (state.incidents.length > 0 && !state.selectedIncident) {
      state.selectedIncident = state.incidents[0];
    }

    onSearchOrFilterChange();
    updateStatsBanner();
  } catch (err) {
    console.error('Failed to load initial triage data:', err);
    showToast('Failed to connect to triage server', 'error');
  }
}

async function runTriageSimulation() {
  const btn = document.getElementById('btn-triage');
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Stream...`;

  try {
    const res = await fetch('/api/triage', { method: 'POST' });
    const data = await res.json();
    
    state.incidents = data.incidents || [];
    state.noise = data.noise || [];
    state.stats.totalAlerts = data.total_raw_alerts || (state.incidents.length + state.noise.length);
    state.stats.criticalCount = data.critical_count || state.incidents.filter(i => i.severity === 'CRITICAL').length;
    state.stats.noiseReductionPct = data.noise_reduction_pct || 60.0;

    if (state.incidents.length > 0) {
      state.selectedIncident = state.incidents[0];
    }

    onSearchOrFilterChange();
    updateStatsBanner();
    showToast('Triage simulation completed successfully! Alerts correlated.', 'success');
  } catch (err) {
    console.error('Triage error:', err);
    showToast('Error executing triage simulation', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Run Triage Simulation`;
  }
}

function updateStatsBanner() {
  document.getElementById('stat-total-alerts').textContent = state.stats.totalAlerts;
  document.getElementById('stat-incidents').textContent = state.incidents.length;
  document.getElementById('stat-critical').textContent = state.stats.criticalCount;
  document.getElementById('stat-noise-reduction').textContent = `${state.stats.noiseReductionPct}%`;

  document.getElementById('tab-inc-count').textContent = state.incidents.length;
  document.getElementById('tab-noise-count').textContent = state.noise.length;
}

function switchTab(tabName) {
  state.activeTab = tabName;
  
  ['incidents', 'topology', 'noise'].forEach(t => {
    const btn = document.getElementById(`tab-${t}`);
    const view = document.getElementById(`view-${t}`);
    if (t === tabName) {
      btn.classList.add('active');
      view.classList.remove('hidden');
    } else {
      btn.classList.remove('active');
      view.classList.add('hidden');
    }
  });

  if (tabName === 'noise') {
    renderFullNoiseList();
  }
}

function onSearchOrFilterChange() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const domain = document.getElementById('domain-select')?.value || 'ALL';

  state.filteredIncidents = state.incidents.filter(inc => {
    const matchQuery = !query || 
      inc.title.toLowerCase().includes(query) ||
      inc.incident_id.toLowerCase().includes(query) ||
      inc.summary.toLowerCase().includes(query) ||
      inc.site_id.toLowerCase().includes(query) ||
      inc.affected_nodes.some(n => n.toLowerCase().includes(query));

    const matchDomain = (domain === 'ALL') || (inc.domain === domain);
    return matchQuery && matchDomain;
  });

  renderIncidents();
  renderDetailPanel();
}

function renderIncidents() {
  const container = document.getElementById('incident-list');
  if (!container) return;

  if (state.filteredIncidents.length === 0) {
    container.innerHTML = `
      <div class="glass-card rounded-xl p-8 text-center text-slate-500 flex flex-col items-center gap-2">
        <i class="fa-solid fa-folder-open text-3xl text-slate-600"></i>
        <p class="text-xs">No incidents match your filter parameters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.filteredIncidents.map(inc => {
    const isSelected = state.selectedIncident?.incident_id === inc.incident_id;
    const evalData = inc.triage_evaluation || {};
    const isEscalated = evalData.triage_mode === 'LEVEL_2_ESCALATION';

    const sevClass = inc.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning';

    return `
      <div 
        onclick="selectIncident('${inc.incident_id}')"
        class="glass-card ${isSelected ? 'glass-active' : ''} rounded-xl p-4 cursor-pointer flex flex-col gap-2.5 transition"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-extrabold ${sevClass}">${inc.severity}</span>
            <span class="font-mono text-xs text-cyan-400 font-bold">${inc.incident_id}</span>
            ${isEscalated ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold badge-escalated flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> L2 ESCALATED</span>` : ''}
          </div>
          <div class="flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded text-xs font-mono font-bold text-cyan-300">
            <i class="fa-solid fa-chart-line text-cyan-400 text-[10px]"></i> Impact: ${inc.impact_score}
          </div>
        </div>

        <div>
          <h3 class="font-bold text-sm text-slate-100 line-clamp-1">${inc.title}</h3>
          <p class="text-xs text-slate-400 line-clamp-2 mt-0.5">${inc.summary}</p>
        </div>

        <div class="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
          <div class="flex items-center gap-3">
            <span><i class="fa-solid fa-network-wired text-cyan-400"></i> ${inc.affected_nodes.length} Nodes</span>
            <span><i class="fa-solid fa-bell text-purple-400"></i> ${inc.alerts_count} Alerts</span>
            <span><i class="fa-solid fa-location-dot text-amber-400"></i> ${inc.site_id}</span>
          </div>

          <button 
            onclick="event.stopPropagation(); executePlaybook('${inc.incident_id}')" 
            class="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 hover:bg-cyan-900 font-semibold text-[10px] flex items-center gap-1 transition"
          >
            <i class="fa-solid fa-play text-[9px]"></i> Execute
          </button>
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
    panel.innerHTML = `
      <div class="text-center text-slate-500 my-auto p-8">
        <i class="fa-solid fa-diagram-project text-5xl mb-3 text-slate-700"></i>
        <h3 class="font-bold text-slate-400 text-sm mb-1">Select an Incident</h3>
        <p class="text-xs text-slate-500">Choose an incident card from the list to inspect runbook grounding and diagnostic steps.</p>
      </div>
    `;
    return;
  }

  const evalData = inc.triage_evaluation || {};
  const isEscalated = evalData.triage_mode === 'LEVEL_2_ESCALATION';

  if (isEscalated) {
    // Level-2 Escalation Packet View
    panel.innerHTML = `
      <div class="flex flex-col gap-4">
        <!-- Banner Header -->
        <div class="flex items-start justify-between border-b border-purple-900/60 pb-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-xs font-bold badge-escalated flex items-center gap-1.5 w-fit">
                <i class="fa-solid fa-triangle-exclamation"></i> LEVEL-2 ESCALATION PACKET GENERATED
              </span>
              <span class="font-mono text-xs text-slate-400">${inc.incident_id}</span>
            </div>
            <h3 class="font-bold text-base text-white">${inc.title}</h3>
          </div>
          
          <button onclick="copyEscalationPacket('${inc.incident_id}')" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition cursor-pointer">
            <i class="fa-solid fa-copy"></i> Copy L2 Packet
          </button>
        </div>

        <!-- Reason Card -->
        <div class="bg-purple-950/40 border border-purple-800/60 rounded-xl p-3.5 text-xs text-purple-200">
          <div class="flex items-center gap-2 font-bold text-purple-300 uppercase tracking-wider mb-1">
            <i class="fa-solid fa-circle-info text-purple-400"></i> Escalation Reason
          </div>
          <p class="leading-relaxed text-slate-300">${evalData.escalation_reason || 'RAG vector similarity confidence < 0.70. Automated execution bypassed for safety.'}</p>
        </div>

        <!-- Hypothesized Root Cause Domain -->
        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Hypothesized Domain & Root Cause</h4>
          <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 flex items-center gap-2">
            <i class="fa-solid fa-terminal text-cyan-400"></i>
            <span>${evalData.hypothesized_domain || inc.domain}</span>
          </div>
        </div>

        <!-- Impacted Topology Nodes -->
        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Impacted Nodes (${inc.affected_nodes.length})</h4>
          <div class="flex flex-wrap gap-2">
            ${inc.affected_nodes.map(n => `
              <span class="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-red-400"></span> ${n}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Timeline of Events -->
        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Aggregated Telemetry Timeline (${evalData.timeline_of_events?.length || inc.alerts.length})</h4>
          <div class="bg-slate-950 border border-slate-800/90 rounded-xl p-3 max-h-40 overflow-y-auto font-mono text-[11px] flex flex-col gap-2">
            ${(evalData.timeline_of_events || inc.alerts.map(a => `[${a.timestamp}] ${a.device_id}: ${a.message}`)).map(t => `
              <div class="text-slate-300 flex items-start gap-2">
                <span class="text-cyan-400">►</span>
                <span>${t}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Evaluated Runbooks Match Scores -->
        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Evaluated Runbook Similarity Scores</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            ${(evalData.eval_matches || []).map(m => `
              <div class="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <span class="font-mono text-slate-300 truncate">${m.filename}</span>
                <span class="font-mono font-bold ${m.similarity_score >= 0.70 ? 'text-emerald-400' : 'text-amber-400'}">${m.similarity_score}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else {
    // Runbook Grounded Match View
    panel.innerHTML = `
      <div class="flex flex-col gap-4">
        <!-- Banner Header -->
        <div class="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded text-xs font-bold badge-cited flex items-center gap-1.5 w-fit">
                <i class="fa-solid fa-book-bookmark"></i> Grounded Citation: ${evalData.citation}
              </span>
            </div>
            <h3 class="font-bold text-base text-white">${inc.title}</h3>
          </div>

          <button onclick="executePlaybook('${inc.incident_id}')" class="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer">
            <i class="fa-solid fa-circle-play"></i> Execute Full Playbook
          </button>
        </div>

        <!-- Similarity Match Confidence Badge -->
        <div class="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-brain text-cyan-400 text-sm"></i>
            <span class="text-slate-300">Gemini RAG Vector Match Score:</span>
          </div>
          <span class="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-lg text-xs">
            ${(evalData.confidence_score * 100).toFixed(1)}% Match
          </span>
        </div>

        <!-- Recommended Actions List -->
        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Step-by-Step Triage & Mitigation Actions</h4>
          <div class="flex flex-col gap-2">
            ${(evalData.recommended_actions || []).map((act, idx) => `
              <div class="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex items-start justify-between gap-3 text-xs">
                <div class="flex items-start gap-2.5 text-slate-200">
                  <span class="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">${idx + 1}</span>
                  <div class="leading-relaxed whitespace-pre-line">${act}</div>
                </div>
                <button onclick="executeStep('${inc.incident_id}', ${idx + 1})" class="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 text-[10px] font-semibold flex items-center gap-1 transition shrink-0">
                  <i class="fa-solid fa-check text-[9px]"></i> Execute
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Diagnostic CLI Snippet -->
        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">NOC CLI Diagnostic Command</h4>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-cyan-300 flex items-center justify-between">
            <span>ssh noc@${inc.affected_nodes[0] || 'router'} 'show ip bgp summary'</span>
            <button onclick="copyToClipboard('ssh noc@${inc.affected_nodes[0] || 'router'} \'show ip bgp summary\'', 'CLI command copied!')" class="text-slate-400 hover:text-white transition">
              <i class="fa-solid fa-copy"></i>
            </button>
          </div>
        </div>

        <!-- Aggregated Alert Stream Timeline -->
        <div>
          <h4 class="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Aggregated Alerts Timeline</h4>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto font-mono text-[11px] flex flex-col gap-1.5">
            ${inc.alerts.map(a => `
              <div class="text-slate-300 flex items-center gap-2">
                <span class="text-slate-500">${a.timestamp}</span> 
                <span class="text-cyan-400 font-bold">[${a.device_id}]</span> 
                <span class="text-slate-200">${a.message}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
}

function renderFullNoiseList() {
  const container = document.getElementById('full-noise-list');
  if (!container) return;

  if (state.noise.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-500">No background noise alerts filtered.</div>`;
    return;
  }

  container.innerHTML = state.noise.map(n => `
    <div class="glass-card rounded-xl p-4 flex flex-col gap-2 border border-purple-900/30">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs text-purple-400 font-bold">${n.alert_id}</span>
        <span class="text-[11px] text-slate-500 font-mono">${n.timestamp}</span>
      </div>
      <div class="font-bold text-slate-200 text-xs">${n.alert_type}</div>
      <p class="text-xs text-slate-400 line-clamp-2">${n.message}</p>
      <div class="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 flex justify-between">
        <span>Device: <strong class="text-slate-400">${n.device_id}</strong></span>
        <span class="text-purple-300">Single Jitter Suppressed</span>
      </div>
    </div>
  `).join('');
}

function executePlaybook(incidentId) {
  showToast(`Executed full mitigation playbook for ${incidentId}`, 'success');
}

function executeStep(incidentId, stepNum) {
  showToast(`Executed Action Step #${stepNum} for ${incidentId}`, 'success');
}

function copyEscalationPacket(incidentId) {
  const inc = state.incidents.find(i => i.incident_id === incidentId);
  if (!inc) return;

  const evalData = inc.triage_evaluation || {};
  const packetText = `
=== L2 ESCALATION PACKET ===
Incident ID: ${inc.incident_id}
Title: ${inc.title}
Severity: ${inc.severity} | Impact Score: ${inc.impact_score}
Hypothesized Domain: ${evalData.hypothesized_domain || inc.domain}
Reason: ${evalData.escalation_reason}
Affected Nodes: ${inc.affected_nodes.join(', ')}
Site: ${inc.site_id}
Timestamp: ${new Date().toISOString()}
============================
  `.trim();

  copyToClipboard(packetText, `L2 Escalation Packet for ${incidentId} copied to clipboard!`);
}

function copyToClipboard(text, successMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg, 'info');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-red-950 border-red-800 text-red-200' : type === 'info' ? 'bg-cyan-950 border-cyan-800 text-cyan-200' : 'bg-emerald-950 border-emerald-800 text-emerald-200';
  const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';

  toast.className = `pointer-events-auto px-4 py-3 rounded-xl border text-xs shadow-2xl flex items-center gap-2.5 transition-all transform translate-y-2 opacity-0 ${bgClass}`;
  toast.innerHTML = `<i class="fa-solid ${icon} text-sm"></i> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
