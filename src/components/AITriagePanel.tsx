import React, { useState } from 'react';
import { TelecomIncident, PlaybookStep, SyslogEntry } from '../types/telecom';
import { Cpu, Play, CheckCircle2, AlertOctagon, Terminal, Activity, FileText, Zap, RefreshCw, ShieldAlert, ChevronRight } from 'lucide-react';

interface AITriagePanelProps {
  incident: TelecomIncident | null;
  onUpdatePlaybookStep?: (incidentId: string, stepId: string, status: 'COMPLETED' | 'RUNNING') => void;
  onExecuteFullPlaybook?: (incidentId: string) => void;
}

export const AITriagePanel: React.FC<AITriagePanelProps> = ({
  incident,
  onUpdatePlaybookStep,
  onExecuteFullPlaybook
}) => {
  const [activeTab, setActiveTab] = useState<'playbook' | 'syslogs' | 'telemetry'>('playbook');
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [executedSteps, setExecutedSteps] = useState<Record<string, boolean>>({});

  if (!incident) {
    return (
      <div className="glass-panel" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Cpu size={48} color="var(--primary-cyan)" style={{ marginBottom: '16px', opacity: 0.8 }} />
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '8px' }}>No Incident Selected for AI Triage</h3>
        <p style={{ fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
          Select an active telecom incident from the Incidents Feed or Network Map to perform automated root cause analysis and execute remediation playbooks.
        </p>
      </div>
    );
  }

  const handleRunStep = (step: PlaybookStep) => {
    setRunningStepId(step.id);
    setTimeout(() => {
      setExecutedSteps(prev => ({ ...prev, [step.id]: true }));
      setRunningStepId(null);
      if (onUpdatePlaybookStep) {
        onUpdatePlaybookStep(incident.id, step.id, 'COMPLETED');
      }
    }, 1400);
  };

  const handleRunAll = () => {
    incident.playbook.forEach((step, idx) => {
      setTimeout(() => {
        setExecutedSteps(prev => ({ ...prev, [step.id]: true }));
        if (onUpdatePlaybookStep) {
          onUpdatePlaybookStep(incident.id, step.id, 'COMPLETED');
        }
      }, (idx + 1) * 1200);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Incident Header Card */}
      <div className="glass-panel-glow" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge badge-critical">{incident.severity}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--primary-cyan)', fontWeight: 700 }}>
                {incident.id}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target: <strong>{incident.nodeName}</strong> ({incident.region})
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              {incident.title}
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button className="btn-primary" onClick={handleRunAll}>
              <Play size={16} /> Auto-Execute Playbook
            </button>
          </div>
        </div>

        {/* AI Root Cause Diagnostics Box */}
        <div style={{ background: 'rgba(4, 6, 10, 0.7)', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '10px', padding: '16px', display: 'grid', gridTemplateColumns: '180px 1fr', gap: '20px', alignItems: 'center' }}>
          
          {/* Confidence Meter */}
          <div style={{ textAlign: 'center', borderRight: '1px solid var(--border-subtle)', paddingRight: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
              AI Diagnostic Match
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {incident.rootCauseConfidencePct}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--status-healthy)', marginTop: '4px', fontWeight: 600 }}>
              High Confidence
            </div>
          </div>

          {/* Probable Cause Details */}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Zap size={14} /> IDENTIFIED ROOT CAUSE:
            </div>
            <p style={{ fontSize: '0.9rem', color: '#e2e8f0', lineHeight: 1.45 }}>
              {incident.probableCause}
            </p>
          </div>

        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('playbook')}
          style={{
            background: activeTab === 'playbook' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'playbook' ? 'var(--primary-cyan)' : 'var(--text-muted)',
            border: activeTab === 'playbook' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Cpu size={16} /> Automated Playbook ({incident.playbook.length} Steps)
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          style={{
            background: activeTab === 'telemetry' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'telemetry' ? 'var(--primary-cyan)' : 'var(--text-muted)',
            border: activeTab === 'telemetry' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Activity size={16} /> Real-Time Telemetry Timeline
        </button>

        <button
          onClick={() => setActiveTab('syslogs')}
          style={{
            background: activeTab === 'syslogs' ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
            color: activeTab === 'syslogs' ? 'var(--primary-cyan)' : 'var(--text-muted)',
            border: activeTab === 'syslogs' ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
            padding: '8px 18px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Terminal size={16} /> Correlated Syslogs ({incident.syslogs.length})
        </button>
      </div>

      {/* Tab Content 1: Playbook Execution */}
      {activeTab === 'playbook' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {incident.playbook.map((step) => {
            const isCompleted = step.status === 'COMPLETED' || executedSteps[step.id];
            const isRunning = runningStepId === step.id;

            return (
              <div key={step.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isCompleted ? 'rgba(0, 245, 160, 0.2)' : isRunning ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: isCompleted ? '1px solid #00f5a0' : isRunning ? '1px solid #00f2fe' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: isCompleted ? '#00f5a0' : isRunning ? '#00f2fe' : 'var(--text-muted)'
                    }}>
                      {isCompleted ? <CheckCircle2 size={18} /> : step.stepNumber}
                    </div>

                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {step.title}
                      </h4>
                      <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <button
                    className={isCompleted ? 'btn-secondary' : 'btn-primary'}
                    disabled={isRunning || isCompleted}
                    onClick={() => handleRunStep(step)}
                    style={{ opacity: isCompleted ? 0.7 : 1, fontSize: '0.8rem', padding: '6px 14px' }}
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw size={14} className="spin" /> Executing...
                      </>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle2 size={14} color="#00f5a0" /> Step Executed
                      </>
                    ) : (
                      <>
                        <Play size={14} /> Execute Step
                      </>
                    )}
                  </button>
                </div>

                {/* Command Shell Box */}
                <div style={{ background: '#04060a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  <div style={{ color: 'var(--primary-cyan)', marginBottom: '4px' }}>
                    $ {step.command}
                  </div>
                  {step.outputLogs && step.outputLogs.map((log, lidx) => (
                    <div key={lidx} style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                      {log}
                    </div>
                  ))}
                  {isCompleted && (
                    <div style={{ color: '#00f5a0', marginTop: '4px', fontWeight: 600 }}>
                      [SUCCESS] Execution finished with exit code 0.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content 2: Telemetry Graphs */}
      {activeTab === 'telemetry' && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--primary-cyan)" /> Telemetry Metrics (15m Window)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {incident.telemetryHistory.map((pt, idx) => (
              <div key={idx} style={{ background: 'rgba(4, 6, 10, 0.6)', border: '1px solid var(--border-subtle)', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Time: {pt.timestamp}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Latency:</span>
                    <strong style={{ color: pt.latencyMs > 100 ? '#ff2a6d' : '#00f5a0', fontFamily: 'var(--font-mono)' }}>{pt.latencyMs} ms</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Packet Loss:</span>
                    <strong style={{ color: pt.packetLossPct > 5 ? '#ff2a6d' : '#00f5a0', fontFamily: 'var(--font-mono)' }}>{pt.packetLossPct}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Throughput:</span>
                    <strong style={{ color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)' }}>{pt.throughputGbps} Gbps</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 3: Syslogs Terminal */}
      {activeTab === 'syslogs' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="var(--primary-cyan)" /> Live System Diagnostics Log
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Format: Syslog v2 (RFC 5424)</span>
          </div>

          <div className="log-terminal">
            {incident.syslogs.map((log) => (
              <div key={log.id} className="log-entry">
                <span className="log-time">[{log.timestamp}]</span>
                <span className={`log-level-${log.level.toLowerCase()}`}>[{log.level}]</span>
                <span style={{ color: '#38bdf8' }}>[{log.facility}]</span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
