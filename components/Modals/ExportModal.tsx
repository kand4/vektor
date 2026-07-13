import React, { useState, useEffect } from 'react';
import { AnalysisSession } from '../../types';
import { uploadToTelegraph, createTelegraphAccount, createTelegraphPage } from '../../services/telegraphService';
import { sendTelegramMessage } from '../../services/telegramService';
import { Toast } from '../Toast';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: AnalysisSession[];
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, sessions }) => {
    const [telegramBotToken, setTelegramBotToken] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [telegraphAuthor, setTelegraphAuthor] = useState('VectorGuard AI');
    const [isExporting, setIsExporting] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [toastMsg, setToastMsg] = useState<{msg: string, type: 'error' | 'success'} | null>(null);
    const [telegraphAuthUrl, setTelegraphAuthUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTelegramBotToken(localStorage.getItem('telegram_bot_token') || '');
            setTelegramChatId(localStorage.getItem('telegram_chat_id') || '');
            setTelegraphAuthor(localStorage.getItem('telegraph_author_name') || 'VectorGuard AI');
            setTelegraphAuthUrl(localStorage.getItem('telegraph_auth_url'));
            setStatusText('');
        }
    }, [isOpen]);

    const handleSaveSettings = () => {
        localStorage.setItem('telegram_bot_token', telegramBotToken.trim());
        localStorage.setItem('telegram_chat_id', telegramChatId.trim());
        localStorage.setItem('telegraph_author_name', telegraphAuthor.trim());
    };

    const escapeHtml = (unsafe: string) => {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const buildMarkdownForSession = (session: AnalysisSession, index: number, total: number, telegraphUrl?: string): string => {
        let report = `<b>LAPORAN PEMERIKSAAN KESIHATAN & KESELAMATAN (VECTORGUARD AI)</b>\n`;
        if (index === 0) {
            report += `<i>Tarikh Janaan: ${new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}</i>\n\n`;
        }
        report += `<b>SESI ${index + 1} DARIPADA ${total}</b>\n`;
        if (session.result?.hygieneLevel !== undefined) {
            report += `Skor Kebersihan: <b>${session.result.hygieneLevel.toFixed(1)}/5.0</b>\n`;
        }
        if (session.result?.risks && session.result.risks.length > 0) {
            report += `\n<b>Penemuan Risiko:</b>\n`;
            session.result.risks.forEach((risk, rIdx) => {
                report += `${rIdx + 1}. <b>${escapeHtml(risk.label)}</b> (Keyakinan: ${risk.confidence ? (risk.confidence * 100).toFixed(1) : 90}%)\n`;
                if (risk.agent) report += `   • Agen: <i>${escapeHtml(risk.agent)}</i>\n`;
                if (risk.disease) report += `   • Risiko: <i>${escapeHtml(risk.disease)}</i>\n`;
                report += `   • Tindakan: ${escapeHtml(risk.solution)}\n\n`;
            });
        } else {
            report += `<i>Tiada risiko dikesan.</i>\n\n`;
        }
        if (index === total - 1) {
            if (telegraphUrl) {
                report += `\n\n📄 <b>Laporan Penuh Lengkap (Telegraph):</b>\n<a href="${telegraphUrl}">${telegraphUrl}</a>`;
            }
            const appUrl = "https://vektorx.vercel.app";
            report += `\n\n🔍 <b>Jalankan Analisis Anda Sendiri di:</b>\n<a href="${appUrl}">${appUrl}</a>`;
        }
        return report;
    };

    const buildTelegraphContent = (uploadedImages: {sessionIndex: number, originalUrl: string, cleanUrl?: string}[]) => {
        const content: any[] = [];
        
        content.push({ tag: 'h3', children: ['Laporan Pemeriksaan VectorGuard AI'] });
        content.push({ tag: 'p', children: [`Tarikh Janaan: ${new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`] });
        content.push({ tag: 'hr' });

        sessions.forEach((session, index) => {
            content.push({ tag: 'h4', children: [`Sesi Pemeriksaan ${index + 1}`] });
            
            const imgs = uploadedImages.filter(img => img.sessionIndex === index);
            if (imgs.length > 0) {
                content.push({ tag: 'figure', children: [{ tag: 'img', attrs: { src: imgs[0].originalUrl } }, { tag: 'figcaption', children: ['Imej Bukti Asal'] }] });
                content.push({ tag: 'p', children: [{ tag: 'a', attrs: { href: imgs[0].originalUrl, target: '_blank' }, children: ['(Klik Untuk Lihat Imej Asal)'] }] });
                
                if (imgs[0].cleanUrl) {
                    content.push({ tag: 'figure', children: [{ tag: 'img', attrs: { src: imgs[0].cleanUrl } }, { tag: 'figcaption', children: ['Imej Simulasi Sanitasi'] }] });
                    content.push({ tag: 'p', children: [{ tag: 'a', attrs: { href: imgs[0].cleanUrl, target: '_blank' }, children: ['(Klik Untuk Lihat Imej Simulasi)'] }] });
                }
            }

            if (session.result?.hygieneLevel !== undefined) {
                content.push({ tag: 'p', children: [{ tag: 'b', children: [`Skor Kebersihan: ${session.result.hygieneLevel.toFixed(1)}/5.0`] }] });
            }

            if (session.result?.risks && session.result.risks.length > 0) {
                content.push({ tag: 'p', children: [{ tag: 'b', children: ['Penemuan Risiko Utama:'] }] });
                const ul = { tag: 'ul', children: [] as any[] };
                session.result.risks.forEach((risk) => {
                    ul.children.push({
                        tag: 'li',
                        children: [
                            { tag: 'b', children: [risk.label] },
                            { tag: 'br' },
                            `Agen: ${risk.agent || 'N/A'}`,
                            { tag: 'br' },
                            `Risiko Penyakit: ${risk.disease || 'N/A'}`,
                            { tag: 'br' },
                            { tag: 'i', children: [`Tindakan: ${risk.solution}`] }
                        ]
                    });
                });
                content.push(ul);
            }
            content.push({ tag: 'hr' });
        });

        const appUrl = "https://vektorx.vercel.app";
        content.push({ tag: 'p', children: [{ tag: 'b', children: ['Jalankan Analisis Anda Sendiri di:'] }] });
        content.push({ tag: 'p', children: [{ tag: 'a', attrs: { href: appUrl, target: '_blank' }, children: [appUrl] }] });

        return content;
    };

    const uploadImages = async () => {
        setStatusText("Memuat naik gambar ke pelayan imej awam untuk Telegram...");
        const uploadedImages: {sessionIndex: number, originalUrl: string, cleanUrl?: string}[] = [];
        const allImageUrls: string[] = [];

        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            let originalUrl = "";
            let cleanUrl = undefined;
            
            if (session.imageSrc) {
                try {
                    originalUrl = await uploadToTelegraph(session.imageSrc);
                    allImageUrls.push(originalUrl);
                } catch(e) {
                    console.error("Gagal muat naik gambar asal sesi", i);
                }
            }
            if (session.simulationImage) {
                try {
                    cleanUrl = await uploadToTelegraph(session.simulationImage);
                    allImageUrls.push(cleanUrl);
                } catch(e) {
                    console.error("Gagal muat naik gambar simulasi sesi", i);
                }
            }
            
            if (originalUrl) {
                uploadedImages.push({ sessionIndex: i, originalUrl, cleanUrl });
            }
        }
        return { uploadedImages, allImageUrls };
    };

    const handleExportTelegraph = async () => {
        if (!sessions || sessions.length === 0) return setToastMsg({ msg: "Tiada data analisis.", type: 'error' });
        if (!telegraphAuthor) return setToastMsg({ msg: "Sila isi Nama Pengarang Telegraph.", type: 'error' });
        
        setIsExporting(true);
        handleSaveSettings();
        try {
            const { uploadedImages } = await uploadImages();
            setStatusText("Menjana Artikel Telegraph...");
            const { accessToken, authUrl } = await createTelegraphAccount(telegraphAuthor);
            localStorage.setItem('telegraph_auth_url', authUrl);
            setTelegraphAuthUrl(authUrl);
            const content = buildTelegraphContent(uploadedImages);
            const telegraphUrl = await createTelegraphPage(accessToken, `Laporan Vektor & Sanitasi`, telegraphAuthor, content);
            
            setStatusText("");
            setToastMsg({ msg: `Berjaya! Pautan: ${telegraphUrl}`, type: 'success' });
            
            // Optionally open the URL in a new tab
            setTimeout(() => {
                window.open(telegraphUrl, '_blank');
                onClose();
            }, 1500);
        } catch (error: any) {
            setStatusText("");
            setToastMsg({ msg: `Ralat Telegraph: ${error.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    const cleanTelegramChatId = (id: string): string => {
        let cleaned = id.trim();
        // Extract username from t.me links
        if (cleaned.includes('t.me/')) {
            const parts = cleaned.split('t.me/');
            const lastPart = parts[parts.length - 1].split('?')[0].split('/')[0];
            if (lastPart) cleaned = '@' + lastPart;
        }
        // Ensure username starts with @ if it's not an ID (numbers)
        if (cleaned && !cleaned.startsWith('-') && !/^\d+$/.test(cleaned) && !cleaned.startsWith('@')) {
            cleaned = '@' + cleaned;
        }
        return cleaned;
    };

    const handleExportTelegram = async () => {
        if (!sessions || sessions.length === 0) return setToastMsg({ msg: "Tiada data analisis.", type: 'error' });
        
        setIsExporting(true);
        handleSaveSettings();
        const cleanedChatId = cleanTelegramChatId(telegramChatId);
        
        try {
            const { uploadedImages } = await uploadImages();
            
            setStatusText("Menghantar mesej dan gambar ke Telegram...");
            
            for (let i = 0; i < sessions.length; i++) {
                const session = sessions[i];
                const textReport = buildMarkdownForSession(session, i, sessions.length);
                const sessionImages = uploadedImages.filter(img => img.sessionIndex === i);
                const urlsForSession = [];
                if (sessionImages.length > 0) {
                    urlsForSession.push(sessionImages[0].originalUrl);
                    if (sessionImages[0].cleanUrl) urlsForSession.push(sessionImages[0].cleanUrl);
                }
                
                await sendTelegramMessage(telegramBotToken, cleanedChatId, textReport, urlsForSession);
            }

            setStatusText("");
            setToastMsg({ msg: "Berjaya dihantar ke Telegram!", type: 'success' });
            setTimeout(() => onClose(), 2000);
        } catch (error: any) {
            setStatusText("");
            setToastMsg({ msg: `Ralat Telegram: ${error.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportBoth = async () => {
        if (!sessions || sessions.length === 0) return setToastMsg({ msg: "Tiada data analisis.", type: 'error' });
        setIsExporting(true);
        handleSaveSettings();
        const cleanedChatId = cleanTelegramChatId(telegramChatId);
        
        try {
            const { uploadedImages } = await uploadImages();
            
            setStatusText("Menjana Artikel Telegraph...");
            let telegraphUrl = "";
            if (telegraphAuthor) {
                const { accessToken, authUrl } = await createTelegraphAccount(telegraphAuthor);
                localStorage.setItem('telegraph_auth_url', authUrl);
                setTelegraphAuthUrl(authUrl);
                const content = buildTelegraphContent(uploadedImages);
                telegraphUrl = await createTelegraphPage(accessToken, `Laporan Vektor & Sanitasi`, telegraphAuthor, content);
            }

            setStatusText("Menghantar ke Telegram...");
            
            for (let i = 0; i < sessions.length; i++) {
                const session = sessions[i];
                const textReport = buildMarkdownForSession(session, i, sessions.length, telegraphUrl);
                const sessionImages = uploadedImages.filter(img => img.sessionIndex === i);
                const urlsForSession = [];
                if (sessionImages.length > 0) {
                    urlsForSession.push(sessionImages[0].originalUrl);
                    if (sessionImages[0].cleanUrl) urlsForSession.push(sessionImages[0].cleanUrl);
                }
                
                await sendTelegramMessage(telegramBotToken, cleanedChatId, textReport, urlsForSession);
            }

            setStatusText("");
            setToastMsg({ msg: "Eksport berpusat berjaya diselesaikan!", type: 'success' });
            setTimeout(() => onClose(), 2000);
        } catch (error: any) {
            setStatusText("");
            setToastMsg({ msg: `Ralat: ${error.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
            
            <div className="bg-slate-900 border border-blue-500/50 rounded-xl p-6 w-full max-w-lg shadow-[0_0_30px_rgba(59,130,246,0.3)] my-auto max-h-[90vh] overflow-y-auto animate-fade-in-up">
                <h2 className="text-xl font-bold font-sci-fi text-blue-400 mb-2">🚀 EKSPORT TELEGRAM & TELEGRAPH</h2>
                <p className="text-xs text-slate-400 mb-6 font-mono">Laporkan hasil analisis (gambar berserta maklumat json diagnostik) secara berpusat dan bebas had saiz fail dengan chunking automatik.</p>

                <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <span>📡 Tetapan Telegram Bot</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 mb-4 leading-relaxed font-mono">
                            Biarkan kosong jika anda telah menetapkan <span className="text-blue-400">TELEGRAM_BOT_TOKEN</span> dan <span className="text-blue-400">TELEGRAM_CHAT_ID</span> dalam tab 'Secrets' (Variables Persekitaran Server).
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-slate-400 font-mono block mb-1">TELEGRAM BOT TOKEN (Pilihan)</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                                    placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                                    value={telegramBotToken}
                                    onChange={(e) => setTelegramBotToken(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 font-mono block mb-1">CHAT ID (Pilihan) - Nota: Kumpulan/Saluran mesti bermula tanda '-' seperti -100xxx</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                                    placeholder="Contoh: -1001234567890"
                                    value={telegramChatId}
                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                />
                                <p className="text-[9px] text-slate-500 mt-1 italic">
                                    Tip: Anda boleh masukkan pautan <span className="text-blue-400">t.me/nama_saluran</span> atau <span className="text-blue-400">@username</span>. Bot anda mestilah dilantik sebagai <b>Admin</b> di dalam Saluran/Kumpulan tersebut untuk menghantar mesej.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-lg border border-slate-700">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <span>📝 Tetapan Telegraph</span>
                        </h3>
                        <div>
                            <label className="text-[10px] text-slate-400 font-mono block mb-1">NAMA PENGARANG / ORGANISASI</label>
                            <input
                                type="text"
                                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                                placeholder="Contoh: VectorGuard AI"
                                value={telegraphAuthor}
                                onChange={(e) => setTelegraphAuthor(e.target.value)}
                            />
                            {telegraphAuthUrl && (
                                <p className="text-[10px] text-slate-400 mt-2 font-mono">
                                    <span className="text-yellow-500 font-bold">INFO EDIT: </span>
                                    Untuk mengedit Telegraph selepas diterbitkan, <a href={telegraphAuthUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Log Masuk di Sini</a> menggunakan pelayar web ini, kemudian klik 'EDIT' pada artikel anda.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                    {statusText && (
                        <div className="text-xs text-blue-400 font-mono font-bold animate-pulse text-center bg-blue-900/20 py-2 rounded">
                            {statusText}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={handleExportTelegraph}
                            disabled={isExporting}
                            className="py-3 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 disabled:opacity-50 transition text-xs"
                        >
                            {isExporting ? '...' : 'TERBIT KE TELEGRAPH'}
                        </button>
                        <button
                            onClick={handleExportTelegram}
                            disabled={isExporting}
                            className="py-3 bg-sky-600 text-white rounded font-bold hover:bg-sky-500 shadow-lg shadow-sky-600/30 disabled:opacity-50 transition text-xs"
                        >
                            {isExporting ? '...' : 'HANTAR KE TELEGRAM'}
                        </button>
                    </div>
                    <button
                        onClick={handleExportBoth}
                        disabled={isExporting}
                        className="w-full py-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/30 disabled:opacity-50 transition text-sm"
                    >
                        {isExporting ? 'MEMPROSES...' : 'EKSPORT KEDUA-DUANYA'}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isExporting}
                        className="w-full py-2 bg-slate-800 text-slate-300 rounded font-bold hover:bg-slate-700 disabled:opacity-50 transition mt-2 text-sm"
                    >
                        BATAL
                    </button>
                </div>
            </div>
        </div>
    );
};
