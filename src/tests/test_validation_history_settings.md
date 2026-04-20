# Validation Assertions: History, Session Detail, and Settings Pages

This document contains validation contract assertions for the three pages in OpenMarcus.

---

## History Page (`/history`)

### VAL-HISTORY-001: Page Structure
- **VAL-HISTORY-001-001**: Header contains back arrow IconButton with `icon=ft.Icons.ARROW_BACK`
- **VAL-HISTORY-001-002**: Header contains "Session History" title Text with `size=18` and `weight=ft.FontWeight.BOLD`
- **VAL-HISTORY-001-003**: Header row contains IconButton and Text in a Row layout
- **VAL-HISTORY-001-004**: View route is `/history`

### VAL-HISTORY-002: Session Count Display
- **VAL-HISTORY-002-001**: Sessions count text displays dynamically (e.g., "5 sessions with Marcus Aurelius")
- **VAL-HISTORY-002-002**: Sessions count text uses `ft.Text` with `size=14` and `color=ft.Colors.GREY_600`

### VAL-HISTORY-003: Session List Display
- **VAL-HISTORY-003-001**: Sessions are displayed in a `ft.ListView` container
- **VAL-HISTORY-003-002**: Each session is wrapped in an `ft.Card` component
- **VAL-HISTORY-003-003**: Empty state shows "No sessions yet. Start your first meditation!" text
- **VAL-HISTORY-003-004**: Empty state text is `italic=True` and centered with `ft.alignment.center`

### VAL-HISTORY-004: Session Card Content
- **VAL-HISTORY-004-001**: State badge shows "Completed" with `bgcolor=ft.Colors.GREEN` for concluded sessions
- **VAL-HISTORY-004-002**: State badge shows "Active" with `bgcolor=ft.Colors.BLUE` for active sessions
- **VAL-HISTORY-004-003**: State badge shows "Intro" with `bgcolor=ft.Colors.ORANGE` for intro state
- **VAL-HISTORY-004-004**: State badge is a Container with `border_radius=8` and white text
- **VAL-HISTORY-004-005**: Session title displays as "Session from [date]" format
- **VAL-HISTORY-004-006**: Duration row contains SCHEDULE icon + duration text
- **VAL-HISTORY-004-007**: Date row contains CALENDAR_TODAY icon + date text
- **VAL-HISTORY-004-008**: Summary preview has `max_lines=2` with ellipsis overflow
- **VAL-HISTORY-004-009**: "View Details →" link is a Text with `color=ft.Colors.DEEP_PURPLE` and `weight=ft.FontWeight.BOLD`

### VAL-HISTORY-005: Card Interactions
- **VAL-HISTORY-005-001**: Card has `on_click` handler that calls `view_session(session)`
- **VAL-HISTORY-005-002**: "View Details" text Container has `on_click` that calls `view_session`
- **VAL-HISTORY-005-003**: `view_session()` sets `app.current_session_id` to session ID
- **VAL-HISTORY-005-004**: `view_session()` calls `app.navigate_to(f"/session/{session['id']}")`

### VAL-HISTORY-006: Loading State
- **VAL-HISTORY-006-001**: Initial loading shows `ft.ProgressRing` with `visible=True`
- **VAL-HISTORY-006-002**: ProgressRing is visible during `load_sessions()` async operation
- **VAL-HISTORY-006-003**: ProgressRing is hidden after sessions load via `loading_indicator.visible = False`

### VAL-HISTORY-007: Error Handling
- **VAL-HISTORY-007-001**: Error text displays in red with `color=ft.Colors.ERROR` and `size=14`
- **VAL-HISTORY-007-002**: Error text is hidden initially with `visible=False`
- **VAL-HISTORY-007-003**: Error banner with retry capability is shown for network errors
- **VAL-HISTORY-007-004**: Error banner `on_retry` handler calls `load_sessions()`
- **VAL-HISTORY-007-005**: Error banner `on_dismiss` handler hides the banner

### VAL-HISTORY-008: Navigation
- **VAL-HISTORY-008-001**: Back arrow IconButton navigates to `/home` on click
- **VAL-HISTORY-008-002**: NavigationRail in sidebar can navigate to `/history` (selected index)

---

## Session Detail Page (`/session/{id}`)

### VAL-DETAIL-001: Page Structure
- **VAL-DETAIL-001-001**: Header contains back arrow IconButton with `icon=ft.Icons.ARROW_BACK`
- **VAL-DETAIL-001-002**: Header contains "Session Details" title Text with `size=18` and `weight=ft.FontWeight.BOLD`
- **VAL-DETAIL-001-003**: View route is `/session/{session_id}` when ID is provided
- **VAL-DETAIL-001-004**: View route is `/session/detail` when no ID is provided

### VAL-DETAIL-002: No Session ID Handling
- **VAL-DETAIL-002-001**: When no session ID, error text shows "No session ID provided"
- **VAL-DETAIL-002-002**: Error text is `visible=True` when session ID is missing

### VAL-DETAIL-003: Session Info Card
- **VAL-DETAIL-003-001**: Session info card has `ft.Container` with `padding=16` and `border_radius=12`
- **VAL-DETAIL-003-002**: State badge displays "Completed" (green), "Active" (blue), or "Intro" (orange)
- **VAL-DETAIL-003-003**: Duration displays in bold with `color=ft.Colors.GREY_600`
- **VAL-DETAIL-003-004**: Date row contains CALENDAR_TODAY icon + formatted date string

### VAL-DETAIL-004: Summary Section
- **VAL-DETAIL-004-001**: Summary section only renders when `summary` exists and is non-empty
- **VAL-DETAIL-004-002**: Summary container has `bgcolor=ft.Colors.DEEP_PURPLE_50` (purple background)
- **VAL-DETAIL-004-003**: Summary header row contains SUMMARIZE icon + "Session Summary" text
- **VAL-DETAIL-004-004**: Summary icon is `color=ft.Colors.DEEP_PURPLE`
- **VAL-DETAIL-004-005**: "Session Summary" header is `weight=ft.FontWeight.BOLD` and `color=ft.Colors.DEEP_PURPLE`
- **VAL-DETAIL-004-006**: Empty summary returns empty Container (no section shown)

### VAL-DETAIL-005: Conversation Section
- **VAL-DETAIL-005-001**: "Conversation" section header is `ft.Text` with `size=18` and `weight=ft.FontWeight.BOLD`
- **VAL-DETAIL-005-002**: Messages are displayed in an `ft.ListView` inside a Container with `expand=True`
- **VAL-DETAIL-005-003**: Empty messages shows "No messages in this session." in italic grey text

### VAL-DETAIL-006: Message Bubbles
- **VAL-DETAIL-006-001**: User messages are right-aligned with `alignment=ft.alignment.center_right`
- **VAL-DETAIL-006-002**: User message bubbles have `bgcolor=ft.Colors.SECONDARY_CONTAINER`
- **VAL-DETAIL-006-003**: User message text is `color=ft.Colors.ON_SECONDARY_CONTAINER`
- **VAL-DETAIL-006-004**: Marcus messages are left-aligned with `alignment=ft.alignment.center_left`
- **VAL-DETAIL-006-005**: Marcus messages include CircleAvatar with "M" content and `bgcolor=ft.Colors.DEEP_PURPLE`
- **VAL-DETAIL-006-006**: Marcus message bubbles have `bgcolor=ft.Colors.PRIMARY_CONTAINER`
- **VAL-DETAIL-006-007**: Marcus avatar has `radius=16` and white "M" text
- **VAL-DETAIL-006-008**: Message timestamps display below message text when available

### VAL-DETAIL-007: Error State
- **VAL-DETAIL-007-001**: Error state shows ERROR_OUTLINE icon with `size=48` and `color=ft.Colors.ERROR`
- **VAL-DETAIL-007-002**: Error message text is displayed below the icon
- **VAL-DETAIL-007-003**: "Go Back" ElevatedButton navigates to `/history` on click

### VAL-DETAIL-008: Loading State
- **VAL-DETAIL-008-001**: Initial loading shows `ft.ProgressRing` centered in content area
- **VAL-DETAIL-008-002**: ProgressRing is `visible=True` during `load_session()` async operation
- **VAL-DETAIL-008-003**: ProgressRing is hidden after session loads via `loading_indicator.visible = False`

### VAL-DETAIL-009: Navigation
- **VAL-DETAIL-009-001**: Back arrow navigates to `/history` on click
- **VAL-DETAIL-009-002**: Error state "Go Back" button navigates to `/history`

---

## Settings Page (`/settings`)

### VAL-SETTINGS-001: Page Structure
- **VAL-SETTINGS-001-001**: View uses Row layout with NavigationRail + VerticalDivider + content Container
- **VAL-SETTINGS-001-002**: View route is `/settings`
- **VAL-SETTINGS-001-003**: Content area uses `ft.ListView` with scroll capability
- **VAL-SETTINGS-001-004**: Settings content uses `ft.Card` components for each section

### VAL-SETTINGS-002: Text-to-Speech Section
- **VAL-SETTINGS-002-001**: TTS section has Card with VOLUME_UP icon + "Text-to-Speech" header
- **VAL-SETTINGS-002-002**: TTS Voice dropdown has `label="Text-to-Speech Voice"` and `width=400`
- **VAL-SETTINGS-002-003**: Dropdown option 1: `en_US-lessac-medium` displays as "Lessac Medium (Default)"
- **VAL-SETTINGS-002-004**: Dropdown option 2: `en_US-lessac-high` displays as "Lessac High"
- **VAL-SETTINGS-002-005**: Dropdown option 3: `en_US-amy-medium` displays as "Amy Medium"
- **VAL-SETTINGS-002-006**: Default TTS voice is `en_US-lessac-medium`
- **VAL-SETTINGS-002-007**: Dropdown `on_change` calls `handle_tts_voice_change()`

### VAL-SETTINGS-003: Speech-to-Text Section
- **VAL-SETTINGS-003-001**: STT section has Card with MIC icon + "Speech-to-Text" header
- **VAL-SETTINGS-003-002**: STT Enable Switch has `label="Enable Voice Input"`
- **VAL-SETTINGS-003-003**: STT Switch default value is `True`
- **VAL-SETTINGS-003-004**: STT Switch `on_change` calls `handle_stt_enabled_change()`
- **VAL-SETTINGS-003-005**: STT description text: "Allow voice input for meditation sessions"

### VAL-SETTINGS-004: AI Model Section
- **VAL-SETTINGS-004-001**: AI Model section has Card with PSYCHOLOGY icon + "AI Model" header
- **VAL-SETTINGS-004-002**: Model dropdown has `label="AI Model"` and `width=400`
- **VAL-SETTINGS-004-003**: Dropdown option 1: `llama-3.2-1b` displays as "Llama 3.2 1B (Fast, Low RAM)"
- **VAL-SETTINGS-004-004**: Dropdown option 2: `llama-3.2-3b` displays as "Llama 3.2 3B (Balanced)"
- **VAL-SETTINGS-004-005**: Dropdown option 3: `mistral-7b` displays as "Mistral 7B (High Quality)"
- **VAL-SETTINGS-004-006**: Dropdown option 4: `phi-3-mini` displays as "Phi-3 Mini (Compact)"
- **VAL-SETTINGS-004-007**: Default AI model is `llama-3.2-1b`
- **VAL-SETTINGS-004-008**: Model dropdown `on_change` calls `handle_model_change()`
- **VAL-SETTINGS-004-009**: Info text: "Select the AI model for meditation conversations"
- **VAL-SETTINGS-004-010**: Warning text: "Smaller models use less RAM but may be less nuanced"

### VAL-SETTINGS-005: Data Management Section
- **VAL-SETTINGS-005-001**: Data section has Card with FOLDER icon + "Data Management" header
- **VAL-SETTINGS-005-002**: Export Data button is `ft.ElevatedButton` with DOWNLOAD icon
- **VAL-SETTINGS-005-003**: Export Data button `on_click` calls `handle_export()`
- **VAL-SETTINGS-005-004**: Clear All Data button is `ft.OutlinedButton` with DELETE icon
- **VAL-SETTINGS-005-005**: Clear All Data icon has `icon_color=ft.Colors.ERROR`
- **VAL-SETTINGS-005-006**: Clear All Data button `on_click` calls `handle_clear_data()`
- **VAL-SETTINGS-005-007**: Data description: "Export your data for backup or clear all data to start fresh"

### VAL-SETTINGS-006: System Info Section
- **VAL-SETTINGS-006-001**: System info displays below a `ft.Divider`
- **VAL-SETTINGS-006-002**: RAM display shows "System RAM:" label + value in GB (e.g., "16.0 GB")
- **VAL-SETTINGS-006-003**: App Version displays "App Version:" label + "0.1.0"
- **VAL-SETTINGS-006-004**: Version text is `color=ft.Colors.GREY_600`

### VAL-SETTINGS-007: Settings Persistence
- **VAL-SETTINGS-007-001**: Dropdown changes trigger immediate API save via `save_settings()`
- **VAL-SETTINGS-007-002**: Switch changes trigger immediate API save via `save_settings()`
- **VAL-SETTINGS-007-003**: `save_settings()` calls `api_client.update_settings(updates)`
- **VAL-SETTINGS-007-004**: Settings load on page build via `load_settings()` async task

### VAL-SETTINGS-008: Export Functionality
- **VAL-SETTINGS-008-001**: Export calls `api_client.export_data("json")`
- **VAL-SETTINGS-008-002**: Export saves file to `~/Downloads/openMarcus_export.json`
- **VAL-SETTINGS-008-003**: Export shows "Preparing export..." status initially
- **VAL-SETTINGS-008-004**: Success shows "Data exported to Downloads folder" status
- **VAL-SETTINGS-008-005**: Failure shows error status with "Export failed" message

### VAL-SETTINGS-009: Clear Data Confirmation Dialog
- **VAL-SETTINGS-009-001**: Clear button shows `ft.AlertDialog` with `modal=True`
- **VAL-SETTINGS-009-002**: Dialog title is "Clear All Data"
- **VAL-SETTINGS-009-003**: Dialog content warns about permanent deletion
- **VAL-SETTINGS-009-004**: Dialog has "Cancel" TextButton that dismisses dialog
- **VAL-SETTINGS-009-005**: Dialog has "Clear All Data" TextButton with `color=ft.Colors.ERROR`
- **VAL-SETTINGS-009-006**: "Clear All Data" button `on_click` calls `_confirm_clear_data()`
- **VAL-SETTINGS-009-007**: `_confirm_clear_data()` closes dialog, shows "Clearing all data..." status
- **VAL-SETTINGS-009-008**: `_confirm_clear_data()` calls `api_client.clear_all_data()`
- **VAL-SETTINGS-009-009**: After clear success, `_logout_after_clear()` is called
- **VAL-SETTINGS-009-010**: `_logout_after_clear()` calls `api_client.clear_token()`
- **VAL-SETTINGS-009-011**: `_logout_after_clear()` navigates to login screen

### VAL-SETTINGS-010: Status Messages
- **VAL-SETTINGS-010-001**: Status message uses `ft.Text` with `size=12`
- **VAL-SETTINGS-010-002**: Error status messages have `color=ft.Colors.ERROR`
- **VAL-SETTINGS-010-003**: Success status messages have `color=ft.Colors.GREEN`
- **VAL-SETTINGS-010-004**: Status messages auto-hide after 3 seconds via `_hide_status_after_delay()`
- **VAL-SETTINGS-010-005**: Status is `visible=False` when hidden

### VAL-SETTINGS-011: Navigation
- **VAL-SETTINGS-011-001**: NavigationRail can navigate to `/settings` (selected index)
- **VAL-SETTINGS-011-002**: NavigationRail can navigate to `/history`, `/home`, `/profile`

---

## Cross-Page Navigation

### VAL-NAV-001: History to Session Detail
- **VAL-NAV-001-001**: Clicking session card navigates from `/history` to `/session/{id}`
- **VAL-NAV-001-002**: Clicking "View Details" link navigates from `/history` to `/session/{id}`
- **VAL-NAV-001-003**: Back arrow on session detail navigates back to `/history`

### VAL-NAV-002: Settings Navigation
- **VAL-NAV-002-001**: Settings page accessible via NavigationRail from any page
- **VAL-NAV-002-002**: After clear data + logout, user lands on login screen

---

## Edge Cases

### VAL-EDGE-001: Empty States
- **VAL-EDGE-001-001**: History page shows empty message when no sessions exist
- **VAL-EDGE-001-002**: Session detail shows "Session not found" when data is None
- **VAL-EDGE-001-003**: Conversation section shows empty message when no messages

### VAL-EDGE-002: Error States
- **VAL-EDGE-002-001**: History page shows error banner with retry on API failure
- **VAL-EDGE-002-002**: Session detail shows error icon + message + "Go Back" on failure
- **VAL-EDGE-002-003**: Settings shows error banner on settings load failure

### VAL-EDGE-003: Session State Variations
- **VAL-EDGE-003-001**: Summary section hidden when summary is None or empty string
- **VAL-EDGE-003-002**: Duration shows "< 1 min" for sessions under 1 minute
- **VAL-EDGE-003-003**: Duration shows "1 min" for sessions exactly 1 minute
