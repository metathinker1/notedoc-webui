import { useState, useEffect } from 'react';

export default function NoteForm() {
  const [dateTime, setDateTime] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceLinks, setSourceLinks] = useState(['']);
  const [noteDocPath, setNoteDocPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Set default date/time to nearest 15-minute interval
  useEffect(() => {
    const now = new Date();
    const minutes = now.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const adjustedHours = roundedMinutes === 60 ? now.getHours() + 1 : now.getHours();
    const adjustedMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    
    const formattedDateTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      adjustedHours,
      adjustedMinutes
    ).toISOString().slice(0, 16);
    
    setDateTime(formattedDateTime);
    
    // Set NoteDoc path from environment variable (only on client-side)
    if (typeof window !== 'undefined') {
      setNoteDocPath(process.env.NOTE_DOC_REPO_PATH || '/default/note-doc/path');
    }
  }, []);

  const addSourceLink = () => {
    setSourceLinks([...sourceLinks, '']);
  };

  const removeSourceLink = (index) => {
    if (sourceLinks.length > 1) {
      const newLinks = [...sourceLinks];
      newLinks.splice(index, 1);
      setSourceLinks(newLinks);
    }
  };

  const updateSourceLink = (index, value) => {
    const newLinks = [...sourceLinks];
    newLinks[index] = value;
    setSourceLinks(newLinks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // In a real implementation, this would send data to the backend
      const noteData = {
        dateTime,
        title,
        description,
        sourceLinks: sourceLinks.filter(link => link.trim() !== ''),
        noteDocPath: noteDocPath || '/default/note-doc/path'
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Note data to be submitted:', noteData);
      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setTitle('');
      setDescription('');
      setSourceLinks(['']);
    } catch (error) {
      console.error('Error submitting note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">NoteDoc Note Entry</h1>
          <p className="text-gray-600 mb-6">Enter metadata and source links for your note</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Source Links Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Links
              </label>
              <div className="space-y-2">
                {sourceLinks.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => updateSourceLink(index, e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 min-w-[500px]"
                      placeholder="https://example.com ----"
                      minLength="10"
                      style={{ minWidth: '500px' }}
                    />
                    {sourceLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSourceLink(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSourceLink}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add Source Link
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-3 rounded-md font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Note'}
              </button>
            </div>
          </form>

          {/* Success Message */}
          {submitSuccess && (
            <div className="mt-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
              <p>Note submitted successfully!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}