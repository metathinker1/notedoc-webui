import { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

export async function getStaticProps() {
  const templatesDir = path.join(process.cwd(), 'resources', 'templates');
  const noteTemplate = fs.readFileSync(path.join(templatesDir, 'add-note-template-1.txt'), 'utf-8');
  const slackNoteTemplate = fs.readFileSync(path.join(templatesDir, 'add-note-template-2.txt'), 'utf-8');

  const slackChannelsCsv = fs.readFileSync(path.join(process.cwd(), 'resources', 'slack-channels.csv'), 'utf-8');
  const slackChannels = slackChannelsCsv.split('\n').map(line => line.trim()).filter(Boolean);

  return { props: { noteTemplate, slackNoteTemplate, slackChannels } };
}

export default function NoteForm({ noteTemplate, slackNoteTemplate, slackChannels }) {
  const [dateTime, setDateTime] = useState('');
  const [linkType, setLinkType] = useState('DataLink');
  const [sourceLink, setSourceLink] = useState('');
  const [slackChannel, setSlackChannel] = useState('');
  const [knownSlackChannels, setKnownSlackChannels] = useState(slackChannels);
  const [noteDocPath, setNoteDocPath] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [generatedNote, setGeneratedNote] = useState('');
  const [noteDocFiles, setNoteDocFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [datePart = '', timePart = '00:00'] = dateTime.split('T');
  const [hourPart = '00', minutePart = '00'] = timePart.split(':');

  // Set default date/time to nearest 15-minute interval in MDT timezone
  useEffect(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const adjustedHours = roundedMinutes === 60 ? now.getHours() + 1 : now.getHours();
    const adjustedMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    
    // Create date in MDT timezone and format for the date/hour/minute fields
    const dateForMDT = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      adjustedHours,
      adjustedMinutes
    );
    
    // Convert to MDT timezone and format as YYYY-MM-DDTHH:mm
    const year = dateForMDT.getFullYear();
    const month = String(dateForMDT.getMonth() + 1).padStart(2, '0');
    const day = String(dateForMDT.getDate()).padStart(2, '0');
    const hours = String(dateForMDT.getHours()).padStart(2, '0');
    const minutesFormatted = String(dateForMDT.getMinutes()).padStart(2, '0');
    
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutesFormatted}`;
    
    setDateTime(formattedDateTime);
  }, []);

  // Fetch NoteDoc files on component mount
  useEffect(() => {
    const fetchNoteDocFiles = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/note-doc-files');
        const data = await response.json();

        // The configured repo path is server-only (NOTE_DOC_REPO_PATH isn't
        // exposed to the client), so read it from the API response instead -
        // it's included whether the request succeeded or failed.
        if (data.path) {
          setNoteDocPath(data.path);
        }

        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        setNoteDocFiles(data.files || []);
        setFilteredFiles(data.files || []);
      } catch (err) {
        console.error('Failed to fetch NoteDoc files:', err);
        setError('Failed to load NoteDoc files');
      } finally {
        setLoading(false);
      }
    };

    fetchNoteDocFiles();
  }, []);

  // Filter files based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredFiles(noteDocFiles);
    } else {
      const filtered = noteDocFiles.filter(file => 
        file.entityName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [searchTerm, noteDocFiles]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowSuggestions(true);
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setShowSuggestions(false);
  };

  const saveNewSlackChannel = async (channelName) => {
    try {
      const response = await fetch('/api/slack-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channelName }),
      });
      const data = await response.json();
      if (response.ok && data.added) {
        setKnownSlackChannels(data.channels);
      }
    } catch (err) {
      console.error('Failed to save new Slack channel:', err);
    }
  };

  const handleCreateNote = (e) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      const [datePart, timePart] = dateTime.split('T');
      const [YYYY, MM, DD] = datePart.split('-');
      const [hh, mm] = timePart.split(':');

      const hasSlackChannel = slackChannel.trim() !== '';
      const template = hasSlackChannel ? slackNoteTemplate : noteTemplate;

      let noteText = template
        .replaceAll('{{YYYY}}', YYYY)
        .replaceAll('{{MM}}', MM)
        .replaceAll('{{DD}}', DD)
        .replaceAll('{{hh}}', hh)
        .replaceAll('{{mm}}', mm)
        .replaceAll('{{link-type}}', linkType)
        .replaceAll('{{url}}', sourceLink);

      if (hasSlackChannel) {
        // The template already supplies the leading '#' as literal text.
        const channelName = slackChannel.trim().replace(/^#/, '');
        noteText = noteText.replaceAll('{{#slack-channel}}', channelName);

        const isKnownChannel = knownSlackChannels.some(
          name => name.toLowerCase() === channelName.toLowerCase()
        );
        if (!isKnownChannel) {
          saveNewSlackChannel(channelName);
        }
      }

      setGeneratedNote(noteText);
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error generating note text:', error);
      setSubmitError('Failed to generate note text');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">NoteDoc Note Entry</h1>
          <p className="text-gray-600 mb-6">Enter metadata and a source link for your note</p>
          
          <form onSubmit={handleCreateNote} className="space-y-6">
            {/* Date and Time Field */}
            <div>
              <label htmlFor="datePart" className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time (24-hour)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  id="datePart"
                  value={datePart}
                  onChange={(e) => setDateTime(`${e.target.value}T${hourPart}:${minutePart}`)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <select
                  aria-label="Hour"
                  value={hourPart}
                  onChange={(e) => setDateTime(`${datePart}T${e.target.value}:${minutePart}`)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <span className="text-gray-500">:</span>
                <select
                  aria-label="Minute"
                  value={minutePart}
                  onChange={(e) => setDateTime(`${datePart}T${hourPart}:${e.target.value}`)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Link Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link Type
              </label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="DataLink">DataLink</option>
                <option value="TextLink">TextLink</option>
              </select>
            </div>

            {/* NoteDoc Repository Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NoteDoc Repository
              </label>
              
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading NoteDoc files...</div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">{error}</div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Search for NoteDoc files..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  {showSuggestions && filteredFiles.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => handleFileSelect(file)}
                          className="px-4 py-2 hover:bg-blue-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium">{file.entityName}</div>
                          <div className="text-sm text-gray-600">
                            {file.entityType} • {file.entityAspect}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedFile && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="font-medium text-blue-800">Selected NoteDoc File:</div>
                  <div className="text-sm mt-2">
                    {selectedFile.entityType}.{selectedFile.entityName}.{selectedFile.entityAspect}
                  </div>
                </div>
              )}
              
              {/* Matching NoteDoc Files List */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Matching NoteDoc Files:</h3>
                <div className="bg-gray-50 rounded-md p-2 max-h-40 overflow-y-auto w-full">
                  {filteredFiles.length > 0 ? (
                    <ul className="space-y-1 w-full">
                      {filteredFiles.map((file) => (
                        <li key={file.id} className="text-sm p-2 hover:bg-gray-100 rounded cursor-pointer w-full whitespace-nowrap overflow-hidden text-ellipsis" onClick={() => handleFileSelect(file)}>
                          {file.entityType}.{file.entityName}.{file.entityAspect}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 p-2">No matching files found</p>
                  )}
                </div>
              </div>
            </div>

            {/* Source Link Section */}
            <div>
              <label htmlFor="sourceLink" className="block text-sm font-medium text-gray-700 mb-1">
                Source Link
              </label>
              <input
                type="url"
                id="sourceLink"
                value={sourceLink}
                onChange={(e) => setSourceLink(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
                minLength="10"
              />
            </div>

            {/* Slack Channel Section */}
            <div>
              <label htmlFor="slackChannel" className="block text-sm font-medium text-gray-700 mb-1">
                Slack Channel
              </label>
              <input
                type="text"
                id="slackChannel"
                list="slackChannelOptions"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="channel-name"
                autoComplete="off"
              />
              <datalist id="slackChannelOptions">
                {knownSlackChannels.map((channel) => (
                  <option key={channel} value={channel} />
                ))}
              </datalist>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-3 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Note
              </button>
            </div>
          </form>

          {/* Generated Note Display */}
          {generatedNote && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Generated Note:</h3>
              <textarea
                readOnly
                value={generatedNote}
                rows={Math.max(10, generatedNote.split('\n').length + 2)}
                className="w-full p-4 bg-gray-100 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          )}

          {/* Success Message */}
          {submitSuccess && (
            <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              <p>Note text generated below.</p>
            </div>
          )}

          {/* Error Message */}
          {submitError && (
            <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              <p>{submitError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}