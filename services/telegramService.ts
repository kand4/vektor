// Helper function to send directly to Telegram Bot API (which allows direct browser CORS)
const sendDirectToTelegram = async (
    botToken: string,
    chatId: string,
    text: string,
    rawImages?: string[]
) => {
    // 1. Send Text message directly
    const textRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        })
    });

    let resData: any = null;
    try {
        resData = await textRes.json();
    } catch (_) {}

    if (!textRes.ok) {
        // Retry with plain text if HTML entity parsing failed
        const plainText = text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
        const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: plainText
            })
        });
        if (!retryRes.ok) {
            const retryData = await retryRes.json().catch(() => ({}));
            let desc = retryData.description || resData?.description || `Ralat Telegram (${textRes.status})`;
            if (desc.includes("chat not found")) {
                desc += " (Pastikan Bot telah dimasukkan ke dalam kumpulan/saluran tersebut sebagai Admin).";
            } else if (desc.includes("Unauthorized") || desc.includes("Not Found")) {
                desc += " (Sila periksa semula Telegram Bot Token anda dari @BotFather).";
            }
            throw new Error(desc);
        }
    }

    // 2. Send Raw Images if provided
    if (rawImages && rawImages.length > 0) {
        const validImages = rawImages.filter(img => typeof img === 'string' && img.length > 50);
        if (validImages.length > 0) {
            try {
                const fd = new FormData();
                fd.append("chat_id", chatId);
                const mediaMeta = validImages.map((_, idx) => ({
                    type: 'photo',
                    media: `attach://photo_${idx}`
                }));
                fd.append("media", JSON.stringify(mediaMeta));

                validImages.forEach((base64Str, idx) => {
                    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    const type = matches ? matches[1] : 'image/jpeg';
                    const dataPart = matches ? matches[2] : base64Str;
                    const byteChars = atob(dataPart);
                    const byteNumbers = new Array(byteChars.length);
                    for (let i = 0; i < byteChars.length; i++) {
                        byteNumbers[i] = byteChars.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type });
                    const ext = type.includes('png') ? 'png' : 'jpg';
                    fd.append(`photo_${idx}`, blob, `specimen_${idx}.${ext}`);
                });

                await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
                    method: 'POST',
                    body: fd
                });
            } catch (mediaErr) {
                console.warn("Direct media group warning:", mediaErr);
            }
        }
    }

    return { success: true };
};

export const sendTelegramMessage = async (
    botToken: string, 
    chatId: string, 
    text: string, 
    mediaUrls?: string[],
    rawImages?: string[]
) => {
    let serverError: string | null = null;
    
    // Attempt 1: Via backend proxy route
    try {
        const response = await fetch('/api/telegram/send', {
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

        if (response.ok && !data?.error) {
            return data || { success: true };
        }

        serverError = data?.error?.message || data?.error || (responseText ? responseText.slice(0, 200) : `Status ${response.status}`);
    } catch (networkErr: any) {
        serverError = networkErr?.message || 'Gagal menghubungi pelayan proksi.';
    }

    // Attempt 2: Direct browser-to-Telegram API fallback (bypasses 405 or server proxy issues)
    if (botToken && chatId) {
        console.warn(`Proxy telegram send note: ${serverError}. Menggunakan sambungan terus ke API Telegram...`);
        return await sendDirectToTelegram(botToken, chatId, text, rawImages);
    }

    throw new Error(serverError || 'Gagal menghantar laporan ke Telegram.');
};
