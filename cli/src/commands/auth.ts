import { Command } from "commander";
import { setConfig, getConfig } from "../config/config.js";
import { api } from "../api/api-client.js";

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
                console.log("Connecting to backend to verify connection status...");
                const status = await api.checkStatus();
                console.log("✔ Connection verified successfully!");
                console.log("Telegram auth status:", status.authenticated ? "Connected" : "Disconnected");
            } catch (err: any) {
                console.warn("⚠️ Warning: Saved token, but backend status verification failed.");
                console.warn(`(Reason: ${err.message})`);
            }
        });

    program
        .command("logout")
        .description("Remove authentication token from configuration")
        .action(() => {
            setConfig({ token: null });
            console.log("✔ Authentication token successfully cleared.");
        });

    program
        .command("whoami")
        .description("Show current configuration connection and auth status details")
        .action(async () => {
            try {
                const config = getConfig();
                console.log(`Config Base API: ${config.apiUrl}`);
                console.log(`Token Present:   ${config.token ? "Yes" : "No"}`);
                
                console.log("Contacting backend API...");
                const status = await api.checkStatus();
                console.log("\nBackend Connection Response:");
                console.log(JSON.stringify(status, null, 2));
            } catch (err: any) {
                console.error(`❌ Connection failed: ${err.message}`);
            }
        });
}
