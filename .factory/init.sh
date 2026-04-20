#!/bin/bash
# OpenMarcus E2E Test Mission - Environment Setup

set -e

cd /Users/stefano/repos/open-marcus/src

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Install Playwright for E2E testing
echo "Installing Playwright..."
pip install -q playwright
playwright install chromium

# Create e2e test directory
mkdir -p tests/e2e

# Verify installation
echo "Verifying installation..."
python -c "import flet; print(f'Flet {flet.__version__} installed')"
python -c "import playwright; print('Playwright installed')"

echo "Setup complete!"
