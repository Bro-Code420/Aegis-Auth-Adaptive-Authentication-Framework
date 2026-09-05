"""
Structured logging utility for the ML Backend Service.
"""
import logging
import sys
from typing import Optional

from src.config.settings import LOG_LEVEL, LOG_FORMAT


def setup_logger(name: Optional[str] = None, level: Optional[str] = None) -> logging.Logger:
    """
    Set up a structured logger.
    
    Args:
        name: Logger name (defaults to root logger)
        level: Log level (defaults to LOG_LEVEL from settings)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name or __name__)
    
    # Avoid duplicate handlers
    if logger.handlers:
        return logger
    
    logger.setLevel(level or LOG_LEVEL)
    
    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level or LOG_LEVEL)
    
    # Formatter
    formatter = logging.Formatter(LOG_FORMAT)
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    logger.propagate = False
    
    return logger


# Default logger instance
logger = setup_logger("ml_backend")
