import React from 'react';

const FileViewer = ({ file, onClose, isLoading }) => {
    // This component will not render if there's no file to view and it's not in a loading state.
    if (!file && !isLoading) return null;

    // Decodes base64 content from the GitHub API.
    const decodedContent = () => {
        if (!file?.content) return "No content available.";
        try {
            return atob(file.content);
        } catch (e) {
            console.error("Failed to decode base64 content", e);
            return "Error: Could not decode file content. It might be binary or corrupted.";
        }
    };

    return (
        // Modal overlay
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
                    <h3 className="font-mono text-lg text-gray-200 truncate pr-4">
                        {isLoading ? 'Loading...' : file.path}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white text-3xl font-bold leading-none p-1"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </header>
                <main className="flex-grow p-4 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <p>Fetching file content...</p>
                        </div>
                    ) : (
                         <pre className="text-sm whitespace-pre-wrap break-words">
                            <code className="font-mono">{decodedContent()}</code>
                         </pre>
                    )}
                </main>
            </div>
        </div>
    );
};

export default FileViewer;