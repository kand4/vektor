export const sendTelegramMessage = async (
    botToken: string, 
    chatId: string, 
    text: string, 
    mediaUrls?: string[],
    rawImages?: string[]
) => {
    let response: Response;
    try {
        response = await fetch('/api/telegram/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientBotToken: botToken,
                clientChatId: chatId,
                text,
                mediaUrls: mediaUrls || [],
                rawImages: rawImages || []
            })
        });
    } catch (networkErr: any) {
        throw new Error(`Ralat sambungan ke pelayan: ${networkErr?.message || 'Gagal menghubungi pelayan.'}`);
    }

    let data: any = null;
    let responseText = '';
    try {
        responseText = await response.text();
        if (responseText && responseText.trim().length > 0) {
            data = JSON.parse(responseText);
        }
    } catch (_) {
        data = null;
    }

    if (!response.ok) {
        const errMsg = data?.error?.message || data?.error || (responseText ? responseText.slice(0, 200) : `Pelayan mengembalikan status ${response.status} (${response.statusText || 'Ralat'}).`);
        throw new Error(errMsg);
    }

    if (data?.error) {
        throw new Error(data.error?.message || data.error || 'Gagal menghantar laporan ke Telegram.');
    }

    return data || { success: true };
};
