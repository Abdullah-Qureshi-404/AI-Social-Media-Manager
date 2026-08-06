from typing import Optional

# HARDCODED MASTER PRESET PROMPTS WITH STRICT DISH PRESERVATION
GOLDEN_HOUR_WARMTH = """A professional, high-resolution, photorealistic photograph of the EXACT food dish in {reference_image}.

CRITICAL INSTRUCTION — DISH PRESERVATION:
Do NOT alter, recreate, or replace the food dish. The food items ({product_name}), rice, curry, meat, garnishes, fork, plate, bowl, and food arrangement MUST REMAIN 100% IDENTICAL to {reference_image}.

Aesthetic Application:
Apply a soft, warm, honey-toned golden hour sunset glow over the scene in the style of luxury cafe dining. Enhance lighting, color vibrancy, and shadows. Replace only the table background with a warm polished wooden surface or luxury cafe table while keeping the original plate and food completely intact.

Key Exclusions:
No added text, no watermarks, no captions, no logos."""

RUSTIC_CAFE = """A candid artisanal food photograph of the EXACT food dish in {reference_image}.

CRITICAL INSTRUCTION — DISH PRESERVATION:
Do NOT alter, recreate, or replace the food dish. The food items ({product_name}), rice, curry, meat, garnishes, fork, plate, bowl, and food arrangement MUST REMAIN 100% IDENTICAL to {reference_image}.

Aesthetic Application:
Enhance the atmosphere with cozy warm coffee shop ambient lighting. Place the original plate on a subtle reclaimed wood table surface with soft bokeh in the background. Preserve the food and plate exactly as shown.

Key Exclusions:
No added text, no watermarks, no captions, no logos."""

DARK_MOODY = """A dramatic cinematic studio food photograph of the EXACT food dish in {reference_image}.

CRITICAL INSTRUCTION — DISH PRESERVATION:
Do NOT alter, recreate, or replace the food dish. The food items ({product_name}), rice, curry, meat, garnishes, fork, plate, bowl, and food arrangement MUST REMAIN 100% IDENTICAL to {reference_image}.

Aesthetic Application:
Apply rich directional lighting and deep shadows onto dark slate or dark marble backdrop behind the original plate. Enhance restaurant contrast while preserving the exact food dish.

Key Exclusions:
No added text, no watermarks, no captions, no logos."""

CLEAN_MINIMALIST = """A pristine Scandinavian style food photograph of the EXACT food dish in {reference_image}.

CRITICAL INSTRUCTION — DISH PRESERVATION:
Do NOT alter, recreate, or replace the food dish. The food items ({product_name}), rice, curry, meat, garnishes, fork, plate, bowl, and food arrangement MUST REMAIN 100% IDENTICAL to {reference_image}.

Aesthetic Application:
Apply bright natural window daylight and a clean minimalist backdrop. Keep the exact plate and food completely unchanged.

Key Exclusions:
No added text, no watermarks, no captions, no logos."""

BRIGHT_AIRY = """A beautifully styled food photograph of the EXACT food dish in {reference_image}.

CRITICAL INSTRUCTION — DISH PRESERVATION:
Do NOT alter, recreate, or replace the food dish. The food items ({product_name}), rice, curry, meat, garnishes, fork, plate, bowl, and food arrangement MUST REMAIN 100% IDENTICAL to {reference_image}.

Aesthetic Application:
Enhance with soft window light, vibrant natural colors, and a clean bright background atmosphere. Keep the exact food dish and plate untouched.

Key Exclusions:
No added text, no watermarks, no captions, no logos."""

STUDIO_COMMERCIAL = """A professional commercial advertisement photograph of the EXACT food dish in {reference_image}.

CRITICAL INSTRUCTION — DISH PRESERVATION:
Do NOT alter, recreate, or replace the food dish. The food items ({product_name}), rice, curry, meat, garnishes, fork, plate, bowl, and food arrangement MUST REMAIN 100% IDENTICAL to {reference_image}.

Aesthetic Application:
Apply crisp studio flash lighting, sharp focus, and commercial color grading around the original plate and food.

Key Exclusions:
No added text, no watermarks, no captions, no logos."""

PRESET_PROMPTS = {
    "golden_hour": GOLDEN_HOUR_WARMTH,
    "rustic_cafe": RUSTIC_CAFE,
    "dark_moody": DARK_MOODY,
    "clean_minimalist": CLEAN_MINIMALIST,
    "bright_airy": BRIGHT_AIRY,
    "studio_commercial": STUDIO_COMMERCIAL,
}

COMMON_PRODUCT_PRESERVATION_RULES = """STRICT PRODUCT PRESERVATION DIRECTIVE:
1. THE FOOD DISH IN THE GENERATED PHOTO MUST MATCH THE ORIGINAL DISH FROM THE INPUT PHOTO EXACTLY.
2. DO NOT GENERATE A DIFFERENT TYPE OF FOOD OR MEAL.
3. Keep the exact food items, rice grains, curry/gravy appearance, meat pieces, garnishes, plate shape, bowl, fork, and food placement intact.
4. ONLY improve lighting, color saturation, sharpness, shadows, and table background around the food.
5. Produce a photorealistic food advertisement where the customer recognizes the exact meal from the restaurant."""

USER_CUSTOM_PROMPT_TEMPLATE = """Additional User Instruction:
{user_prompt}
(Apply this instruction ONLY if it does NOT change or replace the food dish from the original photo)."""


def build_image_prompt(
    preset_name: str = "golden_hour",
    custom_instruction: Optional[str] = None,
    product_name: str = "original food dish",
    reference_image: str = "the original uploaded photo",
) -> str:
    """Constructs strict dish preservation food photography prompt."""
    preset_key = (preset_name or "golden_hour").lower().strip()
    if preset_key not in PRESET_PROMPTS or preset_key == "custom":
        preset_key = "golden_hour"

    master_template = PRESET_PROMPTS[preset_key]
    master_prompt = master_template.format(
        product_name=product_name,
        reference_image=reference_image,
    )

    parts = [master_prompt, COMMON_PRODUCT_PRESERVATION_RULES]

    if custom_instruction and custom_instruction.strip():
        user_section = USER_CUSTOM_PROMPT_TEMPLATE.format(
            user_prompt=custom_instruction.strip()
        )
        parts.append(user_section)

    return "\n\n".join(parts)
