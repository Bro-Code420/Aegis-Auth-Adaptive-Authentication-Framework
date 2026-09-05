"""
FastAPI routes for login anomaly prediction.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from src.api.schemas import LoginRequest, ModelPredictionResponse
from src.inference.login_predictor import predict_login_anomaly
from src.utils.logger import logger

router = APIRouter(prefix="/predict", tags=["Login"])


@router.post("/login", response_model=ModelPredictionResponse)
async def predict_login(request: LoginRequest) -> ModelPredictionResponse:
    """
    Predict login anomaly score.
    
    Args:
        request: Login request with features
    
    Returns:
        Model prediction response with anomaly score
    """
    try:
        logger.info(f"Login prediction request received: {request.dict()}")
        
        # Convert Pydantic model to dict
        features = request.dict()
        
        # Run prediction
        result = predict_login_anomaly(features)
        
        logger.info(f"Login prediction completed: score={result['score']:.4f}")
        
        return ModelPredictionResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error in login prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in login prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
