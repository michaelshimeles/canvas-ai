// Shared global logs storage
let globalLogs: string[] = [];

export function addLog(log: string) {
    globalLogs.push(log);
    // Keep only last 500 logs to prevent memory issues
    if (globalLogs.length > 500) {
        globalLogs = globalLogs.slice(-500);
    }
}

export function getLogs(): string[] {
    return [...globalLogs];
}

export function clearLogs() {
    globalLogs = [];
}

