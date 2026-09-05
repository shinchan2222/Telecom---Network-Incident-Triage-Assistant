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
  document.getElementById('btn-triage')?.addEventListener('click', runTriageSimulation);
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
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Stream...`;
  }

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
    showToast('Triage simulation completed! Alerts correlated with deterministic rules.', 'success');
  } catch (err) {
    console.error('Triage error:', err);
    showToast('Error executing triage simulation', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Run Triage Simulation`;
    }
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
      btn?.classList.add('active');
      view?.classList.remove('hidden');
    } else {
      btn?.classList.remove('active');
      view?.classList.add('hidden');
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
      <div class="glass-card rounded-xl p-8 text-center text-slate-400 flex flex-col items-center gap-2">
        <i class="fa-solid fa-folder-open text-3xl text-slate-300"></i>
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
            <span class="font-mono text-xs text-sky-700 font-bold">${inc.incident_id}</span>
            ${isEscalated ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold badge-escalated flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> L2 ESCALATED</span>` : ''}
          </div>
          <div class="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs font-mono font-bold text-sky-700">
            <i class="fa-solid fa-chart-line text-sky-600 text-[10px]"></i> Impact: ${inc.impact_score}
          </div>
        </div>

        <div>
          <h3 class="font-bold text-sm text-slate-900 line-clamp-1">${inc.title}</h3>
          <p class="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">${inc.summary}</p>
        </div>

        <!-- Deterministic Explainability Pill -->
        <div class="p-2 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-1.5 font-mono">
          <i class="fa-solid fa-code-branch text-sky-600 text-[10px]"></i>
          <span class="truncate">${inc.causal_rule_pill || `Rule: Temporal Co-occurrence (Δt = 94s < 180s) + Shared Upstream L2 Trunk`}</span>
        </div>

        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200">
          <div class="flex items-center gap-3">
            <button onclick="event.stopPropagation(); openBlastRadiusModal('${inc.incident_id}')" class="text-sky-700 font-bold hover:text-sky-800 flex items-center gap-1">
              <i class="fa-solid fa-circle-nodes text-sky-600"></i> ${inc.affected_nodes.length} Nodes
            </button>
            <span><i class="fa-solid fa-bell text-purple-600"></i> ${inc.alerts_count} Alerts</span>
          </div>

          <button 
            onclick="event.stopPropagation(); openTerminalModal('${inc.affected_nodes[0] || 'device'}', 'show ip bgp summary')" 
            class="px-2.5 py-1 rounded bg-sky-50 border border-sky-300 text-sky-700 hover:bg-sky-100 font-bold text-[10px] flex items-center gap-1 transition"
          >
            <i class="fa-solid fa-terminal text-[9px]"></i> CLI Diag
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
      <div class="text-center text-slate-400 my-auto p-8">
        <i class="fa-solid fa-diagram-project text-5xl mb-3 text-slate-300"></i>
        <h3 class="font-bold text-slate-700 text-sm mb-1">Select an Incident</h3>
        <p class="text-xs text-slate-500">Choose an incident card from the list to inspect runbook grounding and diagnostic steps.</p>
      </div>
    `;
    return;
  }

  const evalData = inc.triage_evaluation || {};
  const isEscalated = evalData.triage_mode === 'LEVEL_2_ESCALATION';

  panel.innerHTML = `
    <div class="flex flex-col gap-4">
      
      <!-- Top Banner & Human-in-the-Loop Action Toolbar -->
      <div class="flex flex-wrap items-start justify-between border-b border-slate-200 pb-3 gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded text-xs font-bold ${isEscalated ? 'badge-escalated' : 'badge-cited'} flex items-center gap-1.5 w-fit">
              <i class="fa-solid ${isEscalated ? 'fa-triangle-exclamation' : 'fa-book-bookmark'}"></i> 
              ${isEscalated ? 'LEVEL-2 ESCALATION PACKET' : `Grounded Citation: ${evalData.citation}`}
            </span>
            <span class="font-mono text-xs text-slate-500 font-bold">${inc.incident_id}</span>
          </div>
          <h3 class="font-bold text-base text-slate-900">${inc.title}</h3>
        </div>

        <!-- Human-in-the-Loop Action Toolbar -->
        <div class="flex items-center gap-2">
          <button onclick="dispatchTicket('${inc.incident_id}')" class="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer" title="Simulate Jira/ServiceNow ticket creation">
            <i class="fa-solid fa-ticket"></i> Dispatch Ticket
          </button>
          
          <button onclick="demoteToNoise('${inc.incident_id}')" class="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer" title="Reclassify alert into Noise pool">
            <i class="fa-solid fa-filter-circle-xmark"></i> Demote Noise
          </button>

          <button onclick="downloadDossier('${inc.incident_id}')" class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer" title="Force L2 Escalation Dossier download">
            <i class="fa-solid fa-file-arrow-down"></i> Force Dossier
          </button>
        </div>
      </div>

      <!-- Deterministic Causal "Why Grouped?" Explainability Container -->
      <div class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col gap-1.5 font-mono text-xs text-slate-200">
        <div class="flex items-center justify-between text-sky-400 font-bold text-[11px] uppercase tracking-wider">
          <span><i class="fa-solid fa-shield-halved"></i> Deterministic Causal Explainability</span>
          <span class="text-slate-400">Rule Engine Grounding</span>
        </div>
        <div class="text-emerald-400 text-xs font-semibold">
          ► ${inc.causal_rule_pill || `Rule: Temporal Co-occurrence (Δt = 94s < 180s) + Shared L2 Upstream Interface (ge-0/0/1)`}
        </div>
        <div class="text-sky-300 text-[11px]">
          ► ${inc.topology_rule_pill || `Topology: Site (${inc.site_id}) & Core-to-Access Dependency Cascade (${inc.affected_nodes.length} nodes)`}
        </div>
      </div>

      <!-- Interactive Blast-Radius Quick Visualizer Trigger -->
      <div class="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs">
        <div class="flex items-center gap-2 text-sky-900 font-medium">
          <i class="fa-solid fa-circle-nodes text-sky-600 text-base"></i>
          <span>Impacted Nodes Blast Radius (${inc.affected_nodes.length} devices)</span>
        </div>
        <button onclick="openBlastRadiusModal('${inc.incident_id}')" class="px-3 py-1 bg-white border border-sky-300 text-sky-700 hover:bg-sky-100 font-bold rounded-lg text-xs transition shadow-sm">
          <i class="fa-solid fa-expand"></i> Launch Interactive Graph
        </button>
      </div>

      <!-- RAG Recommendation & Actions -->
      ${isEscalated ? `
        <div class="bg-purple-50 border border-purple-200 rounded-xl p-3.5 text-xs text-purple-900">
          <div class="flex items-center gap-2 font-bold text-purple-700 uppercase tracking-wider mb-1">
            <i class="fa-solid fa-circle-info text-purple-600"></i> Escalation Reason
          </div>
          <p class="leading-relaxed text-slate-700 font-medium">${evalData.escalation_reason || 'RAG vector similarity confidence < 0.70. Automated execution bypassed for safety.'}</p>
        </div>
      ` : `
        <div class="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-brain text-emerald-600 text-base"></i>
            <span class="text-slate-800 font-medium">Gemini RAG Vector Match Score:</span>
          </div>
          <span class="font-mono font-bold text-emerald-800 bg-white border border-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shadow-sm">
            ${((evalData.confidence_score || 0.85) * 100).toFixed(1)}% Match
          </span>
        </div>

        <div>
          <h4 class="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Step-by-Step Triage & Mitigation Actions</h4>
          <div class="flex flex-col gap-2">
            ${(evalData.recommended_actions || []).map((act, idx) => `
              <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs">
                <div class="flex items-start gap-2.5 text-slate-800">
                  <span class="w-5 h-5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">${idx + 1}</span>
                  <div class="leading-relaxed whitespace-pre-line font-medium">${act}</div>
                </div>
                <button onclick="executeStep('${inc.incident_id}', ${idx + 1})" class="px-2.5 py-1 rounded bg-white border border-slate-300 hover:border-sky-500 text-slate-700 hover:text-sky-600 text-[10px] font-bold flex items-center gap-1 transition shrink-0 shadow-sm">
                  <i class="fa-solid fa-check text-[9px]"></i> Execute
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `}

      <!-- Diagnostic CLI Terminal Simulator Box -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-bold text-xs text-slate-500 uppercase tracking-wider">NOC Diagnostic Command</h4>
          <button onclick="openTerminalModal('${inc.affected_nodes[0] || 'router'}', 'show ip bgp summary')" class="text-sky-600 hover:text-sky-700 font-bold text-xs flex items-center gap-1">
            <i class="fa-solid fa-terminal"></i> Run Live Diagnostic
          </button>
        </div>
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-sky-300 flex items-center justify-between shadow-inner">
          <span>ssh noc@${inc.affected_nodes[0] || 'router'} 'show ip bgp summary'</span>
          <button onclick="openTerminalModal('${inc.affected_nodes[0] || 'router'}', 'show ip bgp summary')" class="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-[11px] transition">
            Run
          </button>
        </div>
      </div>

    </div>
  `;
}

/* =========================================================
   FEATURE 1: INTERACTIVE BLAST-RADIUS SVG TOPOLOGY RENDERER
   ========================================================= */
function openBlastRadiusModal(targetId) {
  const modal = document.getElementById('blast-modal');
  if (!modal) return;

  const inc = state.incidents.find(i => i.incident_id === targetId || i.site_id === targetId || i.affected_nodes.includes(targetId)) || state.selectedIncident || state.incidents[0];
  
  if (inc) {
    document.getElementById('blast-modal-site').textContent = inc.site_id;
    renderBlastSvgGraph(inc);
  }

  modal.classList.remove('hidden');
}

function closeBlastRadiusModal() {
  document.getElementById('blast-modal')?.classList.add('hidden');
}

function renderBlastSvgGraph(inc) {
  const svg = document.getElementById('blast-svg');
  if (!svg) return;

  const rootDevice = inc.primary_device || inc.affected_nodes[0] || 'CORE-RTR-01';
  const affected = inc.affected_nodes.filter(n => n !== rootDevice);
  const noiseNodes = state.noise.slice(0, 3).map(n => n.device_id);

  // Define layout coordinates
  const centerX = 380;
  const centerY = 190;

  let svgHtml = `
    <!-- Defs for glow effects -->
    <defs>
      <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  `;

  // Draw links to transit nodes
  const angleStep = Math.PI / Math.max(affected.length, 1);
  const radius = 130;

  const nodeCoords = [];

  affected.forEach((node, i) => {
    const angle = Math.PI - (i + 0.5) * (Math.PI / affected.length);
    const nx = centerX + radius * Math.cos(angle);
    const ny = centerY - radius * Math.sin(angle);
    nodeCoords.push({ id: node, x: nx, y: ny, type: 'TRANSIT' });

    svgHtml += `
      <line x1="${centerX}" y1="${centerY}" x2="${nx}" y2="${ny}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4" />
    `;
  });

  // Draw links to isolated noise nodes
  noiseNodes.forEach((node, i) => {
    const nx = 70 + i * 80;
    const ny = 330;
    nodeCoords.push({ id: node, x: nx, y: ny, type: 'NOISE' });

    svgHtml += `
      <line x1="${centerX}" y1="${centerY}" x2="${nx}" y2="${ny}" stroke="#475569" stroke-width="1" stroke-dasharray="2" opacity="0.5" />
    `;
  });

  // Draw Root Cause Node at Center
  svgHtml += `
    <g class="cursor-pointer" onclick="inspectBlastNode('${rootDevice}', 'ROOT_CAUSE', '${inc.severity}', '${inc.site_id}')">
      <circle cx="${centerX}" cy="${centerY}" r="28" fill="#ef4444" opacity="0.3" class="node-pulse" />
      <circle cx="${centerX}" cy="${centerY}" r="20" fill="#dc2626" stroke="#fca5a5" stroke-width="3" filter="url(#glow-red)" />
      <text x="${centerX}" y="${centerY + 4}" text-anchor="middle" fill="#ffffff" font-size="10" font-weight="bold" font-family="JetBrains Mono">${rootDevice.substring(0, 10)}</text>
      <text x="${centerX}" y="${centerY - 28}" text-anchor="middle" fill="#fca5a5" font-size="9" font-weight="bold">ROOT CAUSE</text>
    </g>
  `;

  // Draw Transit Nodes
  nodeCoords.filter(n => n.type === 'TRANSIT').forEach(n => {
    svgHtml += `
      <g class="cursor-pointer" onclick="inspectBlastNode('${n.id}', 'TRANSIT_IMPACT', 'WARNING', '${inc.site_id}')">
        <circle cx="${n.x}" cy="${n.y}" r="16" fill="#d97706" stroke="#fde68a" stroke-width="2" />
        <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" fill="#ffffff" font-size="9" font-weight="bold" font-family="JetBrains Mono">${n.id.substring(0, 8)}</text>
      </g>
    `;
  });

  // Draw Outer Noise Nodes
  nodeCoords.filter(n => n.type === 'NOISE').forEach(n => {
    svgHtml += `
      <g class="cursor-pointer" onclick="inspectBlastNode('${n.id}', 'ISOLATED_NOISE', 'INFO', '${inc.site_id}')">
        <circle cx="${n.x}" cy="${n.y}" r="12" fill="#334155" stroke="#64748b" stroke-width="1.5" />
        <text x="${n.x}" y="${n.y + 3}" text-anchor="middle" fill="#cbd5e1" font-size="8" font-family="JetBrains Mono">${n.id.substring(0, 7)}</text>
      </g>
    `;
  });

  svg.innerHTML = svgHtml;
  inspectBlastNode(rootDevice, 'ROOT_CAUSE', inc.severity, inc.site_id);
}

function inspectBlastNode(nodeId, role, status, siteId) {
  const inspector = document.getElementById('blast-node-inspector');
  if (!inspector) return;

  const roleBadge = role === 'ROOT_CAUSE' ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300">ROOT CAUSE</span>' :
                    role === 'TRANSIT_IMPACT' ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">IMPACTED TRANSIT</span>' :
                    '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">NOISE / ISOLATED</span>';

  inspector.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-server text-sky-600 text-lg"></i>
      <div>
        <div class="flex items-center gap-2">
          <strong class="font-mono text-slate-900">${nodeId}</strong>
          ${roleBadge}
        </div>
        <div class="text-[11px] text-slate-500">Site: ${siteId} | Interface: ge-0/0/1 (10Gbps Trunk) | Status: ${status}</div>
      </div>
    </div>
    <button onclick="openTerminalModal('${nodeId}', 'show interface ge-0/0/1 diagnostics')" class="px-3 py-1 rounded bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition">
      <i class="fa-solid fa-terminal"></i> CLI Diag
    </button>
  `;
}

/* =========================================================
   FEATURE 3: INTERACTIVE MOCK NOC TERMINAL (CLI SIMULATOR)
   ========================================================= */
function openTerminalModal(deviceId, command = 'show ip bgp summary') {
  const modal = document.getElementById('terminal-modal');
  if (!modal) return;

  document.getElementById('terminal-target-device').textContent = `noc@${deviceId}`;
  document.getElementById('terminal-input').value = command;

  modal.classList.remove('hidden');
  runTerminalExec();
}

function closeTerminalModal() {
  document.getElementById('terminal-modal')?.classList.add('hidden');
}

function getMockCliOutput(deviceId, command) {
  const dev = deviceId || 'CORE-RTR-01';
  const cmd = (command || 'show ip bgp summary').trim().toLowerCase();

  if (cmd.includes('interface') || cmd.includes('optical') || cmd.includes('transceiver') || cmd.includes('diag')) {
    return `Connecting to ${dev}.net.telecom.internal [10.240.12.1]...
Connected (SSHv2, AES-256-GCM). Authenticated as noc-ops.

${dev}# ${command}
Physical Interface: ge-0/0/1
Link State        : DOWN (Loss of Signal / Transceiver Rx Failure)
Link Speed        : 10Gbps Full-Duplex
MAC Address       : 00:1c:73:9a:12:4f

SFP+ Optical Transceiver Diagnostic:
  Laser Bias Current      : 32.4 mA  [NORMAL]
  Tx Optical Power        : -2.10 dBm [NORMAL]
  Rx Optical Power        : -40.00 dBm [CRITICAL: LOSS OF SIGNAL (LOS ALARM)]
  Module Temperature      : 42.1 C   [NORMAL]
  Supply Voltage          : 3.29 V   [NORMAL]

Interface Error Statistics:
  Input Drops             : 45,210 pkts
  CRC Frame Errors        : 1,204
  Carrier Transitions     : 18

[DIAGNOSTIC]: Hard Loss of Signal (LOS) detected on Rx power (-40.0 dBm). Fiber cut on Span 4.
[COMMAND EXIT CODE]: 0 (OK)`;
  } else if (cmd.includes('bgp')) {
    return `Connecting to ${dev}.net.telecom.internal [10.240.12.1]...
Connected (SSHv2, AES-256-GCM). Authenticated as noc-ops.

${dev}# ${command}
BGP router identifier 10.240.12.1, local AS number 64512
BGP table version is 841029, main routing table version 841029
412809 network entries using 99074160 bytes

Neighbor        V    AS MsgRcvd MsgSent   TblVer  InQ OutQ Up/Down  State/PfxRcd
10.240.12.2     4 64512  142091  142090   841029    0    0 00:01:14  Active (Neighbor Flapping)
10.240.12.5     4 65001   94120   94118   841029    0    0 42w1d    31204
10.240.12.9     4 65002  102941  102940   841029    0    0 12w4d    48102

[DIAGNOSTIC]: Neighbor 10.240.12.2 state is ACTIVE / IDLE (BGP Session Flapping). 
[ACTION]: Reset BGP peer session via 'clear ip bgp 10.240.12.2 soft'.
[COMMAND EXIT CODE]: 0 (OK)`;
  } else {
    return `Connecting to ${dev}.net.telecom.internal [10.240.12.1]...
Connected (SSHv2, AES-256-GCM). Authenticated as noc-ops.

${dev}# ${command}
Device Operational Metrics:
  Host Name                   : ${dev}
  Platform                    : Junos OS / Cisco IOS-XE Release 17.09
  CPU Utilization (5-min avg) : 88.4% [ELEVATED]
  RAM Usage                   : 92.1% (3.68 GB / 4.00 GB)
  Active Flow Entries         : 184,209 flows
  Temperature Sensor 1        : 38 C (Normal)

System Uptime: 142 days, 06 hours, 22 mins
Last Config Modification: 2026-09-01 04:12:09 UTC by noc-admin

[COMMAND EXIT CODE]: 0 (OK)`;
  }
}

async function runTerminalExec() {
  const device = (document.getElementById('terminal-target-device')?.textContent || '').replace('noc@', '').trim() || 'CORE-RTR-01';
  const command = (document.getElementById('terminal-input')?.value || '').trim() || 'show interface ge-0/0/1 diagnostics';
  const screen = document.getElementById('terminal-screen');

  if (screen) {
    screen.innerHTML = `Connecting to ${device}...\n$ ${command}\n\n[EXEC] Running diagnostic process...`;
  }

  try {
    const res = await fetch('/api/terminal/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: device, command: command })
    });
    const data = await res.json();
    
    const outputText = data && data.output ? data.output : getMockCliOutput(device, command);
    if (screen) screen.innerHTML = outputText;
  } catch (err) {
    if (screen) screen.innerHTML = getMockCliOutput(device, command);
  }
}

/* =========================================================
   FEATURE 4: HUMAN-IN-THE-LOOP ACTION TOOLBAR HANDLERS
   ========================================================= */
async function dispatchTicket(incidentId) {
  try {
    const res = await fetch(`/api/incidents/${incidentId}/dispatch-ticket`, { method: 'POST' });
    const data = await res.json();
    showToast(`Dispatched ServiceNow Ticket ${data.ticket_id} for ${incidentId}`, 'success');
  } catch (err) {
    showToast('Failed to dispatch ticket', 'error');
  }
}

async function demoteToNoise(incidentId) {
  try {
    const res = await fetch(`/api/incidents/${incidentId}/demote-to-noise`, { method: 'POST' });
    const data = await res.json();
    
    // Update local state
    state.incidents = state.incidents.filter(i => i.incident_id !== incidentId);
    if (state.selectedIncident?.incident_id === incidentId) {
      state.selectedIncident = state.incidents[0] || null;
    }

    onSearchOrFilterChange();
    updateStatsBanner();
    showToast(`Incident ${incidentId} demoted to Noise pool`, 'info');
  } catch (err) {
    showToast('Failed to demote incident', 'error');
  }
}

function downloadDossier(incidentId) {
  window.open(`/api/incidents/${incidentId}/download-dossier`, '_blank');
  showToast(`Downloaded L2 Escalation Dossier markdown file`, 'success');
}

function renderFullNoiseList() {
  const container = document.getElementById('full-noise-list');
  if (!container) return;

  if (state.noise.length === 0) {
    container.innerHTML = `<div class="col-span-full p-8 text-center text-slate-400">No background noise alerts filtered.</div>`;
    return;
  }

  container.innerHTML = state.noise.map(n => `
    <div class="glass-card rounded-xl p-4 flex flex-col gap-2 border border-purple-200">
      <div class="flex items-center justify-between">
        <span class="font-mono text-xs text-purple-700 font-bold">${n.alert_id}</span>
        <span class="text-[11px] text-slate-500 font-mono">${n.timestamp}</span>
      </div>
      <div class="font-bold text-slate-900 text-xs">${n.alert_type}</div>
      <p class="text-xs text-slate-600 line-clamp-2">${n.message}</p>
      <div class="pt-2 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
        <span>Device: <strong class="text-slate-700">${n.device_id}</strong></span>
        <span class="text-purple-700 font-semibold">${n.demoted_reason || 'Single Jitter Suppressed'}</span>
      </div>
    </div>
  `).join('');
}

function executeStep(incidentId, stepNum) {
  showToast(`Executed Action Step #${stepNum} for ${incidentId}`, 'success');
}

/* =========================================================
   FEATURE 5: SCENARIO PRESET SWITCHER & 1-CLICK REPORT EXPORT
   ========================================================= */
async function onScenarioPresetChange() {
  const scenarioKey = document.getElementById('scenario-select')?.value || 'ALL';
  const btn = document.getElementById('btn-triage');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Switching...`;
  }

  try {
    const res = await fetch(`/api/triage/preset?scenario=${scenarioKey}`, { method: 'POST' });
    const data = await res.json();

    state.incidents = data.incidents || [];
    state.noise = data.noise || [];
    state.stats.totalAlerts = data.total_raw_alerts || (state.incidents.length + state.noise.length);
    state.stats.criticalCount = data.critical_count || state.incidents.filter(i => i.severity === 'CRITICAL').length;
    state.stats.noiseReductionPct = data.noise_reduction_pct || 60.0;

    if (state.incidents.length > 0) {
      state.selectedIncident = state.incidents[0];
    } else {
      state.selectedIncident = null;
    }

    onSearchOrFilterChange();
    updateStatsBanner();

    const scenarioLabel = scenarioKey === 'FIBER_CUT' ? 'Subsea Fiber Cut' :
                          scenarioKey === 'BGP_FLAP' ? 'US-East BGP Flap' :
                          scenarioKey === 'RADIUS_STORM' ? 'EU RADIUS Storm' :
                          scenarioKey === 'MEMORY_LEAK' ? 'Switch Memory Leak' : 'All Stream Alerts';

    showToast(`Switched scenario to ${scenarioLabel} (${state.incidents.length} correlated incidents)`, 'info');
  } catch (err) {
    console.error('Error switching scenario:', err);
    showToast('Failed to switch sample scenario', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-bolt"></i> Run Triage`;
    }
  }
}

function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

function exportTriageReport(format = 'json') {
  const menu = document.getElementById('export-menu');
  if (menu) menu.classList.add('hidden');

  window.open(`/api/incidents/export?format=${format}`, '_blank');
  showToast(`Downloading Triage Report (${format.toUpperCase()})`, 'success');
}

// Close export menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('export-menu');
  const btn = e.target.closest('button[onclick*="toggleExportMenu"]');
  if (menu && !menu.contains(e.target) && !btn) {
    menu.classList.add('hidden');
  }
});

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'error' ? 'bg-red-600 text-white shadow-red-500/20' : type === 'info' ? 'bg-sky-600 text-white shadow-sky-500/20' : 'bg-emerald-600 text-white shadow-emerald-500/20';
  const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';

  toast.className = `pointer-events-auto px-4 py-3 rounded-xl border-none text-xs font-semibold shadow-xl flex items-center gap-2.5 transition-all transform translate-y-2 opacity-0 ${bgClass}`;
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
