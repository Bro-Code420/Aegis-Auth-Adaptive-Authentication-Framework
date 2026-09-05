"""
Training script for session drift anomaly detection model.
"""
import pandas as pd
import joblib
from pathlib import Path
from typing import Tuple
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import numpy as np

from src.models.session_model import create_session_model, get_model_config
from src.features.session_features import get_session_feature_names
from config.logging_config import get_logger

logger = get_logger(__name__)

# Constants
RANDOM_STATE = 42
DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "session_drift_synthetic_10000.csv"
WEIGHTS_DIR = Path(__file__).resolve().parent.parent.parent / "weights"
MODEL_NAME = "session_model_v1.pkl"


def load_data(data_path: Path) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Load and prepare training data.
    
    Args:
        data_path: Path to CSV file
    
    Returns:
        Tuple of (features DataFrame, target Series)
    """
    logger.info(f"Loading data from {data_path}")
    df = pd.read_csv(data_path)
    
    # Extract features
    features = get_session_feature_names()
    X = df[features]
    y = df["anomaly_label"]
    
    logger.info(f"Loaded {len(df)} samples with {len(features)} features")
    logger.info(f"Anomaly rate: {y.mean():.4f}")
    
    return X, y


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> Tuple:
    """
    Train the session drift anomaly detection model.
    
    Args:
        X_train: Training features
        y_train: Training labels
    
    Returns:
        Tuple of (trained pipeline, predictions, scores)
    """
    logger.info("Creating model pipeline")
    config = get_model_config()
    pipeline = create_session_model(**{k: v for k, v in config.items() if k != "features"})
    
    logger.info("Training model...")
    # IsolationForest is unsupervised
    pipeline.fit(X_train)
    
    logger.info("Making predictions...")
    pred_raw = pipeline.predict(X_train)
    pred = np.where(pred_raw == -1, 1, 0)
    scores = pipeline.decision_function(X_train)
    
    logger.info("Training completed")
    return pipeline, pred, scores


def evaluate_model(pipeline, X_test: pd.DataFrame, y_test: pd.Series):
    """
    Evaluate model performance.
    
    Args:
        pipeline: Trained pipeline
        X_test: Test features
        y_test: Test labels
    """
    logger.info("Evaluating model...")
    
    pred_raw = pipeline.predict(X_test)
    pred = np.where(pred_raw == -1, 1, 0)
    
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, pred))


def save_model(pipeline, weights_dir: Path, model_name: str):
    """
    Save trained model to disk.
    
    Args:
        pipeline: Trained pipeline
        weights_dir: Directory to save model
        model_name: Model filename
    """
    weights_dir.mkdir(parents=True, exist_ok=True)
    model_path = weights_dir / model_name
    
    logger.info(f"Saving model to {model_path}")
    joblib.dump(pipeline, model_path)
    logger.info("Model saved successfully")


def main():
    """Main training function."""
    logger.info("=" * 60)
    logger.info("Session Model Training")
    logger.info("=" * 60)
    
    # Load data
    X, y = load_data(DATA_PATH)
    
    # Split data
    logger.info("Splitting data into train/test sets")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )
    
    # Train model
    pipeline, pred, scores = train_model(X_train, y_train)
    
    # Evaluate model
    evaluate_model(pipeline, X_test, y_test)
    
    # Save model
    save_model(pipeline, WEIGHTS_DIR, MODEL_NAME)
    
    logger.info("=" * 60)
    logger.info("Training completed successfully!")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
