"""Shared output directory definitions for generated artifacts."""

import os
from pathlib import Path


ENGINE_ROOT = Path(__file__).resolve().parent
_configured_output_root = os.getenv("ANOTHERME_OUTPUT_ROOT", "").strip()
if _configured_output_root:
	GENERATED_OUTPUTS_ROOT = Path(_configured_output_root).expanduser().resolve()
else:
	GENERATED_OUTPUTS_ROOT = ENGINE_ROOT / "generated_outputs"
DEFAULT_OUTPUT_DIR = GENERATED_OUTPUTS_ROOT / "default_run"
GATEWAY_OUTPUTS_ROOT = GENERATED_OUTPUTS_ROOT / "gateway_runs"
LEGACY_OUTPUTS_ROOT = GENERATED_OUTPUTS_ROOT / "legacy"
