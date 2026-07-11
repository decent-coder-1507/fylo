#!/usr/bin/env node

import { Command } from "commander";
import { registerConfigCommands } from "../commands/config.js";
import { registerAuthCommands } from "../commands/auth.js";
import { registerUploadCommands } from "../commands/upload.js";

const program = new Command();

program
    .name("fylo")
    .description("Fylo CLI - Smart Upload Platform CLI Client")
    .version("1.0.0");

// Register commands
registerConfigCommands(program);
registerAuthCommands(program);
registerUploadCommands(program);

// Parse CLI input arguments
program.parse(process.argv);
