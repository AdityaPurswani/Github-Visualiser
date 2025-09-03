import React, { useMemo } from 'react';

// Function to get file extension
const getExtension = (path) => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()}` : 'none';
};

// Function to format file size
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Bar = ({ label, value, maxValue, color }) => {
    const widthPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
        <div className="flex items-center gap-4 mb-2">
            <div className="w-24 text-right text-sm text-gray-400 truncate" title={label}>{label}</div>
            <div className="flex-grow bg-gray-700 rounded-full h-5">
                <div
                    className={`${color} h-5 rounded-full text-xs text-white flex items-center justify-end pr-2 font-semibold`}
                    style={{ width: `${widthPercentage}%`, minWidth: '24px' }}
                >
                   {value}
                </div>
            </div>
        </div>
    );
};

const CommitGraph = ({ commitData }) => {
    if (!commitData || commitData.length === 0) {
        return <p className="text-gray-400 text-center py-4 h-56 flex items-center justify-center">Commit data is being calculated by GitHub. Please wait a few moments and try visualizing again.</p>;
    }

    const maxCommits = Math.max(...commitData.map(d => d.commits), 1); // Avoid division by zero
    const width = 1100;
    const height = 200;
    const padding = { top: 20, right: 10, bottom: 30, left: 10 };

    const points = commitData.map((d, i) => {
        const x = padding.left + (i / (commitData.length - 1)) * (width - padding.left - padding.right);
        const y = height - padding.bottom - ((d.commits / maxCommits) * (height - padding.top - padding.bottom));
        return { ...d, x, y };
    });

    const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} V ${height - padding.bottom} H ${padding.left} Z`;

    return (
        <div className="h-56 bg-gray-900 p-4 rounded-lg">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                        <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGradient)" stroke="none" />
                <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2" />
                {points.map((p, i) => (
                    <g key={i} className="group">
                        <circle cx={p.x} cy={p.y} r="4" fill="#3B82F6" className="cursor-pointer" />
                        <text x={p.x} y={height - 10} textAnchor="middle" fill="#9CA3AF" fontSize="12">
                            {p.month}
                        </text>
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <rect x={p.x - 20} y={p.y - 35} width="40" height="25" rx="4" fill="rgba(17, 24, 39, 0.8)" />
                            <text x={p.x} y={p.y - 20} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                                {p.commits}
                            </text>
                        </g>
                    </g>
                ))}
            </svg>
        </div>
    );
};


const RepoInsights = ({ repoData }) => {
    const insights = useMemo(() => {
        if (!repoData) return null;

        // 1. File type distribution
        const fileTypes = {};
        repoData.files.forEach(file => {
            if (file.type === 'blob') {
                const ext = getExtension(file.path);
                fileTypes[ext] = (fileTypes[ext] || 0) + 1;
            }
        });
        const sortedFileTypes = Object.entries(fileTypes).sort(([, a], [, b]) => b - a).slice(0, 5);
        const maxFileTypeCount = sortedFileTypes.length > 0 ? sortedFileTypes[0][1] : 0;

        // 2. Largest files
        const largestFiles = [...repoData.files]
            .filter(file => file.type === 'blob' && file.size)
            .sort((a, b) => b.size - a.size)
            .slice(0, 5);

        // 3. Issue labels distribution
        const issueLabels = {};
        repoData.issues.forEach(issue => {
            issue.labels.forEach(label => {
                issueLabels[label.name] = (issueLabels[label.name] || 0) + 1;
            });
        });
        const sortedIssueLabels = Object.entries(issueLabels).sort(([, a], [, b]) => b - a).slice(0, 5);
        const maxIssueLabelCount = sortedIssueLabels.length > 0 ? sortedIssueLabels[0][1] : 0;
        
        // 4. Pull Request data
        const openPullRequests = repoData.pulls ? repoData.pulls.slice(0, 5) : [];
        const openPRCount = repoData.pulls ? repoData.pulls.length : 0;

        // 5. Commit Activity data
        const monthlyCommits = Array(12).fill(0).map((_, i) => ({
            month: new Date(0, i).toLocaleString('default', { month: 'short' }),
            commits: 0,
        }));

        let commitDataAvailable = false;
        if (repoData.commitActivity && repoData.commitActivity.length > 0) {
            commitDataAvailable = true;
            repoData.commitActivity.forEach(week => {
                const monthIndex = new Date(week.week * 1000).getMonth();
                if (monthlyCommits[monthIndex]) {
                    monthlyCommits[monthIndex].commits += week.total;
                }
            });
        }
        
        const currentMonth = new Date().getMonth();
        const orderedMonthlyCommits = [
            ...monthlyCommits.slice(currentMonth + 1),
            ...monthlyCommits.slice(0, currentMonth + 1)
        ];

        return { 
            sortedFileTypes, 
            maxFileTypeCount, 
            largestFiles, 
            sortedIssueLabels, 
            maxIssueLabelCount,
            openPullRequests,
            openPRCount,
            commitActivity: commitDataAvailable ? orderedMonthlyCommits : []
        };
    }, [repoData]);

    if (!insights) return <p className="text-center text-gray-400">No data available to generate insights.</p>;

    const { sortedFileTypes, maxFileTypeCount, largestFiles, sortedIssueLabels, maxIssueLabelCount, openPullRequests, openPRCount, commitActivity } = insights;
    
    const barColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Top 5 File Types</h3>
                    {sortedFileTypes.length > 0 ? (
                        <div className="pt-2">
                            {sortedFileTypes.map(([ext, count], index) => (
                               <Bar key={ext} label={ext} value={count} maxValue={maxFileTypeCount} color={barColors[index % barColors.length]} />
                            ))}
                        </div>
                    ) : <p className="text-gray-400">No files to analyze.</p>}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Top 5 Issue Labels</h3>
                     {sortedIssueLabels.length > 0 ? (
                        <div className="pt-2">
                            {sortedIssueLabels.map(([label, count], index) => (
                               <Bar key={label} label={label} value={count} maxValue={maxIssueLabelCount} color={barColors[index % barColors.length]} />
                            ))}
                        </div>
                    ) : <p className="text-gray-400">No issues with labels found.</p>}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Top 5 Largest Files</h3>
                    {largestFiles.length > 0 ? (
                        <ul className="space-y-2 pt-2">
                            {largestFiles.map(file => (
                                <li key={file.sha} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                                    <span className="text-sm truncate pr-2" title={file.path}>{file.path}</span>
                                    <span className="font-mono text-xs bg-gray-600 px-2 py-1 rounded whitespace-nowrap">{formatBytes(file.size)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400">No files with size data available.</p>}
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">
                        Open Pull Requests ({openPRCount})
                    </h3>
                    {openPullRequests.length > 0 ? (
                        <ul className="space-y-2 pt-2">
                            {openPullRequests.map(pr => (
                                <li key={pr.id} className="bg-gray-700 hover:bg-gray-600 p-2 rounded transition-colors">
                                    <a href={pr.html_url} target="_blank" rel="noopener noreferrer">
                                        <p className="text-sm font-medium truncate" title={pr.title}>{pr.title}</p>
                                        <p className="text-xs text-gray-400">#{pr.number} by {pr.user.login}</p>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400 pt-2">No open pull requests.</p>}
                </div>
            </div>
             <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">Commit Activity (Last 12 Months)</h3>
                <CommitGraph commitData={commitActivity} />
            </div>
        </div>
    );
};

export default RepoInsights;