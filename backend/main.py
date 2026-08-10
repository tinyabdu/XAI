from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, students, admin

app = FastAPI(title="AI Admission System", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "AI Admission System API is running"}