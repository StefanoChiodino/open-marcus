"""
Password Lock Screen for OpenMarcus.
Shows on app launch to require master password before accessing data.
"""

import flet as ft


class PasswordLockScreen:
    """Password lock screen requiring master password to unlock the app."""
    
    def __init__(self, app):
        self.app = app
        self.password_field = ft.TextField(
            label="Master Password",
            password=True,
            width=300,
            autofocus=True,
            on_submit=self.handle_unlock
        )
        self.confirm_password_field = ft.TextField(
            label="Confirm Password",
            password=True,
            width=300,
            visible=False
        )
        self.error_text = ft.Text(
            color=ft.Colors.ERROR,
            visible=False,
        )
        self.success_text = ft.Text(
            color=ft.Colors.GREEN,
            visible=False,
        )
        self.status_text = ft.Text(
            value="Enter your master password to unlock your data.",
            size=14,
            color=ft.Colors.GREY_600,
            text_align=ft.TextAlign.CENTER
        )
        self.unlock_button = ft.ElevatedButton(
            "Unlock",
            width=300,
            on_click=self.handle_unlock,
        )
        self.setup_button = ft.ElevatedButton(
            "Create Password",
            width=300,
            on_click=self.handle_setup,
            visible=False
        )
    
    def build(self) -> ft.View:
        """Build the password lock view."""
        return ft.View(
            route="/lock",
            controls=[
                ft.Container(
                    alignment=ft.alignment.center,
                    expand=True,
                    content=ft.Column(
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        controls=[
                            ft.Icon(
                                name=ft.Icons.LOCK,
                                size=64,
                                color=ft.Colors.DEEP_PURPLE,
                            ),
                            ft.Container(height=24),
                            ft.Text(
                                "OpenMarcus",
                                size=48,
                                weight=ft.FontWeight.BOLD,
                            ),
                            ft.Text(
                                "Your Stoic Meditation Companion",
                                size=16,
                                color=ft.Colors.GREY_600,
                            ),
                            ft.Container(height=40),
                            self.status_text,
                            ft.Container(height=16),
                            self.error_text,
                            self.success_text,
                            ft.Container(height=8),
                            ft.Container(
                                content=ft.Column(
                                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                                    controls=[
                                        self.password_field,
                                        ft.Container(height=12),
                                        self.confirm_password_field,
                                        ft.Container(height=16),
                                        self.unlock_button,
                                        self.setup_button,
                                    ],
                                    alignment=ft.MainAxisAlignment.CENTER,
                                ),
                            ),
                        ],
                    ),
                ),
            ],
        )
    
    def handle_unlock(self, e=None) -> None:
        """Handle unlock button click."""
        password = self.password_field.value
        
        if not password:
            self.show_error("Please enter your password")
            return
        
        from src.services.password_lock import password_lock_service
        
        if not password_lock_service.is_password_set():
            # No password set yet - go to setup mode
            self.show_setup_mode()
            return
        
        success, error = password_lock_service.unlock_with_password(password)
        
        if success:
            self.show_success("Unlocked! Loading your data...")
            # Navigate to login after short delay
            self.app.page.go("/login")
        else:
            self.show_error(error or "Invalid password")
    
    def handle_setup(self, e=None) -> None:
        """Handle setup new password button click."""
        password = self.password_field.value
        confirm = self.confirm_password_field.value
        
        if not password:
            self.show_error("Please enter a password")
            return
        
        if len(password) < 8:
            self.show_error("Password must be at least 8 characters")
            return
        
        if not confirm:
            self.show_error("Please confirm your password")
            return
        
        if password != confirm:
            self.show_error("Passwords do not match")
            return
        
        from src.services.password_lock import password_lock_service
        
        success, error = password_lock_service.setup_new_password(password)
        
        if success:
            self.show_success("Password created! Loading your data...")
            self.app.page.go("/login")
        else:
            self.show_error(error or "Failed to create password")
    
    def show_setup_mode(self) -> None:
        """Switch to setup mode for first-time users."""
        self.password_field.label = "Create Master Password"
        self.confirm_password_field.visible = True
        self.unlock_button.visible = False
        self.setup_button.visible = True
        self.status_text.value = "Create a master password to encrypt your data."
        self.error_text.visible = False
        self.app.page.update()
    
    def show_error(self, message: str) -> None:
        """Show error message."""
        self.error_text.value = message
        self.error_text.visible = True
        self.success_text.visible = False
        self.app.page.update()
    
    def show_success(self, message: str) -> None:
        """Show success message."""
        self.success_text.value = message
        self.success_text.visible = True
        self.error_text.visible = False
        self.app.page.update()
    
    def reset(self) -> None:
        """Reset the lock screen to initial state."""
        self.password_field.value = ""
        self.password_field.label = "Master Password"
        self.password_field.visible = True
        self.confirm_password_field.value = ""
        self.confirm_password_field.visible = False
        self.unlock_button.visible = True
        self.unlock_button.text = "Unlock"
        self.setup_button.visible = False
        self.status_text.value = "Enter your master password to unlock your data."
        self.error_text.visible = False
        self.success_text.visible = False
