import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tooltip from './components/Tooltip';
import { validateToken } from './api/github';

export default function App() {
    const [user, setUser] = useState(null);
    const [rateLimit, setRateLimit] = useState({ limit: 'N/A', remaining: 'N/A'});
    const [isLoading, setIsLoading] = useState(true); // To check for stored token

    useEffect(() => {
        // Apply global styles
        document.body.className = 'bg-gray-900 text-gray-200 font-sans';
        
        // Check for a stored token on initial load
        const storedToken = localStorage.getItem('github_pat');
        if (storedToken) {
            validateToken(storedToken)
                .then(({ user, rateLimit }) => {
                    setUser(user);
                    setRateLimit(rateLimit);
                })
                .catch(() => {
                    // Token is invalid, remove it
                    localStorage.removeItem('github_pat');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
        }
        
        // Cleanup function
        return () => {
            document.body.className = '';
        };
    }, []);

    const handleLogin = (token, userData, rateLimitData) => {
        localStorage.setItem('github_pat', token);
        setUser(userData);
        setRateLimit(rateLimitData);
    };

    const handleLogout = () => {
        localStorage.removeItem('github_pat');
        setUser(null);
    };

    // Display a loading message while checking for the stored token
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            {user ? (
                <Dashboard user={user} rateLimit={rateLimit} setRateLimit={setRateLimit} onLogout={handleLogout} />
            ) : (
                <Login onLogin={handleLogin} />
            )}
            <Tooltip />
        </div>
    );
}
