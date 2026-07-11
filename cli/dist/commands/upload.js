import { api } from "../api/api-client.js";
import fs from "fs";
import path from "path";
function formatBytes(bytes, decimals = 2) {
    if (!+bytes)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
/**
 * Registers upload and session workflow commands.
 */
export function registerUploadCommands(program) {
    program
        .command("upload <file>")
        .description("Upload a file to the smart upload platform")
        .option("-f, --folder <id>", "Database Folder ID or target peer channel ID")
        .option("-s, --session <id>", "Existing session ID to resume or execute under")
        .option("--no-session", "Bypass planning handshake stage and upload directly")
        .action(async (file, options) => {
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Error: File not found: ${filePath}`);
            process.exit(1);
        }
        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);
        const size = stats.size;
        console.log(`Preparing upload for: ${fileName} (${formatBytes(size)})`);
        try {
            let finalSessionId = options.session;
            // Handle session logic
            if (options.session === false) {
                console.log("Direct mode activated. Bypassing planner handshake.");
            }
            else if (!finalSessionId) {
                console.log("Planner handshake: Registering upload session on server...");
                const session = await api.createSession(fileName, size, undefined, options.folder);
                finalSessionId = session.id;
                console.log(`✔ Upload session established: ${session.id}`);
                console.log(`  Plan target: ${session.isChunked ? `Chunked Transfer (${session.totalChunks} chunks)` : "Single Block Transfer"}`);
            }
            console.log(`Streaming file contents to server...`);
            const startTime = Date.now();
            const result = await api.uploadFile(filePath, options.folder, finalSessionId);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n✔ Upload finished successfully in ${duration}s!`);
            console.log(`File ID:   ${result.id}`);
            console.log(`Name:      ${result.name}`);
            console.log(`Size:      ${formatBytes(result.size)}`);
            if (result.checksum) {
                console.log(`Checksum:  ${result.checksum}`);
            }
        }
        catch (err) {
            console.error(`❌ Upload failed: ${err.message}`);
            process.exit(1);
        }
    });
    program
        .command("sessions")
        .description("List recent upload session workflows")
        .action(async () => {
        try {
            console.log("Loading upload sessions from server...");
            const sessions = await api.listSessions();
            if (sessions.length === 0) {
                console.log("No upload sessions found.");
                return;
            }
            console.log("\nRecent Upload Sessions:");
            console.log("=".repeat(85));
            console.log(`${"Session ID".padEnd(26)} ${"File Name".padEnd(22)} ${"Size".padEnd(10)} ${"Status".padEnd(12)} ${"Created".padEnd(12)}`);
            console.log("=".repeat(85));
            for (const s of sessions) {
                const dateStr = new Date(s.createdAt).toLocaleDateString();
                const sizeStr = formatBytes(s.size);
                const nameTrunc = s.fileName.length > 20 ? s.fileName.slice(0, 17) + "..." : s.fileName;
                console.log(`${s.id.padEnd(26)} ${nameTrunc.padEnd(22)} ${sizeStr.padEnd(10)} ${s.status.padEnd(12)} ${dateStr.padEnd(12)}`);
            }
            console.log("=".repeat(85));
        }
        catch (err) {
            console.error(`❌ Failed to list sessions: ${err.message}`);
        }
    });
    program
        .command("session <id>")
        .description("Show detail view of a specific upload session")
        .action(async (id) => {
        try {
            console.log(`Fetching session details for ID: ${id}`);
            const session = await api.getSession(id);
            console.log("\nSession Detailed View:");
            console.log(JSON.stringify(session, null, 2));
        }
        catch (err) {
            console.error(`❌ Failed to retrieve session details: ${err.message}`);
        }
    });
}
