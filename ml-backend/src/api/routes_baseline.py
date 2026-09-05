"""
FastAPI routes for user baseline anomaly prediction.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from src.api.schemas import BaselineRequest, ModelPredictionResponse
from src.inference.baseline_predictor import predict_baseline_anomaly
from src.utils.logger import logger

router = APIRouter(prefix="/predict", tags=["Baseline"])


@router.post("/baseline", response_model=ModelPredictionResponse)
async def predict_baseline(request: BaselineRequest) -> ModelPredictionResponse:
    """
    Predict user baseline anomaly score.
    
    Args:
        request: Baseline request with features
    
    Returns:
        Model prediction response with anomaly score
    """
    try:
        logger.info(f"Baseline prediction request received: {request.dict()}")
        
        # Convert Pydantic model to dict
        features = request.dict()
        
        # Run prediction
        result = predict_baseline_anomaly(features)
        
        logger.info(f"Baseline prediction completed: score={result['score']:.4f}")
        
        return ModelPredictionResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error in baseline prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in baseline prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
