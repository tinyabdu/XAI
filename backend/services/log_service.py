import sqlite3, json, os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "logs.db")


def _conn():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db():
    with _conn() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id          TEXT PRIMARY KEY,
                timestamp   TEXT NOT NULL,
                ip          TEXT,
                label       TEXT,
                risk        TEXT,
                action      TEXT,
                confidence  REAL,
                shap        TEXT,
                lime        TEXT,
                input_data  TEXT
            )
        """)
        con.commit()


def save_events(events: list):
    with _conn() as con:
        for e in events:
            con.execute("""
                INSERT OR IGNORE INTO events
                (id, timestamp, ip, label, risk, action, confidence, shap, lime, input_data)
                VALUES (?,?,?,?,?,?,?,?,?,?)
            """, (
                e["id"], e["timestamp"], e.get("ip",""),
                e["label"], e["risk"], e["action"], e["confidence"],
                json.dumps(e.get("shap", [])),
                json.dumps(e.get("lime", [])),
                json.dumps(e.get("input", {})),
            ))
        con.commit()


def get_recent_events(limit: int = 100) -> list:
    with _conn() as con:
        rows = con.execute(
            "SELECT * FROM events ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    result = []
    for r in rows:
        result.append({
            "id": r["id"], "timestamp": r["timestamp"],
            "ip": r["ip"], "label": r["label"],
            "risk": r["risk"], "action": r["action"],
            "confidence": r["confidence"],
            "shap": json.loads(r["shap"]),
            "lime": json.loads(r["lime"]),
            "input": json.loads(r["input_data"]),
        })
    return result


def get_stats() -> dict:
    with _conn() as con:
        total   = con.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        blocked = con.execute("SELECT COUNT(*) FROM events WHERE action='blocked'").fetchone()[0]
        flagged = con.execute("SELECT COUNT(*) FROM events WHERE action='flagged'").fetchone()[0]
        allowed = con.execute("SELECT COUNT(*) FROM events WHERE action='allowed'").fetchone()[0]
    return {"total": total, "blocked": blocked, "flagged": flagged, "allowed": allowed}


# Initialise DB on import
init_db()


# ── Admin Actions Table ──────────────────────────────────────────────

def _ensure_actions_table():
    with _conn() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS admin_actions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id   TEXT NOT NULL,
                action     TEXT NOT NULL,
                new_label  TEXT,
                note       TEXT,
                timestamp  TEXT NOT NULL
            )
        """)
        con.commit()

_ensure_actions_table()


def save_admin_action(event_id: str, action: str, new_label: str = None, note: str = None):
    from datetime import datetime
    with _conn() as con:
        con.execute("""
            INSERT INTO admin_actions (event_id, action, new_label, note, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (event_id, action, new_label, note, datetime.utcnow().isoformat() + "Z"))
        con.commit()


def get_admin_actions() -> list:
    with _conn() as con:
        rows = con.execute(
            "SELECT * FROM admin_actions ORDER BY timestamp DESC"
        ).fetchall()
    return [dict(r) for r in rows]
