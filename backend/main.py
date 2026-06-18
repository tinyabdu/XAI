from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import predict, report, simulate, auth, health, actions

app = FastAPI(title="XAI Admin Monitor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api")
app.include_router(report.router, prefix="/api")
app.include_router(simulate.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(actions.router, prefix="/api")

@app.get("/")
def root():
    return {"message": "XAI Admin Monitor API is running"}
