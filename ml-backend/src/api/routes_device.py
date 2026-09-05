"""
FastAPI routes for device trust prediction.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from src.api.schemas import DeviceRequest, ModelPredictionResponse
from src.inference.device_predictor import predict_device_trust
from src.utils.logger import logger

router = APIRouter(prefix="/predict", tags=["Device"])


@router.post("/device", response_model=ModelPredictionResponse)
async def predict_device(request: DeviceRequest) -> ModelPredictionResponse:
    """
    Predict device trust score (probability of low trust).
    
    Args:
        request: Device request with features
    
    Returns:
        Model prediction response with low trust probability
    """
    try:
        logger.info(f"Device prediction request received: {request.dict()}")
        
        # Convert Pydantic model to dict
        features = request.dict()
        
        # Run prediction
        result = predict_device_trust(features)
        
        logger.info(f"Device prediction completed: score={result['score']:.4f}")
        
        return ModelPredictionResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error in device prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in device prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
