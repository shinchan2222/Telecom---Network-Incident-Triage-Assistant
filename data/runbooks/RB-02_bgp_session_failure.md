# Runbook ID: RB-02
## Title: BGP Session Flapping & Peering Failure Triage
### Trigger Conditions
- BGP neighbor state transition from ESTABLISHED to IDLE / ACTIVE.
- High packet drop rate across peering gateway or IXP border router.
- Hold-timer expired alerts on AS peering interfaces.

### Diagnostic Commands
1. Check BGP neighbor status and flap count:
   `show bgp ipv4 unicast summary`
2. Check Path MTU Discovery and interface packet drops:
   `show interface stats peering-gw-01`
3. Inspect route flap dampening status:
   `show bgp dampening flap-statistics`

### Mitigation Steps
1. Section 3.1: Enable route dampening on neighbor interface to arrest global routing table instability: `set bgp neighbor <peer-ip> dampening`.
2. Section 3.2: Verify interface MTU configuration and TCP MSS clamping: `set interface eth0/1 mtu 1500 tcp-mss 1460`.
3. Section 3.3: Soft-reset BGP session: `clear bgp ipv4 unicast <peer-ip> soft in`.

### Escalation Criteria
- Escalated to L2 WAN Architecture if BGP session remains IDLE for > 15 minutes after soft reset.
