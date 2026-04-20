"""
E2E Test Configuration for OpenMarcus.

This module provides fixtures for testing the OpenMarcus Flet application
using Playwright for browser automation.

To run the Flet app in web mode for testing, we start it as a subprocess
on a specific port and use Playwright to interact with it.
"""

import os
import sys
import time
import subprocess
import signal
from pathlib import Path
from typing import Generator, Optional

import pytest
from playwright.sync_api import sync_playwright, Browser, Page, Playwright


# Add src to path so we can import modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

# Base URL for the Flet web app
FLET_WEB_URL = "http://localhost:3100"

# Path to the E2E test app
TEST_APP_PATH = Path(__file__).parent / "flet_test_app.py"


class FletAppServer:
    """Context manager for running Flet app as a web server."""
    
    def __init__(self, port: int = 3100, timeout: int = 30):
        self.port = port
        self.timeout = timeout
        self.process: Optional[subprocess.Popen] = None
        self.url = f"http://localhost:{port}"
    
    def start(self) -> None:
        """Start the Flet app in web mode."""
        env = os.environ.copy()
        env["FLET_PORT"] = str(self.port)
        
        # Get the directory containing the test app
        test_app_dir = str(Path(__file__).parent)
        
        # Run the test app directly using the venv's Python
        # We use the test app which has minimal dependencies
        self.process = subprocess.Popen(
            [sys.executable, str(TEST_APP_PATH)],
            cwd=test_app_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            preexec_fn=os.setsid if hasattr(os, 'setsid') else None,
        )
        
        # Wait for the app to start
        self._wait_for_startup()
    
    def _wait_for_startup(self) -> None:
        """Wait for the Flet app to start."""
        import urllib.request
        import urllib.error
        
        start_time = time.time()
        while time.time() - start_time < self.timeout:
            try:
                urllib.request.urlopen(self.url, timeout=1)
                return
            except (urllib.error.URLError, ConnectionRefusedError):
                time.sleep(0.5)
        
        # If we get here, the app didn't start - check what happened
        if self.process:
            stdout, stderr = self.process.communicate(timeout=1)
            print(f"Flet app stdout: {stdout.decode() if stdout else 'None'}")
            print(f"Flet app stderr: {stderr.decode() if stderr else 'None'}")
        
        raise RuntimeError(f"Flet app failed to start within {self.timeout} seconds")
    
    def stop(self) -> None:
        """Stop the Flet app."""
        if self.process:
            if hasattr(os, 'killpg'):
                try:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                except ProcessLookupError:
                    pass
            else:
                self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
    
    def __enter__(self) -> "FletAppServer":
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.stop()


@pytest.fixture(scope="session")
def flet_app_server() -> Generator[FletAppServer, None, None]:
    """
    Session-scoped fixture that starts the Flet app in web mode.
    
    This runs once per test session and provides the base URL for testing.
    """
    server = FletAppServer(port=3100, timeout=30)
    server.start()
    yield server
    server.stop()


@pytest.fixture(scope="session")
def playwright_instance() -> Generator[Playwright, None, None]:
    """
    Session-scoped Playwright instance.
    
    This runs once per test session and manages the browser lifecycle.
    """
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_instance: Playwright) -> Generator[Browser, None, None]:
    """
    Session-scoped browser instance.
    
    This runs once per test session and provides the browser for testing.
    """
    browser = playwright_instance.chromium.launch(headless=True)
    yield browser
    browser.close()


@pytest.fixture(scope="function")
def page(browser: Browser, flet_app_server: FletAppServer) -> Generator[Page, None, None]:
    """
    Function-scoped page fixture.
    
    This provides a fresh page for each test function.
    Note: Flet apps use WebSockets to communicate between the Python backend
    and the web frontend. In a headless environment, the WebSocket connection
    may not be established properly, causing the page content to not render.
    """
    context = browser.new_context()
    page = context.new_page()
    
    # Navigate to the lock screen
    page.goto(f"{flet_app_server.url}/lock")
    
    # Wait for the Flet app to initialize
    # Note: The page content is rendered client-side via JavaScript/WebSocket
    page.wait_for_load_state("domcontentloaded")
    
    # Give the Flet app time to initialize WebSocket connection
    page.wait_for_timeout(3000)
    
    yield page
    
    page.close()
    context.close()


@pytest.fixture(scope="function")
def page_with_storage(page: Page) -> Page:
    """
    Page fixture with localStorage cleared.
    
    This provides a clean page state for each test.
    """
    page.evaluate("() => localStorage.clear()")
    return page


# Alias for backward compatibility
@pytest.fixture(scope="function")
def authenticated_page(page: Page) -> Page:
    """
    Placeholder for authenticated page fixture.
    
    This will be used for tests that require a logged-in user.
    Currently returns the page as-is.
    """
    return page
