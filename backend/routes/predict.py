from fastapi import APIRouter
from pydantic import BaseModel
from services.ai_service import predict_single, get_shap_global

router = APIRouter()


class TrafficInput(BaseModel):
    ip_request_rate: float
    login_attempts: int
    failed_logins: int
    session_duration: float
    pages_visited: int
    request_size_kb: float
    unique_endpoints: int
    time_of_day: int


@router.post("/predict")
def predict(data: TrafficInput):
    result = predict_single(data.dict())
    return result


@router.get("/shap/global")
def shap_global():
    return {"features": get_shap_global()}
