// Configuration file for NoteDoc Web UI
const config = {
  // Default NoteDoc repository path - can be overridden via environment variables
  noteDocRepoPath: process.env.NOTE_DOC_REPO_PATH || '/default/note-doc/path',
  
  // Default date/time format
  dateTimeFormat: 'YYYY-MM-DDTHH:mm',
  
  // Default time interval for date/time snapping (in minutes)
  timeSnapInterval: 15,
};

module.exports = config;