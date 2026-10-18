"""Read the same application switch before a collector makes any network request."""
import json
import os
from pathlib import Path
import shutil
import subprocess


def require_collection_enabled():
    php = os.environ.get('SOURCE_COLLECTION_PHP') or shutil.which('php')
    loader = next((p for root in Path(__file__).resolve().parents
                   for p in (root / 'backend/vendor/autoload.php', root / 'vendor/autoload.php')
                   if p.is_file()), None)
    if not php or not loader:
        raise ValueError('Collection is OFF: application policy could not be checked')
    code = "require $argv[1]; echo json_encode(\\App\\Http\\Controllers\\Api\\V1\\SourceIntelligenceController::collectionSettings()['enabled']);"
    try:
        result = subprocess.run([php, '-r', code, str(loader)], capture_output=True, text=True, timeout=10)
        enabled = result.returncode == 0 and json.loads(result.stdout) is True
    except (OSError, ValueError, subprocess.SubprocessError):
        enabled = False
    if not enabled:
        raise ValueError('COLLECTION_GLOBALLY_DISABLED: enable only through Super Admin after checking applicable rules')
