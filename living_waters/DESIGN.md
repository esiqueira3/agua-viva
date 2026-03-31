# Design System Specification: Editorial Sanctuary

## 1. Overview & Creative North Star
**Creative North Star: The Digital Cathedral**
This design system rejects the "SaaS dashboard" aesthetic in favor of a high-end editorial experience. We are not just managing data; we are stewarding a community. The visual language balances the weight of tradition (Deep Blue and Gold) with the breath of modernism (Generous whitespace and Glassmorphism).

To break the "template" look, we utilize **Intentional Asymmetry**. Dashboards should not be rigid grids; use overlapping elements where a card might slightly "float" over a section header, and employ a high-contrast typography scale to create a clear, authoritative path for the eye.

---

## 2. Color Strategy & Tonal Depth
Our palette is rooted in the `primary` (#011549) to convey stability, accented by `tertiary_fixed` (#FFE08F) to evoke a sense of "sacred" premium quality.

### The "No-Line" Rule
**Standard 1px borders are strictly prohibited.** To define sections, use background shifts. A `surface_container_low` section sitting on a `surface` background provides a sophisticated boundary that feels organic rather than mechanical.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. 
*   **Base:** `surface` (#F9F9FF)
*   **Sectioning:** `surface_container_low` (#F0F3FF)
*   **Interactive Cards:** `surface_container_lowest` (#FFFFFF)
*   **Depth:** Use `surface_variant` (#DCE2F3) for inset elements like search bars or inactive tabs.

### The Glass & Gradient Rule
For the collapsible sidebar and floating headers, apply a **Glassmorphism** effect:
*   **Background:** `surface` at 80% opacity.
*   **Backdrop-blur:** 12px - 20px.
*   **CTA Soul:** Use a subtle linear gradient for primary buttons, transitioning from `primary` (#011549) to `primary_container` (#1A2B5E) at a 135-degree angle. This adds "visual weight" that flat hex codes cannot achieve.

---

## 3. Typography: The Editorial Voice
We pair **Manrope** (Display/Headlines) for its modern, architectural feel with **Inter** (Body/Labels) for its Swiss-style legibility.

*   **Display-LG (Manrope):** 3.5rem. Use for high-impact welcome messages. Apply `letter-spacing: -0.02em`.
*   **Headline-MD (Manrope):** 1.75rem. Use for page titles. Increase `letter-spacing: 0.05em` (Generous Tracking) to lean into the "Premium" brand pillars.
*   **Title-SM (Inter):** 1rem. Bold weight. Used for card headers and navigation labels.
*   **Body-MD (Inter):** 0.875rem. The workhorse for all data and descriptions.

**Hierarchy Note:** Always contrast a `headline-md` title with a `label-sm` subtitle in `on_surface_variant` (#45464F) to create a sophisticated, tiered information scent.

---

## 4. Elevation & Depth
Depth in this system is achieved through **Tonal Layering** rather than drop shadows.

*   **The Layering Principle:** Place a `surface_container_lowest` card on a `surface_container_low` background. The slight shift in brightness creates a "soft lift" that feels architectural.
*   **Ambient Shadows:** If an element must "float" (e.g., a Modal or Menu), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(21, 28, 39, 0.06)`. Note the use of the `on_surface` color for the shadow tint to keep it natural.
*   **The Ghost Border:** For accessibility in forms, use `outline_variant` (#C5C6D1) at **20% opacity**. Never use a 100% opaque border.

---

## 5. Components & Interaction

### Collapsible Sidebar
*   **Style:** `surface_container_low` background with a right-hand "Ghost Border" (20% opacity). 
*   **Active State:** No heavy fills. Use a `tertiary_fixed_dim` (#E6C364) vertical pill (4px wide) on the left edge and transition the text to `primary`.

### Informative Cards
*   **Style:** `surface_container_lowest` with a `lg` (1rem) corner radius.
*   **Constraint:** No dividers. Separate content using the `spacing-6` (1.5rem) token. Use `surface_container_high` for internal header backgrounds to differentiate data types.

### Status Indicators (The "Traffic Light" System)
Used for member health or project status. Do not use raw circles; use "Squircled" chips.
*   **Urgent:** `error` (#BA1A1A) text on `error_container` (#FFDAD6).
*   **Warning:** `on_tertiary_container` (#B19238) text on `tertiary_fixed` (#FFE08F).
*   **Healthy:** `on_primary_fixed_variant` text on `primary_fixed`.

### Tabbed Forms
*   **Style:** Interactive tabs should look like "Underlined" editorial text. The active tab uses a 2px `primary` underline, while inactive tabs use `on_surface_variant` at 50% opacity.

### Interactive Calendar
*   **Style:** Avoid heavy grid lines. Use `surface` for the background and `surface_container_highest` (#DCE2F3) for the "Today" highlight. Events are styled as floating "Glass" pills using department colors at 20% opacity.

---

## 6. Departmental Color Tokens
When designing for specific ministries, use these functional accents for iconography and small highlight surfaces:
*   **Youth:** #3B82F6 (Blue)
*   **Kids:** #F59E0B (Yellow)
*   **Worship:** #8B5CF6 (Purple)
*   **Intercession:** #EC4899 (Pink)
*   **General:** #10B981 (Green)
*   **Admin:** #6B7280 (Gray)

---

## 7. Do's and Don'ts

### Do
*   **Do** use `xl` (1.5rem) rounding for large layout containers and `md` (0.75rem) for interactive components.
*   **Do** utilize "Negative Space" as a functional tool. If a screen feels cluttered, increase the spacing between cards to `spacing-10` (2.5rem).
*   **Do** use `soft gold` (tertiary tokens) sparingly—only for "Premium" moments like leadership tiers or giving milestones.

### Don't
*   **Don't** use black (#000000). Always use `on_surface` (#151C27) for text to maintain a high-end, ink-on-paper feel.
*   **Don't** use 1px solid dividers to separate list items. Use a 12px vertical gap (`spacing-3`) or a subtle background shift.
*   **Don't** use standard "Blue" links. Navigation should feel like an editorial menu—clean, bold, and reactive via opacity or weight changes.