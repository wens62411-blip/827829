# Refinement image provenance

Generated using the built-in image generation tool on 2026-09-11, then resized/encoded using Sharp. The architecture is an original illustrative setting and does not claim any real venue affiliation. Existing photo assets and the personal card image design are preserved.

## City panel prompt

Use case: photorealistic-natural. Asset type: wide 2.4:1 banner for AB Club digital card mini program's city-community panel. Create a new high-resolution elegant European classical villa terrace and salon architecture: ivory limestone arches, subtly carved cornice, aged warm marble, wrought-iron details, a glimpse of a tranquil Italian lake and pale mountains beyond the arches. Afternoon soft daylight, finely resolved stone textures and balanced perspective, tasteful architectural editorial photograph with restrained old-world art atmosphere. Champagne gold highlights, ivory, warm taupe and deep charcoal, natural color, not green dominated. Composition suitable for a 1440 by 600 wide crop: architecture and view both legible, no important details near extreme edges. No people, no text, no logos, no watermarks, no collage, no artificial blur or shallow depth of field, all architectural detail sharp. This is an original illustrative setting, do not depict a specific named venue.

## Brand share prompt

Use case: ads-marketing. Asset type: actual WeChat Mini Program share thumbnail for AB Club, landscape ratio 5:4, designed to remain exceptionally legible at 300x240 preview size. Create a premium editorial brand cover, large ivory negative space, ink-black typography, fine champagne-gold rules and warm stone grey. Exact large title: "AB Club". Exact Chinese subheading: "你的名片，连接世界". Exact single bottom caption: "数字名片 · 个性表达 · 全球华人". Use a beautiful elegant serif title, refined Chinese Songti type, sharp readable text, plenty of whitespace. Upper left two-thirds largely clear for the title and subheading. Lower right: elegant minimalist ivory personal-card silhouette with a short vertical gold rule and abstract fine text strokes, no fake personal information; behind it a narrow softly lit crop of classical European stone arch and sculptural detail. The imagery should feel like an art publication cover, with realistic fine material texture. Only the specified three text lines. No giant logo, no green theme, no flashy gradients, no QR, no fake buttons, no dense dashboard, no names/phone/email, no phone device mockup, no watermarks. High-resolution final artwork, complete design, not a screenshot.

## Runtime files

- City panel: `miniprogram/assets/community/european-classical-terrace.jpg`, 1200 × 500, 90,733 bytes.
- Brand share: `miniprogram/assets/brand/ab-club-brand-share.jpg`, 600 × 480, 32,531 bytes.
- Both final JPEGs were visually inspected after size optimization. Readable brand copy is preserved. Master PNGs remain outside the runtime package.
- Regeneration/format conversion helper: `scripts/prepare-refinement-assets.cjs` (Sharp provided externally; no new app dependency).
