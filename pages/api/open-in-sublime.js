// API route to open a NoteDoc file in Sublime Text, scrolled to the last line
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import config from '../../config.js';

const execFileAsync = promisify(execFile);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName } = req.body;

    if (
      typeof fileName !== 'string' ||
      !fileName.trim() ||
      fileName.includes('/') ||
      fileName.includes('\\') ||
      fileName.includes('..')
    ) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const fullPath = path.join(config.noteDocRepoPath, fileName);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found', path: fullPath });
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lastLine = content.split('\n').length;

    // subl accepts file:line[:column] as a single argument to open at a position
    await execFileAsync('subl', [`${fullPath}:${lastLine}`]);

    res.status(200).json({ success: true, path: fullPath, line: lastLine });
  } catch (error) {
    console.error('Error opening file in Sublime Text:', error);
    res.status(500).json({ error: error.message || 'Failed to open file in Sublime Text' });
  }
}
