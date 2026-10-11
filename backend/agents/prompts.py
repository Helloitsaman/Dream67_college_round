"""Prompt source: load test prompts from a user-supplied file or a public dataset."""

from __future__ import annotations

import csv
import json
from pathlib import Path


def load_prompts(path: str | Path, field: str = "prompt") -> list[str]:
    """Load prompts from a file.

    Supported formats:
      .txt    one prompt per line (blank lines and '#' comments ignored)
      .jsonl  one JSON object (or string) per line; text taken from `field`
      .json   list of strings or objects with `field`
      .csv    column named `field`
    """
    p = Path(path)
    suffix = p.suffix.lower()
    text = p.read_text(encoding="utf-8")

    if suffix == ".txt":
        prompts = [l.strip() for l in text.splitlines() if l.strip() and not l.startswith("#")]
    elif suffix == ".jsonl":
        prompts = [_extract(json.loads(l), field) for l in text.splitlines() if l.strip()]
    elif suffix == ".json":
        data = json.loads(text)
        prompts = [_extract(item, field) for item in (data if isinstance(data, list) else [data])]
    elif suffix == ".csv":
        with p.open(newline="", encoding="utf-8") as f:
            prompts = [row[field] for row in csv.DictReader(f)]
    else:
        raise ValueError(f"Unsupported prompt file type: {suffix}")

    return [x for x in prompts if x]


def load_hf_dataset(
    name: str, split: str = "train", field: str = "text", limit: int | None = None
) -> list[str]:
    """Load prompts from a Hugging Face dataset (requires `pip install datasets`)."""
    from datasets import load_dataset

    ds = load_dataset(name, split=split)
    prompts = [str(row[field]) for row in ds]
    return prompts[:limit] if limit else prompts


def _extract(item, field: str) -> str:
    if isinstance(item, str):
        return item
    if isinstance(item, dict) and field in item:
        return str(item[field])
    raise ValueError(f"Cannot find field '{field}' in {item!r}")
