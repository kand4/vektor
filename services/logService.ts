export interface ErrorLog {
    timestamp: string;
    message: string;
    stack?: string;
    context?: any;
}

const LOG_KEY = 'vectorguard_error_logs';

const redactSensitiveLogText = (input: string): string => {
    if (!input) return input;
    return input
        .replace(/AIza[0-9A-Za-z_-]{35}/g, '[REDACTED_GEMINI_KEY]')
        .replace(/([?&](?:key|api_key|apikey|access_token|token)=)[^&\s"']+/gi, '$1[REDACTED]')
        .replace(/bot[0-9]{8,10}:[a-zA-Z0-9_-]{35}/gi, 'bot[REDACTED_TELEGRAM_TOKEN]')
        .replace(/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/g, '[REDACTED_GITHUB_TOKEN]')
        .replace(/\bgithub_pat_[A-Za-z0-9_]{82}\b/g, '[REDACTED_GITHUB_PAT]')
        .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_SECRET_KEY]')
        .replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer [REDACTED]');
};

export const saveLog = (message: string, context?: any) => {
    try {
        const logs: ErrorLog[] = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        const safeMessage = redactSensitiveLogText(String(message || ''));
        const safeStack = redactSensitiveLogText(new Error().stack || '');
        let safeContext = undefined;
        if (context !== undefined) {
            try {
                safeContext = JSON.parse(redactSensitiveLogText(JSON.stringify(context)));
            } catch {
                safeContext = '[Unserializable Context Redacted]';
            }
        }

        logs.unshift({
            timestamp: new Date().toISOString(),
            message: safeMessage,
            stack: safeStack,
            context: safeContext
        });
        
        // Keep only last 50 logs
        if (logs.length > 50) logs.pop();
        
        localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch (e) {
        // Ignored
    }
}

export const getLogs = (): ErrorLog[] => {
    try {
        return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

export const clearLogs = () => {
    localStorage.removeItem(LOG_KEY);
}
