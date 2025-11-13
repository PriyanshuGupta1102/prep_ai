#!/usr/bin/env bash
# Helper script for Render: runs the start script which uses $PORT
# Render sets $PORT automatically, so we only fallback when missing.
if [ -z "$PORT" ]; then
  PORT=10000
fi

echo "Starting app on port $PORT..."

# Use npm to run the render:start script which calls `next start -p $PORT`.
npm run render:start
