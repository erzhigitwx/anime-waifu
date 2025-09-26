export class Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private log(level: string, ...args: any[]) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] [${this.context}]`, ...args);
    }

    public debug(...args: any[]) {
        // Only log debug in development environments
        if (process.env.NODE_ENV === 'development') {
            this.log('DEBUG', ...args);
        }
    }

    public info(...args: any[]) {
        this.log('INFO', ...args);
    }

    public warn(...args: any[]) {
        this.log('WARN', ...args);
    }

    public error(...args: any[]) {
        this.log('ERROR', ...args);
    }
}