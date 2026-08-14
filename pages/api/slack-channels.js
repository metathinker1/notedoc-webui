// API route to append a new Slack channel to the known-channels CSV
import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), 'resources', 'slack-channels.csv');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { channel } = req.body;
    const trimmed = typeof channel === 'string' ? channel.trim() : '';

    if (!trimmed) {
      return res.status(400).json({ error: 'channel is required' });
    }

    const raw = fs.readFileSync(csvPath, 'utf-8');
    const channels = raw.split('\n').map(line => line.trim()).filter(Boolean);
    const alreadyKnown = channels.some(name => name.toLowerCase() === trimmed.toLowerCase());

    if (!alreadyKnown) {
      const needsNewline = raw.length > 0 && !raw.endsWith('\n');
      fs.appendFileSync(csvPath, `${needsNewline ? '\n' : ''}${trimmed}\n`);
      channels.push(trimmed);
    }

    res.status(200).json({ channels, added: !alreadyKnown });
  } catch (error) {
    console.error('Error updating Slack channels:', error);
    res.status(500).json({ error: 'Failed to update Slack channels' });
  }
}
