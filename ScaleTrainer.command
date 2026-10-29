#!/bin/bash
# Jazz Scale Trainer launcher.
#
# Runs the Vite dev server and opens Chrome (required for Web MIDI). The app is
# 100% browser-based: no Python backend, no build step needed to try it.

set -e

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# --- Pick a JS package manager --------------------------------------------
JS_PM=""
if command -v npm >/dev/null 2>&1; then
    JS_PM="npm"
elif command -v bun >/dev/null 2>&1; then
    JS_PM="bun"
elif [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
    JS_PM="bun"
else
    echo "==> ERROR: npm or bun is required."
    echo "    Install Node.js (https://nodejs.org) or bun (https://bun.sh), then re-run."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "==> Installing dependencies (first run)..."
    "$JS_PM" install
fi

URL="http://127.0.0.1:5174"

# Open Chrome once the dev server is up. Web MIDI needs Chrome/Edge (not Safari).
(
    for _ in $(seq 1 40); do
        if curl -sf "$URL" >/dev/null 2>&1; then
            break
        fi
        sleep 0.25
    done
    if open -Ra "Google Chrome" >/dev/null 2>&1; then
        open -a "Google Chrome" "$URL"
    else
        echo "==> Google Chrome not found. Open $URL in Chrome or Edge for live MIDI."
        open "$URL" || true
    fi
) &

echo "==> Starting Jazz Scale Trainer on $URL"
echo "==> Use Chrome or Edge for live MIDI from your Nord Grand 2."
exec "$JS_PM" run dev
