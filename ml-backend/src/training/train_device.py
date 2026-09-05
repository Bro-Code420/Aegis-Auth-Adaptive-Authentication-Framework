"""
Training script for device trust prediction model.
"""
import pandas as pd
import joblib
from pathlib import Path
from typing import Tuple
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import classification_report, roc_auc_score

from src.models.device_trust_model import create_device_model, get_model_config
from src.features.device_features import get_device_feature_names
from config.logging_config import get_logger

logger = get_logger(__name__)

# Constants
RANDOM_STATE = 42
DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "device_trust_synthetic_10000.csv"
WEIGHTS_DIR = Path(__file__).resolve().parent.parent.parent / "weights"
MODEL_NAME = "device_trust_model_v1.pkl"


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
    features = get_device_feature_names()
    X = df[features]
    y = df["low_trust_flag"]
    
    logger.info(f"Loaded {len(df)} samples with {len(features)} features")
    logger.info(f"Low trust rate: {y.mean():.4f}")
    
    return X, y


def train_model(X_train: pd.DataFrame, y_train: pd.Series) -> Tuple:
    """
    Train the device trust prediction model.
    
    Args:
        X_train: Training features
        y_train: Training labels
    
    Returns:
        Tuple of (trained pipeline, predictions, probabilities)
    """
    logger.info("Creating model pipeline")
    config = get_model_config()
    pipeline = create_device_model(**{k: v for k, v in config.items() if k != "features"})
    
    logger.info("Training model...")
    pipeline.fit(X_train, y_train)
    
    logger.info("Making predictions...")
    pred = pipeline.predict(X_train)
    proba = pipeline.predict_proba(X_train)[:, 1]  # Probability of low trust
    
    logger.info("Training completed")
    return pipeline, pred, proba


def evaluate_model(pipeline, X_test: pd.DataFrame, y_test: pd.Series):
    """
    Evaluate model performance.
    
    Args:
        pipeline: Trained pipeline
        X_test: Test features
        y_test: Test labels
    """
    logger.info("Evaluating model...")
    
    pred = pipeline.predict(X_test)
    proba = pipeline.predict_proba(X_test)[:, 1]
    
    logger.info("\nClassification Report:")
    logger.info(classification_report(y_test, pred))
    
    auc = roc_auc_score(y_test, proba)
    logger.info(f"\nROC-AUC: {auc:.4f}")


def cross_validate(pipeline, X: pd.DataFrame, y: pd.Series):
    """
    Perform cross-validation.
    
    Args:
        pipeline: Model pipeline
        X: Features
        y: Labels
    """
    logger.info("Performing cross-validation...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    scores = cross_val_score(pipeline, X, y, cv=cv, scoring="roc_auc")
    logger.info(f"Cross-validation ROC-AUC: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")


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
    logger.info("Device Trust Model Training")
    logger.info("=" * 60)
    
    # Load data
    X, y = load_data(DATA_PATH)
    
    # Split data
    logger.info("Splitting data into train/test sets")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE
    )
    
    # Cross-validation
    config = get_model_config()
    pipeline = create_device_model(**{k: v for k, v in config.items() if k != "features"})
    cross_validate(pipeline, X_train, y_train)
    
    # Train model
    pipeline, pred, proba = train_model(X_train, y_train)
    
    # Evaluate model
    evaluate_model(pipeline, X_test, y_test)
    
    # Save model
    save_model(pipeline, WEIGHTS_DIR, MODEL_NAME)
    
    logger.info("=" * 60)
    logger.info("Training completed successfully!")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
