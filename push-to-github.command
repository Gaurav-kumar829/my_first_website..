#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo "🚀 Pushing OfferShield to GitHub..."
echo "Repository: https://github.com/Gaurav-kumar829/my_first_website.."
echo "=================================================="
echo ""
echo "Note: When prompted for Password, GitHub requires a Personal Access Token (PAT)."
echo "If you need a token: https://github.com/settings/tokens"
echo ""

git push -u origin main --force

echo ""
echo "=================================================="
read -p "Press Enter to finish..."
