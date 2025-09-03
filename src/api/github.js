const GITHUB_API_BASE = 'https://api.github.com';
export const fetchApi = async (url, authToken) => {
    const headers = { Authorization: `token ${authToken}` };
    const response = await fetch(url, { headers });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    // Return both the JSON data and the headers for rate limit info
    return {
        data: await response.json(),
        headers: response.headers
    };
};

export const getFileContent = async (owner, repo, filePath, token) => {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}`;
    const { data } = await fetchApi(url, token);
    return data;
};

export const validateToken = async (token) => {
    const { data, headers } = await fetchApi('https://api.github.com/user', token);
    const rateLimit = {
        limit: headers.get('X-RateLimit-Limit'),
        remaining: headers.get('X-RateLimit-Remaining'),
    };
    return { user: data, rateLimit };
};