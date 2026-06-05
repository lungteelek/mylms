# Design

## Visual System

### Theme

Dark, premium, high-contrast product UI with a cool blue-violet core and warm amber accents for highlights. The surface feels like a serious SaaS dashboard, not a marketing site.

### Color

- Background: deep navy gradients built from `#07111f`, `#091829`, and `#0b172b`
- Surface: translucent dark panels around `rgba(10, 20, 38, 0.82)` and `rgba(12, 22, 41, 0.84)`
- Primary accent: cyan `#5ad3ff` / `#5dd7ff`
- Secondary accent: violet `#8c7dff` / `#9b85ff`
- Warm accent: amber `#ffb86b` / `#ffc56f`
- Semantic states: success `#35d39f` / `#36d39f`, warning `#f7c84b`, danger `#ff6b8a`
- Text: near-white `#eef5ff`
- Muted text: blue-gray `#9db1cf` / `#9db1d1`

Use accents sparingly on active states, chips, progress, and emphasis. Inactive UI should stay restrained.

### Typography

- Primary family: `Inter`
- Secondary Thai support: `Noto Sans Thai`
- Legacy marketing/hero page: `Noto Serif Thai` and `Space Mono` still exist in the older course landing surface, but the current product UI uses a single sans stack for labels, data, and body
- Heading rhythm: bold, compact, tightly controlled, with strong scale jumps between title, section, and body

### Layout

- Desktop-first app shell
- Wide top bar with right-aligned actions
- Three-column dashboard structure for admin, with sidebar, workspace, and insights
- Student view uses a two-column learning layout, with a large player on the left and tutor/planner panels on the right
- Dense but breathable spacing, tuned for long working sessions
- Cards are the main container pattern, but large panels and tabbed subviews are preferred over nested micro-cards when possible

### Components

- Top bar with brand mark, title, and quick actions
- Gradient primary button and restrained ghost button
- Pills / chips for live status, AI assist, and playback speed
- Hierarchical lesson tree with indentation for nested nodes
- Metrics tiles for high-level numbers
- Workspace tabs for admin: builder, students, finance
- Video player stage with overlay controls
- Transcript rows that behave like seek targets
- Planner cards and AI chat bubbles on the student page

### Motion

- Motion is short and state-based, around 150–250 ms
- Hover lift is subtle
- Interactive controls should show clear active states
- Reduced motion is supported and should disable decorative animation

### Responsiveness

- Desktop is the primary canvas
- Large monitors should not feel empty, so containers expand up to 1680px to 1820px
- Breakpoints collapse the 3-column admin layout and 2-column student layout down to single-column stacks on smaller screens
- Touch targets remain generous for tablet and mobile

### Accessibility

- Focus-visible outlines are present for buttons, tabs, links, and transcript/file actions
- Text contrast stays high on dark surfaces
- Reduce motion preference disables animation and transition behavior

## Components In Practice

### Admin Surface

The admin page should feel like a control room:

- course structure is easy to scan
- student status and renewal signals are visible at a glance
- finance data stays compact and readable
- workspace tabs let the user switch context without losing the current page

### Student Surface

The student page should feel like a focused learning environment:

- video player is the center of attention
- speed controls and transcript seeking are one click away
- lesson files are secondary, but always visible
- AI tutor and study planner sit beside the player as support tools

## Identity Notes

The visual identity is not decorative-first. It is a product-first dark system with sharp hierarchy, cool neon energy, and enough warmth in the accent layer to keep the UI from feeling sterile.
