import React, { useState } from 'react';
import { validateToken } from '../api/github';

const Login = ({ onLogin }) => {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!token) {
            setError('Please enter a token.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const { user, rateLimit } = await validateToken(token);
            onLogin(token, user, rateLimit);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Welcome!</h1>
            <p className="text-gray-400 mt-2 mb-6">Please log in with a GitHub Personal Access Token to continue.</p>
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
                <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="ghp_..."
                    className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button 
                    onClick={handleLogin} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 ease-in-out disabled:opacity-50"
                    disabled={isLoading}
                >
                    {isLoading ? 'Verifying...' : 'Login with Token'}
                </button>
                <p className="text-red-400 text-sm mt-3 h-4">{error}</p>
                <div className="text-left text-sm text-gray-400 mt-6">
                    <p className="font-semibold">How to get a token:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">GitHub Tokens</a>.</li>
                        <li>Give your token a name (e.g., "RepoVisualizer").</li>
                        <li>Select an expiration (30 days is recommended).</li>
                        <li>Under "Repository access", select "Public Repositories (read-only)".</li>
                        <li>Click "Generate token" and copy it here.</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default Login;
