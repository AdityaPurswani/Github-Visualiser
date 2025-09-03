import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Icons } from './Icon.jsx';

const AIAssistant = ({ repoData, onFileContentRequested }) => {
    const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
    const [isKeyValid, setIsKeyValid] = useState(false);
    const [isKeyLoading, setIsKeyLoading] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [userQuery, setUserQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const chatEndRef = useRef(null);

    useEffect(() => {
        if (apiKey) {
            validateApiKey(apiKey);
        }
    }, [apiKey]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    const validateApiKey = async (key) => {
        if (!key) {
            setIsKeyValid(false);
            return;
        }
        setIsKeyLoading(true);
        try {
            const genAI = new GoogleGenerativeAI(key);
            // Quick check to see if the model can be initialized
            await genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            setIsKeyValid(true);
            localStorage.setItem('gemini_api_key', key);
        } catch (error) {
            console.error("API Key validation failed:", error);
            setIsKeyValid(false);
            localStorage.removeItem('gemini_api_key');
        } finally {
            setIsKeyLoading(false);
        }
    };

    const handleFileSelection = (e) => {
        const { value, checked } = e.target;
        setSelectedFiles(prev =>
            checked ? [...prev, value] : prev.filter(file => file !== value)
        );
    };

    const handleQuerySubmit = async (e) => {
        e.preventDefault();
        if (!userQuery.trim() || isLoading || selectedFiles.length === 0) return;

        const userMessage = { role: 'user', text: userQuery };
        setChatHistory(prev => [...prev, userMessage]);
        setIsLoading(true);
        setUserQuery('');

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

            let context = "CONTEXT: You are an expert programmer and AI assistant. The user has provided the following file(s) from a GitHub repository. Answer the user's question based on the content of these files.\n\n";

            for (const filePath of selectedFiles) {
                const file = repoData.files.find(f => f.path === filePath);
                let content = '';

                if (file && file.size > 1000000) { 
                    content = `[Error: This file is larger than 1MB (${(file.size / 1024 / 1024).toFixed(2)} MB) and could not be processed.]`;
                } else {
                    // Fetch the raw text content directly
                    content = await onFileContentRequested(filePath);
                }
                context += `--- FILE: ${filePath} ---\n\`\`\`\n${content}\n\`\`\`\n\n`;
            }
            
            const prompt = `${context}QUESTION: ${userQuery}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            setChatHistory(prev => [...prev, { role: 'model', text }]);

        } catch (error) {
            console.error("Error generating content:", error);
            if (error.message && (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID"))) {
                setChatHistory(prev => [...prev, { role: 'model', text: "It seems the API key is invalid. Please re-enter a valid key to continue." }]);
                handleChangeKey(); // Log out and clear the invalid key
            } else {
                setChatHistory(prev => [...prev, { role: 'model', text: `Sorry, an error occurred: ${error.message}` }]);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleChangeKey = () => {
        setIsKeyValid(false);
        setApiKey('');
        localStorage.removeItem('gemini_api_key');
    };
    
    // API Key Input View
    if (!isKeyValid) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg text-white">
                <h3 className="text-xl font-semibold mb-4">AI Assistant Setup</h3>
                <p className="text-gray-400 mb-4">Please enter your Google Gemini API key to use this feature. You can get a free key from Google AI Studio.</p>
                <div className="flex items-center gap-2">
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Gemini API Key"
                        className="flex-grow bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => validateApiKey(apiKey)} disabled={isKeyLoading} className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                        {isKeyLoading ? 'Validating...' : 'Save Key'}
                    </button>
                </div>
                 {!isKeyValid && apiKey && !isKeyLoading && <p className="text-red-400 mt-2">The API key provided is invalid.</p>}
            </div>
        );
    }

    // Main AI Assistant View
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* File Selection Panel */}
            <div className="lg:col-span-1 bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
                    <h3 className="text-xl font-semibold">Select Files</h3>
                     <button onClick={handleChangeKey} className="text-xs text-blue-400 hover:underline">Change API Key</button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                    {repoData?.files?.filter(f => f.type === 'blob').map(file => (
                        <div key={file.path} className="flex items-center my-2">
                            <input
                                type="checkbox"
                                id={`file-${file.path}`}
                                value={file.path}
                                onChange={handleFileSelection}
                                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600"
                            />
                            <label htmlFor={`file-${file.path}`} className="ml-3 text-sm text-gray-300 truncate">{file.path}</label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-2 bg-gray-800 rounded-lg flex flex-col h-[80vh]">
                <div className="flex-grow p-4 overflow-y-auto">
                    <div className="space-y-4">
                        {chatHistory.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                         {isLoading && (
                            <div className="flex justify-start">
                                 <div className="max-w-lg p-3 rounded-lg bg-gray-700 text-gray-200">
                                     <span className="animate-pulse">Thinking...</span>
                                 </div>
                             </div>
                         )}
                        <div ref={chatEndRef} />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-700">
                    <form onSubmit={handleQuerySubmit} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={userQuery}
                            onChange={(e) => setUserQuery(e.target.value)}
                            placeholder={selectedFiles.length > 0 ? "Ask about the selected files..." : "Please select at least one file."}
                            disabled={isLoading || selectedFiles.length === 0}
                            className="flex-grow bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <button type="submit" disabled={isLoading || !userQuery.trim() || selectedFiles.length === 0} className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg text-white disabled:opacity-50">
                            {Icons.Send}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;