from fastapi import APIRouter, Depends
from routes.auth import verify_token
import psutil, time, datetime

router = APIRouter()
START_TIME = time.time()


@router.get("/health")
def system_health(token: str = Depends(verify_token)):
    cpu      = psutil.cpu_percent(interval=0.5)
    ram      = psutil.virtual_memory()
    disk     = psutil.disk_usage("/")
    uptime_s = int(time.time() - START_TIME)
    uptime   = str(datetime.timedelta(seconds=uptime_s))

    def status(pct):
        if pct < 60:  return "good"
        if pct < 85:  return "warning"
        return "critical"

    return {
        "cpu": {
            "percent": cpu,
            "status": status(cpu),
        },
        "ram": {
            "percent": ram.percent,
            "used_gb": round(ram.used / 1e9, 2),
            "total_gb": round(ram.total / 1e9, 2),
            "status": status(ram.percent),
        },
        "disk": {
            "percent": disk.percent,
            "used_gb": round(disk.used / 1e9, 2),
            "total_gb": round(disk.total / 1e9, 2),
            "status": status(disk.percent),
        },
        "monitor_uptime": uptime,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }