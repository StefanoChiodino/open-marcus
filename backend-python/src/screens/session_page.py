"""
Session Page for OpenMarcus.
Meditation chat interface with Marcus Aurelius.
Handles intro state and active chat state transitions.
"""

import flet as ft
import asyncio
from typing import Optional

from src.services.api_client import api_client
from src.screens.navigation import NavigationSidebar


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

    def show_error(self, message: str) -> None:
        """Show an error message."""
        self.error_text.value = message
        self.error_text.visible = True
        self.app.page.update()

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
        for msg in self.messages:
            is_user = msg.get("role") == "user"
            controls.append(self._build_message_bubble(msg.get("content", ""), is_user))
        return controls

    def _build_message_bubble(self, text: str, is_user: bool) -> ft.Container:
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
            # Marcus message - left aligned with avatar
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
                            content=ft.Text(
                                text,
                                size=14,
                                color=ft.Colors.ON_PRIMARY_CONTAINER,
                            ),
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
        """Handle sending a message."""
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

        # Send to API
        try:
            result, error = await api_client.add_message(self.current_session["id"], text)
            
            if error:
                self.show_error(f"Failed to send message: {error}")
                # Remove the message from UI on error
                self.messages.pop()
                self._update_messages_list()
                self.app.page.update()
                return
            
            if result:
                # Update session state
                self.session_state = result.get("session_state", self.session_state)
                
                # Extract and add AI response to messages
                ai_message = {
                    "role": result.get("role", "assistant"),
                    "content": result.get("content", ""),
                }
                if ai_message["content"]:
                    self.messages.append(ai_message)
                    self._update_messages_list()
                    self.app.page.update()
                
        except Exception as e:
            self.show_error(f"Error sending message: {str(e)}")

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
