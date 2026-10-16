"""CLI entry point: `python -m app.seed`."""
from app.seed.seed_data import seed_all

if __name__ == "__main__":
    summary = seed_all(reset=True)
    print("BhumiShield Demo Database Seeded Successfully:", summary)
