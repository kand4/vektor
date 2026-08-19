const safeParseJson = async (response: Response, defaultError: string) => {
    let data: any = null;
    let text = '';
    try {
        text = await response.text();
        if (text && text.trim().length > 0) {
            data = JSON.parse(text);
        }
    } catch (_) {
        data = null;
    }

    if (!response.ok) {
        const errorMsg = data?.error?.message || data?.error || (text ? text.slice(0, 200) : `Pelayan mengembalikan status ${response.status} (${response.statusText || 'Ralat'}).`);
        throw new Error(errorMsg);
    }

    if (!data) {
        throw new Error(defaultError);
    }

    return data;
};

export const uploadToTelegraph = async (base64Image: string): Promise<string> => {
    if (!base64Image || base64Image.length < 50) return '';
    let response: Response | null = null;
    try {
        response = await fetch('/api/telegraph/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
    } catch (e: any) {
        console.warn('Ralat sambungan muat naik imej:', e?.message);
        return '';
    }

    if (!response || !response.ok) {
        console.warn('Muat naik imej mengembalikan status:', response?.status);
        return '';
    }

    let data: any = null;
    try {
        data = await response.json();
    } catch (_) {}

    if (data?.url) {
        return data.url;
    }
    return '';
};

export const createTelegraphAccount = async (authorName: string): Promise<{ accessToken: string, authUrl: string }> => {
    let response: Response | null = null;
    const cleanAuthor = authorName || 'VectorGuard AI';
    
    // Attempt 1: POST
    try {
        response = await fetch(`/api/telegraph/createAccount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authorName: cleanAuthor })
        });
    } catch (_) {}

    // Attempt 2: GET fallback if POST is blocked or returns non-200
    if (!response || !response.ok) {
        try {
            response = await fetch(`/api/telegraph/createAccount?authorName=${encodeURIComponent(cleanAuthor)}`, {
                method: 'GET'
            });
        } catch (e: any) {
            throw new Error(`Ralat sambungan Telegraph: ${e?.message || 'Gagal menyambung ke pelayan.'}`);
        }
    }

    const data = await safeParseJson(response, 'Gagal mencipta akaun Telegraph.');
    if (data.ok && data.result) {
        return {
            accessToken: data.result.access_token,
            authUrl: data.result.auth_url
        };
    }
    throw new Error(data.error || 'Gagal mencipta akaun Telegraph.');
};

export const createTelegraphPage = async (accessToken: string, title: string, authorName: string, content: any[]): Promise<string> => {
    let response: Response | null = null;
    const safeTitle = title || 'Laporan Vektor & Kebersihan';
    const safeAuthor = authorName || 'VectorGuard AI';
    
    // Attempt 1: POST JSON
    try {
        response = await fetch('/api/telegraph/createPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessToken,
                title: safeTitle,
                authorName: safeAuthor,
                content
            })
        });
    } catch (_) {}

    // Attempt 2: Form-urlencoded POST fallback
    if (!response || !response.ok) {
        try {
            const bodyParams = new URLSearchParams();
            bodyParams.append('accessToken', accessToken);
            bodyParams.append('title', safeTitle);
            bodyParams.append('authorName', safeAuthor);
            bodyParams.append('content', JSON.stringify(content || []));

            response = await fetch('/api/telegraph/createPage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bodyParams.toString()
            });
        } catch (e: any) {
            throw new Error(`Ralat sambungan Telegraph: ${e?.message || 'Gagal menyambung ke pelayan.'}`);
        }
    }

    const data = await safeParseJson(response, 'Gagal menerbitkan artikel Telegraph.');
    if (data.ok && data.result) {
        return data.result.url;
    }
    throw new Error(data.error || 'Gagal menerbitkan artikel Telegraph.');
};
