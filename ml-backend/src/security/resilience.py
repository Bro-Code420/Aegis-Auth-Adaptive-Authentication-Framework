"""
External Dependency Resilience & Circuit Breaker Engine for AegisAuth Pro.
Guarantees third-party outages (Gemini, Twilio, Pinata/IPFS) fail gracefully
into degraded modes without interrupting core authentication or granting access.
"""
import time
import threading
from typing import Callable, Any, Dict, List, Optional, Tuple
from src.utils.logger import logger


class CircuitBreakerOpenException(Exception):
    """Raised when a call is rejected because the circuit is OPEN."""
    pass


class CircuitBreaker:
    """
    Thread-safe Circuit Breaker with CLOSED -> OPEN -> HALF_OPEN states.
    """
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout_seconds: float = 30.0,
        expected_exception: type = Exception
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout_seconds = recovery_timeout_seconds
        self.expected_exception = expected_exception
        
        self._state = "CLOSED" # CLOSED, OPEN, HALF_OPEN
        self._failure_count = 0
        self._last_failure_time = 0.0
        self._lock = threading.Lock()

    @property
    def state(self) -> str:
        with self._lock:
            if self._state == "OPEN":
                if time.time() - self._last_failure_time > self.recovery_timeout_seconds:
                    self._state = "HALF_OPEN"
                    logger.info(f"[CircuitBreaker:{self.name}] Transitioned from OPEN to HALF_OPEN (Trial call allowed)")
            return self._state

    def execute(self, func: Callable, *args, fallback: Optional[Callable] = None, **kwargs) -> Any:
        """Executes the wrapped function through the circuit breaker."""
        current_state = self.state
        
        if current_state == "OPEN":
            logger.warning(f"[CircuitBreaker:{self.name}] Call rejected: Circuit is OPEN (Degraded mode active)")
            if fallback:
                return fallback(*args, **kwargs)
            raise CircuitBreakerOpenException(f"Circuit '{self.name}' is OPEN. Service in degraded state.")

        try:
            result = func(*args, **kwargs)
            # Success in HALF_OPEN or CLOSED resets the circuit
            with self._lock:
                if self._state == "HALF_OPEN":
                    logger.info(f"[CircuitBreaker:{self.name}] Recovery verified. Transitioned from HALF_OPEN to CLOSED.")
                self._state = "CLOSED"
                self._failure_count = 0
            return result
        except self.expected_exception as e:
            with self._lock:
                self._failure_count += 1
                self._last_failure_time = time.time()
                logger.error(f"[CircuitBreaker:{self.name}] Call failed ({self._failure_count}/{self.failure_threshold}): {e}")
                
                if self._failure_count >= self.failure_threshold or self._state == "HALF_OPEN":
                    self._state = "OPEN"
                    logger.error(f"[CircuitBreaker:{self.name}] Tripped! State changed to OPEN for {self.recovery_timeout_seconds}s")

            if fallback:
                return fallback(*args, **kwargs)
            raise e


class DeadLetterQueue:
    """
    In-memory dead-letter queue for deferred processing of failed non-critical tasks.
    """
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._queue: List[Dict[str, Any]] = []
        self._lock = threading.Lock()

    def enqueue(self, task_type: str, payload: Dict[str, Any], error: str) -> None:
        with self._lock:
            if len(self._queue) >= self.max_size:
                self._queue.pop(0) # Evict oldest
            self._queue.append({
                "task_type": task_type,
                "payload": payload,
                "error": error,
                "timestamp": time.time(),
                "retries": 0
            })
            logger.info(f"[DeadLetterQueue] Enqueued failed {task_type} task. DLQ Size: {len(self._queue)}")

    def get_pending_tasks(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._queue)


# Global Circuit Breakers for 3rd Party Integrations
gemini_breaker = CircuitBreaker("Gemini_AI", failure_threshold=3, recovery_timeout_seconds=20.0)
twilio_breaker = CircuitBreaker("Twilio_Voice", failure_threshold=3, recovery_timeout_seconds=30.0)
pinata_breaker = CircuitBreaker("Pinata_IPFS", failure_threshold=3, recovery_timeout_seconds=20.0)
dlq = DeadLetterQueue()
