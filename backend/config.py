import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the project root if it exists
project_root = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=project_root / ".env")

class Settings:
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "").strip()
    GITHUB_OWNER: str = os.getenv("GITHUB_OWNER", "").strip()
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "").strip()

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "").strip()
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "").strip()

    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8000"))

    # In-memory toggle for the demo fix
    FIX_ENABLED: bool = False

settings = Settings()
