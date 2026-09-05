# Runbook ID: RB-04
## Title: Switch Process Memory Leak & Control Plane Buffer Exhaustion
### Trigger Conditions
- High RAM memory consumption alarm (> 92%) on access/distribution switch.
- Control plane packet drop counters incrementing on management CPU.
- Slow CLI responsivity or SNMP timeout alerts on switch stack.

### Diagnostic Commands
1. Check process memory allocation top consumers:
   `show process memory sorted`
2. Inspect buffer pool utilization:
   `show buffers summary`
3. Verify uptime and software version build:
   `show version`

### Mitigation Steps
1. Section 3.1: Clear dynamic MAC address table and ARP table cache to reclaim buffer memory: `clear mac address-table dynamic`.
2. Section 3.2: Restart affected routing control process gracefully: `restart process routing-engine`.
3. Section 3.3: Schedule hitless ISSU software upgrade or planned failover to redundant supervisor module.

### Escalation Criteria
- If memory utilization continues linear leak after clearing dynamic buffers, escalate to Switching Firmware Team for kernel patch.
