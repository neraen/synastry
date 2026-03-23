# Design System Strategy: The Celestial Editorial

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Cosmic Curator."** We are moving away from the "utility-first" look of standard dating apps to create an editorial, high-end experience that feels like a private consultation with the stars. 

This system breaks the "template" look through **Intentional Asymmetry** and **Tonal Depth**. By utilizing large-scale serif typography juxtaposed with tight, functional sans-serif labels, we create a rhythmic hierarchy. Layouts should feel breathable and expansive, using overlapping glass layers to simulate the infinite depth of the night sky. We do not "box" content; we "float" it.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the deep reaches of the cosmos, using `surface` (`#180d2c`) as our anchor. 

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to define sections. Boundaries must be established through:
1. **Background Color Shifts:** A `surface-container-low` section sitting on a `surface` background.
2. **Tonal Transitions:** Using the `secondary-container` (`#440fdb`) to create soft pools of light that define functional areas.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the surface-container tiers (Lowest to Highest) to create "nested" depth.
*   **Lowest (`#130827`):** Use for "inset" areas or background sections that should feel further away.
*   **High/Highest (`#2f2444` / `#3a2f50`):** Use for interactive elements that need to feel closer to the user.
*   **The Glass Rule:** For floating modals or "Star Cards," use `surface-variant` with a 40-60% opacity and a `20px` to `40px` backdrop-blur. This allows the cosmic gradients of the background to bleed through, ensuring the UI feels integrated into the environment.

### Signature Textures
Main CTAs and Hero moments must use the **Signature Gradient**: transitioning from `primary` (`#e9c349`) to `primary-container` (`#866a00`). This adds "soul" and a metallic, gold-leaf quality that flat colors cannot replicate.

---

## 3. Typography: The Editorial Voice
We use a high-contrast typographic scale to convey "Emotional Intelligence."

*   **Display & Headlines (Noto Serif):** These are our "Artistic" layer. Use `display-lg` (3.5rem) for personality-driven moments (e.g., a user's name or a zodiac sign). The serif reflects tradition and trust.
*   **Body & Titles (Manrope):** These are our "Functional" layer. Manrope provides a clean, modern contrast to the serif.
*   **Visual Hierarchy:** Titles should always have generous tracking (letter-spacing: 0.05em) to maintain a premium, airy feel.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are too "heavy" for a celestial theme. We use **Ambient Light** principles.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section to create a soft, natural lift.
*   **Ambient Shadows:** If a floating effect is required (e.g., a floating Action Button), use a shadow with a 40px blur, 0px offset, and 6% opacity using a tint of `on-surface` (`#ebdcff`). This mimics the soft glow of a nebula.
*   **The "Ghost Border" Fallback:** For accessibility in forms, use the `outline-variant` (`#474556`) at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components & Interaction

### Buttons
*   **Primary (The Gold Standard):** Uses the `primary` to `primary-container` gradient. Roundedness: `full`. No border.
*   **Secondary (The Glass Variant):** Semi-transparent `surface-bright` with a subtle 10% `outline` ghost border.
*   **Tertiary:** Text-only using `primary` color, all-caps, with `label-md` styling.

### Cards & Profiles
*   **Forbid Divider Lines:** Use `Spacing 8` (2.75rem) or `Spacing 12` (4rem) to separate sections.
*   **Glassmorphism:** All profile cards must use `surface-container-high` at 40% opacity with a heavy backdrop blur. 
*   **Corners:** Use `xl` (3rem) for large profile containers and `md` (1.5rem) for internal UI elements.

### Inputs & Selection
*   **Input Fields:** Ghost borders only. The "Active" state should not be a thicker border, but a subtle outer glow using `secondary` (`#c8bfff`) at 20% opacity.
*   **Celestial Chips:** Selection chips use `surface-container-highest`. When selected, they transition to `secondary-container` with white text.

### Custom Components: "The Transit Map"
A bespoke vertical timeline component for astrological transits. It uses a 1px vertical line made of a gradient (transparent to `outline-variant` to transparent) to guide the eye without creating a hard visual "wall."

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Asymmetry:** Offset your text blocks. Let a headline hang over the edge of a card to create a high-fashion, editorial layout.
*   **Use Micro-Interactions:** Elements should fade and slide in softly (300ms-500ms), mimicking the slow movement of stars.
*   **Check Contrast:** Ensure `on-surface` (`#ebdcff`) is used for all primary reading to maintain accessibility on the dark `surface`.

### Don't:
*   **Don't use pure black:** It kills the "Deep Purple" mystery. Stick to `surface-container-lowest` for your darkest areas.
*   **Don't use icons with fills:** Only use thin-stroke (1pt to 1.5pt) line icons. Solid icons feel too heavy and "app-like."
*   **Don't use standard grids:** While a grid exists, feel free to let images "break" the grid to create a sense of infinite space.