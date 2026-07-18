import chalk from "chalk";
class Logger {
    isJsonMode = false;
    isVerboseMode = false;
    isColorEnabled = true;
    init(options = {}) {
        this.isJsonMode = options.json || process.env.FYLO_JSON === "true";
        this.isVerboseMode = options.verbose || process.env.FYLO_VERBOSE === "true";
        const hasNoColor = options.noColor || process.env.NO_COLOR !== undefined || !process.stdout.isTTY;
        this.isColorEnabled = !hasNoColor;
    }
    get isJson() {
        return this.isJsonMode;
    }
    get isVerbose() {
        return this.isVerboseMode;
    }
    get isColor() {
        return this.isColorEnabled;
    }
    /**
     * Info log. Written to stderr in JSON/non-JSON mode to prevent polluting stdout.
     */
    info(msg) {
        if (this.isJsonMode) {
            const logObj = { timestamp: new Date().toISOString(), level: "INFO", message: msg };
            process.stderr.write(JSON.stringify(logObj) + "\n");
        }
        else {
            process.stderr.write(msg + "\n");
        }
    }
    /**
     * Error log. Written to stderr.
     */
    error(msg, err) {
        const errorMsg = err ? `${msg}: ${err.message || err}` : msg;
        if (this.isJsonMode) {
            const logObj = {
                timestamp: new Date().toISOString(),
                level: "ERROR",
                message: errorMsg,
                stack: err?.stack || undefined
            };
            process.stderr.write(JSON.stringify(logObj) + "\n");
        }
        else {
            const formatted = this.isColorEnabled ? chalk.red(`❌ ${errorMsg}`) : `Error: ${errorMsg}`;
            process.stderr.write(formatted + "\n");
        }
    }
    /**
     * Warning log. Written to stderr.
     */
    warn(msg) {
        if (this.isJsonMode) {
            const logObj = { timestamp: new Date().toISOString(), level: "WARN", message: msg };
            process.stderr.write(JSON.stringify(logObj) + "\n");
        }
        else {
            const formatted = this.isColorEnabled ? chalk.yellow(`⚠️ ${msg}`) : `Warning: ${msg}`;
            process.stderr.write(formatted + "\n");
        }
    }
    /**
     * Debug log. Written to stderr.
     */
    debug(msg) {
        if (!this.isVerboseMode)
            return;
        if (this.isJsonMode) {
            const logObj = { timestamp: new Date().toISOString(), level: "DEBUG", message: msg };
            process.stderr.write(JSON.stringify(logObj) + "\n");
        }
        else {
            const formatted = this.isColorEnabled ? chalk.gray(`[DEBUG] ${msg}`) : `[DEBUG] ${msg}`;
            process.stderr.write(formatted + "\n");
        }
    }
    /**
     * Outputs the final structured result of a command to stdout.
     * In JSON mode, this is stringified JSON.
     * In standard mode, it calls the prettyPrinter callback.
     */
    output(result, prettyPrinter) {
        if (this.isJsonMode) {
            process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        }
        else {
            prettyPrinter(result);
        }
    }
    /**
     * Terminate the process with a failure status code.
     */
    fatal(msg, err, exitCode = 1) {
        this.error(msg, err);
        process.exit(exitCode);
    }
}
export const logger = new Logger();
