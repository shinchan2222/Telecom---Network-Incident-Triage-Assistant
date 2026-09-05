# Runbook ID: RB-01
## Title: Physical Fiber Cut / Core Link Down Triage
### Trigger Conditions
- Loss of Signal (LOS) alarm on optical interface or DWDM transponder.
- Cascading BGP/OSPF neighbor down alerts across multiple downstream access routers at the same site.
- Interface operational status changed to DOWN on core trunk link.

### Diagnostic Commands
1. Execute OTDR (Optical Time-Domain Reflectometer) pulse check on affected interface:
   `show interfaces transceiver optical-power slot 1/1`
2. Check LLDP neighbor state to confirm remote peer loss:
   `show lldp neighbors detail`
3. Verify spanning-tree and link aggregation failover:
   `show lacp summary`

### Mitigation Steps
1. Section 3.1: Force DWDM ROADM protection switch to route optical payload to secondary physical Ring B.
2. Section 3.2: Verify interface state after re-route: `show interface link-status`.
3. Section 3.3: Issue automated ticket to Fiber Repair Logistics dispatch team with OTDR distance coordinates.

### Escalation Criteria
- If secondary optical ring exceeds 90% bandwidth capacity or OTDR indicates double-ended physical trunk severing, escalate to L2 Optical Engineering Team immediately.
