import { useState, useEffect } from 'react';
import fs from 'fs';
import path from 'path';

export async function getStaticProps() {
  const templatePath = path.join(process.cwd(), 'resources', 'templates', 'add-note-template-1.txt');
  const noteTemplate = fs.readFileSync(templatePath, 'utf-8');
  return { props: { noteTemplate } };
}

export default function NoteForm({ noteTemplate }) {
  const [dateTime, setDateTime] = useState('');
  const [linkType, setLinkType] = useState('DataLink');
  const [sourceLink, setSourceLink] = useState('');
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

  // Set default date/time to nearest 15-minute interval in MDT timezone
  useEffect(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const adjustedHours = roundedMinutes === 60 ? now.getHours() + 1 : now.getHours();
    const adjustedMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    
    // Create date in MDT timezone and format for datetime-local input
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

  const handleCreateNote = (e) => {
    e.preventDefault();
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      const [datePart, timePart] = dateTime.split('T');
      const [YYYY, MM, DD] = datePart.split('-');
      const [hh, mm] = timePart.split(':');

      const noteText = noteTemplate
        .replaceAll('{{YYYY}}', YYYY)
        .replaceAll('{{MM}}', MM)
        .replaceAll('{{DD}}', DD)
        .replaceAll('{{hh}}', hh)
        .replaceAll('{{mm}}', mm)
        .replaceAll('{{link-type}}', linkType)
        .replaceAll('{{url}}', sourceLink);

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
              <label htmlFor="dateTime" className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                id="dateTime" 
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
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