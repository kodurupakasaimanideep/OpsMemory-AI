import json
import os
from pathlib import Path
from typing import Dict, Any, List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"

def get_data_dir() -> Path:
    return DATA_DIR

def load_json_file(filepath: Path) -> Optional[Dict[str, Any]]:
    if not filepath.exists():
        return None
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json_file(filepath: Path, data: Dict[str, Any]) -> None:
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def calculate_text_similarity(text1: str, text2: str) -> float:
    words1 = set(text1.lower().replace("-", " ").replace("_", " ").split())
    words2 = set(text2.lower().replace("-", " ").replace("_", " ").split())
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return round(len(intersection) / len(union), 2)
