"""
LMS Portal — FastAPI ML Service
Provides skill-level prediction based on student learning metrics.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator
import math

app = FastAPI(
    title="LMS ML Service",
    description="Skill prediction service for the LMS Portal",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus metrics
Instrumentator().instrument(app).expose(app)


# ─── Models ───

class PredictionInput(BaseModel):
    hours_watched: float
    quizzes_passed: int
    assignments_done: int


class PredictionOutput(BaseModel):
    predicted_level: str
    confidence: float
    model: str
    input_summary: dict


# ─── Skill Level Prediction (Stub ML Model) ───

def predict_skill_level(hours: float, quizzes: int, assignments: int) -> tuple:
    """
    A simple heuristic-based prediction model.
    In production, this would be a trained ML model (e.g., scikit-learn, PyTorch).
    
    Scoring formula:
    - hours_watched contributes 40% (normalized to 0-40 range, assuming max ~50 hours)
    - quizzes_passed contributes 35% (normalized to 0-35 range, assuming max ~20 quizzes)
    - assignments_done contributes 25% (normalized to 0-25 range, assuming max ~15 assignments)
    """
    hours_score = min(hours / 50.0, 1.0) * 40
    quiz_score = min(quizzes / 20.0, 1.0) * 35
    assignment_score = min(assignments / 15.0, 1.0) * 25
    
    total_score = hours_score + quiz_score + assignment_score
    
    # Apply a sigmoid-like smoothing for confidence
    confidence = 1 / (1 + math.exp(-0.1 * (total_score - 50)))
    confidence = round(confidence, 3)
    
    # Map score to skill level
    if total_score >= 80:
        level = "🏆 Expert"
    elif total_score >= 60:
        level = "🚀 Advanced"
    elif total_score >= 40:
        level = "📈 Intermediate"
    elif total_score >= 20:
        level = "📘 Beginner"
    else:
        level = "🌱 Novice"
    
    return level, confidence


# ─── Routes ───

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "lms-ml",
        "model": "skill-predictor-v1",
    }


@app.post("/predict", response_model=PredictionOutput)
async def predict(data: PredictionInput):
    """
    Predict student skill level based on learning metrics.
    Called internally by the Node.js backend via Docker network.
    """
    level, confidence = predict_skill_level(
        data.hours_watched,
        data.quizzes_passed,
        data.assignments_done,
    )
    
    return PredictionOutput(
        predicted_level=level,
        confidence=confidence,
        model="skill-predictor-v1",
        input_summary={
            "hours_watched": data.hours_watched,
            "quizzes_passed": data.quizzes_passed,
            "assignments_done": data.assignments_done,
        },
    )


@app.get("/")
async def root():
    return {
        "service": "LMS ML Service",
        "version": "1.0.0",
        "endpoints": ["/health", "/predict"],
    }
