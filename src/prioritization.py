from typing import List, Dict, Any

def calculate_impact_score(incident: Dict[str, Any]) -> float:
    """
    Calculates weighted impact score:
    score = (severity_weight * 0.4) + (affected_nodes_weight * 0.4) + (tier_weight * 0.2)
    """
    # 1. Severity Weight
    severity = incident.get("severity", "INFO").upper()
    if severity == "CRITICAL":
        severity_weight = 100.0
    elif severity == "WARNING":
        severity_weight = 60.0
    else:
        severity_weight = 20.0

    # 2. Affected Nodes Weight (scaled to 100)
    affected_nodes = incident.get("affected_nodes", [])
    node_count = len(affected_nodes)
    affected_nodes_weight = min(node_count * 25.0, 100.0)

    # 3. Tier Weight (highest device tier in incident)
    roles = [a.get("device_role", "").lower() for a in incident.get("alerts", [])]
    if "core" in roles:
        tier_weight = 100.0
    elif "distribution" in roles:
        tier_weight = 70.0
    else:
        tier_weight = 40.0

    score = (severity_weight * 0.4) + (affected_nodes_weight * 0.4) + (tier_weight * 0.2)
    return round(score, 1)

def prioritize_incidents(incidents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Ranks correlated incidents by impact score descending."""
    for inc in incidents:
        inc["impact_score"] = calculate_impact_score(inc)

    # Sort descending by impact score
    sorted_incidents = sorted(incidents, key=lambda x: x["impact_score"], reverse=True)
    
    # Assign priority rank
    for idx, inc in enumerate(sorted_incidents, start=1):
        inc["priority_rank"] = idx

    return sorted_incidents
