#!/bin/bash
set -e

cd /Users/stefano/repos/open-marcus/backend-python

# Check Python version
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $PYTHON_VERSION"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install core dependencies
echo "Installing core dependencies..."
pip install --upgrade pip

# Flet and web framework
pip install flet fastapi uvicorn

# Database
pip install sqlalchemy aiosqlite

# Data validation
pip install pydantic pydantic-settings

# Authentication
pip install passlib[argon2] python-jose[cryptography] bcrypt

# LLM integration (llama-cpp-python with Metal support for Mac)
pip install llama-cpp-python

# Speech
pip install faster-whisper piper-tts

# Testing
pip install pytest pytest-asyncio httpx

# Code quality
pip install ruff black mypy

echo "Python environment ready"
echo "To activate: source venv/bin/activate"
echo "To run Flet: flet run"
