"""Run larp_engine.battle() over a list of id pairs. Used only by test_battle_parity.mjs.

Usage: python scripts/_parity_python.py pairs.json out.json
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from larp_engine import battle  # noqa: E402


def main() -> int:
    pairs = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    out_path = Path(sys.argv[2])

    battlers = json.loads((ROOT / "data" / "battlers.json").read_text(encoding="utf-8"))["battlers"]
    by_id = {b["id"]: b for b in battlers}

    results = []
    for a_id, b_id in pairs:
        results.append(battle(by_id[a_id], by_id[b_id]))

    out_path.write_text(json.dumps(results, ensure_ascii=False), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
