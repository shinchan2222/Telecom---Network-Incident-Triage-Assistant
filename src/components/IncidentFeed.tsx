import React, { useState } from 'react';
import { TelecomIncident, IncidentSeverity, IncidentDomain } from '../types/telecom';
import { AlertTriangle, Clock, Users, ArrowRight, ShieldAlert, Cpu, CheckCircle2, Filter, Layers } from 'lucide-react';

interface IncidentFeedProps {
  incidents: TelecomIncident[];
  selectedIncident: TelecomIncident | null;
  onSelectIncident: (incident: TelecomIncident) => void;
  onOpenTriage: (incident: TelecomIncident) => void;
  searchQuery: string;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onOpenTriage,
  searchQuery
}) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [domainFilter, setDomainFilter] = useState<string>('ALL');

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = searchQuery === '' || 
      inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.nodeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.region.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    const matchesDomain = domainFilter === 'ALL' || inc.domain === domainFilter;

    return matchesSearch && matchesSeverity && matchesDomain;
  });

  const getSeverityBadgeClass = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL': return 'badge-critical';
      case 'MAJOR': return 'badge-major';
      case 'MINOR': return 'badge-minor';
      default: return 'badge-healthy';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>
            <Filter size={16} /> Filters:
          </div>

          {/* Severity Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'CRITICAL', 'MAJOR', 'MINOR'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                style={{
                  background: severityFilter === sev ? 'rgba(0, 242, 254, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  color: severityFilter === sev ? 'var(--primary-cyan)' : 'var(--text-muted)',
                  border: severityFilter === sev ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid var(--border-subtle)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {sev}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />

          {/* Domain Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={14} color="var(--text-muted)" />
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-subtle)',
                padding: '5px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="ALL">All Domains</option>
              <option value="5G Core">5G Core</option>
              <option value="Fiber Backhaul">Fiber Backhaul</option>
              <option value="Edge Datacenter">Edge Datacenter</option>
              <option value="Cell Tower RAN">Cell Tower RAN</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Showing <span style={{ color: 'var(--primary-cyan)', fontWeight: 700 }}>{filteredIncidents.length}</span> of {incidents.length} incidents
        </div>
      </div>

      {/* Incident List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(640px, 1fr))', gap: '16px' }}>
        {filteredIncidents.map((incident) => {
          const isSelected = selectedIncident?.id === incident.id;
          return (
            <div
              key={incident.id}
              className={isSelected ? 'glass-panel-glow' : 'glass-panel'}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}
            >
              {/* Header Row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`badge ${getSeverityBadgeClass(incident.severity)}`}>
                    {incident.severity}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--primary-cyan)', fontWeight: 600 }}>
                    {incident.id}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                    {incident.domain}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  MTTR ~{incident.mttrEstimateMinutes}m
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', lineHeight: 1.3 }}>
                  {incident.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {incident.description}
                </p>
              </div>

              {/* Stats Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(4, 6, 10, 0.5)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Target Node</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {incident.nodeName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Blast Radius</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--status-critical)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} />
                    {(incident.blastRadiusUsers / 1000).toFixed(0)}k Users
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>AI Root Cause Match</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--status-healthy)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Cpu size={12} color="#00f5a0" />
                    {incident.rootCauseConfidencePct}% Confidence
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  Region: <span style={{ color: 'var(--text-muted)' }}>{incident.region}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => onSelectIncident(incident)}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    View Details
                  </button>

                  <button
                    className="btn-primary"
                    onClick={() => onOpenTriage(incident)}
                    style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    <Cpu size={14} /> Run AI Triage <ArrowRight size={14} />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
