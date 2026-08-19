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

    const [lastCreatedUrl, setLastCreatedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTelegramBotToken(localStorage.getItem('telegram_bot_token') || '');
            setTelegramChatId(localStorage.getItem('telegram_chat_id') || '');
            setTelegraphAuthor(localStorage.getItem('telegraph_author_name') || 'VectorGuard AI');
            setTelegraphAuthUrl(localStorage.getItem('telegraph_auth_url'));
            setStatusText('');
            setLastCreatedUrl(null);
        }
    }, [isOpen]);

    const handleSaveSettings = () => {
        localStorage.setItem('telegram_bot_token', telegramBotToken.trim());
        localStorage.setItem('telegram_chat_id', telegramChatId.trim());
        localStorage.setItem('telegraph_author_name', telegraphAuthor.trim());
    };

    const handleResetTelegraphToken = async () => {
        try {
            setIsExporting(true);
            setStatusText("Mewujudkan akaun Telegraph baru...");
            const { accessToken, authUrl } = await createTelegraphAccount(telegraphAuthor, true);
            setTelegraphAuthUrl(authUrl);
            setStatusText("");
            setToastMsg({ msg: "Akaun Telegraph berjaya diperbaharui!", type: 'success' });
        } catch (e: any) {
            setStatusText("");
            setToastMsg({ msg: `Ralat: ${e?.message || 'Gagal memperbaharui akaun'}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    const escapeHtml = (unsafe?: string) => {
        if (!unsafe) return "";
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };

    const buildMarkdownForSession = (session: AnalysisSession, index: number, total: number, telegraphUrl?: string): string => {
        const isKkmMode = session.mode === 'KKM_FOOD_STANDARD' || !!session.result?.kkmReport;
        const kkm = session.result?.kkmReport;
        const sensitivity = session.result?.sensitivityUsed || 'STANDARD';

        let report = "";
        if (index === 0) {
            if (isKkmMode) {
                report += `<b>📋 LAPORAN PENILAIAN PREMIS MAKANAN KKM (BORANG K-PPKM)</b>\n`;
                report += `<i>Sistem Penguatkuasaan & Forensik Kebersihan Makanan VectorGuard AI</i>\n`;
            } else {
                report += `<b>🛡️ LAPORAN PEMERIKSAAN VEKTOR & SANITASI (VECTORGUARD AI)</b>\n`;
                report += `<i>Sistem Diagnostik Entomologi & Keselamatan Awam</i>\n`;
            }
            report += `<i>Tarikh Janaan: ${new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</i>\n`;
            report += `<i>Tahap Sensitiviti: ${escapeHtml(sensitivity)}</i>\n\n`;
        }

        report += `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n`;
        report += `<b>SESI ${index + 1} DARIPADA ${total}: ${escapeHtml(session.fileName || 'Pemeriksaan Lapangan')}</b>\n`;

        // KKM Specific Report Section
        if (isKkmMode && kkm) {
            const finalScore = typeof kkm.totalScore === 'number' ? kkm.totalScore : Math.max(0, 100 - (kkm.totalDemerit || 0));
            report += `\n<b>🏛️ KEPUTUSAN GRED KKM:</b>\n`;
            report += `• Gred Premis: <b>GRED ${escapeHtml(kkm.grade || 'N/A')}</b>\n`;
            report += `• Skor Keseluruhan: <b>${finalScore}%</b> (Jumlah Demerit: -${kkm.totalDemerit || 0} mata)\n`;
            if (kkm.recommendation) {
                report += `• Status Tindakan: <b>${escapeHtml(kkm.recommendation)}</b>\n`;
            }
            if (kkm.summary) {
                report += `• Ulasan Pegawai/AI: <i>${escapeHtml(kkm.summary)}</i>\n`;
            }

            // Display sections with violations
            const violatedSections = kkm.sections?.filter(s => (s.demeritReceived > 0 || (s.violations && s.violations.length > 0))) || [];
            if (violatedSections.length > 0) {
                report += `\n<b>⚠️ ELEMEN PELANGGARAN KKM (DEMERIT):</b>\n`;
                violatedSections.forEach((sec) => {
                    report += `• <b>[${escapeHtml(sec.code)}] ${escapeHtml(sec.title)}</b> (-${sec.demeritReceived} mata)\n`;
                    if (sec.violations && sec.violations.length > 0) {
                        sec.violations.forEach((v) => {
                            report += `   - <i>${escapeHtml(v)}</i>\n`;
                        });
                    }
                });
            }
        } else {
            // General Vector & Hygiene Report
            if (session.result?.hygieneLevel !== undefined) {
                report += `• Skor Kebersihan: <b>${session.result.hygieneLevel.toFixed(1)}/5.0</b>\n`;
            }
            if (session.result?.safetyLevel !== undefined) {
                report += `• Skor Keselamatan: <b>${session.result.safetyLevel.toFixed(1)}/5.0</b>\n`;
            }
            if (session.result?.predictedOutbreakChance !== undefined) {
                report += `• Risiko Wabak: <b>${session.result.predictedOutbreakChance}%</b>\n`;
            }
        }

        // Risks findings (Formatted safely for Extreme sensitivity & multiple risks)
        if (session.result?.risks && session.result.risks.length > 0) {
            report += `\n<b>🔍 PENEMUAN RISIKO & KETIDAKPATUHAN (${session.result.risks.length} Titik):</b>\n`;
            session.result.risks.forEach((risk, rIdx) => {
                const conf = risk.confidence ? (risk.confidence * 100).toFixed(0) : '90';
                report += `<b>${rIdx + 1}. ${escapeHtml(risk.label)}</b> [${conf}%]\n`;
                if (risk.agent) report += `   • Agen/Punca: <i>${escapeHtml(risk.agent)}</i>\n`;
                if (risk.disease) report += `   • Vektor/Penyakit: <i>${escapeHtml(risk.disease)}</i>\n`;
                if (risk.solution) report += `   • Tindakan: ${escapeHtml(risk.solution)}\n`;
                report += `\n`;
            });
        } else {
            report += `\n<i>✅ Tiada risiko kritikal dikesan pada premis ini.</i>\n\n`;
        }

        if (session.result?.legalSection) {
            report += `⚖️ <b>Peruntukan Undang-Undang:</b> ${escapeHtml(session.result.legalSection)}\n\n`;
        }

        if (index === total - 1) {
            report += `<b>━━━━━━━━━━━━━━━━━━━━━</b>\n`;
            if (telegraphUrl) {
                report += `📄 <b>Laporan Penuh Digital (Telegraph):</b>\n<a href="${telegraphUrl}">${telegraphUrl}</a>\n\n`;
            }
            const appUrl = "https://vektorx.vercel.app";
            report += `🔍 <b>Jalankan Pemeriksaan Seterusnya di:</b>\n<a href="${appUrl}">${appUrl}</a>`;
        }

        return report;
    };

    const buildTelegraphContent = (uploadedImages: {sessionIndex: number, originalUrl: string, cleanUrl?: string}[]) => {
        const content: any[] = [];
        
        content.push({ tag: 'h3', children: ['LAPORAN PEMERIKSAAN & AUDIT PREMIS (VECTORGUARD AI)'] });
        content.push({ tag: 'p', children: [`Tarikh Janaan: ${new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`] });
        content.push({ tag: 'hr' });

        sessions.forEach((session, index) => {
            const isKkmMode = session.mode === 'KKM_FOOD_STANDARD' || !!session.result?.kkmReport;
            const kkm = session.result?.kkmReport;

            content.push({ tag: 'h4', children: [`Sesi ${index + 1}: ${session.fileName || 'Pemeriksaan Premis'}`] });
            
            const imgs = uploadedImages.filter(img => img.sessionIndex === index);
            if (imgs.length > 0 && imgs[0].originalUrl) {
                content.push({ tag: 'figure', children: [{ tag: 'img', attrs: { src: imgs[0].originalUrl } }, { tag: 'figcaption', children: ['Imej Bukti Asal'] }] });
                content.push({ tag: 'p', children: [{ tag: 'a', attrs: { href: imgs[0].originalUrl, target: '_blank' }, children: ['(Klik Untuk Buka Imej Asal)'] }] });
                
                if (imgs[0].cleanUrl) {
                    content.push({ tag: 'figure', children: [{ tag: 'img', attrs: { src: imgs[0].cleanUrl } }, { tag: 'figcaption', children: ['Imej Simulasi Sanitasi'] }] });
                    content.push({ tag: 'p', children: [{ tag: 'a', attrs: { href: imgs[0].cleanUrl, target: '_blank' }, children: ['(Klik Untuk Buka Imej Simulasi)'] }] });
                }
            }

            if (isKkmMode && kkm) {
                const finalScore = typeof kkm.totalScore === 'number' ? kkm.totalScore : Math.max(0, 100 - (kkm.totalDemerit || 0));
                content.push({ tag: 'p', children: [{ tag: 'b', children: [`🏛️ Gred KKM: Gred ${kkm.grade || 'N/A'} | Skor: ${finalScore}% (Demerit: -${kkm.totalDemerit || 0})`] }] });
                if (kkm.recommendation) {
                    content.push({ tag: 'p', children: [{ tag: 'b', children: ['Status Tindakan: '] }, kkm.recommendation] });
                }
                if (kkm.summary) {
                    content.push({ tag: 'p', children: [{ tag: 'i', children: [`"${kkm.summary}"`] }] });
                }

                const violatedSections = kkm.sections?.filter(s => (s.demeritReceived > 0 || (s.violations && s.violations.length > 0))) || [];
                if (violatedSections.length > 0) {
                    content.push({ tag: 'p', children: [{ tag: 'b', children: ['Pelanggaran Elemen Borang KKM:'] }] });
                    const secUl = { tag: 'ul', children: [] as any[] };
                    violatedSections.forEach(sec => {
                        secUl.children.push({
                            tag: 'li',
                            children: [
                                { tag: 'b', children: [`[${sec.code}] ${sec.title}`] },
                                ` (-${sec.demeritReceived} mata)`,
                                ...(sec.violations && sec.violations.length > 0 ? [{ tag: 'br' }, { tag: 'i', children: [sec.violations.join('; ')] }] : [])
                            ]
                        });
                    });
                    content.push(secUl);
                }
            } else {
                if (session.result?.hygieneLevel !== undefined) {
                    content.push({ tag: 'p', children: [{ tag: 'b', children: [`Skor Kebersihan: ${session.result.hygieneLevel.toFixed(1)}/5.0 | Keselamatan: ${session.result?.safetyLevel?.toFixed(1) || 'N/A'}/5.0`] }] });
                }
            }

            if (session.result?.risks && session.result.risks.length > 0) {
                content.push({ tag: 'p', children: [{ tag: 'b', children: [`Penemuan Titik Risiko (${session.result.risks.length} Titik):`] }] });
                const ul = { tag: 'ul', children: [] as any[] };
                session.result.risks.forEach((risk) => {
                    ul.children.push({
                        tag: 'li',
                        children: [
                            { tag: 'b', children: [risk.label || 'Risiko Dikesan'] },
                            { tag: 'br' },
                            `Punca/Agen: ${risk.agent || 'N/A'}`,
                            { tag: 'br' },
                            `Risiko: ${risk.disease || 'N/A'}`,
                            { tag: 'br' },
                            { tag: 'i', children: [`Tindakan: ${risk.solution || 'Sanitasi segera'}`] }
                        ]
                    });
                });
                content.push(ul);
            }

            if (session.result?.legalSection) {
                content.push({ tag: 'p', children: [{ tag: 'b', children: ['Peruntukan Undang-Undang: '] }, session.result.legalSection] });
            }

            content.push({ tag: 'hr' });
        });

        const appUrl = "https://vektorx.vercel.app";
        content.push({ tag: 'p', children: [{ tag: 'b', children: ['Jalankan Analisis Anda Sendiri di: '] }, { tag: 'a', attrs: { href: appUrl, target: '_blank' }, children: [appUrl] }] });

        return content;
    };

    const uploadImages = async () => {
        setStatusText("Memuat naik gambar ke pelayan imej untuk Telegraph/Telegram...");
        const uploadedImages: {sessionIndex: number, originalUrl: string, cleanUrl?: string}[] = [];
        const allImageUrls: string[] = [];

        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            let originalUrl = "";
            let cleanUrl = undefined;
            
            if (session.imageSrc) {
                try {
                    originalUrl = await uploadToTelegraph(session.imageSrc);
                    if (originalUrl) allImageUrls.push(originalUrl);
                } catch(e: any) {
                    console.warn("Gagal muat naik gambar asal sesi", i, e?.message || e);
                }
            }
            if (session.simulationImage) {
                try {
                    cleanUrl = await uploadToTelegraph(session.simulationImage);
                    if (cleanUrl) allImageUrls.push(cleanUrl);
                } catch(e: any) {
                    console.warn("Gagal muat naik gambar simulasi sesi", i, e?.message || e);
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
            if (authUrl) {
                localStorage.setItem('telegraph_auth_url', authUrl);
                setTelegraphAuthUrl(authUrl);
            }
            const content = buildTelegraphContent(uploadedImages);
            const telegraphUrl = await createTelegraphPage(accessToken, `Laporan Vektor & Sanitasi`, telegraphAuthor, content);
            
            setStatusText("");
            setLastCreatedUrl(telegraphUrl);
            setToastMsg({ msg: `Artikel Telegraph Berjaya Diterbitkan!`, type: 'success' });
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
        if (!sessions || sessions.length === 0) return setToastMsg({ msg: "Tiada data analisis untuk dieksport.", type: 'error' });
        
        const token = telegramBotToken.trim();
        const rawChatId = telegramChatId.trim();

        if (!token || !rawChatId) {
            setToastMsg({ 
                msg: "Sila masukkan Telegram Bot Token dan Chat ID anda dalam tetapan di bawah.", 
                type: 'error' 
            });
            return;
        }

        setIsExporting(true);
        handleSaveSettings();
        const cleanedChatId = cleanTelegramChatId(rawChatId);
        
        try {
            const { uploadedImages } = await uploadImages();
            
            setStatusText("Menghantar mesej dan gambar ke Telegram...");
            
            for (let i = 0; i < sessions.length; i++) {
                const session = sessions[i];
                const textReport = buildMarkdownForSession(session, i, sessions.length);
                const sessionImages = uploadedImages.filter(img => img.sessionIndex === i);
                const urlsForSession: string[] = [];
                if (sessionImages.length > 0) {
                    urlsForSession.push(sessionImages[0].originalUrl);
                    if (sessionImages[0].cleanUrl) urlsForSession.push(sessionImages[0].cleanUrl);
                }

                // Also collect raw images as reliable fallback
                const rawImagesForSession: string[] = [];
                if (session.imageSrc) rawImagesForSession.push(session.imageSrc);
                if (session.simulationImage) rawImagesForSession.push(session.simulationImage);
                
                await sendTelegramMessage(token, cleanedChatId, textReport, urlsForSession, rawImagesForSession);
            }

            setStatusText("");
            setToastMsg({ msg: "Laporan berjaya dihantar ke Telegram!", type: 'success' });
            setTimeout(() => onClose(), 2000);
        } catch (error: any) {
            setStatusText("");
            setToastMsg({ msg: `Ralat Telegram: ${error.message}`, type: 'error' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportBoth = async () => {
        if (!sessions || sessions.length === 0) return setToastMsg({ msg: "Tiada data analisis untuk dieksport.", type: 'error' });
        
        const token = telegramBotToken.trim();
        const rawChatId = telegramChatId.trim();

        if (!token || !rawChatId) {
            setToastMsg({ 
                msg: "Sila masukkan Telegram Bot Token dan Chat ID anda dalam tetapan di bawah.", 
                type: 'error' 
            });
            return;
        }

        setIsExporting(true);
        handleSaveSettings();
        const cleanedChatId = cleanTelegramChatId(rawChatId);
        
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
                const urlsForSession: string[] = [];
                if (sessionImages.length > 0) {
                    urlsForSession.push(sessionImages[0].originalUrl);
                    if (sessionImages[0].cleanUrl) urlsForSession.push(sessionImages[0].cleanUrl);
                }

                const rawImagesForSession: string[] = [];
                if (session.imageSrc) rawImagesForSession.push(session.imageSrc);
                if (session.simulationImage) rawImagesForSession.push(session.simulationImage);
                
                await sendTelegramMessage(token, cleanedChatId, textReport, urlsForSession, rawImagesForSession);
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
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>📝 Tetapan Telegraph (telegra.ph)</span>
                            </h3>
                            <button
                                type="button"
                                onClick={handleResetTelegraphToken}
                                disabled={isExporting}
                                className="text-[10px] text-amber-400 hover:text-amber-300 font-mono underline"
                            >
                                🔄 Jana Semula Akaun
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-3 leading-relaxed font-mono">
                            <span className="text-emerald-400">Nota:</span> Telegraph tidak memerlukan Telegram Bot Token atau Chat ID. Ia menjana artikel web rasmi Telegram secara automatik.
                        </p>
                        <div className="space-y-2">
                            <div>
                                <label className="text-[10px] text-slate-400 font-mono block mb-1">NAMA PENGARANG / ORGANISASI</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                                    placeholder="Contoh: VectorGuard AI"
                                    value={telegraphAuthor}
                                    onChange={(e) => setTelegraphAuthor(e.target.value)}
                                />
                            </div>

                            {telegraphAuthUrl && (
                                <div className="mt-3 p-2.5 bg-slate-900/90 border border-slate-700/80 rounded flex items-center justify-between gap-2">
                                    <div className="text-[10px] text-slate-300 font-mono">
                                        <span className="text-amber-400 font-bold">✏️ Sesi Pengarang:</span> Log masuk untuk membolehkan butang <b>EDIT</b> pada artikel Telegraph.
                                    </div>
                                    <a
                                        href={telegraphAuthUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold whitespace-nowrap transition"
                                    >
                                        Buka Sesi Edit ↗
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {lastCreatedUrl && (
                    <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-lg animate-fade-in">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                            <span>✅ Artikel Telegraph Berjaya Diterbitkan!</span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-mono break-all mb-3 select-all bg-black/40 p-1.5 rounded">
                            {lastCreatedUrl}
                        </p>
                        <div className="flex items-center gap-2">
                            <a
                                href={lastCreatedUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-center text-xs font-bold transition shadow"
                            >
                                🌐 Buka Artikel
                            </a>
                            {telegraphAuthUrl && (
                                <a
                                    href={telegraphAuthUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded text-center text-xs font-bold transition shadow"
                                >
                                    ✏️ Log Masuk & Edit
                                </a>
                            )}
                        </div>
                    </div>
                )}

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
