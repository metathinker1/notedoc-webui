// API route to fetch NoteDoc files from the repository
import fs from 'fs';
import path from 'path';
import config from '../../config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const noteDocPath = config.noteDocRepoPath;

    // Check if the path exists
    if (!fs.existsSync(noteDocPath)) {
      return res.status(400).json({ 
        error: 'NoteDoc repository path does not exist',
        path: noteDocPath
      });
    }

    // Read all files in the NoteDoc repository and filter by pattern
    const files = fs.readdirSync(noteDocPath);
    
    // Filter files that match the pattern "*.*.n*"
    const noteDocFiles = files
      .filter(file => {
        // Match files with pattern: *.*.n* (e.g., project.myproject.design.n, task.mytask.planning.n)
        return file.match(/^[^.]+\.[^.]+\.n/);
      })
      .map(file => {
        // Parse file name into components
        const parts = file.split('.');
        if (parts.length >= 3) {
          // Format: entityType.entityName.entityAspect.n[extension]
          const entityType = parts[0];
          const entityName = parts[1];
          const entityAspect = parts[2];
          
          return {
            id: file,
            entityType,
            entityName,
            entityAspect,
            fileName: file
          };
        }
        return null;
      })
      .filter(Boolean); // Remove any null entries

    res.status(200).json({ 
      files: noteDocFiles,
      count: noteDocFiles.length
    });
  } catch (error) {
    console.error('Error reading NoteDoc files:', error);
    res.status(500).json({ error: 'Failed to read NoteDoc files' });
  }
}