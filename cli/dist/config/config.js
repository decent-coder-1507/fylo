import fs from "fs";
import path from "path";
import os from "os";
const CONFIG_DIR = path.join(os.homedir(), ".fylo");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const DEFAULT_CONFIG = {
    apiUrl: "http://localhost:5000/api",
    token: null,
};
/**
 * Returns the path to the configuration file.
 */
export function getConfigFile() {
    return CONFIG_FILE;
}
/**
 * Loads configuration from disk, creating a default one if none exists.
 */
export function getConfig() {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        if (!fs.existsSync(CONFIG_FILE)) {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
            return DEFAULT_CONFIG;
        }
        const data = fs.readFileSync(CONFIG_FILE, "utf8");
        const parsed = JSON.parse(data);
        return {
            apiUrl: parsed.apiUrl || DEFAULT_CONFIG.apiUrl,
            token: parsed.token !== undefined ? parsed.token : DEFAULT_CONFIG.token,
        };
    }
    catch (error) {
        return DEFAULT_CONFIG;
    }
}
/**
 * Merges partial config values and persists the config on disk.
 */
export function setConfig(updates) {
    const current = getConfig();
    const updated = { ...current, ...updates };
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf8");
}
/**
 * Clears the stored configuration.
 */
export function clearConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            fs.unlinkSync(CONFIG_FILE);
        }
        catch (err) {
            console.error("Failed to delete config file:", err);
        }
    }
}
