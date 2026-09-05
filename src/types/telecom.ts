export type IncidentSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

export type IncidentDomain = 
  | '5G Core' 
  | 'Fiber Backhaul' 
  | 'Edge Datacenter' 
  | 'Cell Tower RAN' 
  | 'Satellite Link' 
  | 'VoLTE / IMS';

export type IncidentStatus = 'OPEN' | 'ANALYZING' | 'REMEDIATING' | 'RESOLVED';

export interface TelemetryPoint {
  timestamp: string;
  latencyMs: number;
  packetLossPct: number;
  throughputGbps: number;
  snrDb?: number;
}

export interface SyslogEntry {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'SUCCESS';
  facility: string;
  message: string;
}

export interface PlaybookStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  command: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  outputLogs?: string[];
}

export interface TelecomIncident {
  id: string;
  title: string;
  domain: IncidentDomain;
  severity: IncidentSeverity;
  status: IncidentStatus;
  region: string;
  nodeId: string;
  nodeName: string;
  detectedAt: string;
  mttrEstimateMinutes: number;
  blastRadiusUsers: number;
  description: string;
  rootCauseConfidencePct: number;
  probableCause: string;
  syslogs: SyslogEntry[];
  telemetryHistory: TelemetryPoint[];
  playbook: PlaybookStep[];
}

export interface NetworkNode {
  id: string;
  name: string;
  domain: IncidentDomain;
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';
  region: string;
  ipAddress: string;
  latencyMs: number;
  packetLossPct: number;
  activeIncidentsCount: number;
  position: { x: number; y: number }; // Relative map % coordinates
}
