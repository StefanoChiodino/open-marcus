# UI Fix Mission - Validation Contract

## Area: Layout (CRITICAL)

### VAL-LAYOUT-CRIT-001: Footer renders at bottom of page, not as full-height banner
The LegalDisclaimer footer renders at the BOTTOM of the page below all content. It does NOT span the full viewport width as a banner at the top. The footer should be a normal page footer, not a full-height flex item. At 1280px, footer should be at bottom with its natural content height (~50px).
Tool: agent-browser
Evidence: screenshot at 1280px, footer at viewport bottom, not spanning full height

### VAL-LAYOUT-CRIT-002: Main content fills available width on desktop
On desktop (1280px), the main content area fills the available space between the sidebar (240px) and the right edge of the viewport. It does NOT collapse to a narrow column. Content should use the full available width with comfortable margins.
Tool: agent-browser
Evidence: screenshot at 1280px, measure main content width vs available space

### VAL-LAYOUT-CRIT-003: Layout structure correct at all breakpoints
At 1280px, 768px, and 375px, the layout has: sidebar (or bottom nav) + main content + footer at bottom. The footer is NOT positioned at the top or as a full-height banner.
Tool: agent-browser
Evidence: screenshots at 1280px, 768px, 375px

## Area: Home Page

### VAL-HOME-001: Home page renders correct content
Home page at `/` shows the welcome card with "Welcome, {name}" greeting, the OpenMarcus tagline, and a "Begin Meditation" button. No duplicate branding (OpenMarcus should appear at most twice: sidebar + welcome card h2).
Tool: agent-browser
Evidence: screenshot, snapshot of DOM content

### VAL-HOME-002: Desktop layout uses available viewport space
At 1280px+, the welcome card should be centered with comfortable margins, not crammed into a narrow column. The content should feel balanced on the page, not like mobile content stretched to desktop.
Tool: agent-browser
Evidence: screenshot at 1280px width, measure content width vs viewport width

### VAL-HOME-003: Legal disclaimer appears at most twice
Home page shows the legal disclaimer no more than 2 times (once in the footer, optionally once in the welcome card). The header/brand area should NOT duplicate the disclaimer.
Tool: agent-browser
Evidence: screenshot, count disclaimer occurrences

### VAL-HOME-004: Begin Meditation flow is clear
The "Begin Meditation" button on the home page either: (a) starts the meditation session directly, OR (b) navigates to /session where the session immediately begins. The user should NOT have to click "Begin Meditation" twice in sequence.
Tool: agent-browser
Evidence: screenshot, click "Begin Meditation" and verify session starts without needing another click

## Area: Session Page

### VAL-SESSION-001: Session page renders meditation chat UI
Navigating to `/session` shows the meditation chat interface: Marcus greeting message, message input area, Begin Meditation button (if session not started). NOT the home page welcome card content.
Tool: agent-browser
Evidence: screenshot, snapshot shows "I am Marcus" greeting OR Begin Meditation button with Marcus icon

### VAL-SESSION-002: Session page navigation active state correct
When on `/session`, the "Meditation" nav item is highlighted as active. No other nav items should be simultaneously active.
Tool: agent-browser
Evidence: screenshot, only Meditation link has active class/style

## Area: History Page

### VAL-HIST-001: History page renders session list
Navigating to `/history` shows the session history list with "Past Meditations" heading. NOT settings content.
Tool: agent-browser
Evidence: snapshot shows "Past Meditations" heading OR session list items

### VAL-HIST-002: History page mobile layout correct
At 375px mobile viewport, the history page shows session history content (not settings). Bottom navigation visible at bottom of viewport, not covering content.
Tool: agent-browser
Evidence: screenshot at 375px, full page scroll

## Area: Profile Page

### VAL-PROF-001: Profile page renders profile content
Navigating to `/profile` shows profile information (name, bio) and Edit/Reset buttons. NOT settings content or empty page.
Tool: agent-browser
Evidence: snapshot shows profile name OR Edit Profile button visible

### VAL-PROF-002: Profile page mobile layout correct
At 375px mobile viewport, the profile page content is visible and not empty. Bottom nav at bottom of viewport.
Tool: agent-browser
Evidence: screenshot at 375px, profile content visible

## Area: Settings Page

### VAL-SETTINGS-001: Settings page renders settings content
Navigating to `/settings` shows the Settings page with model selection, data export/import, and delete options. NOT history or profile content.
Tool: agent-browser
Evidence: snapshot shows "Active Model" combobox OR "Download JSON Export" button

### VAL-SETTINGS-002: Settings page mobile navigation correct
At 375px on `/settings`, clicking History nav should NOT show settings content. Each page's content is independent.
Tool: agent-browser
Evidence: navigate to settings at 375px, click History nav, verify history content shows

## Area: Navigation

### VAL-NAV-001: Mobile bottom nav at viewport bottom
At 375px, the mobile bottom navigation bar is fixed to the bottom of the viewport and does NOT float over or cover main content. Content scrolls above the nav.
Tool: agent-browser
Evidence: screenshot at 375px, measure nav position relative to viewport bottom

### VAL-NAV-002: Nav active state single item only
On any page, exactly ONE nav item is highlighted as active. Never two simultaneously.
Tool: agent-browser
Evidence: screenshot on each page at desktop, count active nav items

### VAL-NAV-003: Nav labels visible at desktop
At 1280px desktop viewport, nav items show BOTH icons AND text labels. Labels are readable and not truncated.
Tool: agent-browser
Evidence: screenshot at 1280px, nav shows "Home", "Meditation", etc.

### VAL-NAV-004: Nav labels at tablet
At 768px-1199px tablet width, nav labels are visible and readable (not truncated to empty). At 1024px-1199px, sidebar is wider and labels fit properly.
Tool: agent-browser
Evidence: screenshots at 768px, 900px, 1024px, 1100px

## Area: Layout & Responsiveness

### VAL-LAYOUT-001: Session page full-width content
On `/session` at desktop, the meditation chat interface fills available width properly. No duplicate home page elements visible.
Tool: agent-browser
Evidence: screenshot at 1280px, chat UI fills main area

### VAL-LAYOUT-002: All pages content fits viewport
On all pages at all breakpoints (375px, 768px, 1280px), content fits within the viewport without horizontal overflow or clipping.
Tool: agent-browser
Evidence: screenshots at each breakpoint, no horizontal scrollbar visible

### VAL-LAYOUT-003: Onboarding page mobile-friendly
At 375px, the onboarding form is usable: inputs are full-width, labels visible, submit button reachable.
Tool: agent-browser
Evidence: screenshot at 375px, form inputs readable

## Area: Voice Controls

### VAL-VOICE-001: Voice input error message is actionable
When clicking the microphone and the STT server is not running, the error message clearly states what went wrong AND how to fix it. E.g., "STT server is not running. To start it: cd servers/stt && node server.mjs"
Tool: agent-browser
Evidence: Click mic button without STT server, verify error message

### VAL-VOICE-002: Voice output icon state is visually clear
The speaker button clearly shows its enabled/disabled state. When disabled: grey speaker icon. When enabled: colored/highlighted speaker icon. When speaking: animated speaker icon. The states are visually distinct and intuitive.
Tool: agent-browser
Evidence: Toggle voice output button, screenshot each state

## Area: Visual Polish

### VAL-POLISH-001: Button styles consistent
Primary action buttons ("Begin Meditation") and secondary buttons ("Edit Profile") use consistent styling from the same design system. No jarring contrast differences.
Tool: agent-browser
Evidence: screenshots, visual comparison of button styles

### VAL-POLISH-002: Text hierarchy clear
On home page, page-level heading and card heading have distinct visual hierarchy. Users know where to look first.
Tool: agent-browser
Evidence: screenshot, visual hierarchy clear

## Cross-Area Flows

### VAL-CROSS-001: Navigation to all pages works
Starting from home, navigate to: Session → History → Profile → Settings. Each page loads its own content without showing another page's content.
Tool: agent-browser
Evidence: screenshots of each page, verify content matches URL

### VAL-CROSS-002: Mobile navigation to all pages works
At 375px, navigate to each page via bottom nav. Each page shows correct content. No content bleeding between pages.
Tool: agent-browser
Evidence: screenshots at 375px for each page

### VAL-CROSS-003: Tablet navigation to all pages works
At 768px, navigate to each page. Nav labels visible, content correct, no layout breaks.
Tool: agent-browser
Evidence: screenshots at 768px for each page
