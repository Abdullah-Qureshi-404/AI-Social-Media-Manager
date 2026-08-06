import pytest
from app.services.image_editing.prompt_builder import (
    build_image_prompt,
    GOLDEN_HOUR_WARMTH,
    RUSTIC_CAFE,
    DARK_MOODY,
    CLEAN_MINIMALIST,
    BRIGHT_AIRY,
    STUDIO_COMMERCIAL,
    COMMON_PRODUCT_PRESERVATION_RULES,
)

def test_preset_prompts_assembled_correctly():
    # Test Golden Hour preset without user custom instruction
    prompt_gh = build_image_prompt("golden_hour")
    assert "luxury cafe dining" in prompt_gh
    assert COMMON_PRODUCT_PRESERVATION_RULES in prompt_gh
    assert "Additional User Instruction:" not in prompt_gh

    # Test Rustic Cafe preset with user instruction
    prompt_rc = build_image_prompt("rustic_cafe", custom_instruction="Make background pink")
    assert "cozy warm coffee shop" in prompt_rc
    assert COMMON_PRODUCT_PRESERVATION_RULES in prompt_rc
    assert "Additional User Instruction:" in prompt_rc
    assert "Make background pink" in prompt_rc
    assert "Apply this instruction ONLY if it does NOT change or replace" in prompt_rc

def test_all_six_presets_available():
    presets = [
        ("golden_hour", "luxury cafe dining"),
        ("rustic_cafe", "cozy warm coffee shop"),
        ("dark_moody", "dark slate or dark marble"),
        ("clean_minimalist", "Scandinavian style food photograph"),
        ("bright_airy", "soft window light"),
        ("studio_commercial", "professional commercial advertisement"),
    ]
    for key, snippet in presets:
        prompt = build_image_prompt(key)
        assert snippet in prompt, f"Preset {key} missing expected snippet"
        assert COMMON_PRODUCT_PRESERVATION_RULES in prompt
