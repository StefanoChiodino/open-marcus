#!/bin/bash
set -e

cd /Users/stefano/repos/open-marcus

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  pnpm install
fi

# Check if playwright browsers are installed
if [ ! -d "node_modules/@playwright/test" ]; then
  echo "Installing Playwright browsers..."
  npx playwright install chromium
fi

echo "Environment ready for e2e testing"
