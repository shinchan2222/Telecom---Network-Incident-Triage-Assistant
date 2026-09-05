import React from 'react';
import { Activity, Radio, ShieldAlert, Cpu, Search, CheckCircle2, Zap } from 'lucide-react';

interface NavbarProps {
  activeTab: 'incidents' | 'triage' | 'topology' | 'simulator';
  setActiveTab: (tab: 'incidents' | 'triage' | 'topology' | 'simulator') => void;
  criticalCount: number;
  totalCount: number;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  criticalCount,
  totalCount,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(7, 9, 14, 0.85)', backdropFilter: 'blur(16px)', sticky: 'top', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand & Status Ticker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00f2fe 0%, #7f00ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(0, 242, 254, 0.4)'
            }}>
              <Radio size={22} color="#04060a" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', background: 'linear-gradient(90deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                TELECOM<span style={{ color: 'var(--primary-cyan)', WebkitTextFillColor: 'var(--primary-cyan)' }}>.TRIAGE</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulse-active" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00f5a0', display: 'inline-block' }}></span>
                AI Network Incident Command
              </div>
            </div>
          </div>

          {/* Incident Alert Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: criticalCount > 0 ? 'rgba(255, 42, 109, 0.12)' : 'rgba(0, 245, 160, 0.12)',
            border: criticalCount > 0 ? '1px solid rgba(255, 42, 109, 0.3)' : '1px solid rgba(0, 245, 160, 0.3)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <ShieldAlert size={14} color={criticalCount > 0 ? '#ff2a6d' : '#00f5a0'} />
            <span style={{ color: criticalCount > 0 ? '#ff2a6d' : '#00f5a0' }}>
              {criticalCount} Critical | {totalCount} Active Incidents
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ flex: '1', maxWidth: '360px', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search nodes, incidents, regions, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none'
            }}
          />
        </div>

        {/* Nav Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>


          {/* Primary Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.8)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveTab('incidents')}
              style={{
                background: activeTab === 'incidents' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: activeTab === 'incidents' ? 'var(--primary-cyan)' : 'var(--text-muted)',
                border: activeTab === 'incidents' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Activity size={14} /> Incidents
            </button>

            <button
              onClick={() => setActiveTab('triage')}
              style={{
                background: activeTab === 'triage' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: activeTab === 'triage' ? 'var(--primary-cyan)' : 'var(--text-muted)',
                border: activeTab === 'triage' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Cpu size={14} /> AI Triage & Playbooks
            </button>

            <button
              onClick={() => setActiveTab('topology')}
              style={{
                background: activeTab === 'topology' ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
                color: activeTab === 'topology' ? 'var(--primary-cyan)' : 'var(--text-muted)',
                border: activeTab === 'topology' ? '1px solid rgba(0, 242, 254, 0.4)' : '1px solid transparent',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Radio size={14} /> Network Map
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              style={{
                background: activeTab === 'simulator' ? 'rgba(255, 42, 109, 0.2)' : 'transparent',
                color: activeTab === 'simulator' ? '#ff2a6d' : 'var(--text-muted)',
                border: activeTab === 'simulator' ? '1px solid rgba(255, 42, 109, 0.4)' : '1px solid transparent',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Zap size={14} /> Outage Simulator
            </button>
          </nav>
        </div>

      </div>
    </header>
  );
};
