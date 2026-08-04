import random, time, uuid
from datetime import datetime, timedelta
from services.ai_service import predict_single, FEATURES

SAMPLE_IPS = [
    "192.168.1.{}".format(i) for i in range(10, 30)
] + ["10.0.0.{}".format(i) for i in range(1, 15)]


def _random_normal():
    return {
        "ip_request_rate": round(random.uniform(1, 30), 2),
        "login_attempts": random.randint(1, 3),
        "failed_logins": random.randint(0, 1),
        "session_duration": round(random.uniform(60, 600), 2),
        "pages_visited": random.randint(2, 18),
        "request_size_kb": round(random.uniform(1, 50), 2),
        "unique_endpoints": random.randint(1, 8),
        "time_of_day": random.randint(7, 21),
    }


def _random_brute_force():
    return {
        "ip_request_rate": round(random.uniform(10, 40), 2),
        "login_attempts": random.randint(12, 50),
        "failed_logins": random.randint(10, 45),
        "session_duration": round(random.uniform(5, 30), 2),
        "pages_visited": random.randint(1, 2),
        "request_size_kb": round(random.uniform(0.1, 3), 2),
        "unique_endpoints": random.randint(1, 2),
        "time_of_day": random.randint(0, 5),
    }


def _random_ddos():
    return {
        "ip_request_rate": round(random.uniform(300, 900), 2),
        "login_attempts": random.randint(0, 2),
        "failed_logins": random.randint(0, 1),
        "session_duration": round(random.uniform(1, 8), 2),
        "pages_visited": random.randint(1, 2),
        "request_size_kb": round(random.uniform(0.1, 1.5), 2),
        "unique_endpoints": 1,
        "time_of_day": random.randint(0, 23),
    }


def _random_suspicious():
    return {
        "ip_request_rate": round(random.uniform(60, 140), 2),
        "login_attempts": random.randint(4, 14),
        "failed_logins": random.randint(3, 11),
        "session_duration": round(random.uniform(5, 25), 2),
        "pages_visited": random.randint(18, 38),
        "request_size_kb": round(random.uniform(120, 480), 2),
        "unique_endpoints": random.randint(12, 28),
        "time_of_day": random.randint(0, 23),
    }


TYPE_FUNCS = {
    "normal": _random_normal,
    "brute_force": _random_brute_force,
    "ddos": _random_ddos,
    "suspicious": _random_suspicious,
}

WEIGHTS = [0.60, 0.20, 0.10, 0.10]
TRAFFIC_TYPES = list(TYPE_FUNCS.keys())


def generate_event():
    """Generate a single simulated traffic event evaluated by the AI in real time."""
    ttype = random.choices(TRAFFIC_TYPES, weights=WEIGHTS, k=1)[0]
    data = TYPE_FUNCS[ttype]()
    result = predict_single(data)
    return {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ip": random.choice(SAMPLE_IPS),
        "true_type": ttype,
        **result,
    }


def simulate_batch(n: int = 20, hours_ago: int = 8):
    """Generate n simulated traffic events spread over the last `hours_ago` hours."""
    now = datetime.utcnow()
    start = now - timedelta(hours=hours_ago)
    events = []

    for _ in range(n):
        event = generate_event()
        ts = start + timedelta(seconds=random.randint(0, hours_ago * 3600))
        event["timestamp"] = ts.isoformat() + "Z"
        events.append(event)

    events.sort(key=lambda e: e["timestamp"])
    return events
