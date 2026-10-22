# Apple-Inspired Design System: Horizontal Island Studio

> **Design Specification & Style Guide for Playsole One**  
> *A modern, tactile, and fluid interface standard blending Apple Human Interface Guidelines with high-performance studio aesthetics.*

---

## 1. Design Philosophy & Aesthetic Direction

The **Horizontal Island Studio** moves away from generic, cluttered admin templates and repetitive vertical sidebars. It prioritizes clarity, content hierarchy, atmospheric depth, and tactile physical feedback.

### Core Tenets
1. **Air & Atmosphere over Borders**: Use subtle background radial glows, generous breathing room, and soft frosted glass rather than heavy dividers.
2. **Horizontal Harmony**: Utilize widescreen layouts with balanced split-horizon bento cards rather than narrow vertical columns.
3. **Tactile Physics**: Interactive elements respond with subtle spring-like micro-transitions, soft elevation on hover, and pill-shaped segment highlights that feel tangible.
4. **Apple-Grade Glassmorphism**: Clean `backdrop-filter: blur(24px)` with high-translucency white surfaces (`rgba(255, 255, 255, 0.88)`) and hairline borders (`rgba(226, 232, 240, 0.85)`).
5. **No Visual Noise**: Eliminate unnecessary sci-fi jargon or artificial chrome. Content takes center stage with crisp typography, precise badges, and immediate status telemetry.

---

## 2. Design Tokens & Visual Hierarchy

### A. Color Palette

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--brand` | `#0076FE` | Primary accent, active tabs, verified indicators |
| `--brand-hover` | `#0060d0` | Primary button hover state |
| `--brand-glow` | `rgba(0, 118, 254, 0.2)` | Focus rings and primary button glow |
| `--bg-canvas` | `#f8fafc` | Global canvas background |
| `--surface-island` | `rgba(255, 255, 255, 0.88)` | Top floating island omni-dock |
| `--surface-glass` | `rgba(255, 255, 255, 0.70)` | Secondary translucent panels |
| `--surface-card` | `#ffffff` | Studio bento cards and hero horizon |
| `--border-glass` | `rgba(226, 232, 240, 0.85)` | Hairline translucent borders |
| `--border-hover` | `#cbd5e1` | Hovered interactive borders |
| `--text-primary` | `#090d16` | Main headings, titles, active labels |
| `--text-secondary`| `#475569` | Subtitles, body copy, descriptions |
| `--text-muted` | `#94a3b8` | Metadata, timestamps, placeholders |
| `--success` | `#10b981` | Positive status, verified checks |
| `--success-surface`| `#ecfdf5` | Background for success capsules |
| `--warning` | `#f59e0b` | Attention notices, untrusted devices |
| `--warning-surface`| `#fffbeb` | Background for warning capsules |
| `--danger` | `#ef4444` | Destructive actions, revocations |
| `--danger-surface` | `#fef2f2` | Danger button hover and alerts |

### B. Spatial Scale & Geometry

```css
:root {
  --dock-height: 64px;
  --radius-pill: 9999px;   /* Pills, buttons, switcher tabs */
  --radius-xl: 20px;       /* Studio cards, hero horizon */
  --radius-lg: 14px;       /* Telemetry tiles, sub-containers */
  --radius-md: 10px;       /* Inputs, small controls */
  --radius-sm: 8px;        /* Badges, chips */
}
```

### C. Shadows & Depth

```css
:root {
  /* Floating Island Dock Elevation */
  --shadow-island: 
    0 10px 30px -5px rgba(0, 0, 0, 0.06), 
    0 4px 12px -2px rgba(0, 0, 0, 0.03);

  /* Studio Bento Card Elevation */
  --shadow-card: 
    0 4px 20px -2px rgba(15, 23, 42, 0.04), 
    0 1px 3px 0 rgba(15, 23, 42, 0.03);

  /* Modal Floating Depth */
  --shadow-modal: 
    0 24px 48px -12px rgba(15, 23, 42, 0.16), 
    0 4px 12px 0 rgba(15, 23, 42, 0.04);
}
```

### D. Atmospheric Horizon Gradient

A subtle radial glow anchored to the top of the viewport provides depth without distracting from the UI:

```css
body::before {
  content: "";
  position: fixed;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 1000px;
  height: 450px;
  background: radial-gradient(
    circle, 
    rgba(0, 118, 254, 0.07) 0%, 
    rgba(99, 102, 241, 0.04) 45%, 
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}
```

---

## 3. Typography & Text Hierarchy

We combine **Plus Jakarta Sans** (for geometric headings and crisp button labels) with **Inter** (for high-legibility interface copy and metadata) and native system font fallbacks.

- **Title 1 / Main Heading**: `24px` | Weight: `700` | Tracking: `-0.02em`
- **Section Heading (Card Titles)**: `17px` | Weight: `700` | Tracking: `-0.01em`
- **Body Regular**: `14px` | Weight: `400` | Line Height: `1.5`
- **UI Button / Control**: `13px` | Weight: `600` | Tracking: `0`
- **Status / Pill Label**: `12px` | Weight: `600`
- **Uppercase Meta / Telemetry**: `11px` - `12px` | Weight: `600` | Tracking: `+0.04em` | Text Transform: `uppercase`

---

## 4. Key Component Blueprints

### A. Top Floating Island Omni-Dock

The centerpiece of navigation. It floats 18px from the top edge, sticky-positioned with frosted glass backdrop filter.

```
+----------------------------------------------------------------------------------------------------+
|  [Logo] Playsole One [PRO]   |   (•) Overview   (•) Profile   (•) Security [2FA]   (•) Apps [3]   |   (Avatar) John Doe [⎋]  |
+----------------------------------------------------------------------------------------------------+
```

#### Key Specs:
- **Container**: Max width `1120px`, height `64px`, border-radius `9999px`.
- **Glass Effect**: `background: rgba(255, 255, 255, 0.88); backdrop-filter: blur(24px);`.
- **Segmented Switcher**: Inset pill container (`background: rgba(241, 245, 249, 0.8)`) with sliding white active pill tabs (`box-shadow: 0 2px 8px rgba(0,0,0,0.06)`).
- **User Capsule**: Right-aligned pill holding the user avatar, truncated display name, and circular sign-out trigger.

---

### B. Widescreen Hero Identity Horizon Card

Positioned at the top of the main stage, summarizing the user's presence and security status at a glance.

#### Key Specs:
- **Grid Layout**: 2-column split (`1.4fr : 1fr`).
- **Left Identity Horizon**:
  - `96px` Circular avatar halo with interactive hover lens (`.avatar-edit-lens`) for camera/upload.
  - Large headline with soft pulse verified status chip (`Verified Account`).
  - Account email and member timestamp.
- **Right Telemetry Horizon**:
  - Divided by a vertical frosted hairline (`border-left: 1px solid #f1f5f9`).
  - Dual telemetry metric tiles:
    1. **Security Health**: Status pill (`Strong` / `Attention Required`) with active 2FA badge.
    2. **Active Integrations**: Total connected apps and active hardware count.
  - Tiles feature gentle vertical lift on hover (`transform: translateY(-2px)`).

---

### C. Bento Horizon Grid & Studio Cards

Workspaces are organized into an Apple-inspired Bento Grid layout:

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}
.bento-col-8  { grid-column: span 8; }
.bento-col-4  { grid-column: span 4; }
.bento-col-6  { grid-column: span 6; }
.bento-col-12 { grid-column: span 12; }
```

#### Studio Card Attributes:
- Surface: `#ffffff`
- Corner Radius: `20px` (`--radius-xl`)
- Border: `1px solid rgba(226, 232, 240, 0.85)`
- Padding: `28px`

---

### D. Status Capsules & Scope Chips

Status indicators are rendered as rounded pills with tinted monochromatic backgrounds:

| Capsule Type | Background | Text Color | Dot / Indicator |
| :--- | :--- | :--- | :--- |
| **Success** (`.capsule-success`) | `#ecfdf5` | `#10b981` | Green check / solid dot |
| **Warning** (`.capsule-warning`) | `#fffbeb` | `#f59e0b` | Amber exclamation |
| **Danger** (`.capsule-danger`) | `#fef2f2` | `#ef4444` | Red stop |
| **Neutral** (`.capsule-neutral`) | `#f1f5f9` | `#475569` | Slate dot |
| **Current** (`.capsule-current`) | `#eff6ff` | `#0076FE` | Brand blue pulse |
| **Scope Chip** (`.scope-chip`) | `#f1f5f9` | `#475569` | Compact permission badge |

---

### E. Tactile Buttons & Controls

- **Primary Button (`.btn-island-primary`)**:
  - Pill radius (`9999px`), solid brand blue background.
  - Subtle glow on hover: `box-shadow: 0 4px 14px rgba(0, 118, 254, 0.2)`.
  - Press feedback: `transform: scale(0.985)`.
- **Secondary Button (`.btn-island-secondary`)**:
  - Crisp white pill with frosted border (`rgba(226, 232, 240, 0.85)`).
- **Destructive Button (`.btn-island-danger`)**:
  - Danger-tinted surface (`#fef2f2`) with red text (`#ef4444`).
- **Ghost Button (`.btn-island-ghost`)**:
  - Borderless, low-contrast interactive label.

---

### F. Glassmorphic Modal Dialogs

Modals float over the viewport with a frosted dark veil:

```css
.modal-overlay {
  background: rgba(9, 13, 22, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-dialog {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: var(--shadow-modal);
  border: 1px solid rgba(226, 232, 240, 0.9);
  animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
```

---

## 5. Motion & Micro-Interactions

### A. Fluid Tab Transitions
Switching between `Overview`, `Profile`, `Security`, and `Connected Apps` triggers a smooth, non-disruptive stage fade:

```css
@keyframes stageFade {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### B. Clean URL State Synchronization
When a user switches tabs, the browser URL immediately updates via `history.replaceState` to:
```
/dashboard?tab=profile
/dashboard?tab=security
/dashboard?tab=grants
```
No messy URL fragment hashes (`#profile`) or cross-path redirects occur.

### C. 5-Second Self-Dismissing Feedback Banners
Alert messages (such as *"Authenticator app removed"* or *"Profile saved"*) display at the top of the workspace with a clear manual dismiss button (`×`), and automatically slide up and dissolve after 5 seconds:

```javascript
function dismissBanner(banner) {
  banner.style.opacity = '0';
  banner.style.transform = 'translateY(-6px)';
  banner.style.maxHeight = '0';
  banner.style.marginTop = '0';
  banner.style.marginBottom = '0';
  banner.style.padding = '0';
  setTimeout(() => banner.remove(), 450);
}
```

### D. Dirty-State Form Reactivity
Action buttons (e.g., *Save Changes*) remain disabled (`opacity: 0.5`) until the user modifies an input value. Once the form differs from baseline values, the button smoothly activates.

---

## 6. Implementation Checklist for New Pages

When extending this Apple-inspired style to additional pages:

1. **Include the Top Floating Omni-Dock**:
   - Maintain the standard `1120px` max-width and `64px` height.
   - Use `.island-dock` with backdrop filter blur.
2. **Apply the Atmospheric Glow**:
   - Add the radial gradient pseudo-element to `body::before`.
3. **Use Bento Grids**:
   - Place related controls and readouts into `.studio-card` elements within a 12-column grid.
4. **Adhere to the Radius Hierarchy**:
   - `9999px` for buttons, pills, chips, and docks.
   - `20px` for main cards and dialogs.
   - `14px` for sub-tiles and inner groupings.
5. **Preserve Fluid Micro-Interactions**:
   - Ensure all modal dialogs, tab transitions, and feedback banners use the defined `cubic-bezier(0.16, 1, 0.3, 1)` easing.
