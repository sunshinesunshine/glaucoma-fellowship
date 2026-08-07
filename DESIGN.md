---
name: Glaucoma Fellowship Portal
description: Glaucoma Fellowship Rotation & Surgery Case Tracker
colors:
  primary-ss: "#3b82f6"
  primary-mn: "#f97316"
  neutral-bg: "#0b0f19"
  neutral-text: "#e2e8f0"
  card-bg: "rgba(17, 24, 39, 0.65)"
  nav-bg: "rgba(11, 15, 25, 0.85)"
  slate-950: "#070a13"
  slate-955: "#090d18"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(1.5rem, 5vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "12px"
  lg: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary-ss}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  card-glass:
    backgroundColor: "{colors.card-bg}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Glaucoma Fellowship Portal

## 1. Overview

**Creative North Star: "The Clinical Command Deck"**

The design system is structured as a premium dark-themed medical portal that emphasizes readability, accessibility, and high-efficiency workflow operations. Since fellows and supervisors interact with the app in fast-paced, high-glare clinical settings, the visual density is structured to keep inputs and schedules readable at a glance without decorative distractions.

Key characteristics:
* **Slate-Dark Canvas**: Reduces eye strain under bright surgical lights.
* **Tonal Division**: Sections and grids are divided using borders and tints rather than shadows.
* **Tactile Interactions**: Large, deliberate hit targets (`rounded-xl` / `rounded-3xl`) that feel physical and solid.
* **High Contrast**: Guaranteed readability through strict WCAG AA contrast floors.

---

## 2. Colors

The color palette is built around two saturated action accents representing the two fellows (SS and MN) set against a deep slate base.

### Primary
* **SS Accent (Vibrant Blue)** (`#3b82f6` / `oklch(62% 0.25 250)`): Primary active accent for Fellow SS (Sirawich). Used for SS-specific clinic slots, log lists, and visual chart bars.
* **MN Accent (Vibrant Orange)** (`#f97316` / `oklch(65% 0.22 35)`): Primary active accent for Fellow MN (Metas). Used for MN-specific clinic slots, log lists, and visual chart bars.

### Neutral
* **Midnight Base (Dark Blue-Slate)** (`#0b0f19`): Main application background.
* **Slate Surface (Glass Overlay)** (`rgba(17, 24, 39, 0.65)`): Container background for cards and calendars.
* **Slate Text (Light Gray)** (`#e2e8f0`): Standard readability color for body text.

### Named Rules
**The Split-Fellow Rule.** The accents `primary-ss` (Blue) and `primary-mn` (Orange) must never be blended or cross-assigned. They serve as a direct identity anchor; color represents the person.

**The Contrast Floor Rule.** Text elements must never use light-gray on dark-gray styling. Inactive calendar cell tags and weekend labels must use at least `slate-400` (`#94a3b8`) or above on `#0b0f19` backgrounds to satisfy the `4.5:1` WCAG AA minimum contrast ratio under clinic lighting.

---

## 3. Typography

**Display Font:** Outfit (with fallback `sans-serif`)
**Body Font:** Inter (with fallback `sans-serif`)

### Hierarchy
* **Display** (Outfit Bold, `clamp(1.5rem, 5vw, 2.5rem)`, `1.2` line-height): Main portal headers, app branding, and large stat summaries.
* **Headline** (Outfit Semi-Bold, `18px`, `1.3` line-height): Section card titles and calendar header months.
* **Body** (Inter Regular, `13px`, `1.5` line-height): Case logs, tables, input fields, and patient detail text.
* **Label** (Inter Bold, `10px`, `0.05em` letter-spacing, uppercase): Table headers, labels, and small calendar badges.

---

## 4. Elevation

Depth is conveyed strictly through **Restrained Flat** principles. The application relies on solid borders, transparent glass overlays, and clear color division instead of depth drop shadows.

### Depth Vocabulary
* **Flat Surfaces**: Background surfaces use `#0b0f19`. Overlaid containers use glass cards with `1px` solid border (`rgba(255, 255, 255, 0.08)`).
* **Tonal Glows**: Ambient backdrop blurs (`blur(80px)`) in the body background provide subtle color fields, but containers themselves are flat.

### Named Rules
**The No-Shadows Rule.** Drop shadows are prohibited. Depth division is created using border strokes (`1px` solid) and distinct background color shifts (e.g. `slate-950` to `slate-955`).

**The Focus Outline Rule.** All interactive inputs, selectors, and action buttons must render high-contrast focus rings (`focus-visible`) to guide keyboard navigation and user focus.

---

## 5. Components

### Buttons
* **Shape:** Rounded corners (`12px` radius).
* **Primary:** Blue background (`#3b82f6`) or deep slate with white text.
* **Hover / Focus:** Scale transform up (`scale-102`) and border-color transitions (`duration-200`).

### Cards / Containers
* **Corner Style:** Rounded corners (`24px` radius).
* **Background:** Semi-transparent Midnight Slate (`rgba(17, 24, 39, 0.65)`).
* **Border:** Thin light-border (`1px` solid `rgba(255, 255, 255, 0.08)`).

### Inputs / Fields
* **Style:** Solid border with `12px` radius.
* **Focus:** Blue border (`#3b82f6`) with an internal highlight.

### Navigation
* **Style:** Floating bottom navigation bar.
* **Icons:** Inline SVGs only. No emojis are permitted in navigation buttons or header interfaces to prevent mobile layout distortion.

### Study Flip Cards
* **Interaction**: Interactive 3D flip card with front/back clinical presentations.
* **Front (Question)**: Midnight black background (`#070a13`), rounded corners (`24px`), thin border (`1px`), showing blue clinical tags.
* **Back (Answer)**: Indigo/slate dark background (`#111827`), showing diagnosis and explanations.

### Surgical Analytics Chart
* **Visual**: Pure, responsive SVG charts (no external library).
* **Styles**: Thin grid lines (`rgba(255, 255, 255, 0.05)`), distinct bar fills (SS Blue `#3b82f6` and MN Orange `#f97316`).

---

## 6. Do's and Don'ts

### Do:
* **Do** use Outfit for all title numbers and headers to ensure a clean, modern aesthetic.
* **Do** use inline SVGs instead of emojis in calendars to prevent mobile browser text wrap and layout distortions.
* **Do** test all clinical headers across responsive breakpoints to prevent headline overflow on mobile viewports.

### Don't:
* **Don't** use drop shadows (`box-shadow` or Tailwind `shadow-*` utility classes) on glass cards or buttons.
* **Don't** use text gradients or border-left accents as decoration on cards.
* **Don't** use excessive rounding (radius > `16px`) on input fields, buttons, or small badges.
