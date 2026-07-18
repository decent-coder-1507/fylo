import { api } from "../api/api-client.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";
import { logger } from "../utils/logger.js";
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
export async function calculateFileSha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", (err) => reject(err));
    });
}
// Git and package.json auto-detection helpers
export function getGitCommit() {
    try {
        return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    }
    catch {
        return undefined;
    }
}
export function getGitBranch() {
    try {
        return execSync("git rev-parse --abbrev-ref HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    }
    catch {
        return undefined;
    }
}
export function getGitUser() {
    const details = {};
    try {
        details.name = execSync("git config user.name", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    }
    catch { }
    try {
        details.email = execSync("git config user.email", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    }
    catch { }
    return details;
}
export function getPackageMetadata(filePath) {
    try {
        let currentDir = path.dirname(path.resolve(filePath));
        for (let i = 0; i < 5; i++) {
            const packagePath = path.join(currentDir, "package.json");
            if (fs.existsSync(packagePath)) {
                const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
                return { name: pkg.name, version: pkg.version };
            }
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir)
                break;
            currentDir = parentDir;
        }
    }
    catch { }
    // Fallback: use current folder name as project name
    try {
        return { name: path.basename(process.cwd()) };
    }
    catch {
        return {};
    }
}
/**
 * Registers upload and session workflow commands.
 */
export function registerUploadCommands(program) {
    program
        .command("upload <file>")
        .description("Upload a file to the smart upload platform as a developer artifact")
        .option("-f, --folder <id>", "Database Folder ID or target peer channel ID")
        .option("-s, --session <id>", "Existing session ID to resume or execute under")
        .option("--no-session", "Bypass planning handshake stage and upload directly")
        // Developer Artifact Options
        .option("--project <name>", "Developer project name")
        .option("--version <semver>", "Release or build version")
        .option("--commit <hash>", "Git commit SHA hash reference")
        .option("--branch <name>", "Git branch name")
        .option("--env <environment>", "Build environment (e.g. production, staging, development, CI/CD)")
        .option("--tags <tags>", "Comma-separated list of build tags")
        .option("--uploader-name <name>", "Uploader name")
        .option("--uploader-email <email>", "Uploader email contact")
        .action(async (file, options) => {
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
            logger.fatal(`File not found: ${filePath}`);
        }
        const stats = fs.statSync(filePath);
        const fileName = path.basename(filePath);
        const size = stats.size;
        // Auto-detect artifact metadata details
        const pkgInfo = getPackageMetadata(filePath);
        const gitUser = getGitUser();
        const autoCommit = getGitCommit();
        const autoBranch = getGitBranch();
        // Build env detection
        let autoEnv = "local";
        if (process.env.GITHUB_ACTIONS)
            autoEnv = "github-ci";
        else if (process.env.CI)
            autoEnv = "ci";
        else if (process.env.NODE_ENV)
            autoEnv = process.env.NODE_ENV;
        const artifactMetadata = {
            projectName: options.project || process.env.FYLO_PROJECT || pkgInfo.name || undefined,
            projectVersion: options.version || process.env.FYLO_VERSION || pkgInfo.version || undefined,
            commitHash: options.commit || process.env.FYLO_COMMIT || autoCommit || undefined,
            branchName: options.branch || process.env.FYLO_BRANCH || autoBranch || undefined,
            buildEnv: options.env || process.env.FYLO_ENV || autoEnv,
            tags: (options.tags || process.env.FYLO_TAGS || "").split(",").map((t) => t.trim()).filter(Boolean),
            uploaderName: options.uploaderName || process.env.FYLO_UPLOADER_NAME || gitUser.name || undefined,
            uploaderEmail: options.uploaderEmail || process.env.FYLO_UPLOADER_EMAIL || gitUser.email || undefined,
        };
        logger.info(`Preparing upload for: ${fileName} (${formatBytes(size)})`);
        logger.info("\nDetected Developer Artifact Details:");
        logger.info(`- Project:      ${artifactMetadata.projectName || "None"}`);
        logger.info(`- Version:      ${artifactMetadata.projectVersion || "None"}`);
        if (artifactMetadata.branchName || artifactMetadata.commitHash) {
            logger.info(`- Git Ref:      ${artifactMetadata.branchName || "unknown"} (${artifactMetadata.commitHash?.slice(0, 7) || "no commit"})`);
        }
        logger.info(`- Env:          ${artifactMetadata.buildEnv}`);
        if (artifactMetadata.tags.length > 0) {
            logger.info(`- Tags:         ${artifactMetadata.tags.join(", ")}`);
        }
        if (artifactMetadata.uploaderName || artifactMetadata.uploaderEmail) {
            logger.info(`- Uploader:     ${artifactMetadata.uploaderName || ""} <${artifactMetadata.uploaderEmail || ""}>`);
        }
        logger.info("");
        try {
            let session = null;
            let finalSessionId = options.session;
            // 1. Calculate overall file checksum (SHA-256)
            logger.info("Calculating file integrity checksum...");
            const fileChecksum = await calculateFileSha256(filePath);
            logger.info(`Checksum: ${fileChecksum}`);
            // 2. Retrieve or create Upload Session
            if (options.session === false) {
                logger.info("Direct mode activated. Bypassing planner handshake.");
            }
            else if (finalSessionId) {
                logger.info(`Retrieving active session: ${finalSessionId}...`);
                session = await api.getSession(finalSessionId);
            }
            else {
                logger.info("Planner handshake: Registering upload session on server...");
                session = await api.createSession(fileName, size, undefined, options.folder, fileChecksum, artifactMetadata);
                finalSessionId = session.id;
                logger.info(`✔ Upload session established: ${session.id}`);
            }
            const startTime = Date.now();
            let result;
            if (session && session.status === "COMPLETED") {
                logger.info(`\n✔ Upload session ${session.id} is already completed!`);
                result = {
                    id: session.fileId || "",
                    name: session.fileName,
                    size: session.size,
                    checksum: session.checksum,
                    deduplicated: session.deduplicated,
                };
            }
            else if (session && session.isChunked && session.plan && session.plan.chunks) {
                logger.info(`Resumable Chunked Transfer detected (${session.totalChunks} chunks).`);
                const chunks = session.plan.chunks;
                const fileHandle = fs.openSync(filePath, "r");
                try {
                    for (let i = 0; i < chunks.length; i++) {
                        const chunk = chunks[i];
                        // Check if this chunk is already completed (resumability!)
                        if (chunk.status === "completed") {
                            logger.info(`  Chunk ${chunk.index + 1}/${chunks.length} already uploaded. Skipping.`);
                            continue;
                        }
                        logger.info(`  Uploading Chunk ${chunk.index + 1}/${chunks.length} (${formatBytes(chunk.size)})...`);
                        const buffer = Buffer.alloc(chunk.size);
                        fs.readSync(fileHandle, buffer, 0, chunk.size, chunk.offset);
                        // Calculate chunk-specific checksum for chunk integrity verification
                        const chunkChecksum = crypto.createHash("sha256").update(buffer).digest("hex");
                        // Upload the chunk with retry support (handled on backend)
                        await api.uploadChunk(session.id, chunk.index, buffer, chunkChecksum);
                    }
                }
                finally {
                    fs.closeSync(fileHandle);
                }
                logger.info("Verifying overall upload integrity and completing session...");
                result = await api.verifySession(session.id);
            }
            else {
                // Falls back to direct upload
                logger.info(`Streaming file contents to server...`);
                result = await api.uploadFile(filePath, options.folder, finalSessionId, artifactMetadata);
            }
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const resolvedVia = result.deduplicated
                ? " (resolved via duplicate detection)"
                : "";
            logger.output(result, (res) => {
                console.log(`\n✔ Upload finished successfully in ${duration}s${resolvedVia}!`);
                console.log(`File ID:   ${res.id}`);
                console.log(`Name:      ${res.name}`);
                console.log(`Size:      ${formatBytes(res.size)}`);
                if (res.checksum) {
                    console.log(`Checksum:  ${res.checksum}`);
                }
            });
        }
        catch (err) {
            logger.fatal("Upload failed", err);
        }
    });
    program
        .command("sessions")
        .description("List recent upload session workflows")
        .action(async () => {
        try {
            logger.info("Loading upload sessions from server...");
            const sessions = await api.listSessions();
            logger.output(sessions, (list) => {
                if (list.length === 0) {
                    console.log("No upload sessions found.");
                    return;
                }
                console.log("\nRecent Upload Sessions:");
                console.log("=".repeat(85));
                console.log(`${"Session ID".padEnd(26)} ${"File Name".padEnd(22)} ${"Size".padEnd(10)} ${"Status".padEnd(12)} ${"Created".padEnd(12)}`);
                console.log("=".repeat(85));
                for (const s of list) {
                    const dateStr = new Date(s.createdAt).toLocaleDateString();
                    const sizeStr = formatBytes(s.size);
                    const nameTrunc = s.fileName.length > 20 ? s.fileName.slice(0, 17) + "..." : s.fileName;
                    console.log(`${s.id.padEnd(26)} ${nameTrunc.padEnd(22)} ${sizeStr.padEnd(10)} ${s.status.padEnd(12)} ${dateStr.padEnd(12)}`);
                }
                console.log("=".repeat(85));
            });
        }
        catch (err) {
            logger.fatal("Failed to list sessions", err);
        }
    });
    program
        .command("session <id>")
        .description("Show detail view of a specific upload session")
        .action(async (id) => {
        try {
            logger.info(`Fetching session details for ID: ${id}`);
            const session = await api.getSession(id);
            logger.output(session, (data) => {
                console.log("\nSession Detailed View:");
                console.log(JSON.stringify(data, null, 2));
            });
        }
        catch (err) {
            logger.fatal("Failed to retrieve session details", err);
        }
    });
    program
        .command("projects")
        .description("List distinct developer projects tracked as artifacts")
        .action(async () => {
        try {
            logger.info("Loading tracked projects from server...");
            const projects = await api.getProjects();
            logger.output(projects, (list) => {
                if (list.length === 0) {
                    console.log("No developer projects found.");
                    return;
                }
                console.log("\nTracked Developer Projects:");
                console.log("=".repeat(105));
                console.log(`${"Project Name".padEnd(25)} ${"Builds".padEnd(8)} ${"Latest Version".padEnd(16)} ${"Git Branch".padEnd(16)} ${"Env".padEnd(12)} ${"Last Updated".padEnd(15)}`);
                console.log("=".repeat(105));
                for (const p of list) {
                    const dateStr = new Date(p.updatedAt).toLocaleDateString();
                    console.log(`${(p.projectName || "unnamed").padEnd(25)} ${String(p.buildsCount).padEnd(8)} ${(p.latestVersion || "-").padEnd(16)} ${(p.latestBranch || "-").padEnd(16)} ${(p.latestEnv || "-").padEnd(12)} ${dateStr.padEnd(15)}`);
                }
                console.log("=".repeat(105));
            });
        }
        catch (err) {
            logger.fatal("Failed to list projects", err);
        }
    });
    program
        .command("versions <projectName>")
        .description("List all artifact builds and versions for a project")
        .action(async (projectName) => {
        try {
            logger.info(`Loading version history for project: ${projectName}...`);
            const versions = await api.getProjectVersions(projectName);
            logger.output(versions, (list) => {
                if (list.length === 0) {
                    console.log(`No builds found for project: ${projectName}`);
                    return;
                }
                console.log(`\nArtifact History for '${projectName}':`);
                console.log("=".repeat(115));
                console.log(`${"File ID".padEnd(38)} ${"Version".padEnd(12)} ${"Branch".padEnd(14)} ${"Commit".padEnd(10)} ${"Env".padEnd(10)} ${"Size".padEnd(10)} ${"Created At"}`);
                console.log("=".repeat(115));
                for (const v of list) {
                    const dateStr = new Date(v.createdAt).toLocaleDateString() + " " + new Date(v.createdAt).toLocaleTimeString();
                    const sizeStr = formatBytes(v.size || 0);
                    console.log(`${v.id.padEnd(38)} ${(v.projectVersion || "-").padEnd(12)} ${(v.branchName || "-").padEnd(14)} ${(v.commitHash ? v.commitHash.slice(0, 7) : "-").padEnd(10)} ${(v.buildEnv || "-").padEnd(10)} ${sizeStr.padEnd(10)} ${dateStr}`);
                }
                console.log("=".repeat(115));
            });
        }
        catch (err) {
            logger.fatal("Failed to retrieve version history", err);
        }
    });
    program
        .command("tags")
        .description("List artifact tags summary and usage counts")
        .action(async () => {
        try {
            logger.info("Loading artifact tags summary...");
            const tags = await api.getArtifactTags();
            logger.output(tags, (list) => {
                if (list.length === 0) {
                    console.log("No artifact tags found.");
                    return;
                }
                console.log("\nTracked Artifact Tags:");
                console.log("=".repeat(35));
                console.log(`${"Tag Name".padEnd(20)} ${"Usage Count"}`);
                console.log("=".repeat(35));
                for (const t of list) {
                    console.log(`${t.name.padEnd(20)} ${t.count}`);
                }
                console.log("=".repeat(35));
            });
        }
        catch (err) {
            logger.fatal("Failed to list tags", err);
        }
    });
}
export async function runUploadForFile(filePath, folderId, artifactMetadata, options = {}) {
    const stats = fs.statSync(filePath);
    const fileName = options.customFileName || path.basename(filePath);
    const size = stats.size;
    let session = null;
    let finalSessionId = typeof options.session === "string" ? options.session : undefined;
    // Calculate file checksum (SHA-256)
    const fileChecksum = await calculateFileSha256(filePath);
    if (options.session === false) {
        // Direct mode
    }
    else if (finalSessionId) {
        session = await api.getSession(finalSessionId);
    }
    else {
        session = await api.createSession(fileName, size, undefined, folderId, fileChecksum, artifactMetadata);
        finalSessionId = session.id;
    }
    let result;
    if (session && session.status === "COMPLETED") {
        result = {
            id: session.fileId || "",
            name: session.fileName,
            size: session.size,
            checksum: session.checksum,
            deduplicated: session.deduplicated,
        };
    }
    else if (session && session.isChunked && session.plan && session.plan.chunks) {
        logger.info(`    Resumable Chunked Transfer detected (${session.totalChunks} chunks).`);
        const chunks = session.plan.chunks;
        const fileHandle = fs.openSync(filePath, "r");
        try {
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                if (chunk.status === "completed") {
                    logger.info(`      Chunk ${chunk.index + 1}/${chunks.length} already uploaded. Skipping.`);
                    continue;
                }
                logger.info(`      Uploading Chunk ${chunk.index + 1}/${chunks.length} (${formatBytes(chunk.size)})...`);
                const buffer = Buffer.alloc(chunk.size);
                fs.readSync(fileHandle, buffer, 0, chunk.size, chunk.offset);
                const chunkChecksum = crypto.createHash("sha256").update(buffer).digest("hex");
                await api.uploadChunk(session.id, chunk.index, buffer, chunkChecksum);
            }
        }
        finally {
            fs.closeSync(fileHandle);
        }
        logger.info("    Verifying overall upload integrity and completing session...");
        result = await api.verifySession(session.id);
    }
    else {
        logger.info(`    Streaming file contents to server...`);
        result = await api.uploadFile(filePath, folderId, finalSessionId, artifactMetadata, options.customFileName);
    }
    return result;
}
