from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.ai_service import predict_single, get_shap_global
from routes.auth import verify_token

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
def predict(data: TrafficInput, token: str = Depends(verify_token)):
    result = predict_single(data.dict())
    return result


@router.get("/shap/global")
def shap_global(token: str = Depends(verify_token)):
    return {"features": get_shap_global()}
