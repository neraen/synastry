# Project: Lunestia (app/)

## Stack
- React Native + Expo Router
- TypeScript
- i18n via react-i18next
- Backend: Symfony API (authApi)

## Key paths
- Tabs: `app/app/(tabs)/` — transits.tsx is the "Voyage temporel" screen (Timeline + Calendar + Mirror tabs)
- Theme: `app/theme/index.ts` — SINGLE SOURCE of colors/fonts/spacing/radius
- Components: `app/components/ui/` — GlassCard, GoldButton, GhostButton, FormattedText, TabHeader, Starfield
- Services: `app/services/astrology.ts` — all API calls incl. getMirrorTransits, getMirrorInterpretation

## Design rules (CLAUDE.md)
- Colors ONLY from theme/index.ts (no hardcoded hex except specific accent colors with no theme equivalent)
- No 1px borders → background color shifts
- Cards = GlassCard (opacity 0.4–0.6 + backdropFilter blur)
- Font: NotoSerif (display), Manrope (body)
- Border radius: full for pills/buttons, xl (24) for containers, md (12) for inner elements
- Gaps between sections: 32px or 48px, never dividers

## Mirror tab (Variante A — Décennies + années)
Implemented in `transits.tsx` → `MirrorTabContent` component.

### Structure
1. **GlassCard picker**: big age + "ans" + year | decade pills (ScrollView horizontal) | year grid (10 flex buttons)
2. **Chapter cards** (MirrorChapterCard): glass card per chapter, first card has drop cap + gold glow
3. **Pin CTA**: full-width Pressable with bookmark icon
4. **Feedback**: thumbs up/down toggle

### API types (astrology.ts)
- `MirrorChapter { theme, glyph, accent, text }` — accent: 'gold'|'violet'|'pink'|'blue' or raw hex
- `MirrorMilestone { age, label, glyph }` — default set in DEFAULT_MILESTONES constant
- `MirrorInterpretationResponse` now has optional `chapters?` + `milestones?` fields
- Backward compat: if API returns `interpretation` string only, shown as single GlassCard (FormattedText)

### Chapter accent colors
Defined in `CHAPTER_ACCENT_MAP`: gold→colors.primary, violet→#9B5CFF, pink→colors.accent.pink, blue→#5DA9F5
