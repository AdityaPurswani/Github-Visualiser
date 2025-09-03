import React, { use, useState } from 'react';
import { fetchApi, getFileContent } from '../api/github';
import { Icons } from '../components/Icon';
import FileTreeView from '../components/FileTreeView';
import RadialTree from '../visualizations/RadialTree';
import ForceGraph from '../visualizations/ForceGraph';
import FileViewer from '../components/FileViewer';
import RepoInsights from '../components/RepoInsights';
import AIAssistant from '../components/AIAssistant';

// Helper function to parse URL
const parseGitHubUrl = (url) => {
    try {
        const { pathname } = new URL(url);
        const parts = pathname.split('/').filter(p => p);
        if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
        return null;
    } catch (error) { return null; }
};

// Helper function to create D3 hierarchy
const createHierarchyData = (files) => {
    const root = { name: "root", children: [] };
    if (!files || files.length === 0) return root;
    files.forEach(file => {
        let currentNode = root;
        file.path.split('/').forEach(part => {
            let childNode = currentNode.children?.find(c => c.name === part);
            if (!childNode) {
                childNode = { name: part };
                if (!currentNode.children) currentNode.children = [];
                currentNode.children.push(childNode);
            }
            currentNode = childNode;
        });
    });
    return root;
};

const decodeBase64 = (encodedString) => {
    try {
        // Use TextDecoder for robust UTF-8 decoding of the binary string from atob
        const binaryString = atob(encodedString);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    } catch (e) {
        console.error("Base64 decoding failed:", e);
        return "[Error: Could not decode file content. It may be binary or use an unsupported encoding.]";
    }
};

const Dashboard = ({ user, rateLimit, setRateLimit, onLogout }) => {
    const [repoUrl, setRepoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [repoData, setRepoData] = useState(null);
    const [activeTab, setActiveTab] = useState('list');
    const [viewingFile, setViewingFile] = useState(null);
    const [isFileLoading, setIsFileLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    
    const authToken = localStorage.getItem('github_pat');

    // Add a check to ensure user and rateLimit data are available before rendering.
    if (!user || !rateLimit) {
        return (
            <div className="flex justify-center items-center h-screen text-white">
                Loading user data...
            </div>
        );
    }

    const handleVisualize = async () => {
        if (!authToken) {
             setError('Authentication is required.');
             return;
        }
        const repoInfo = parseGitHubUrl(repoUrl);
        if (!repoInfo) {
            setError('Invalid GitHub repository URL format.');
            return;
        }

        setIsLoading(true);
        setError('');
        setRepoData(null);
        
        
        try {
            const { owner, repo } = repoInfo;
            
            const fetchWithRateLimitUpdate = async (url) => {
                const { data, headers, status } = await fetchApi(url, authToken);
                 if (status === 202) { // Handle case where stats are being computed
                    return [];
                }
                const remaining = headers.get('X-RateLimit-Remaining');
                const limit = headers.get('X-RateLimit-Limit');
                if (remaining && limit) setRateLimit({ limit, remaining });
                return data;
            };

            const repoDetails = await fetchWithRateLimitUpdate(`https://api.github.com/repos/${owner}/${repo}`);
            const defaultBranch = repoDetails.default_branch;

            if (!defaultBranch) {
                throw new Error("Could not determine the default branch for this repository.");
            }

            const [tree, issues, workflows, pulls, commitActivity] = await Promise.all([
                fetchWithRateLimitUpdate(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`),
                fetchWithRateLimitUpdate(`https://api.github.com/repos/${owner}/${repo}/issues`),
                fetchWithRateLimitUpdate(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`),
                fetchWithRateLimitUpdate(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open`),
                fetchWithRateLimitUpdate(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`)
            ]);

            const hierarchyData = createHierarchyData(tree.tree);
            
            setRepoData({
                details: repoDetails,
                issues,
                workflows: workflows.workflows,
                files: tree.tree,
                hierarchy: hierarchyData,
                pulls,
                commitActivity
            });
            setActiveTab('list');

        } catch (err) {
            setError(`Failed to fetch repo data. It might be private, non-existent, or you've hit the API limit. Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileClick = async (file) => {
        if (!file || !file.path) return;
        setIsFileLoading(true);
        setViewingFile({ path: file.path, content: 'Loading...' }); 
        try {
            const { owner, repo } = parseGitHubUrl(repoUrl);
            const contentData = await getFileContent(owner, repo, file.path, authToken);
            
            if (contentData.encoding === 'base64' && contentData.content) {
                const decodedContent = decodeBase64(contentData.content);
                setViewingFile({ path: file.path, content: decodedContent });
            } else {
                 setViewingFile({ path: file.path, content: `// Cannot display content of type: ${contentData.type}` });
            }
        } catch (err) {
            console.error("Failed to fetch file content for viewer:", err);
            setViewingFile({ path: file.path, content: `// Error: Could not load content for ${file.path}.` });
        } finally {
            setIsFileLoading(false);
        }
    };
    
    const handleFileContentForAI = async (filePath) => {
        if (!filePath) {
            return "[Error: Invalid file path provided.]";
        }
        try {
            const { owner, repo } = parseGitHubUrl(repoUrl);
            const contentData = await getFileContent(owner, repo, filePath, authToken);

            if (contentData.encoding === 'base64' && contentData.content) {
                return decodeBase64(contentData.content);
            }
            return `[Error: Content for ${filePath} is not available in a readable format (type: ${contentData.type}).]`;
        } catch (error) {
            console.error('Error fetching file content for AI:', error);
            return `[Error: Failed to fetch content for ${filePath}. The file might be inaccessible.]`;
        }
    };


    const closeFileViewer = () => {
        setViewingFile(null);
    };
    
    const TabButton = ({ id, label }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`viz-tab py-3 px-2 sm:px-4 font-medium rounded-t-lg text-sm sm:text-base ${activeTab === id ? 'active-tab text-white' : 'text-gray-400 hover:text-white'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="w-full max-w-6xl mx-auto">
             <FileViewer 
                file={viewingFile}
                isLoading={isFileLoading}
                onClose={closeFileViewer} 
            />
            <header className="text-center mb-8 flex justify-between items-center">
                <img className="w-15 h-15" src="\github-mark.svg"/>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">GitHub Repository Visualizer</h1>
                 <div className="flex items-center gap-4">
                     <div className="text-right">
                         <p className="font-semibold text-white">{user.login}</p>
                         <p className="text-sm text-gray-400">API: {rateLimit.remaining} / {rateLimit.limit}</p>
                     </div>
                     <img src={user.avatar_url} alt="User Avatar" className="w-12 h-12 rounded-full border-2 border-gray-600"/>
                     <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Logout</button>
                 </div>
            </header>

            <div className="flex flex-col sm:flex-row gap-2 mb-8">
                <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleVisualize()}
                    placeholder="e.g., https://github.com/d3/d3"
                    className="flex-grow bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleVisualize} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 ease-in-out flex items-center justify-center disabled:opacity-50">
                    <span className="mr-2">{Icons.Search}</span>
                    {isLoading ? 'Visualizing...' : 'Visualize'}
                </button>
            </div>

            {isLoading && <div className="text-center text-lg text-gray-300">Fetching repository data...</div>}
            {error && <div className="text-center bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg">{error}</div>}
            
            {repoData && (
                <div id="results">
                    <div className="bg-gray-800 p-4 rounded-lg mb-6 flex justify-between items-center flex-wrap gap-4">
                        <h2 className="text-2xl font-bold text-white truncate">{repoData.details.full_name}</h2>
                        <div className="flex items-center text-yellow-400 bg-gray-700 px-3 py-1 rounded-full text-lg">
                            <span className="mr-2">{Icons.Star}</span>
                            <span className="font-semibold">{repoData.details.stargazers_count.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mb-4 border-b border-gray-700">
                        <nav className="flex space-x-1 sm:space-x-4" aria-label="Tabs">
                            <TabButton id="list" label="List View" />
                            <TabButton id="radial" label="Radial Tree" />
                            <TabButton id="graph" label="Force Graph" />
                            <TabButton id="insights" label="Insights" />
                            <TabButton id="ai" label="AI Assistant" />
                        </nav>
                    </div>

                    <div>
                        {activeTab === 'list' && (
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-gray-800 p-4 rounded-lg">
                                    <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">File Tree</h3>
                                    <div className="max-h-[60vh] overflow-y-auto pr-2"><FileTreeView files={repoData.files} onFileClick={handleFileClick} /></div>
                                </div>
                                <div className="flex flex-col gap-6">
                                    <div className="bg-gray-800 p-4 rounded-lg">
                                        <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Open Issues</h3>
                                        <div className="max-h-[28vh] overflow-y-auto pr-2 space-y-2">
                                            {repoData.issues.length > 0 ? repoData.issues.map(issue => (
                                                <a key={issue.id} href={issue.html_url} target="_blank" rel="noopener noreferrer" className="block bg-gray-700 hover:bg-gray-600 p-3 rounded-lg transition duration-150">
                                                    <p className="font-medium truncate">{issue.title}</p>
                                                    <p className="text-sm text-gray-400">#{issue.number} opened by {issue.user.login}</p>
                                                </a>
                                            )) : <p className="text-gray-400">No open issues.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-gray-800 p-4 rounded-lg">
                                        <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Workflows</h3>
                                        <div className="max-h-[28vh] overflow-y-auto pr-2 space-y-2">
                                            {repoData.workflows?.length > 0 ? repoData.workflows.map(wf => (
                                                <a key={wf.id} href={wf.html_url} target="_blank" rel="noopener noreferrer" className="block bg-gray-700 hover:bg-gray-600 p-3 rounded-lg transition duration-150">
                                                    <div className="flex items-center">
                                                         <span className={`mr-3 p-1.5 rounded-full ${wf.state === 'active' ? 'bg-green-900 text-green-400' : 'bg-gray-600 text-gray-300'}`}>{Icons.Check}</span>
                                                        <div>
                                                            <p className="font-medium truncate">{wf.name}</p>
                                                            <p className="text-sm text-gray-400">State: {wf.state}</p>
                                                        </div>
                                                    </div>
                                                </a>
                                            )) : <p className="text-gray-400">No workflows found.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'radial' && (
                             <div className="bg-gray-700 p-2 sm:p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Radial File Tree</h3>
                                <RadialTree data={repoData.hierarchy} />
                             </div>
                        )}
                        {activeTab === 'graph' && (
                             <div className="bg-gray-700 p-2 sm:p-4 rounded-lg">
                                <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Force-Directed Graph</h3>
                                <ForceGraph data={repoData.hierarchy} />
                            </div>
                        )}
                        {activeTab === 'insights' && (
                            <RepoInsights repoData={repoData} />
                        )}
                        {activeTab === 'ai' && (
                            <AIAssistant 
                                repoData={repoData} 
                                onFileContentRequested={handleFileContentForAI}
                                chatHistory={chatHistory}
                                setChatHistory={setChatHistory}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;