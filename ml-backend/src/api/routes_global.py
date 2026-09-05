"""
FastAPI routes for global threat prediction.
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from src.api.schemas import GlobalRequest, ModelPredictionResponse
from src.inference.global_predictor import predict_global_threat
from src.utils.logger import logger

router = APIRouter(prefix="/predict", tags=["Global"])


@router.post("/global", response_model=ModelPredictionResponse)
async def predict_global(request: GlobalRequest) -> ModelPredictionResponse:
    """
    Predict global threat score using clustering.
    
    Args:
        request: Global threat request with features
    
    Returns:
        Model prediction response with threat score and cluster info
    """
    try:
        logger.info(f"Global prediction request received: {request.dict()}")
        
        # Convert Pydantic model to dict
        features = request.dict()
        
        # Run prediction
        result = predict_global_threat(features)
        
        logger.info(f"Global prediction completed: score={result['score']:.4f}, cluster={result.get('cluster_label')}")
        
        return ModelPredictionResponse(**result)
    
    except ValueError as e:
        logger.error(f"Validation error in global prediction: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in global prediction: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
