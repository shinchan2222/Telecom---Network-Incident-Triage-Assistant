import { TelecomIncident, NetworkNode } from '../types/telecom';

export const MOCK_INCIDENTS: TelecomIncident[] = [
  {
    id: 'INC-8902',
    title: 'Trans-Atlantic Subsea Fiber Trunk Cut (Bermuda-Lisbon Span 4)',
    domain: 'Fiber Backhaul',
    severity: 'CRITICAL',
    status: 'OPEN',
    region: 'North America / EU',
    nodeId: 'node-fib-01',
    nodeName: 'Lisbon-Bermuda Subsea Repeater 14',
    detectedAt: '2026-09-05T11:42:10Z',
    mttrEstimateMinutes: 45,
    blastRadiusUsers: 1420000,
    description: 'Loss of optical signal detected on DWDM Channels 1-48. OTDR scan confirms physical fiber disruption 142km off Bermuda coast. Automatic optical protection switching (ROADM) failed due to secondary path congestion.',
    rootCauseConfidencePct: 96.4,
    probableCause: 'Physical fiber break caused by maritime anchor drag on undersea cable segment TAT-14. Secondary fiber Ring B experiencing 98% bandwidth saturation.',
    syslogs: [
      { id: 'l1', timestamp: '11:42:10.012', level: 'ERROR', facility: 'DWDM-PHY', message: 'LOS (Loss of Signal) alarm triggered on Transceiver Slot 04/Port 01 [Optical Power: -42.8 dBm]' },
      { id: 'l2', timestamp: '11:42:10.045', level: 'ERROR', facility: 'ROADM-CTRL', message: 'Protection Switch Failed: Target Backup Link BER > 1e-3 threshold' },
      { id: 'l3', timestamp: '11:42:11.120', level: 'WARN', facility: 'BGP-EVPN', message: 'BGP Session flapping with peer 198.51.100.24 (Subsea-Lisbon-GW01)' },
      { id: 'l4', timestamp: '11:42:15.500', level: 'INFO', facility: 'OTDR-DIAG', message: 'OTDR Pulse Echo return localized break at 142.35 km mark' }
    ],
    telemetryHistory: [
      { timestamp: '11:35', latencyMs: 38, packetLossPct: 0.01, throughputGbps: 840, snrDb: 28 },
      { timestamp: '11:38', latencyMs: 39, packetLossPct: 0.02, throughputGbps: 845, snrDb: 28 },
      { timestamp: '11:40', latencyMs: 41, packetLossPct: 0.05, throughputGbps: 830, snrDb: 27 },
      { timestamp: '11:42', latencyMs: 320, packetLossPct: 88.5, throughputGbps: 45, snrDb: 4 },
      { timestamp: '11:45', latencyMs: 295, packetLossPct: 74.2, throughputGbps: 110, snrDb: 6 }
    ],
    playbook: [
      {
        id: 'pb1-1',
        stepNumber: 1,
        title: 'Isolate Damaged Subsea Span',
        description: 'Disable optical amplifiers on damaged TAT-14 Span 4 to prevent laser pump overheating.',
        command: 'telecom-cli dwdm disable-laser --node Lisbon-Bermuda-R14 --span 4',
        status: 'COMPLETED',
        outputLogs: ['[OK] Laser pump 4A powered down', '[OK] ROADM port isolated']
      },
      {
        id: 'pb1-2',
        stepNumber: 2,
        title: 'Activate Terrestrial Bypass Route (TAT-North)',
        description: 'Re-route priority 5G voice & data traffic through North Atlantic Terrestrial Ring via Halifax.',
        command: 'telecom-cli roadm reroute --source Bermuda-GW --dest Lisbon-GW --via Halifax-Ring',
        status: 'RUNNING',
        outputLogs: ['Provisioning 400G cross-connect on Halifax-Ring...', 'Rebalancing QAM-16 modulation...']
      },
      {
        id: 'pb1-3',
        stepNumber: 3,
        title: 'Notify Marine Repair Vessel',
        description: 'Dispatch CS Sovereign repair ship from Halifax harbor with OTDR coordinates.',
        command: 'telecom-cli dispatch marine-repair --vessel CS-Sovereign --coords 32.3013,-64.7600',
        status: 'PENDING'
      }
    ]
  },
  {
    id: 'INC-8905',
    title: '5G Core AMF Pod Crash & UPF Congestion (Chicago Edge DC)',
    domain: '5G Core',
    severity: 'CRITICAL',
    status: 'ANALYZING',
    region: 'US-Midwest',
    nodeId: 'node-core-chicago',
    nodeName: 'Chicago-5GC-Cluster-01',
    detectedAt: '2026-09-05T11:48:33Z',
    mttrEstimateMinutes: 18,
    blastRadiusUsers: 580000,
    description: 'Access and Mobility Management Function (AMF) pod experienced OOM (Out Of Memory) crash during 5G SA registration surge. User Plane Function (UPF) packet processing buffer overflowed, causing gNodeB attachment failures.',
    rootCauseConfidencePct: 92.1,
    probableCause: 'Kubernetes AMF pod memory leak during HTTP/2 N1/N2 SBI interface overload. Memory consumption hit 100% cgroup limit.',
    syslogs: [
      { id: 'l21', timestamp: '11:48:30.100', level: 'WARN', facility: 'K8S-5GC', message: 'Container amf-service-v2-7df89 Pod memory usage > 95% threshold (15.2Gi / 16Gi)' },
      { id: 'l22', timestamp: '11:48:33.001', level: 'ERROR', facility: 'K8S-KERN', message: 'OOM-Killer invoked: killed process 14023 (amf_main_daemon)' },
      { id: 'l23', timestamp: '11:48:34.200', level: 'ERROR', facility: 'N2-INTERFACE', message: 'gNodeB ID 48012 lost SCTP association with AMF Chicago-01' },
      { id: 'l24', timestamp: '11:48:38.800', level: 'WARN', facility: 'UPF-PFCP', message: 'PFCP Heartbeat Timeout with session controller. Dropping unallocated GTP-U tunnels.' }
    ],
    telemetryHistory: [
      { timestamp: '11:40', latencyMs: 12, packetLossPct: 0.0, throughputGbps: 180, snrDb: 32 },
      { timestamp: '11:43', latencyMs: 14, packetLossPct: 0.0, throughputGbps: 195, snrDb: 32 },
      { timestamp: '11:46', latencyMs: 45, packetLossPct: 4.2, throughputGbps: 210, snrDb: 30 },
      { timestamp: '11:48', latencyMs: 480, packetLossPct: 42.1, throughputGbps: 35, snrDb: 18 },
      { timestamp: '11:51', latencyMs: 310, packetLossPct: 28.5, throughputGbps: 70, snrDb: 22 }
    ],
    playbook: [
      {
        id: 'pb2-1',
        stepNumber: 1,
        title: 'Spin Up Hot-Standby AMF Replica Cluster',
        description: 'Scale out AMF deployment in secondary availability zone (Chicago-DC2).',
        command: 'kubectl scale deployment amf-service --replicas=6 -n 5g-core',
        status: 'COMPLETED',
        outputLogs: ['[OK] Deployment scaled to 6 pods', '[OK] Pod amf-service-v2-89xa2 state READY']
      },
      {
        id: 'pb2-2',
        stepNumber: 2,
        title: 'Flush Stale SCTP Connections on UPF',
        description: 'Clear orphaned GTP-U tunnel state on UPF hardware acceleration card.',
        command: 'telecom-cli upf flush-tunnels --node Chicago-UPF-01 --reason amf-failover',
        status: 'PENDING'
      },
      {
        id: 'pb2-3',
        stepNumber: 3,
        title: 'Send gNodeB SCTP Re-association Broadcast',
        description: 'Instruct regional gNodeB base stations to reconnect to secondary AMF IP pool.',
        command: 'telecom-cli ran broadcast-sctp --region US-Midwest --new-amf-ip 10.240.12.50',
        status: 'PENDING'
      }
    ]
  },
  {
    id: 'INC-8909',
    title: 'BGP Route Flapping & Packet Blackhole (Frankfurt IXP Gateway)',
    domain: 'Edge Datacenter',
    severity: 'MAJOR',
    status: 'OPEN',
    region: 'Europe-Central',
    nodeId: 'node-ixp-fra',
    nodeName: 'Frankfurt-DE-CIX-Border Router 02',
    detectedAt: '2026-09-05T11:22:45Z',
    mttrEstimateMinutes: 25,
    blastRadiusUsers: 340000,
    description: 'AS65001 border router flapping AS paths every 45 seconds due to MTU mismatch on DE-CIX peering cross-connect. Causing international transit traffic loss.',
    rootCauseConfidencePct: 89.5,
    probableCause: 'Peering partner misconfiguration setting Jumbo Frames (9000 bytes) on link with 1500 byte path MTU discovery disabled.',
    syslogs: [
      { id: 'l31', timestamp: '11:22:45.000', level: 'WARN', facility: 'BGP-ROUTER', message: 'BGP-5-ADJCHANGE: neighbor 80.81.192.12 Down - Hold Timer Expired' },
      { id: 'l32', timestamp: '11:23:30.120', level: 'INFO', facility: 'BGP-ROUTER', message: 'BGP-5-ADJCHANGE: neighbor 80.81.192.12 Up' },
      { id: 'l33', timestamp: '11:24:15.550', level: 'ERROR', facility: 'IP-FORWARD', message: 'Path MTU Discovery failed: ICMP Fragmentation Needed dropped by remote ACL' }
    ],
    telemetryHistory: [
      { timestamp: '11:15', latencyMs: 22, packetLossPct: 0.0, throughputGbps: 420, snrDb: 35 },
      { timestamp: '11:20', latencyMs: 24, packetLossPct: 0.1, throughputGbps: 415, snrDb: 35 },
      { timestamp: '11:25', latencyMs: 180, packetLossPct: 18.4, throughputGbps: 210, snrDb: 25 },
      { timestamp: '11:30', latencyMs: 165, packetLossPct: 15.2, throughputGbps: 240, snrDb: 28 }
    ],
    playbook: [
      {
        id: 'pb3-1',
        stepNumber: 1,
        title: 'Enforce Dampening on Flapping BGP Neighbor',
        description: 'Apply route dampening penalty to prevent global routing table instability.',
        command: 'telecom-cli bgp dampen-neighbor --neighbor 80.81.192.12 --decay-half-life 15',
        status: 'COMPLETED',
        outputLogs: ['[OK] BGP Route dampening rule applied to neighbor 80.81.192.12']
      },
      {
        id: 'pb3-2',
        stepNumber: 2,
        title: 'Clamp MSS & Force MTU 1500',
        description: 'Set IP TCP MSS clamping to 1460 bytes on peering interface.',
        command: 'telecom-cli router set-interface --name eth0/1/2 --mtu 1500 --tcp-mss 1460',
        status: 'PENDING'
      }
    ]
  },
  {
    id: 'INC-8914',
    title: 'Massive Signal SNR Degradation on gNodeB Array (Seattle Metro)',
    domain: 'Cell Tower RAN',
    severity: 'MINOR',
    status: 'OPEN',
    region: 'US-West',
    nodeId: 'node-ran-sea',
    nodeName: 'Seattle-Downtown-gNodeB Sector Array 4',
    detectedAt: '2026-09-05T11:10:00Z',
    mttrEstimateMinutes: 60,
    blastRadiusUsers: 45000,
    description: 'External RF interference on n78 (3.5GHz C-band) spectrum causing high Block Error Rate (BLER) and handover failures in downtown commercial district.',
    rootCauseConfidencePct: 84.0,
    probableCause: 'Unauthorized high-power C-band repeater signal leaking from adjacent private construction site.',
    syslogs: [
      { id: 'l41', timestamp: '11:10:00.000', level: 'WARN', facility: 'RAN-PHY', message: 'PUSCH SINR dropped below 3 dB on Sector Antenna 2B' },
      { id: 'l42', timestamp: '11:12:10.000', level: 'WARN', facility: 'RAN-RRC', message: 'RRC Re-establishment Failure rate elevated to 14.8%' }
    ],
    telemetryHistory: [
      { timestamp: '11:00', latencyMs: 15, packetLossPct: 0.0, throughputGbps: 4.2, snrDb: 29 },
      { timestamp: '11:10', latencyMs: 65, packetLossPct: 5.1, throughputGbps: 1.1, snrDb: 4 },
      { timestamp: '11:20', latencyMs: 58, packetLossPct: 4.8, throughputGbps: 1.3, snrDb: 6 }
    ],
    playbook: [
      {
        id: 'pb4-1',
        stepNumber: 1,
        title: 'Adjust Beamforming Dynamic Tilting',
        description: 'Downtilt sector antennas by 3 degrees to shield receivers from ground-level RF noise.',
        command: 'telecom-cli ran adjust-antenna --sector Seattle-A4 --electrical-downtilt 6.5',
        status: 'PENDING'
      }
    ]
  }
];

export const MOCK_NODES: NetworkNode[] = [
  {
    id: 'node-fib-01',
    name: 'Lisbon-Bermuda Subsea Repeater 14',
    domain: 'Fiber Backhaul',
    status: 'CRITICAL',
    region: 'North America / EU',
    ipAddress: '198.51.100.14',
    latencyMs: 320,
    packetLossPct: 74.2,
    activeIncidentsCount: 1,
    position: { x: 38, y: 42 }
  },
  {
    id: 'node-core-chicago',
    name: 'Chicago-5GC-Cluster-01',
    domain: '5G Core',
    status: 'CRITICAL',
    region: 'US-Midwest',
    ipAddress: '10.240.12.10',
    latencyMs: 310,
    packetLossPct: 28.5,
    activeIncidentsCount: 1,
    position: { x: 26, y: 35 }
  },
  {
    id: 'node-ixp-fra',
    name: 'Frankfurt-DE-CIX-Border Router 02',
    domain: 'Edge Datacenter',
    status: 'DEGRADED',
    region: 'Europe-Central',
    ipAddress: '80.81.192.12',
    latencyMs: 165,
    packetLossPct: 15.2,
    activeIncidentsCount: 1,
    position: { x: 54, y: 32 }
  },
  {
    id: 'node-ran-sea',
    name: 'Seattle-Downtown-gNodeB Sector Array 4',
    domain: 'Cell Tower RAN',
    status: 'DEGRADED',
    region: 'US-West',
    ipAddress: '172.18.44.101',
    latencyMs: 58,
    packetLossPct: 4.8,
    activeIncidentsCount: 1,
    position: { x: 18, y: 28 }
  },
  {
    id: 'node-core-tokyo',
    name: 'Tokyo-5GC-AMF-UPF Core Gateway',
    domain: '5G Core',
    status: 'HEALTHY',
    region: 'APAC',
    ipAddress: '203.0.113.88',
    latencyMs: 18,
    packetLossPct: 0.0,
    activeIncidentsCount: 0,
    position: { x: 82, y: 40 }
  },
  {
    id: 'node-sat-lon',
    name: 'London Satellite Ground Gateway-01',
    domain: 'Satellite Link',
    status: 'HEALTHY',
    region: 'Europe-West',
    ipAddress: '195.66.224.1',
    latencyMs: 45,
    packetLossPct: 0.02,
    activeIncidentsCount: 0,
    position: { x: 48, y: 29 }
  }
];

