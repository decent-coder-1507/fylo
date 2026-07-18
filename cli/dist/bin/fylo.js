#!/usr/bin/env node
import { Command } from "commander";
import { registerConfigCommands } from "../commands/config.js";
import { registerAuthCommands } from "../commands/auth.js";
import { registerUploadCommands } from "../commands/upload.js";
import { registerSyncCommands } from "../commands/sync.js";
import { logger } from "../utils/logger.js";
const program = new Command();
program
    .name("fylo")
    .description("Fylo CLI - Smart Upload Platform CLI Client")
    .version("1.0.0", "-v, --version-cli")
    .option("--json", "Output results in JSON format")
    .option("--verbose", "Enable verbose logging to stderr")
    .option("--no-color", "Disable colors and spinners");
program.hook("preAction", () => {
    const opts = program.opts();
    logger.init({
        json: opts.json,
        verbose: opts.verbose,
        noColor: !opts.color,
    });
});
// Register commands
registerConfigCommands(program);
registerAuthCommands(program);
registerUploadCommands(program);
registerSyncCommands(program);
// Parse CLI input arguments
program.parse(process.argv);
