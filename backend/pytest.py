"""Lightweight offline pytest runner fallback when system `pytest` package is not installed.

Allows `python3 -m pytest` to discover and run all `tests/test_*.py` suites with zero network dependencies.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path


def main() -> int:
    start_dir = Path(__file__).resolve().parent / "tests"
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=str(start_dir), pattern="test_*.py")
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    total = result.testsRun
    failed = len(result.failures) + len(result.errors)
    print("=" * 70)
    if failed == 0:
        print(f"================== {total} passed in BhumiShield test suite ==================")
        return 0
    print(f"================== {failed} failed, {total - failed} passed ==================")
    return 1


if __name__ == "__main__":
    sys.exit(main())
