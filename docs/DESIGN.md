# Design System: DATN Social (Instagram-Inspired)

## 1. Visual Theme & Atmosphere

A social networking SPA inspired by Instagram's visual language — clean surfaces, soft elevation, and accent-driven interactivity. Light mode (default) uses warm greys (`#F0F2F5`) with pure white cards. Dark mode swaps to deep charcoal (`#0C1014`) with tinted glass. The mood is approachable, content-forward, and motion-polished.

## 2. Color Palette & Roles

### Light Mode
- **Canvas** (`--app-bg: #F0F2F5`) — Page background
- **Surface** (`--app-surface: #FFFFFF`) — Cards, modals, panels
- **Surface Muted** (`--app-surface-muted: #F8F9F9`) — Subtle hover fills
- **Primary** (`--app-primary: #4150F7`) — CTAs, active indicators, links
- **Primary Soft** (`--app-primary-soft: rgba(65,80,247,0.1)`) — Icon/alert backgrounds
- **Primary Strong** (`--app-primary-strong: #3A41D6`) — Button hover
- **Accent** (`--app-accent: #0095F6`) — Notification badges, secondary highlights
- **Success** (`--app-success: #1CD164`) — Online status dot
- **Danger** (`--app-danger: #E74C3C`) — Destructive actions
- **Text** (`--app-text: #1C1E21`) — Primary content
- **Text Muted** (`--app-muted: #737373`) — Secondary metadata
- **Text Strong** (`--app-muted-strong: #2B3036`) — Descriptions, body
- **Border** (`--app-border: #E4E6EB`) — Card outlines, dividers
- **Border Strong** (`--app-border-strong: #D1D5DB`) — Input focus borders

### Dark Mode (`<html class="dark">`)
- **Canvas** → `#0C1014`
- **Surface** → `#111518`
- **Primary** → `#6370FF` (brighter for dark contrast)
- **Text** → `#F0F2F5`
- All surfaces shift cooler, borders become `#252B30`, shadows deepen.

### Elevation
- **Card shadow** (`--app-shadow`) — `0px 1px 3px rgba(0,0,0,0.06)` → `0px 1px 4px rgba(0,0,0,0.4)` dark
- **Floating** (`--app-shadow-floating`) — Tinted to primary: `0px 2px 8px rgba(65,80,247,0.24)`
- **Elevated** (`--app-shadow-elevated`) — `0px 8px 24px rgba(0,0,0,0.16)` → `0px 12px 40px rgba(0,0,0,0.6)` dark

## 3. Typography Rules

- **Font Stack**: `Optimistic, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
- **Base Size**: `15px` body, `line-height: 20px`
- **Headings**: Weight `600` (semibold), `letter-spacing: 0`
- **H1 (Page Title)**: `28px`, `leading-tight`, `font-semibold`
- **H2 (Card Title)**: `text-lg` / `18px`, `font-semibold`, `leading-6`
- **Description/Subtitle**: `text-sm` / `13px`, `leading-6`, `text-muted-strong`
- **Metadata**: `text-xs` / `11px`, `text-muted`
- **Badges**: `text-[10px]`, `uppercase`, `tracking-[0.2em]`, `font-semibold`
- **Line limit**: Paragraphs capped at `max-w-[65ch]`
- **selection**: `rgba(65,80,247,0.18)` background

## 4. Component Stylings

### Cards (`surface-card`, `.surface-card-strong`)
- **Border**: `1px solid var(--app-border)`
- **Radius**: `rounded-xl` (`12px`)
- **Background**: `var(--app-surface)`
- **Shadow**: `var(--app-shadow)` (subtle), `var(--app-shadow-lg)` (strong variant)
- **Padding**: `p-4` internally

### Buttons
- **Primary Fill**: `bg-[var(--app-primary)]` + white text + `hover:bg-[var(--app-primary-strong)]`
- **Ghost/Outline**: `border border-[var(--app-border)]` + `bg-[var(--app-surface)]` + `hover:bg-[var(--app-bg-soft)]`
- **Danger Fill**: `bg-[var(--app-danger)]` + white text
- **Disabled**: `bg-[var(--app-border)]` + `text-[var(--app-muted)]`, `cursor: not-allowed`
- **Shape**: `rounded-lg`, `min-h-[40px]`, `px-4`, `text-sm font-semibold`
- **Tactile**: `.btn-tactile:active { transform: scale(0.97) }`
- **Transition**: `.spring-ease` class (`0.35s cubic-bezier(0.16, 1, 0.3, 1)`)
- **Focus**: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]`

### Inputs & Forms
- **Border**: `1px solid var(--app-border)` → `focus:border-[var(--app-primary)]`
- **Background**: `var(--app-surface)`
- **Placeholder**: `var(--app-muted)`, weight `400`
- **Focus**: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-primary)]`
- **Error Text**: `text-[var(--app-danger)]`, `text-sm`, `aria-live="polite"`
- **Label**: `text-sm font-medium text-[var(--app-text)]`, `htmlFor` required

### Dialogs (`ConfirmDialog`, `PromptDialog`)
- **Overlay**: `fixed inset-0 z-[1000]`, `bg-[rgba(28,30,33,0.72)]`, `backdrop-blur-sm`
- **Panel**: `.glass-panel`, `w-full max-w-md`, `rounded-xl`, `p-5`
- **Dismiss**: `Escape` key, backdrop click (`onMouseDown` on overlay)
- **Focus management**: `useRef` + `autofocus` on cancel/input

### Avatar
- **Sizes**: `xs` (24px), `sm` (32px), `md` (44px), `lg` (56px), `xl` (150px)
- **Shape**: `rounded-full` (circle)
- **Fallback**: Cloudinary default avatar
- **Story Ring**: `bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)]`, `p-[2px]`, inner `border-2 border-white`

### StatePanel (Empty / Error / Loading states)
- **Container**: `.surface-card`, `rounded-xl`, `p-8`, `text-center`
- **Icon area**: `h-14 w-14 rounded-full border border-[--app-border]` with uppercase letterfallback
- **Title**: `text-xl font-semibold`
- **Description**: `text-sm leading-6 text-[--app-muted-strong]`
- **Action**: Optional `React.ReactNode` below description

### Glass Panel (`.glass-panel`)
- **Background**: `var(--app-glass-bg)` (white/78% light, `#111518/75%` dark)
- **Blur**: `backdrop-filter: blur(16px) saturate(200%)`
- **Border**: `var(--app-glass-border)`
- **Inner highlight**: `inset 0 1px 0 rgba(255,255,255,0.12)`

### Status Dot (`.status-dot-online`)
- **Size**: `8px`, `rounded-full`
- **Color**: `var(--app-success)`
- **Animation**: `breathe` — scale/opacity pulse every `2.4s`

### Skeleton (`.skeleton`)
- **Gradient**: `var(--app-border)` → `var(--app-bg-soft)` → `var(--app-border)`
- **Animation**: `shimmer` — background-position sweep every `1.6s`
- **Radius**: `6px`

## 5. Layout Principles

### Page Structure
- **Desktop (>1024px)**: Fixed left sidebar (`w-[72px]` compact / `w-[244px]` expanded), main content in `max-w-[975px]` container, optional right aside (`320px`)
- **Mobile (<1024px)**: Sticky top header, bottom nav bar (`56px`), full-width content with `px-4`
- **Shell class**: `.app-shell` with `min-height: 100dvh`, background `var(--app-bg)`
- **Safe areas**: `env(safe-area-inset-*)` for header/bottom-nav padding
- **Header height**: `60px` + safe-top
- **Bottom nav height**: `56px` + safe-bottom

### Content Max Widths
- **Default content**: `max-w-[935px]` (Instagram-aligned)
- **Feed posts grid**: `max-w-[630px]` (single-column post cards)
- **Auth forms**: `max-w-[420px]`
- **Dialogs**: `max-w-md`

### Grid System
- **Tailwind CSS Grid** (`grid grid-cols-3 gap-1` for profile grid)
- **CSS Flexbox** for card layouts, nav items
- **Bento/gapless**: Not used — prefers spaced card layouts

## 6. Motion & Interaction

### Spring Ease (`.spring-ease`)
- **Duration**: `0.35s`
- **Timing**: `cubic-bezier(0.16, 1, 0.3, 1)` — overshoot spring feel
- **Properties**: `transform, opacity, background-color, border-color, color, box-shadow`

### Framer Motion
- **Bottom nav icons**: `whileTap={{ scale: 0.88 }}`, `animate={{ scale: isActive ? 1.12 : 1 }}`, spring `{ stiffness: 360, damping: 22 }`
- **Staggered entry**: `.stagger-1` through `.stagger-4` (80ms cascade)
- **Float-in**: `.float-in` animation (`translateY(10px) → 0`, `400ms`)
- **AnimatePresence**: Used in FeedPage for post list transitions

### Loading
- **Skeleton shimmer**: `1.6s` animation loop
- **Route loading**: `StatePanel` with "Đang tải..." message inside `<Suspense>`

### Reduced Motion
- **`@media (prefers-reduced-motion: reduce)`**: Kills all animation/transition durations to `0.01ms`, disables smooth scroll

### Icon Interactivity (`.interactive-icon`)
- **Hover**: `scale(1.15)` over `200ms` with spring cubic-bezier
- **Active**: `scale(0.92)`

## 7. Anti-Patterns (Banned)

- **No shadcn/ui** — project uses raw Tailwind + CSS custom properties
- **No emojis in UI text** — use Phosphor Icons exclusively
- **No radial/conic gradients** — backgrounds use soft `blur-3xl` blobs, not hard gradient fills
- **No `h-screen`** — uses `min-h-[100dvh]` for full-height sections
- **No barrel index files** — direct imports from component files
- **No inline `font-bold`** — use `font-semibold` (600) as max weight
- **No `box-shadow` without CSS variable** — all shadows reference `--app-shadow*`
- **No `border-radius` overrides** — use `rounded-lg` (8px), `rounded-xl` (12px), or `rounded-2xl` (16px)

## 8. Code Conventions

### CSS
- **Utility-first**: Tailwind classes for >90% of styling
- **Custom classes**: `.surface-card`, `.glass-panel`, `.btn-tactile`, `.spring-ease` for repeatable patterns
- **Tailwind config**: Colors aliased as `primary`, `surface`, `border`, `text`, `app-*`

### React Patterns
- **Components**: `const ComponentName: React.FC<Props> = ({...}) =>` with default export
- **Lazy loading**: `React.lazy(() => import('./...'))` wrapped in `<Suspense>`
- **Error boundary**: `ErrorBoundary` class component wrapping `<Routes>`
- **State management**: `useState` / `useReducer` for local UI, `AuthContext` for auth, no global store
- **API calls**: Service layer (`services/*.service.ts`) using raw `fetch` or Axios wrappers
- **Notifications**: `react-hot-toast` for toasts, not MUI Snackbar
- **Modal open/close**: `useState` boolean, `Escape` key handling in `useEffect`

### Accessibility
- **Skip link**: "Chuyển tới nội dung chính" in AppShell
- **aria-modal**: `"true"` on dialog sections
- **aria-labelledby**: Dialog title ID
- **aria-invalid**: On input validation error
- **aria-live**: "polite" on error messages
- **focus-visible**: Every interactive element has visible focus ring
- **prefers-reduced-motion**: Global animation kill switch

## 9. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| **Mobile** | < 768px (`sm`) | Bottom nav, top header, full-width content with `px-4` |
| **Tablet** | 768px–1024px (`md`) | Same as mobile, slightly wider padding |
| **Desktop** | > 1024px (`lg`) | Left sidebar appears, bottom nav hidden, max-width container |
| **Wide** | > 1280px (`xl`) | Sidebar expands to `244px` with labels, optional right aside (320px) |

## 10. Accessibility Targets

- **Focus**: Visible `outline-2` + `outline-offset-2` in primary color on all interactive elements
- **Touch targets**: Minimum `44x44px` for bottom nav items (current: `56x56px`)
- **Color contrast**: `--app-muted (#737373)` on `--app-bg (#F0F2F5)` = ~4.6:1 (meets WCAG AA for normal text)
- **Dark mode contrast**: `--app-muted (#8E8E93)` on `--app-bg (#0C1014)` = ~6.2:1
- **Form labels**: Explicit `<label htmlFor>` for every input
- **Skip navigation**: Screen-reader-only skip link at page start
- **Alt text**: All images have descriptive `alt` attributes (name/username for avatars)
