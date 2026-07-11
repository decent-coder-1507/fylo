import { getConfig, setConfig, getConfigFile } from "../config/config.js";
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
        console.log(`Config File: ${getConfigFile()}`);
        console.log(JSON.stringify(config, null, 2));
    });
    configCmd
        .command("set <key> <value>")
        .description("Set a configuration key-value pair (e.g. set apiUrl http://localhost:5000/api)")
        .action((key, value) => {
        const allowedKeys = ["apiUrl", "token"];
        if (!allowedKeys.includes(key)) {
            console.error(`❌ Error: Invalid config key. Allowed keys: ${allowedKeys.join(", ")}`);
            process.exit(1);
        }
        const updates = {};
        if (key === "apiUrl") {
            updates.apiUrl = value;
        }
        else if (key === "token") {
            updates.token = value === "null" ? null : value;
        }
        setConfig(updates);
        console.log(`✔ Config key '${key}' successfully set to '${value}'`);
    });
    configCmd
        .command("get <key>")
        .description("Get a specific configuration key value")
        .action((key) => {
        const config = getConfig();
        if (!(key in config)) {
            console.error(`❌ Error: Config key '${key}' does not exist.`);
            process.exit(1);
        }
        console.log(config[key]);
    });
}
