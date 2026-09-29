import os
from pydantic_settings import BaseSettings

class HindsightConfig(BaseSettings):
    api_url: str = os.getenv("HINDSIGHT_API_URL", "http://localhost:8888")
    api_key: str = os.getenv("HINDSIGHT_API_KEY", "default-dev-key")
    namespace: str = os.getenv("HINDSIGHT_NAMESPACE", "opsmind-production")
    confidence_threshold: float = float(os.getenv("MEMORY_CONFIDENCE_THRESHOLD", "0.75"))
    use_mock_memory: bool = True

    class Config:
        env_file = ".env"
        extra = "allow"

hindsight_config = HindsightConfig()
