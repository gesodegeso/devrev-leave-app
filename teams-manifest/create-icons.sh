#!/bin/bash

# Simple script to create basic Teams app icons
# Requires ImageMagick

set -e

echo "Creating Teams App Icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "Error: ImageMagick is not installed."
    echo "Install it with: sudo apt-get install imagemagick"
    exit 1
fi

# Color icon (192x192)
echo "Creating color.png (192x192)..."
convert -size 192x192 xc:'#0078D4' \
  -font DejaVu-Sans-Bold -pointsize 100 -fill white \
  -gravity center -annotate +0+0 "休" \
  -bordercolor '#0078D4' -border 10 \
  color.png

# Outline icon (32x32)
echo "Creating outline.png (32x32)..."
convert -size 32x32 xc:transparent \
  -font DejaVu-Sans-Bold -pointsize 24 -fill white \
  -gravity center -annotate +0+0 "休" \
  outline.png

echo "Icons created successfully!"
echo ""
echo "Files created:"
echo "  - color.png (192x192)"
echo "  - outline.png (32x32)"
echo ""
echo "Next steps:"
echo "  1. Edit manifest.json and replace YOUR_MICROSOFT_APP_ID"
echo "  2. Run: zip -r teams-app.zip manifest.json color.png outline.png"
echo "  3. Upload teams-app.zip to Microsoft Teams"
