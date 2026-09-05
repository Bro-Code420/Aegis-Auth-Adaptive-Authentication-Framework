"""
FastAPI routes for session drift anomaly prediction.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from src.api.schemas import SessionRequest, ModelPredictionResponse
from src.inference.session_predictor import predict_session_anomaly
from src.utils.logger import logger

router = APIRouter(prefix="/predict", tags=["Session"])


@router.post("/session", response_model=ModelPredictionResponse)
async def predict_session(request: SessionRequest) -> ModelPredictionResponse:
    """
    Predict session drift anomaly score.
    
    Args:
        request: Session request with features
    
    Returns:
        Model prediction response with anomaly score
    """
    try:
        logger.info(f"Session prediction request received: {request.dict()}")
        
        # Convert Pydantic model to dict
        features = request.dict()
        
        # Run prediction
        result = predict_session_anomaly(features)
        
        logger.info(f"Session prediction completed: score={result['score']:.4f}")
        
        return ModelPredictionResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error in session prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in session prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
