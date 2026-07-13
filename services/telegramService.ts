export const sendTelegramMessage = async (botToken: string, chatId: string, text: string, mediaUrls?: string[]) => {
    const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientBotToken: botToken,
            clientChatId: chatId,
            text,
            mediaUrls
        })
    });
    
    const data = await response.json();
    if (!response.ok || data.error) {
        throw new Error(data.error?.message || 'Gagal menghantar laporan ke Telegram.');
    }
    
    return data;
};
