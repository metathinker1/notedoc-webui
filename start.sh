#!/bin/bash

echo "Starting NoteDoc Web UI..."

# Check if node_modules exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
echo "Starting Next.js development server..."
npm run dev