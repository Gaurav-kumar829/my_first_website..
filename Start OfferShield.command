#!/bin/bash
# OfferShield One-Click Launcher for macOS
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Add node to PATH from all common paths
export PATH="$HOME/.local/node/bin:$PATH:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"

echo "=================================================="
echo "🛡️  Starting OfferShield Backend Server..."
echo "=================================================="

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not found in PATH."
    echo "Please ensure Node is installed at $HOME/.local/node/bin/node"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Node.js $(node -v) detected."
echo "🚀 Launching backend on http://localhost:3000..."

# Open browser after 1.5 seconds
(sleep 1.5 && open "http://localhost:3000") &

# Start the server
cd backend && node server.js
