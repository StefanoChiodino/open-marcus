# Validation Contract: Comprehensive E2E Testing

This contract defines behavioral assertions for comprehensive e2e testing of OpenMarcus. The goal is bombproof coverage that catches any regression before it reaches production.

## Area: Authentication

### VAL-AUTH-001: Login with valid credentials redirects to home
A user with valid username and password submits the login form and is redirected to the home page with their profile greeting.
Tool: agent-browser
Evidence: screenshot, network(POST /api/auth/login -> 200), URL changes to /

### VAL-AUTH-002: Login with invalid password shows error
A user with valid username but wrong password sees an error message without page crash.
Tool: agent-browser
Evidence: screenshot showing error alert, no console errors

### VAL-AUTH-003: Login with non-existent username shows error
A user with non-existent username sees an error message.
Tool: agent-browser
Evidence: screenshot showing error alert

### VAL-AUTH-004: Registration creates account and redirects
A new user submits valid registration form and is redirected to home/onboarding.
Tool: agent-browser
Evidence: screenshot, network(POST /api/auth/register -> 201)

### VAL-AUTH-005: Registration with duplicate username shows error
A user tries to register with an existing username and sees an error.
Tool: agent-browser
Evidence: screenshot showing error alert

### VAL-AUTH-006: Password guidance updates in real-time
As user types password, the guidance checkmarks update immediately.
Tool: agent-browser
Evidence: screenshot at each keystroke showing checkmark state change

### VAL-AUTH-007: Logout clears auth and redirects to login
A logged-in user clicks logout, auth token is cleared, user is redirected to login page.
Tool: agent-browser
Evidence: screenshot, localStorage cleared, URL shows /login

### VAL-AUTH-008: Logout clears all local state
After logout, localStorage does not contain any user data (token, profile, session).
Tool: agent-browser, evaluate localStorage
Evidence: localStorage keys verified empty after logout

### VAL-AUTH-009: Session persists after page reload
A logged-in user reloads the page and remains logged in (token valid, profile loaded).
Tool: agent-browser
Evidence: screenshot, user stays on same page without login prompt

### VAL-AUTH-010: Expired/invalid token redirects to login
When auth token becomes invalid, user is redirected to login with appropriate message.
Tool: agent-browser
Evidence: screenshot showing redirect to /login

## Area: Onboarding

### VAL-ONBOARD-001: New user sees onboarding form
A newly registered user without profile sees the ProfileForm.
Tool: agent-browser
Evidence: screenshot showing Name input and Begin Journey button

### VAL-ONBOARD-002: Onboarding with empty name shows validation error
User tries to submit onboarding with empty name and sees validation error.
Tool: agent-browser
Evidence: screenshot showing validation error message

### VAL-ONBOARD-003: Onboarding with very long name handles gracefully
User enters a very long name (500+ chars) and form handles it without crash.
Tool: agent-browser
Evidence: screenshot showing form still functional, truncation or scroll

### VAL-ONBOARD-004: Onboarding with special characters in name works
User enters special characters (<>&"' etc) in name and bio, data persists correctly.
Tool: agent-browser
Evidence: screenshot, data verified via profile page and API

### VAL-ONBOARD-005: Onboarding navigates to home on success
After submitting valid onboarding form, user sees home page with personalized greeting.
Tool: agent-browser
Evidence: screenshot showing Welcome, {name} greeting

### VAL-ONBOARD-006: Returning user skips onboarding
A user who already has a profile logs in and goes directly to home (no onboarding).
Tool: agent-browser
Evidence: screenshot showing home page, not onboarding form

## Area: Profile

### VAL-PROFILE-001: Profile page displays name and bio
Profile page shows the user's name and bio from creation.
Tool: agent-browser
Evidence: screenshot showing name and bio text

### VAL-PROFILE-002: Edit profile shows pre-filled form
Clicking "Edit Profile" shows form with current name and bio pre-filled.
Tool: agent-browser
Evidence: screenshot showing input values match existing profile

### VAL-PROFILE-003: Edit with empty name shows validation error
User clears name field and tries to save, sees validation error.
Tool: agent-browser
Evidence: screenshot showing validation error

### VAL-PROFILE-004: Cancel edit returns to display mode
Clicking Cancel returns to profile display without saving changes.
Tool: agent-browser
Evidence: screenshot showing original values unchanged

### VAL-PROFILE-005: Save edit persists changes
After editing and saving, new name/bio appear on profile page and persist after reload.
Tool: agent-browser
Evidence: screenshot, reload page, verify data still correct

### VAL-PROFILE-006: Profile changes reflect on home page greeting
After editing profile name, home page greeting shows new name immediately.
Tool: agent-browser
Evidence: screenshot showing updated greeting without page reload

### VAL-PROFILE-007: Profile persists across logout/login cycle
After logout and re-login with same credentials, profile data is intact.
Tool: agent-browser
Evidence: screenshot showing same profile before logout and after re-login

## Area: Navigation

### VAL-NAV-001: All sidebar links navigate to correct pages
Each sidebar navigation link (Home, Meditation, History, Profile, Settings) navigates to its corresponding page.
Tool: agent-browser
Evidence: screenshot of each page showing correct content

### VAL-NAV-002: Active page is highlighted in sidebar
The current page's nav item has active styling, and only one item is active.
Tool: agent-browser
Evidence: screenshot showing exactly one active nav item per page

### VAL-NAV-003: Navigation works on mobile bottom nav
At mobile viewport, bottom nav links work correctly.
Tool: agent-browser
Evidence: screenshot at 375px showing navigation works

### VAL-NAV-004: Page content matches URL
After navigation, the page content matches the URL (no content bleeding).
Tool: agent-browser
Evidence: screenshot showing correct content for each URL

### VAL-NAV-005: Sidebar is fixed/sticky on scroll
Sidebar remains visible and fixed while main content scrolls.
Tool: agent-browser
Evidence: screenshot during scroll showing sidebar still visible

## Area: Home Page

### VAL-HOME-001: Home page shows personalized greeting
Home page displays "Welcome, {name}" with user's actual name.
Tool: agent-browser
Evidence: screenshot showing correct name in greeting

### VAL-HOME-002: Begin Meditation button navigates to session
Clicking "Begin Meditation" navigates to /session page.
Tool: agent-browser
Evidence: screenshot, URL shows /session

### VAL-HOME-003: Begin Meditation starts session directly
Clicking "Begin Meditation" on home page starts the meditation session immediately (not just navigation).
Tool: agent-browser
Evidence: screenshot showing active session with Marcus greeting, not idle state

### VAL-HOME-004: Bio is displayed on home page
If user has a bio, it is displayed on the home page.
Tool: agent-browser
Evidence: screenshot showing bio text

## Area: Session - Core Flow

### VAL-SESSION-001: Session page shows idle state
Navigating to /session shows idle state with Marcus icon and Begin Meditation button.
Tool: agent-browser
Evidence: screenshot showing idle session UI

### VAL-SESSION-002: Begin Meditation starts active session
Clicking "Begin Meditation" shows active session with Marcus greeting.
Tool: agent-browser
Evidence: screenshot showing "I am Marcus" greeting

### VAL-SESSION-003: Send message displays user message in chat
User types and sends a message, message appears in chat log.
Tool: agent-browser
Evidence: screenshot showing message in chat

### VAL-SESSION-004: Marcus responds to message
After user sends message, Marcus's response appears in chat (may take time).
Tool: agent-browser
Evidence: screenshot showing Marcus's response text

### VAL-SESSION-005: End session shows summary
Clicking "End Session" shows session summary with Marcus's reflection.
Tool: agent-browser
Evidence: screenshot showing Session Complete heading and reflection

### VAL-SESSION-006: Begin New Meditation resets to idle state
After session summary, clicking "Begin New Meditation" returns to idle state.
Tool: agent-browser
Evidence: screenshot showing idle state again

### VAL-SESSION-007: Session appears in history after completion
After ending session, navigating to History shows the new session.
Tool: agent-browser
Evidence: screenshot showing session in history list

### VAL-SESSION-008: Loading indicator shows during Marcus response
While waiting for Marcus's response, a loading indicator is visible.
Tool: agent-browser
Evidence: screenshot showing loading indicator

### VAL-SESSION-009: Session state persists after page reload
Reloading the page during an active session restores the session state.
Tool: agent-browser
Evidence: screenshot showing same session state after reload

### VAL-SESSION-010: Session with no messages still saves
Ending a session without sending any messages still saves the session.
Tool: agent-browser
Evidence: screenshot, session appears in history

## Area: Session - Voice

### VAL-SESSION-VOICE-001: Voice controls visible in active session
Voice control toolbar (mic, speaker buttons) is visible in active session.
Tool: agent-browser
Evidence: screenshot showing voice controls

### VAL-SESSION-VOICE-002: TTS toggle button toggles TTS on/off
Clicking the speaker button toggles TTS enabled state.
Tool: agent-browser
Evidence: screenshot showing button state change

### VAL-SESSION-VOICE-003: TTS uses saved voice settings
When TTS plays Marcus's response, it uses the voice settings from profile.
Tool: agent-browser
Evidence: audio playback uses configured voice

### VAL-SESSION-VOICE-004: STT microphone shows error when server down
Clicking mic when STT server is not running shows actionable error message.
Tool: agent-browser
Evidence: screenshot showing error with start command

### VAL-SESSION-VOICE-005: Voice playback indicator visible
When Marcus's response is being spoken, a visual indicator shows this.
Tool: agent-browser
Evidence: screenshot showing speaker animation/icon

## Area: History

### VAL-HIST-001: Empty history shows empty state
When no sessions exist, history page shows "No Meditations Yet" message.
Tool: agent-browser
Evidence: screenshot showing empty state

### VAL-HIST-002: History list shows past sessions
When sessions exist, history shows list with session previews.
Tool: agent-browser
Evidence: screenshot showing session items

### VAL-HIST-003: Click session navigates to detail
Clicking a session in history navigates to session detail page.
Tool: agent-browser
Evidence: screenshot showing session detail, URL shows /history/{id}

### VAL-HIST-004: Session detail shows conversation
Session detail page shows the full conversation from that session.
Tool: agent-browser
Evidence: screenshot showing user message and Marcus's response

### VAL-HIST-005: Session detail shows summary
Session detail shows Marcus's reflection and commitments if generated.
Tool: agent-browser
Evidence: screenshot showing reflection section

### VAL-HIST-006: Back to History navigates correctly
Clicking "Back to History" returns to history list page.
Tool: agent-browser
Evidence: screenshot showing history list

### VAL-HIST-007: Invalid session ID shows error
Navigating to /history/invalid-id shows "Session not found" error.
Tool: agent-browser
Evidence: screenshot showing error message

### VAL-HIST-008: Direct URL access to session works
Navigating directly to /history/{sessionId} for valid session shows detail.
Tool: agent-browser
Evidence: screenshot showing session detail

### VAL-HIST-009: History shows session date and duration
Each session in history shows its date and duration.
Tool: agent-browser
Evidence: screenshot showing date/duration text

## Area: Settings - Data Management

### VAL-SETTINGS-001: Settings page loads correctly
Settings page shows all sections: Export, Import, Clear Data.
Tool: agent-browser
Evidence: screenshot showing all sections

### VAL-SETTINGS-002: Export downloads valid JSON file
Clicking Export downloads a JSON file with all user data.
Tool: agent-browser
Evidence: download triggered, file has .json extension, valid JSON structure

### VAL-SETTINGS-003: Export filename includes date
Exported filename includes the current date (e.g., openmarcus-export-2024-01-15.json).
Tool: agent-browser
Evidence: screenshot showing filename with date

### VAL-SETTINGS-004: Import with valid file succeeds
Importing a valid export JSON file restores all data.
Tool: agent-browser
Evidence: screenshot showing success toast, data restored

### VAL-SETTINGS-005: Import with invalid file shows error
Importing an invalid JSON file shows an error message.
Tool: agent-browser
Evidence: screenshot showing error toast

### VAL-SETTINGS-006: Clear Data requires confirmation
Clicking Clear Data shows a confirmation dialog.
Tool: agent-browser
Evidence: screenshot showing confirmation modal

### VAL-SETTINGS-007: Clear Data cancels does not clear
Clicking Cancel in confirmation dialog does not clear data.
Tool: agent-browser
Evidence: screenshot showing data still present

### VAL-SETTINGS-008: Clear Data confirm clears all data
Confirming clear data deletes all profiles, sessions, messages.
Tool: agent-browser
Evidence: screenshot showing redirected to onboarding, data gone

### VAL-SETTINGS-009: Data persists after logout/login
All user data (profile, sessions) persists correctly through logout/login cycle.
Tool: agent-browser
Evidence: screenshot showing same data before and after

## Area: Settings - TTS

### VAL-SETTINGS-TTS-001: TTS section shows voice dropdown
TTS settings shows a dropdown with 6 voice options.
Tool: agent-browser
Evidence: screenshot showing dropdown with voices

### VAL-SETTINGS-TTS-002: TTS section shows rate slider
TTS settings shows a rate slider with current value displayed.
Tool: agent-browser
Evidence: screenshot showing slider

### VAL-SETTINGS-TTS-003: TTS section shows pitch slider
TTS settings shows a pitch slider with current value displayed.
Tool: agent-browser
Evidence: screenshot showing slider

### VAL-SETTINGS-TTS-004: Changing TTS settings saves immediately
Changing any TTS setting triggers an API save.
Tool: agent-browser
Evidence: network(PUT /api/settings -> 200)

### VAL-SETTINGS-TTS-005: TTS settings persist after reload
After changing TTS settings and reloading page, settings are preserved.
Tool: agent-browser
Evidence: screenshot showing same values after reload

### VAL-SETTINGS-TTS-006: TTS voice applies in session
The TTS voice setting is used when Marcus speaks in session.
Tool: agent-browser
Evidence: audio playback matches selected voice

## Area: Settings - STT

### VAL-SETTINGS-STT-001: STT section shows model dropdown
STT settings shows a dropdown listing available Whisper models.
Tool: agent-browser
Evidence: screenshot showing model dropdown

### VAL-SETTINGS-STT-002: Model size shown in dropdown
Each model in dropdown shows its disk/memory size.
Tool: agent-browser
Evidence: screenshot showing size text

### VAL-SETTINGS-STT-003: Reload Model button triggers reload
Clicking Reload Model triggers the model reload API call.
Tool: agent-browser, curl
Evidence: network(POST /api/settings/stt-reload -> 200)

### VAL-SETTINGS-STT-004: Reload shows loading indicator
During model reload, a loading indicator is displayed.
Tool: agent-browser
Evidence: screenshot showing spinner or loading text

### VAL-SETTINGS-STT-005: Reload error shows message
If reload fails, an error message is displayed.
Tool: agent-browser
Evidence: screenshot showing error toast

## Area: Settings - Model Selection

### VAL-SETTINGS-MODEL-001: Model dropdown shows available models
Settings shows a dropdown with available Ollama models.
Tool: agent-browser
Evidence: screenshot showing model options

### VAL-SETTINGS-MODEL-002: Current model is selected
The currently active model is shown as selected in dropdown.
Tool: agent-browser
Evidence: screenshot showing selected value

### VAL-SETTINGS-MODEL-003: Changing model saves
Selecting a different model saves the preference.
Tool: agent-browser
Evidence: network(PUT /api/settings -> 200)

### VAL-SETTINGS-MODEL-004: Model selection persists after reload
After changing model and reloading, the new model is still selected.
Tool: agent-browser
Evidence: screenshot showing new model selected

### VAL-SETTINGS-MODEL-005: System RAM info displayed
Settings shows system RAM information for model recommendations.
Tool: agent-browser
Evidence: screenshot showing RAM info

## Area: Toast Notifications

### VAL-TOAST-001: Success toast appears on successful actions
After successful save/export/etc, success toast appears.
Tool: agent-browser
Evidence: screenshot showing success toast

### VAL-TOAST-002: Error toast appears on failures
After failed action, error toast appears with message.
Tool: agent-browser
Evidence: screenshot showing error toast

### VAL-TOAST-003: Toast auto-dismisses after delay
Toasts disappear after a few seconds automatically.
Tool: agent-browser
Evidence: screenshot sequence showing toast then disappearing

### VAL-TOAST-004: Toast can be manually dismissed
Clicking dismiss button removes toast immediately.
Tool: agent-browser
Evidence: screenshot showing toast gone after dismiss click

## Area: Error Handling

### VAL-ERROR-001: Network error shows user-friendly message
When network request fails, user sees a friendly error message (not raw error).
Tool: agent-browser
Evidence: screenshot showing error message

### VAL-ERROR-002: API 500 error handled gracefully
When server returns 500, app doesn't crash and shows error UI.
Tool: agent-browser
Evidence: screenshot showing error state, no blank page

### VAL-ERROR-003: Timeout error handled gracefully
When request times out, user sees timeout message and can retry.
Tool: agent-browser
Evidence: screenshot showing timeout message

### VAL-ERROR-004: Offline state detected and shown
When device goes offline, app detects and shows offline indicator.
Tool: agent-browser
Evidence: screenshot showing offline message

## Area: Protected Routes

### VAL-PROTECT-001: /session redirects unauthenticated to /login
Direct navigation to /session without auth redirects to login.
Tool: agent-browser
Evidence: URL shows /login

### VAL-PROTECT-002: /history redirects unauthenticated to /login
Direct navigation to /history without auth redirects to login.
Tool: agent-browser
Evidence: URL shows /login

### VAL-PROTECT-003: /profile redirects unauthenticated to /login
Direct navigation to /profile without auth redirects to login.
Tool: agent-browser
Evidence: URL shows /login

### VAL-PROTECT-004: /settings redirects unauthenticated to /login
Direct navigation to /settings without auth redirects to login.
Tool: agent-browser
Evidence: URL shows /login

### VAL-PROTECT-005: Authenticated /login redirects to home
Authenticated user visiting /login is redirected to home.
Tool: agent-browser
Evidence: URL shows /

### VAL-PROTECT-006: Authenticated /register redirects to home
Authenticated user visiting /register is redirected to home.
Tool: agent-browser
Evidence: URL shows /

## Area: Responsive Design

### VAL-RESP-001: Home page works at desktop (1280px)
Home page renders correctly with full sidebar and content.
Tool: agent-browser
Evidence: screenshot at 1280px

### VAL-RESP-002: Home page works at tablet (768px)
Home page renders correctly at tablet width.
Tool: agent-browser
Evidence: screenshot at 768px

### VAL-RESP-003: Home page works at mobile (375px)
Home page renders correctly at mobile width with bottom nav.
Tool: agent-browser
Evidence: screenshot at 375px

### VAL-RESP-004: Session page works at mobile
Session page is usable at mobile with proper scrolling and input.
Tool: agent-browser
Evidence: screenshot at 375px

### VAL-RESP-005: History page works at mobile
History page shows list correctly at mobile.
Tool: agent-browser
Evidence: screenshot at 375px

### VAL-RESP-006: Settings page works at mobile
Settings page is scrollable and usable at mobile.
Tool: agent-browser
Evidence: screenshot at 375px

### VAL-RESP-007: Bottom nav covers no content on mobile
Mobile bottom nav is fixed at bottom, content scrolls above it.
Tool: agent-browser
Evidence: screenshot showing content visible above nav

## Area: Cross-Area Flows

### VAL-CROSS-001: Complete registration → onboarding → session → history flow
A new user registers, completes onboarding, starts session, ends session, views history.
Tool: agent-browser
Evidence: screenshot sequence showing each step

### VAL-CROSS-002: Edit profile → verify on home → session → history shows updated name
Editing profile name updates home greeting, and session/history reflect new name.
Tool: agent-browser
Evidence: screenshot sequence showing name propagation

### VAL-CROSS-003: Settings change → verify in session
Changing TTS/STT settings in settings page affects session behavior.
Tool: agent-browser
Evidence: screenshot showing settings applied in session

### VAL-CROSS-004: Multiple sessions accumulate in history
Creating multiple sessions results in all appearing in history.
Tool: agent-browser
Evidence: screenshot showing multiple sessions in list

### VAL-CROSS-005: Clear data → creates fresh state
Clearing all data returns app to initial state (no profile, no sessions).
Tool: agent-browser
Evidence: screenshot showing onboarding screen

### VAL-CROSS-006: Import → restore all data
Importing valid export JSON restores all profiles and sessions.
Tool: agent-browser
Evidence: screenshot showing restored data

## Area: Concurrent/Multi-Session

### VAL-CONCURRENT-001: Two tabs with different sessions are isolated
Opening app in two tabs, creating session in tab 1, tab 2 shows different state.
Tool: agent-browser
Evidence: screenshots from both tabs

### VAL-CONCURRENT-002: Logout in one tab logs out both
Logging out in tab 1 causes tab 2 to redirect to login.
Tool: agent-browser
Evidence: screenshot showing tab 2 redirect

## Area: Performance/Loading

### VAL-PERF-001: Page loads within reasonable time
Each page load completes within 5 seconds on local network.
Tool: agent-browser
Evidence: network timing data

### VAL-PERF-002: No console errors during normal usage
Using the app normally produces no console errors.
Tool: agent-browser
Evidence: console cleared of errors

### VAL-PERF-003: Session start is responsive
Clicking Begin Meditation shows active session within 2 seconds.
Tool: agent-browser
Evidence: timing measurement

## Area: Accessibility

### VAL-A11Y-001: All interactive elements are keyboard accessible
Tabbing through page reaches all buttons and inputs.
Tool: agent-browser
Evidence: keyboard navigation works

### VAL-A11Y-002: Focus states are visible
Focused elements have visible focus indicator.
Tool: agent-browser
Evidence: screenshot showing focus styles

### VAL-A11Y-003: Form inputs have labels
All form inputs have associated labels for screen readers.
Tool: agent-browser
Evidence: accessibility audit

### VAL-A11Y-004: Color contrast meets WCAG AA
Text contrast ratios meet minimum requirements.
Tool: agent-browser
Evidence: contrast check passes
