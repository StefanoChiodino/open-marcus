#!/bin/bash
set -e

echo "Initializing OpenMarcus development environment..."

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "Warning: Node.js 22+ required. Found Node.js $(node --version)"
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "Creating .env file from example..."
    cp .env.example .env 2>/dev/null || true
fi

# Check Ollama installation
if ! command -v ollama &> /dev/null; then
    echo "Warning: Ollama not found. Install from https://ollama.com"
fi

# Create data directory
mkdir -p data

echo "Initialization complete."
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "Ensure Ollama is running with:"
echo "  ollama serve"
echo "  ollama pull llama3.2:latest"
