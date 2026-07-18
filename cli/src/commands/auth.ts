import { Command } from "commander";
import { setConfig, getConfig } from "../config/config.js";
import { api } from "../api/api-client.js";
import { logger } from "../utils/logger.js";

/**
 * Registers authentication-related commands.
 */
export function registerAuthCommands(program: Command): void {
    program
        .command("login <token>")
        .description("Save authentication token and verify backend connection")
        .action(async (token: string) => {
            try {
                // Save the token first
                setConfig({ token });
                logger.info("Connecting to backend to verify connection status...");
                const status = await api.checkStatus();
                logger.output(status, (res) => {
                    console.log("✔ Connection verified successfully!");
                    console.log("Telegram auth status:", res.authenticated ? "Connected" : "Disconnected");
                });
            } catch (err: any) {
                logger.warn(`Warning: Saved token, but backend status verification failed. (Reason: ${err.message})`);
            }
        });

    program
        .command("logout")
        .description("Remove authentication token from configuration")
        .action(() => {
            setConfig({ token: null });
            logger.output({ cleared: true }, () => {
                console.log("✔ Authentication token successfully cleared.");
            });
        });

    program
        .command("whoami")
        .description("Show current configuration connection and auth status details")
        .action(async () => {
            try {
                const config = getConfig();
                logger.info(`Config Base API: ${config.apiUrl}`);
                logger.info(`Token Present:   ${config.token ? "Yes" : "No"}`);
                
                logger.info("Contacting backend API...");
                const status = await api.checkStatus();
                logger.output(status, (res) => {
                    console.log("\nBackend Connection Response:");
                    console.log(JSON.stringify(res, null, 2));
                });
            } catch (err: any) {
                logger.fatal("Connection failed", err);
            }
        });
}
