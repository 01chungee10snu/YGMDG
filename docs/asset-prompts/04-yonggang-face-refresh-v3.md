# Prompt Pack: Yonggang Face Refresh v3

## Shared Reference

Reference image: `docs/references/yonggang-character-reference.jpg`

Use the reference only for the character design language: rounded orange Yonggang face, shallow U-shaped top notch, one floating molten droplet, thick dark navy outline, tiny black w-shaped mouth, vertical black oval eyes, tiny warm-brown eyebrows, large pale cream cheek blush, and blue workwear feeling.

Do not reproduce the Hyundai Steel logo, H mark, wordmark, or any readable text from the reference image.

## Shared Negative Prompt

No text, no logo, no watermark, no wordmark, no H symbol, no side view, no hidden face, no missing eyes, no missing eyebrows, no missing mouth, no missing cheeks, no photorealism, no scary expression, no cluttered background, no extra character.

## Mascot Prompt

Create a 1024 x 1024 clean 2D vector-style game mascot on a plain white or transparent background. The subject is the Yonggang molten-steel mascot, front-facing full body, using the reference image as strict character-design guidance. Preserve the shallow U-shaped top notch, one floating molten droplet, thick dark navy outline, warm orange/yellow rounded head, two vertical black oval eyes, two tiny warm-brown oval eyebrows, tiny black w-shaped mouth, very large pale cream cheek circles, and blue workwear jacket feeling. Make the head silhouette broad and rounded like the reference, not a pointed flame. Center the full body with generous margin.

## Component Prompt Template

Create a 1024 x 1024 clean 2D vector-style game icon on a plain white or transparent background. The subject is `<TIER_OBJECT>`, front-facing, rounded, toy-like, with the exact Yonggang face grammar visible on the front plane: two vertical black oval eyes, two tiny warm-brown oval eyebrows, tiny black w-shaped mouth, two large pale cream circular cheek blush marks, thick dark navy outline. Use warm molten orange/yellow accents and steel-blue industrial accents. Keep the object readable at small mobile-game icon size. No text, no logo, no watermark.

## GPTImaGen Candidate Job Shape

```json
{
  "mode": "image-to-image",
  "promptFile": "docs/asset-prompts/04-yonggang-face-refresh-v3.md",
  "options": {
    "size": "1024x1024",
    "quality": "high",
    "count": 1,
    "stylePreset": "clean 2D vector mobile game mascot",
    "useCase": "game asset source image",
    "avoid": "text, logo, watermark, H mark, side view, missing face parts"
  },
  "sourceImages": [
    {
      "path": "docs/references/yonggang-character-reference.jpg",
      "role": "main-subject",
      "note": "Follow face grammar and body proportions; do not copy logo or text."
    }
  ],
  "outputDir": "assets/generated/candidates/yonggang-face-refresh-v3"
}
```
