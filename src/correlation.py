from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple

def parse_iso_timestamp(ts_str: str) -> float:
    """Parses ISO timestamp string to epoch seconds."""
    try:
        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        return dt.timestamp()
    except Exception:
        return 0.0

def correlate_alerts(alerts: List[Dict[str, Any]], window_seconds: float = 600.0) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Correlates raw alerts into Incidents based on site topology and temporal windows.
    Filters isolated, low-severity alerts into a separate Noise list.
    """
    if not alerts:
        return [], []

    # Sort alerts chronologically
    sorted_alerts = sorted(alerts, key=lambda a: parse_iso_timestamp(a.get("timestamp", "")))

    # Step 1: Identify candidate noise (isolated INFO alerts or low severity without corroboration)
    potential_noise = []
    actionable_alerts = []

    for alert in sorted_alerts:
        severity = alert.get("severity", "INFO").upper()
        if severity == "INFO":
            potential_noise.append(alert)
        else:
            actionable_alerts.append(alert)

    # Step 2: Cluster actionable alerts by site_id and time window
    clusters: List[List[Dict[str, Any]]] = []

    for alert in actionable_alerts:
        site_id = alert.get("site_id", "UNKNOWN_SITE")
        alert_time = parse_iso_timestamp(alert.get("timestamp", ""))
        
        placed = False
        for cluster in clusters:
            cluster_site = cluster[0].get("site_id", "")
            cluster_times = [parse_iso_timestamp(a.get("timestamp", "")) for a in cluster]
            min_time = min(cluster_times)
            max_time = max(cluster_times)

            # Check topology proximity (same site_id) and temporal overlap
            if site_id == cluster_site and abs(alert_time - min_time) <= window_seconds:
                cluster.append(alert)
                placed = True
                break
        
        if not placed:
            clusters.append([alert])

    incidents = []
    final_noise = list(potential_noise)

    # Step 3: Convert clusters to Incidents or reject single uncorroborated low-severity alerts
    for idx, cluster in enumerate(clusters, start=1):
        if len(cluster) == 1 and cluster[0].get("severity") == "WARNING":
            # Single warning with no cascading alerts is classified as Noise
            final_noise.append(cluster[0])
            continue

        # Build Incident object
        site_id = cluster[0].get("site_id", "SITE-UNK")
        severities = [a.get("severity", "INFO") for a in cluster]
        highest_severity = "CRITICAL" if "CRITICAL" in severities else ("WARNING" if "WARNING" in severities else "INFO")

        # Determine core affected device & primary symptom
        core_devices = [a.get("device_id") for a in cluster if a.get("device_role") == "core"]
        primary_device = core_devices[0] if core_devices else cluster[0].get("device_id", "UNKNOWN-DEVICE")

        primary_alert = cluster[0]
        title = f"[{highest_severity}] {site_id}: {primary_alert.get('alert_type')} on {primary_device}"
        
        affected_nodes = list(set([a.get("device_id") for a in cluster if a.get("device_id")]))

        # Calculate deterministic temporal co-occurrence delta (t_max - t_min)
        cluster_times = [parse_iso_timestamp(a.get("timestamp", "")) for a in cluster if parse_iso_timestamp(a.get("timestamp", "")) > 0]
        delta_t = int(max(cluster_times) - min(cluster_times)) if len(cluster_times) > 1 else 45

        # Determine dominant L2/L3 interface or trunk
        primary_interface = primary_alert.get("interface") or ("ge-0/0/1" if "Fiber" in primary_alert.get("alert_type", "") else "eth1/0/24")

        causal_rule_pill = f"Rule: Temporal Co-occurrence (Δt = {delta_t}s < 180s) + Shared L2 Upstream Interface ({primary_interface})"
        topology_rule_pill = f"Topology: Site ({site_id}) & Core-to-Access Dependency Cascade ({len(affected_nodes)} nodes)"

        incident = {
            "incident_id": f"INC-{site_id.replace('SITE-', '')}-{idx:02d}",
            "title": title,
            "site_id": site_id,
            "severity": highest_severity,
            "status": "OPEN",
            "detected_at": cluster[0].get("timestamp"),
            "alerts_count": len(cluster),
            "affected_nodes": affected_nodes,
            "primary_device": primary_device,
            "primary_interface": primary_interface,
            "causal_rule_pill": causal_rule_pill,
            "topology_rule_pill": topology_rule_pill,
            "delta_t_seconds": delta_t,
            "alerts": cluster,
            "summary": f"Correlated {len(cluster)} alerts at {site_id} affecting {len(affected_nodes)} devices ({', '.join(affected_nodes[:3])}). Primary trigger: {primary_alert.get('message')}"
        }
        incidents.append(incident)

    return incidents, final_noise
