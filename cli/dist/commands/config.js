import { getConfig, setConfig, getConfigFile } from "../config/config.js";
import { logger } from "../utils/logger.js";
/**
 * Registers configuration-related commands.
 */
export function registerConfigCommands(program) {
    const configCmd = program
        .command("config")
        .description("Manage CLI configuration settings");
    configCmd
        .command("show")
        .description("Show current configuration and config file path")
        .action(() => {
        const config = getConfig();
        logger.info(`Config File: ${getConfigFile()}`);
        logger.output(config, (res) => {
            console.log(JSON.stringify(res, null, 2));
        });
    });
    configCmd
        .command("set <key> <value>")
        .description("Set a configuration key-value pair (e.g. set apiUrl http://localhost:5000/api)")
        .action((key, value) => {
        const allowedKeys = ["apiUrl", "token"];
        if (!allowedKeys.includes(key)) {
            logger.fatal(`Invalid config key. Allowed keys: ${allowedKeys.join(", ")}`);
        }
        const updates = {};
        if (key === "apiUrl") {
            updates.apiUrl = value;
        }
        else if (key === "token") {
            updates.token = value === "null" ? null : value;
        }
        setConfig(updates);
        logger.output({ key, value }, () => {
            console.log(`✔ Config key '${key}' successfully set to '${value}'`);
        });
    });
    configCmd
        .command("get <key>")
        .description("Get a specific configuration key value")
        .action((key) => {
        const config = getConfig();
        if (!(key in config)) {
            logger.fatal(`Config key '${key}' does not exist.`);
        }
        const val = config[key];
        logger.output({ [key]: val }, () => {
            console.log(val);
        });
    });
}
