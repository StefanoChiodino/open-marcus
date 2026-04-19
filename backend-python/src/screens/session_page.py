"""
Session Page for OpenMarcus.
Meditation chat interface with Marcus Aurelius.
Handles intro state and active chat state transitions.
"""

import flet as ft
import asyncio
import tempfile
import os
from typing import Optional

from src.services.api_client import api_client, StreamHandler
from src.screens.navigation import NavigationSidebar
from src.screens.error_components import ErrorBanner, NetworkErrorBanner


class SessionPage:
    """Session page with chat interface for meditation with Marcus Aurelius."""

    def __init__(self, app):
        self.app = app
        self.navigation = NavigationSidebar(app)
        
        # Session state
        self.current_session: Optional[dict] = None
        self.session_state = "intro"  # intro, active, concluded
        self.messages: list = []
        
        # Loading state
        self.loading = True
        self.loading_indicator = ft.ProgressRing(visible=True)
        
        # Message input
        self.message_input = ft.TextField(
            hint_text="Share your thoughts...",
            expand=True,
            multiline=True,
            min_lines=1,
            max_lines=5,
            on_submit=self.send_message,
        )
        
        # Send button
        self.send_button = ft.IconButton(
            icon=ft.Icons.SEND,
            icon_size=28,
            icon_color=ft.Colors.WHITE,
            bgcolor=ft.Colors.DEEP_PURPLE,
            on_click=self.send_message,
        )
        
        # Microphone/Recording state
        self.is_recording = False
        self.audio_recorder: Optional[ft.AudioRecorder] = None
        self.mic_button: Optional[ft.IconButton] = None
        self.recording_indicator: Optional[ft.Container] = None
        self.temp_audio_path: Optional[str] = None
        
        # TTS playback state
        self.audio_player: Optional[ft.Audio] = None
        self.is_playing = False
        self.currently_playing_message_index: Optional[int] = None
        
        # Main content container
        self.content_container: Optional[ft.Container] = None
        self.messages_list: Optional[ft.ListView] = None
        self.intro_card: Optional[ft.Container] = None
        self.chat_messages_container: Optional[ft.Column] = None
        self.input_container: Optional[ft.Container] = None
        
        # Error display
        self.error_text = ft.Text(
            "",
            color=ft.Colors.ERROR,
            visible=False,
        )
        
        # Error banner for network/AI errors with retry capability
        self.error_banner = ErrorBanner(
            on_retry=self._handle_error_retry,
            on_dismiss=self._handle_error_dismiss,
        )
        self.error_banner.container.visible = False
        
        # Network error banner with specialized messaging
        self.network_error_banner = NetworkErrorBanner(
            on_retry=self._handle_error_retry,
            on_dismiss=self._handle_error_dismiss,
        )
        self.network_error_banner.container.visible = False
        
        # Initialize audio recorder
        self._init_audio_recorder()
    
    def _handle_error_retry(self, e: ft.ControlEvent) -> None:
        """Handle retry button click on error banner."""
        self.error_banner.hide()
        self.network_error_banner.hide()
        # Re-initialize session
        asyncio.create_task(self.initialize_session())
    
    def _handle_error_dismiss(self, e: ft.ControlEvent) -> None:
        """Handle dismiss button click on error banner."""
        self.error_banner.hide()
        self.network_error_banner.hide()
    
    def _init_audio_player(self) -> None:
        """Initialize the audio player control for TTS playback."""
        self.audio_player = ft.Audio(
            src_base64=None,
            autoplay=False,
            on_state_changed=self._on_audio_state_changed,
        )
    
    def _on_audio_state_changed(self, e: ft.AudioStateChangeEvent) -> None:
        """Handle audio player state changes."""
        if e.state == ft.AudioState.PLAYING:
            self.is_playing = True
        elif e.state == ft.AudioState.STOPPED or e.state == ft.AudioState.IDLE:
            self.is_playing = False
            self.currently_playing_message_index = None
        self.app.page.update()
    
    async def _play_tts(self, message_index: int, text: str) -> None:
        """Play TTS for a message."""
        # If already playing this message, stop it
        if self.is_playing and self.currently_playing_message_index == message_index:
            if self.audio_player:
                self.audio_player.pause()
                self.audio_player.src_base64 = None
            self.is_playing = False
            self.currently_playing_message_index = None
            return
        
        # Stop any currently playing audio
        if self.audio_player and self.is_playing:
            self.audio_player.pause()
            self.audio_player.src_base64 = None
        
        # Initialize audio player if needed
        if not self.audio_player:
            self._init_audio_player()
        
        # Ensure audio player is available
        if not self.audio_player:
            self.show_error("Failed to initialize audio player")
            return
        
        try:
            # Synthesize speech from backend
            result, error = await api_client.synthesize_speech(text)
            
            if error:
                self.show_error(f"TTS failed: {error}")
                return
            
            if result and result.get("audio_base64"):
                # Set the audio source and play
                self.audio_player.src_base64 = result["audio_base64"]
                self.currently_playing_message_index = message_index
                self.is_playing = True
                
                # Add to page overlay if not already there
                if self.audio_player not in self.app.page.overlay:
                    self.app.page.overlay.append(self.audio_player)
                
                self.app.page.update()
        except Exception as ex:
            self.show_error(f"TTS playback error: {str(ex)}")
    
    def _get_play_button(self, message_index: int, text: str) -> ft.IconButton:
        """Get a play button for TTS playback of a message."""
        return ft.IconButton(
            icon=ft.Icons.VOLUME_UP,
            icon_size=18,
            icon_color=ft.Colors.DEEP_PURPLE,
            tooltip="Play speech",
            on_click=lambda _: self._play_tts(message_index, text),
        )

    def _init_audio_recorder(self) -> None:
        """Initialize the audio recorder control."""
        self.audio_recorder = ft.AudioRecorder(
            on_state_changed=self._on_recording_state_changed,
        )
        
        # Create microphone button
        self.mic_button = ft.IconButton(
            icon=ft.Icons.MIC,
            icon_size=24,
            icon_color=ft.Colors.GREY_600,
            tooltip="Record voice message",
            on_click=self._toggle_recording,
        )
        
        # Recording indicator
        self.recording_indicator = ft.Container(
            content=ft.Row(
                controls=[
                    ft.Icon(
                        name=ft.Icons.FIBER_MANUAL_RECORD,
                        color=ft.Colors.RED,
                        size=12,
                    ),
                    ft.Text(
                        "Recording...",
                        size=12,
                        color=ft.Colors.RED,
                    ),
                ],
                spacing=4,
            ),
            visible=False,
            padding=ft.padding.only(right=8),
        )
    
    def _on_recording_state_changed(self, e: ft.AudioRecorderStateChangeEvent) -> None:
        """Handle audio recorder state changes."""
        # Ensure UI elements are initialized
        if not self.recording_indicator or not self.mic_button:
            return
        
        if e.state == ft.AudioRecorderState.RECORDING:
            self.is_recording = True
            self.recording_indicator.visible = True
            self.mic_button.icon = ft.Icons.STOP
            self.mic_button.icon_color = ft.Colors.RED
        elif e.state == ft.AudioRecorderState.STOPPED:
            self.is_recording = False
            self.recording_indicator.visible = False
            self.mic_button.icon = ft.Icons.MIC
            self.mic_button.icon_color = ft.Colors.GREY_600
        self.app.page.update()

    async def _toggle_recording(self, e: ft.ControlEvent) -> None:
        """Toggle recording state."""
        if self.is_recording:
            await self._stop_recording()
        else:
            await self._start_recording()

    async def _start_recording(self) -> None:
        """Start audio recording."""
        if not self.audio_recorder:
            return
        
        # Ensure UI elements are initialized
        if not self.recording_indicator or not self.mic_button:
            self.show_error("UI not ready")
            return
        
        # Check microphone permission first
        has_permission = await self.audio_recorder.has_permission_async()
        if not has_permission:
            self.show_error("Microphone permission denied")
            return
        
        # Create a temporary file for recording
        temp_dir = tempfile.gettempdir()
        self.temp_audio_path = os.path.join(temp_dir, "openmarcus_recording.webm")
        
        try:
            await self.audio_recorder.start_recording_async(self.temp_audio_path)
            self.is_recording = True
            self.recording_indicator.visible = True
            self.mic_button.icon = ft.Icons.STOP
            self.mic_button.icon_color = ft.Colors.RED
            self.app.page.update()
        except Exception as ex:
            self.show_error(f"Failed to start recording: {str(ex)}")

    async def _stop_recording(self) -> None:
        """Stop audio recording and transcribe."""
        if not self.audio_recorder:
            return
        
        # Ensure UI elements are initialized
        if not self.recording_indicator or not self.mic_button:
            self.show_error("UI not ready")
            return
        
        try:
            await self.audio_recorder.stop_recording_async()
            self.is_recording = False
            self.recording_indicator.visible = False
            self.mic_button.icon = ft.Icons.MIC
            self.mic_button.icon_color = ft.Colors.GREY_600
            self.app.page.update()
            
            # Transcribe the recording
            await self._transcribe_recording()
        except Exception as ex:
            self.show_error(f"Failed to stop recording: {str(ex)}")

    async def _transcribe_recording(self) -> None:
        """Send recorded audio to backend for transcription."""
        if not self.temp_audio_path or not os.path.exists(self.temp_audio_path):
            return
        
        try:
            # Check if file has content
            file_size = os.path.getsize(self.temp_audio_path)
            if file_size == 0:
                return
            
            # Send to backend for transcription
            result, error = await api_client.transcribe_audio(self.temp_audio_path)
            
            if error:
                self.show_error(f"Transcription failed: {error}")
                return
            
            if result and result.get("text"):
                # Put transcribed text in message input
                transcribed_text = result["text"].strip()
                self.message_input.value = transcribed_text
                self.message_input.focus()
                self.app.page.update()
        except Exception as ex:
            self.show_error(f"Transcription error: {str(ex)}")
        finally:
            # Clean up temp file
            try:
                if self.temp_audio_path and os.path.exists(self.temp_audio_path):
                    os.unlink(self.temp_audio_path)
            except Exception:
                pass

    def build(self) -> ft.View:
        """Build the session view."""
        # Create container for main content that will be updated
        self.content_container = ft.Container(
            expand=True,
            padding=ft.padding.all(20),
            content=ft.Column(
                controls=[
                    self.loading_indicator,
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                expand=True,
            ),
        )
        
        view = ft.View(
            route="/session",
            controls=[
                ft.Row(
                    controls=[
                        self.navigation.build("/session"),
                        ft.VerticalDivider(width=1),
                        ft.Container(
                            expand=True,
                            content=ft.Column(
                                controls=[
                                    # Header
                                    ft.Container(
                                        padding=ft.padding.all(16),
                                        content=ft.Row(
                                            controls=[
                                                ft.IconButton(
                                                    icon=ft.Icons.ARROW_BACK,
                                                    on_click=self.go_back,
                                                ),
                                                ft.Text(
                                                    "Meditation Session",
                                                    size=18,
                                                    weight=ft.FontWeight.BOLD,
                                                ),
                                                ft.Container(expand=True),
                                                ft.IconButton(
                                                    icon=ft.Icons.STOP_CIRCLE,
                                                    icon_color=ft.Colors.DEEP_PURPLE if self.session_state != "concluded" else ft.Colors.GREY,
                                                    tooltip="End Session",
                                                    on_click=self.end_session,
                                                    disabled=self.session_state == "concluded",
                                                ),
                                            ],
                                        ),
                                    ),
                                    # Error display
                                    ft.Container(
                                        padding=ft.padding.symmetric(horizontal=16),
                                        content=self.error_text,
                                        visible=False,
                                    ),
                                    # Error banner for network/AI errors
                                    ft.Container(
                                        padding=ft.padding.symmetric(horizontal=16),
                                        content=self.error_banner.container,
                                        visible=False,
                                    ),
                                    # Network error banner
                                    ft.Container(
                                        padding=ft.padding.symmetric(horizontal=16),
                                        content=self.network_error_banner.container,
                                        visible=False,
                                    ),
                                    # Main content area
                                    self.content_container,
                                    # Input area
                                    self._build_input_area(),
                                ],
                            ),
                        ),
                    ],
                    spacing=0,
                    expand=True,
                ),
                # Audio recorder control (hidden but must be in view for recording to work)
                self.audio_recorder,
            ],
        )
        
        # Start loading/creating session
        asyncio.create_task(self.initialize_session())
        
        return view

    def _build_input_area(self) -> ft.Container:
        """Build the message input area."""
        self.input_container = ft.Container(
            content=ft.Row(
                controls=[
                    self.mic_button,
                    self.recording_indicator,
                    self.message_input,
                    ft.Container(width=12),
                    self.send_button,
                ],
                alignment=ft.MainAxisAlignment.CENTER,
            ),
            padding=ft.padding.only(top=8, left=16, right=16, bottom=16),
        )
        return self.input_container

    def _build_intro_content(self) -> ft.Column:
        """Build the intro state content with Marcus Aurelius intro card."""
        # Marcus intro card content
        intro_card_content = ft.Column(
            controls=[
                # Avatar and name row
                ft.Row(
                    controls=[
                        ft.CircleAvatar(
                            content=ft.Text(
                                "M",
                                size=20,
                                color=ft.Colors.WHITE,
                            ),
                            bgcolor=ft.Colors.DEEP_PURPLE,
                            radius=24,
                        ),
                        ft.Container(width=16),
                        ft.Column(
                            controls=[
                                ft.Text(
                                    "Marcus Aurelius",
                                    size=18,
                                    weight=ft.FontWeight.BOLD,
                                ),
                                ft.Text(
                                    "Roman Emperor & Stoic Philosopher",
                                    size=12,
                                    color=ft.Colors.GREY_600,
                                ),
                            ],
                        ),
                    ],
                ),
                ft.Container(height=16),
                # Intro text
                ft.Text(
                    "I am here to guide your meditation. Share what is on your mind, and we shall explore it together through the lens of Stoic wisdom.",
                    size=14,
                    color=ft.Colors.GREY_700,
                    italic=True,
                ),
                ft.Container(height=16),
                # Begin button
                ft.Container(
                    content=ft.ElevatedButton(
                        "Begin Conversation",
                        icon=ft.Icons.PLAY_ARROW,
                        icon_color=ft.Colors.WHITE,
                        bgcolor=ft.Colors.DEEP_PURPLE,
                        color=ft.Colors.WHITE,
                        width=250,
                        height=48,
                        style=ft.ButtonStyle(
                            shape=ft.RoundedRectangleBorder(radius=12),
                        ),
                        on_click=self.begin_conversation,
                    ),
                    alignment=ft.alignment.center,
                ),
            ],
        )
        
        return ft.Column(
            controls=[
                ft.Container(expand=True),
                ft.Container(
                    content=ft.Column(
                        controls=[
                            intro_card_content,
                        ],
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                    ),
                    padding=24,
                    border_radius=16,
                    bgcolor=ft.Colors.SURFACE,
                    width=500,
                    alignment=ft.alignment.center,
                ),
                ft.Container(expand=True),
            ],
            alignment=ft.MainAxisAlignment.CENTER,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            expand=True,
        )

    def _build_active_content(self) -> ft.Column:
        """Build the active chat state content."""
        # Build message list controls
        message_controls = self.build_message_controls()
        
        return ft.Column(
            controls=[
                # Messages list
                ft.Container(
                    expand=True,
                    content=self._create_messages_list(message_controls),
                ),
            ],
            expand=True,
        )

    def _create_messages_list(self, message_controls: list) -> ft.ListView:
        """Create the messages ListView with proper scrolling."""
        self.messages_list = ft.ListView(
            expand=True,
            spacing=12,
            padding=ft.padding.all(16),
            controls=message_controls,
        )
        return self.messages_list

    def begin_conversation(self, e=None):
        """Handle beginning the conversation from intro state."""
        # Simply focus on the input field - user types first message
        self.message_input.focus()

    async def initialize_session(self) -> None:
        """Initialize session - create new session or load existing."""
        self.loading = True
        self.loading_indicator.visible = True
        self.error_text.visible = False
        if self.content_container:
            self.content_container.content = ft.Column(
                controls=[self.loading_indicator],
                alignment=ft.MainAxisAlignment.CENTER,
                expand=True,
            )
        self.app.page.update()

        try:
            # Create a new session
            result, error = await api_client.create_session()
            
            if error:
                self.show_error(f"Failed to create session: {error}")
                return
            
            if result:
                self.current_session = result
                self.session_state = result.get("state", "intro")
                self.messages = []
                self.update_content()
            else:
                self.show_error("No session data returned")
                
        except Exception as e:
            self.show_error(f"Error initializing session: {str(e)}")

        self.loading = False
        self.app.page.update()

    def show_error(self, message: str, is_network_error: bool = False) -> None:
        """Show an error message."""
        self.error_text.value = message
        self.error_text.visible = True
        
        # Also show appropriate error banner for prominent display
        if is_network_error or self._is_network_error_message(message):
            self.network_error_banner.show_network_error(
                error_type=self._classify_network_error(message),
                custom_message=message
            )
            self.network_error_banner.container.visible = True
        else:
            self.error_banner.show(message, is_retryable=True)
            self.error_banner.container.visible = True
        
        self.app.page.update()
    
    def _is_network_error_message(self, message: str) -> bool:
        """Check if the error message is a network-related error."""
        network_keywords = [
            "connect", "timeout", "network", "offline", "internet",
            "server", "connection", "request timed out", "cannot connect"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in network_keywords)
    
    def _classify_network_error(self, message: str) -> str:
        """Classify the type of network error."""
        message_lower = message.lower()
        if "timeout" in message_lower:
            return "timeout"
        elif "connect" in message_lower or "connection" in message_lower:
            return "connection"
        elif "offline" in message_lower or "internet" in message_lower:
            return "offline"
        elif "server" in message_lower:
            return "server"
        else:
            return "unknown"

    def update_content(self) -> None:
        """Update the main content area based on session state."""
        if self.loading:
            return

        if self.content_container:
            if self.session_state == "intro":
                self.content_container.content = self._build_intro_content()
                self.message_input.disabled = False
                self.send_button.disabled = False
            else:
                self.content_container.content = self._build_active_content()
                self.message_input.disabled = False
                self.send_button.disabled = False
                
                # Update messages list if exists
                if self.chat_messages_container is None:
                    self.chat_messages_container = ft.Column(
                        controls=self.build_message_controls(),
                        spacing=12,
                    )
            
            self.app.page.update()

    def build_message_controls(self) -> list:
        """Build message list controls."""
        if not self.messages:
            return [
                ft.Container(
                    content=ft.Text(
                        "Your conversation with Marcus Aurelius will appear here...",
                        size=14,
                        color=ft.Colors.GREY_500,
                        italic=True,
                    ),
                    alignment=ft.alignment.center,
                    padding=40,
                ),
            ]

        controls = []
        for i, msg in enumerate(self.messages):
            is_user = msg.get("role") == "user"
            controls.append(self._build_message_bubble(msg.get("content", ""), is_user, message_index=i))
        return controls

    def _build_message_bubble(self, text: str, is_user: bool, message_index: Optional[int] = None) -> ft.Container:
        """Build a single message bubble."""
        if is_user:
            # User message - right aligned
            return ft.Container(
                content=ft.Container(
                    content=ft.Text(
                        text,
                        size=14,
                        color=ft.Colors.ON_SECONDARY_CONTAINER,
                    ),
                    padding=12,
                    border_radius=16,
                    bgcolor=ft.Colors.SECONDARY_CONTAINER,
                ),
                alignment=ft.alignment.center_right,
                margin=ft.margin.only(left=60, right=0),
            )
        else:
            # Marcus message - left aligned with avatar and play button
            # Build the message content
            message_content = ft.Column(
                controls=[
                    ft.Text(
                        text,
                        size=14,
                        color=ft.Colors.ON_PRIMARY_CONTAINER,
                    ),
                ],
                spacing=4,
            )
            
            # Add play button if message_index is provided and text is not empty
            if message_index is not None and text and text.strip():
                # Add TTS play button row
                play_button = self._get_play_button(message_index, text)
                message_content.controls.append(
                    ft.Container(
                        content=play_button,
                        padding=ft.padding.only(top=4),
                    )
                )
            
            # Build Marcus message row with avatar and content
            return ft.Container(
                content=ft.Row(
                    controls=[
                        ft.CircleAvatar(
                            content=ft.Text(
                                "M",
                                size=14,
                                color=ft.Colors.WHITE,
                            ),
                            bgcolor=ft.Colors.DEEP_PURPLE,
                            radius=16,
                        ),
                        ft.Container(width=8),
                        ft.Container(
                            content=message_content,
                            padding=12,
                            border_radius=16,
                            bgcolor=ft.Colors.PRIMARY_CONTAINER,
                        ),
                    ],
                    alignment=ft.MainAxisAlignment.START,
                    vertical_alignment=ft.CrossAxisAlignment.END,
                ),
                alignment=ft.alignment.center_left,
                margin=ft.margin.only(left=0, right=60),
            )

    async def send_message(self, e=None) -> None:
        """Handle sending a message with streaming response."""
        text = self.message_input.value
        if not text:
            return
        
        if not self.current_session:
            self.show_error("No active session. Please wait...")
            return

        # Add user message to UI immediately
        user_message = {
            "role": "user",
            "content": text,
        }
        self.messages.append(user_message)
        self.message_input.value = ""
        
        # Transition from intro to active state
        if self.session_state == "intro":
            self.session_state = "active"
            self.update_content()
        
        # Update UI with new message
        self._update_messages_list()
        self.app.page.update()

        # Create pending AI message for streaming
        pending_ai_message = {
            "role": "assistant",
            "content": "",
        }
        pending_index = len(self.messages)
        self.messages.append(pending_ai_message)
        self._update_messages_list()
        self.app.page.update()

        # Create stream handler for callbacks
        streaming_complete = False
        
        async def on_token(token: str) -> None:
            """Called for each token received from streaming."""
            nonlocal pending_ai_message
            pending_ai_message["content"] += token
            # Update the pending message in the list
            if pending_index < len(self.messages):
                self.messages[pending_index] = pending_ai_message
                self._update_messages_list()
                self.app.page.update()
        
        async def on_session_state(state: str) -> None:
            """Called when session state is received."""
            nonlocal pending_ai_message
            if state == "active" and self.session_state == "intro":
                self.session_state = "active"
        
        async def on_complete(data: dict) -> None:
            """Called when stream is complete."""
            nonlocal pending_ai_message, streaming_complete
            streaming_complete = True
            if data.get("content"):
                pending_ai_message["content"] = data["content"]
            if data.get("session_state"):
                self.session_state = data["session_state"]
        
        async def on_error(error: str) -> None:
            """Called when an error occurs during streaming."""
            # Update pending message to show error
            pending_ai_message["content"] += f"\n[Error: {error}]"
            if pending_index < len(self.messages):
                self.messages[pending_index] = pending_ai_message
        
        handler = StreamHandler(
            on_token=on_token,
            on_session_state=on_session_state,
            on_complete=on_complete,
            on_error=on_error,
        )

        # Send to API with streaming
        try:
            result, error = await api_client.stream_message(
                self.current_session["id"], text, handler
            )
            
            if error:
                self.show_error(f"Failed to send message: {error}")
                # Remove the messages from UI on error
                if pending_index < len(self.messages):
                    self.messages.pop()
                if self.messages and self.messages[-1].get("role") == "user":
                    self.messages.pop()
                self._update_messages_list()
                self.app.page.update()
                return
            
            # Final update to ensure content is correct
            if result and result.get("content"):
                pending_ai_message["content"] = result["content"]
                self.messages[pending_index] = pending_ai_message
                self._update_messages_list()
                self.app.page.update()
            
        except Exception as e:
            self.show_error(f"Error sending message: {str(e)}")
            # Clean up pending message on exception
            if pending_index < len(self.messages):
                self.messages.pop()

    def _update_messages_list(self) -> None:
        """Update the messages list in the UI."""
        if self.messages_list:
            self.messages_list.controls = self.build_message_controls()
        elif self.content_container and self.session_state == "active":
            self.content_container.content = self._build_active_content()

    async def end_session(self, e=None) -> None:
        """Handle ending the session."""
        if not self.current_session:
            return
        
        # Transition to concluded state
        self.session_state = "concluded"
        self.message_input.disabled = True
        self.send_button.disabled = True
        
        try:
            result, error = await api_client.end_session(self.current_session["id"])
            
            if error:
                self.show_error(f"Failed to end session: {error}")
                return
            
            # Update UI
            self.app.page.update()
            
            # Navigate back to home after a brief delay
            await asyncio.sleep(1.5)
            self.app.navigate_to("/home")
            
        except Exception as e:
            self.show_error(f"Error ending session: {str(e)}")

    def go_back(self, e=None) -> None:
        """Navigate back to home page."""
        self.app.navigate_to("/home")
