import type { VercelRequest, VercelResponse } from '@vercel/node';

function sanitizeOpSecError(error: any): string {
  let msg = error?.message || String(error);
  msg = msg.replace(/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED_API_KEY]');
  msg = msg.replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
  msg = msg.replace(/bot[0-9]{8,10}:[a-zA-Z0-9_-]{30,}/gi, 'bot[REDACTED_TOKEN]');
  msg = msg.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  return msg;
}

const chunkHtmlText = (str: string, maxLength: number = 3800): string[] => {
  if (!str || str.length <= maxLength) return [str || ''];
  const lines = str.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > maxLength) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  return chunks.map((chunk) => {
    let fixedChunk = chunk;
    const openTags: string[] = [];
    const tagRegex = /<\/?([a-zA-Z0-9]+)(?:\s+[^>]*?)?>/g;
    let match;
    while ((match = tagRegex.exec(chunk)) !== null) {
      const isClosing = match[0].startsWith('</');
      const tagName = match[1].toLowerCase();
      if (['b', 'i', 'code', 'pre', 'a', 'u', 's'].includes(tagName)) {
        if (isClosing) {
          const idx = openTags.lastIndexOf(tagName);
          if (idx !== -1) openTags.splice(idx, 1);
        } else {
          openTags.push(tagName);
        }
      }
    }
    for (let i = openTags.length - 1; i >= 0; i--) {
      fixedChunk += `</${openTags[i]}>`;
    }
    return fixedChunk;
  });
};

const stripHtml = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: { message: `Kaedah ${req.method} tidak dibenarkan.` } });
  }

  try {
    const payload = req.body || {};
    const { text, mediaUrls, rawImages, clientBotToken, clientChatId } = payload;
    const botToken = (clientBotToken || process.env.TELEGRAM_BOT_TOKEN || '').toString().trim();
    const chatId = (clientChatId || process.env.TELEGRAM_CHAT_ID || '').toString().trim();

    if (!botToken || !chatId) {
      return res.status(400).json({
        error: { message: "Telegram Bot Token dan Chat ID diperlukan. Sila masukkan dalam tetapan eksport atau environment variables." }
      });
    }

    if (text) {
      const chunks = chunkHtmlText(String(text), 3800);
      for (const chunk of chunks) {
        let response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: chunk,
            parse_mode: 'HTML'
          }),
          signal: AbortSignal.timeout(12000)
        });

        if (!response.ok) {
          let errorDescription = 'Ralat tidak diketahui';
          let isParseError = false;
          try {
            const errorData = await response.json();
            errorDescription = errorData.description || JSON.stringify(errorData);
            if (errorDescription.includes("can't parse entities") || errorDescription.includes("tag")) {
              isParseError = true;
            }
          } catch {
            errorDescription = `Status ${response.status}`;
          }

          if (isParseError) {
            response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: stripHtml(chunk)
              }),
              signal: AbortSignal.timeout(12000)
            });
          }

          if (!response.ok) {
            let finalErr = errorDescription;
            try {
              const errJson = await response.json();
              finalErr = errJson.description || finalErr;
            } catch {}
            throw new Error(`Telegram Text Error: ${finalErr}`);
          }
        }
      }
    }

    if (rawImages && Array.isArray(rawImages) && rawImages.length > 0) {
      const validBase64List = rawImages.filter((img: unknown) => typeof img === 'string' && img.length > 50).slice(0, 10);
      if (validBase64List.length > 0) {
        const fd = new FormData();
        fd.append("chat_id", chatId);
        const mediaMeta = validBase64List.map((_: unknown, idx: number) => ({
          type: 'photo',
          media: `attach://photo_${idx}`
        }));
        fd.append("media", JSON.stringify(mediaMeta));

        validBase64List.forEach((base64Str: string, idx: number) => {
          const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          const type = matches ? matches[1] : 'image/jpeg';
          const dataPart = matches ? matches[2] : base64Str;
          const buffer = Buffer.from(dataPart, 'base64');
          const ext = type.includes('png') ? 'png' : 'jpg';
          fd.append(`photo_${idx}`, new Blob([buffer], { type }), `specimen_${idx}.${ext}`);
        });

        await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
          method: 'POST',
          body: fd,
          signal: AbortSignal.timeout(15000)
        }).catch(() => {});
      }
    } else if (mediaUrls && Array.isArray(mediaUrls) && mediaUrls.length > 0) {
      const validUrls = mediaUrls.filter((u: unknown) => typeof u === 'string' && u.startsWith('https://')).slice(0, 10);
      if (validUrls.length > 0) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            media: validUrls.map((url: string) => ({ type: 'photo', media: url }))
          }),
          signal: AbortSignal.timeout(12000)
        }).catch(() => {});
      }
    }

    return res.json({ success: true, message: "Laporan berjaya dihantar ke Telegram." });
  } catch (error: any) {
    console.error("[Vercel API] Telegram proxy error:", sanitizeOpSecError(error));
    return res.status(500).json({ error: { message: sanitizeOpSecError(error) } });
  }
}
