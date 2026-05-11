export interface ErrorLog {
    timestamp: string;
    message: string;
    stack?: string;
    context?: any;
}

const LOG_KEY = 'vectorguard_error_logs';

export const saveLog = (message: string, context?: any) => {
    try {
        const logs: ErrorLog[] = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
        logs.unshift({
            timestamp: new Date().toISOString(),
            message: message.toString(),
            stack: new Error().stack,
            context
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
