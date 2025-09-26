"""
Environment variable loader for Databricks Digital Twin backend.

This module loads environment variables from .env.local file if it exists.
Import this module before importing any other modules that use environment variables.
"""

import os
from pathlib import Path


def load_env_file(env_file=".env.local"):
    """Load environment variables from a file"""
    env_path = Path(__file__).parent / env_file

    if not env_path.exists():
        print(f"Warning: {env_file} not found at {env_path}")
        return

    print(f"Loading environment variables from {env_path}")

    with open(env_path, 'r') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith('#'):
                continue

            # Parse KEY=VALUE pairs
            if '=' in line:
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip()

                # Remove quotes if present
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]

                # Only set if not already in environment
                if key not in os.environ:
                    os.environ[key] = value

            else:
                print(f"Warning: Invalid line {line_num} in {env_file}: {line}")


# Auto-load on import
if __name__ != "__main__":
    load_env_file()