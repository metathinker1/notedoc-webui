# NoteDoc Web UI

A simple Next.js application for entering metadata and a source link for notes to be added to a NoteDoc.

## Features

- Date & time input with default value snapped to nearest 15-minute interval
- Source link entry
- Configuration for NoteDoc repository directory location (via environment variable)

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

The NoteDoc repository path is configured via the environment variable `NOTE_DOC_REPO_PATH`.

This value is read at runtime and cannot be changed through the UI. The UI displays the configured path for reference purposes only.

## API Endpoints

- `POST /api/submit-note` - Submit a new note to the NoteDoc repository

## Project Structure

```
notedoc-webui/
├── pages/
│   └── index.js        # Main form page
│   └── api/
│       └── submit-note.js  # API endpoint for note submission
├── config.js           # Configuration file
├── next.config.js      # Next.js configuration
└── package.json        # Project dependencies and scripts
```

## Technical Details

The date/time field defaults to the nearest 15-minute interval when the form loads. This ensures consistent timestamp formatting for notes in the NoteDoc system.

Each note carries a single source link.