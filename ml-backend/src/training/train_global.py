"""
Training script for global threat detection model.
"""
import pandas as pd
import joblib
from pathlib import Path
from typing import Tuple
from sklearn.metrics import silhouette_score

from src.models.global_threat_model import create_global_model, get_model_config
from src.features.global_features import get_global_feature_names
from config.logging_config import get_logger

logger = get_logger(__name__)

# Constants
RANDOM_STATE = 42
DATA_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "raw" / "global_threat_synthetic_10000.csv"
WEIGHTS_DIR = Path(__file__).resolve().parent.parent.parent / "weights"
MODEL_NAME = "global_threat_model_v1.pkl"


def load_data(data_path: Path) -> pd.DataFrame:
    """
    Load and prepare training data.
    
    Args:
        data_path: Path to CSV file
    
    Returns:
        Features DataFrame
    """
    logger.info(f"Loading data from {data_path}")
    df = pd.read_csv(data_path)
    
    # Extract features
    features = get_global_feature_names()
    X = df[features]
    
    logger.info(f"Loaded {len(df)} samples with {len(features)} features")
    
    return X


def train_model(X: pd.DataFrame) -> Tuple:
    """
    Train the global threat detection model.
    
    Args:
        X: Training features
    
    Returns:
        Tuple of (trained pipeline, cluster labels)
    """
    logger.info("Creating model pipeline")
    config = get_model_config()
    pipeline = create_global_model(**{k: v for k, v in config.items() if k != "features"})
    
    logger.info("Training model...")
    pipeline.fit(X)
    
    logger.info("Getting cluster labels...")
    labels = pipeline.named_steps["model"].labels_
    
    logger.info("Training completed")
    return pipeline, labels


def evaluate_model(pipeline, X: pd.DataFrame, labels: pd.Series):
    """
    Evaluate model performance using silhouette score.
    
    Args:
        pipeline: Trained pipeline
        X: Features
        labels: Cluster labels
    """
    logger.info("Evaluating model...")
    
    # Get scaled features
    scaled_X = pipeline.named_steps["scaler"].transform(X)
    
    # Calculate silhouette score
    silhouette = silhouette_score(scaled_X, labels)
    logger.info(f"\nSilhouette Score: {silhouette:.4f}")
    
    # Cluster distribution
    unique, counts = pd.Series(labels).value_counts().sort_index()
    logger.info("\nCluster Distribution:")
    for cluster, count in zip(unique, counts):
        logger.info(f"  Cluster {cluster}: {count} samples ({count/len(labels)*100:.2f}%)")


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
    logger.info("Global Threat Model Training")
    logger.info("=" * 60)
    
    # Load data
    X = load_data(DATA_PATH)
    
    # Train model (no train/test split for clustering)
    pipeline, labels = train_model(X)
    
    # Evaluate model
    evaluate_model(pipeline, X, labels)
    
    # Save model
    save_model(pipeline, WEIGHTS_DIR, MODEL_NAME)
    
    logger.info("=" * 60)
    logger.info("Training completed successfully!")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
