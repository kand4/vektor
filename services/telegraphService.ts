export const uploadToTelegraph = async (base64Image: string): Promise<string> => {
    try {
        const response = await fetch('/api/telegraph/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.url;
    } catch (e: any) {
        console.error('Telegraph upload error:', e);
        throw e;
    }
};

export const createTelegraphAccount = async (authorName: string): Promise<{ accessToken: string, authUrl: string }> => {
    const response = await fetch(`/api/telegraph/createAccount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName })
    });
    const data = await response.json();
    if (response.ok && data.ok) {
        return {
            accessToken: data.result.access_token,
            authUrl: data.result.auth_url
        };
    }
    throw new Error(data.error || 'Failed to create Telegraph account');
};

export const createTelegraphPage = async (accessToken: string, title: string, authorName: string, content: any[]): Promise<string> => {
    const response = await fetch('/api/telegraph/createPage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            accessToken,
            title,
            authorName,
            content
        })
    });
    const data = await response.json();
    if (response.ok && data.ok) {
        return data.result.url;
    }
    throw new Error(data.error || 'Failed to create Telegraph page');
};
