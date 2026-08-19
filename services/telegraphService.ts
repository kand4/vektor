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
    let response: Response;
    try {
        response = await fetch('/api/telegraph/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        });
    } catch (e: any) {
        throw new Error(`Ralat sambungan muat naik imej: ${e?.message || 'Gagal menyambung ke pelayan.'}`);
    }

    const data = await safeParseJson(response, 'Gagal memuat naik imej ke pelayan.');
    if (data.url) {
        return data.url;
    }
    throw new Error(data.error || 'Respons tidak sah semasa memuat naik imej.');
};

export const createTelegraphAccount = async (authorName: string): Promise<{ accessToken: string, authUrl: string }> => {
    let response: Response;
    try {
        response = await fetch(`/api/telegraph/createAccount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ authorName })
        });
    } catch (e: any) {
        throw new Error(`Ralat sambungan Telegraph: ${e?.message || 'Gagal menyambung ke pelayan.'}`);
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
    let response: Response;
    try {
        response = await fetch('/api/telegraph/createPage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accessToken,
                title,
                authorName,
                content
            })
        });
    } catch (e: any) {
        throw new Error(`Ralat sambungan Telegraph: ${e?.message || 'Gagal menyambung ke pelayan.'}`);
    }

    const data = await safeParseJson(response, 'Gagal menerbitkan artikel Telegraph.');
    if (data.ok && data.result) {
        return data.result.url;
    }
    throw new Error(data.error || 'Gagal menerbitkan artikel Telegraph.');
};
