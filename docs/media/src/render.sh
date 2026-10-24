#!/bin/sh
# Renders the README banner and diagram from their HTML sources at 2x.
# Run from the repo root: sh docs/media/src/render.sh
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() { # name width height
  "$CHROME" --headless=new --hide-scrollbars --force-device-scale-factor=2 --virtual-time-budget=8000 \
    --allow-file-access-from-files --window-size="$2,$3" --screenshot="../$1.png" "file://$PWD/$1.html" 2>/dev/null
}
render banner 1600 600
render how-yappy-works 1600 690
