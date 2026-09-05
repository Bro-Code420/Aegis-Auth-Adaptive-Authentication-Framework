"""
Training script for login anomaly detection model.
"""
import pandas as pd
import joblib
from pathlib import Path
from typing import Tuple
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import numpy as np

from src.models.login_model import create_login_model, get_model_config
from src.features.login_features import extract_login_features, get_login_feature_names
from config.logging_config import get_logger

logger = get_logger(__name__)

# Constants
RANDOM_STATE = 42
DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "login_anomaly_synthetic_10000.csv"
WEIGHTS_DIR = Path(__file__).resolve().parent.parent.parent / "weights"
MODEL_NAME = "login_model_v1.pkl"


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
    features = get_login_feature_names()
    X = df[features]
    y = df["anomaly_label"]
    
    logger.info(f"Loaded {len(df)} samples with {len(features)} features")
    logger.info(f"Anomaly rate: {y.mean():.4f}")
    
    return X, y


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> Tuple:
    """
    Train the login anomaly detection model.
    
    Args:
        X_train: Training features
        y_train: Training labels
    
    Returns:
        Tuple of (trained pipeline, predictions, probabilities)
    """
    logger.info("Creating model pipeline")
    config = get_model_config()
    pipeline = create_login_model(**{k: v for k, v in config.items() if k != "features"})
    
    logger.info("Training model...")
    # IsolationForest is unsupervised, so we fit on X_train only
    pipeline.fit(X_train)
    
    logger.info("Making predictions...")
    # Predict anomalies (-1 for anomaly, 1 for normal)
    pred_raw = pipeline.predict(X_train)
    pred = np.where(pred_raw == -1, 1, 0)  # Convert to 0/1
    
    # Get anomaly scores
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
    scores = pipeline.decision_function(X_test)
    
    # Classification report
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, pred))
    
    # ROC-AUC (using decision function scores)
    try:
        auc = roc_auc_score(y_test, -scores)  # Negative because lower scores = anomaly
        logger.info(f"\nROC-AUC: {auc:.4f}")
    except Exception as e:
        logger.warning(f"Could not calculate ROC-AUC: {e}")


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
    logger.info("Login Model Training")
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
