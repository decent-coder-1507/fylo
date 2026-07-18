import { api } from "../api/api-client.js";
import fs from "fs";
import path from "path";
import readline from "readline";
import { generateBlake3 } from "../utils/checksum.js";
import { logger } from "../utils/logger.js";
import { formatBytes, getGitCommit, getGitBranch, getGitUser, getPackageMetadata, runUploadForFile } from "./upload.js";
// Helper to recursively walk a directory
function walkDir(dir, recursive) {
    let files = [];
    const list = fs.readdirSync(dir);
    for (const item of list) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (recursive) {
                files = files.concat(walkDir(fullPath, recursive));
            }
        }
        else {
            files.push(fullPath);
        }
    }
    return files;
}
// Simple prompt helper for confirmation
async function confirmAction(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            const normalized = answer.trim().toLowerCase();
            resolve(normalized === "y" || normalized === "yes");
        });
    });
}
export function registerSyncCommands(program) {
    program
        .command("sync <localDir>")
        .description("Synchronize a local directory with a remote Folder in TeleStore")
        .option("-f, --folder <id>", "Database Folder ID to sync with")
        .option("-n, --name <name>", "Folder name to sync with. Will find or create folder")
        .option("-d, --delete", "Delete remote files that do not exist locally")
        .option("--no-recursive", "Do not recurse into subdirectories")
        .option("--dry-run", "Show what files would be synced, skipped, or deleted without executing")
        .option("--yes", "Automatically confirm remote file deletions")
        // Developer Artifact Options for Uploads
        .option("--project <name>", "Developer project name")
        .option("--version <semver>", "Release or build version")
        .option("--commit <hash>", "Git commit SHA hash reference")
        .option("--branch <name>", "Git branch name")
        .option("--env <environment>", "Build environment (e.g. production, staging, local)")
        .option("--tags <tags>", "Comma-separated list of build tags")
        .option("--uploader-name <name>", "Uploader name")
        .option("--uploader-email <email>", "Uploader email contact")
        .action(async (localDir, options) => {
        const resolvedLocalDir = path.resolve(localDir);
        if (!fs.existsSync(resolvedLocalDir) || !fs.statSync(resolvedLocalDir).isDirectory()) {
            logger.fatal(`Local path is not a valid directory: ${localDir}`);
        }
        try {
            // 1. Resolve remote Folder
            let folder = null;
            let folderId;
            if (options.folder) {
                logger.info(`Fetching folder by ID: ${options.folder}...`);
                folder = await api.getFolder(options.folder);
                folderId = folder.id;
            }
            else {
                // Try to resolve folder name
                const folderName = options.name || path.basename(resolvedLocalDir);
                logger.info(`Resolving folder name: "${folderName}"...`);
                const folders = await api.listFolders();
                const existingFolder = folders.find((f) => f.name.toLowerCase() === folderName.toLowerCase());
                if (existingFolder) {
                    logger.info(`Found existing folder: "${existingFolder.name}" (ID: ${existingFolder.id})`);
                    folder = await api.getFolder(existingFolder.id);
                    folderId = folder.id;
                }
                else {
                    if (options.dryRun) {
                        logger.info(`[Dry-Run] Would create new folder named: "${folderName}"`);
                        folder = { name: folderName, files: [] };
                        folderId = "dry-run-folder-id";
                    }
                    else {
                        logger.info(`Creating new folder: "${folderName}"...`);
                        const newFolder = await api.createFolder(folderName);
                        logger.info(`✔ Created folder: "${newFolder.name}" (ID: ${newFolder.id})`);
                        folder = await api.getFolder(newFolder.id);
                        folderId = folder.id;
                    }
                }
            }
            logger.info(`\nSynchronizing local directory: ${resolvedLocalDir}`);
            logger.info(`Target Remote Folder:        "${folder.name}" (${folderId})\n`);
            // 2. Scan local files
            const isRecursive = options.recursive !== false;
            const localFilePaths = walkDir(resolvedLocalDir, isRecursive);
            logger.info(`Scanned ${localFilePaths.length} local file(s).`);
            // 3. Build remote files index grouping by name
            const newestRemoteFilesMap = new Map();
            const allRemoteFilesGrouped = new Map();
            for (const f of folder.files || []) {
                if (!allRemoteFilesGrouped.has(f.name)) {
                    allRemoteFilesGrouped.set(f.name, []);
                }
                allRemoteFilesGrouped.get(f.name).push(f);
                if (!newestRemoteFilesMap.has(f.name)) {
                    newestRemoteFilesMap.set(f.name, f);
                }
                else {
                    const existing = newestRemoteFilesMap.get(f.name);
                    if (new Date(f.createdAt) > new Date(existing.createdAt)) {
                        newestRemoteFilesMap.set(f.name, f);
                    }
                }
            }
            // 4. Populate developer metadata (for new/changed file uploads)
            const firstFilePath = localFilePaths[0] || resolvedLocalDir;
            const pkgInfo = getPackageMetadata(firstFilePath);
            const gitUser = getGitUser();
            const autoCommit = getGitCommit();
            const autoBranch = getGitBranch();
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
            // 5. Differential comparison
            const uploadsQueue = [];
            const matchedRemoteNames = new Set();
            let skipCount = 0;
            logger.info("Comparing file checksums and sizes...");
            for (const filePath of localFilePaths) {
                const relativePath = path.relative(resolvedLocalDir, filePath).replace(/\\/g, "/");
                const localSize = fs.statSync(filePath).size;
                let remoteFile = newestRemoteFilesMap.get(relativePath);
                let remoteNameMatch = relativePath;
                if (!remoteFile) {
                    remoteFile = newestRemoteFilesMap.get(relativePath + ".gz");
                    if (remoteFile)
                        remoteNameMatch = relativePath + ".gz";
                }
                if (!remoteFile) {
                    remoteFile = newestRemoteFilesMap.get(relativePath + ".zip");
                    if (remoteFile)
                        remoteNameMatch = relativePath + ".zip";
                }
                if (!remoteFile) {
                    uploadsQueue.push({
                        filePath,
                        relativePath,
                        reason: "File does not exist remotely",
                        size: localSize,
                        oldFileIds: []
                    });
                }
                else {
                    matchedRemoteNames.add(remoteNameMatch);
                    const localChecksum = await generateBlake3(filePath);
                    const remoteChecksum = remoteFile.uploadSession?.plan?.originalMetadata?.checksum || remoteFile.checksum;
                    const sizeMatches = remoteFile.uploadSession?.plan?.originalMetadata?.size === localSize || remoteFile.size === localSize;
                    const checksumMatches = remoteChecksum === localChecksum;
                    if (!sizeMatches || !checksumMatches) {
                        let reason = "File changed";
                        if (!sizeMatches && !checksumMatches) {
                            reason = `Size and checksum changed (Local: ${formatBytes(localSize)} / Hash: ${localChecksum.slice(0, 8)}, Remote: ${formatBytes(remoteFile.size)} / Hash: ${remoteChecksum ? remoteChecksum.slice(0, 8) : "none"})`;
                        }
                        else if (!sizeMatches) {
                            reason = `Size changed (Local: ${formatBytes(localSize)}, Remote: ${formatBytes(remoteFile.size)})`;
                        }
                        else {
                            reason = `Checksum changed (Local: ${localChecksum.slice(0, 8)}, Remote: ${remoteChecksum ? remoteChecksum.slice(0, 8) : "none"})`;
                        }
                        const oldFileRecords = allRemoteFilesGrouped.get(remoteNameMatch) || [];
                        const oldFileIds = oldFileRecords.map((r) => r.id);
                        uploadsQueue.push({
                            filePath,
                            relativePath,
                            reason,
                            size: localSize,
                            oldFileIds
                        });
                    }
                    else {
                        skipCount++;
                    }
                }
            }
            // 6. Detect deleted artifacts
            const deleteQueue = [];
            for (const [remoteName, remoteFiles] of allRemoteFilesGrouped.entries()) {
                if (!matchedRemoteNames.has(remoteName)) {
                    for (const rFile of remoteFiles) {
                        deleteQueue.push({
                            fileId: rFile.id,
                            remoteName
                        });
                    }
                }
            }
            // 7. Report Status
            logger.info("\nSynchronization Status Report:");
            logger.info(`- Skips (unchanged files): ${skipCount}`);
            logger.info(`- Uploads pending:         ${uploadsQueue.length}`);
            logger.info(`- Deletions pending:       ${deleteQueue.length}\n`);
            const result = {
                folderId,
                folderName: folder.name,
                dryRun: !!options.dryRun,
                skipped: skipCount,
                uploaded: [],
                deleted: [],
            };
            if (uploadsQueue.length === 0 && deleteQueue.length === 0) {
                logger.output(result, (res) => {
                    console.log("✔ Directory is already fully synchronized. No changes required.");
                });
                return;
            }
            if (options.dryRun) {
                if (uploadsQueue.length > 0) {
                    logger.info("Pending Uploads (Dry-Run):");
                    for (const u of uploadsQueue) {
                        logger.info(`  [+] ${u.relativePath} (${formatBytes(u.size)}) - Reason: ${u.reason}`);
                        result.uploaded.push({ file: u.relativePath, size: u.size, reason: u.reason });
                    }
                    logger.info("");
                }
                if (deleteQueue.length > 0) {
                    logger.info("Pending Deletions (Dry-Run):");
                    for (const d of deleteQueue) {
                        logger.info(`  [-] ${d.remoteName} (ID: ${d.fileId})`);
                        result.deleted.push({ file: d.remoteName, id: d.fileId });
                    }
                    logger.info("");
                }
                logger.output(result, (res) => {
                    console.log("[Dry-Run] Synchronization completed. No files were modified.");
                });
                return;
            }
            // Execute uploads
            if (uploadsQueue.length > 0) {
                logger.info("Executing uploads...");
                for (const u of uploadsQueue) {
                    logger.info(`\nSyncing: ${u.relativePath} (${formatBytes(u.size)})`);
                    try {
                        const res = await runUploadForFile(u.filePath, folderId, artifactMetadata, {
                            customFileName: u.relativePath
                        });
                        logger.info(`✔ Synced successfully. File ID: ${res.id}`);
                        result.uploaded.push({ file: u.relativePath, size: u.size, id: res.id, reason: u.reason });
                        // Cleanup older versions
                        if (u.oldFileIds.length > 0) {
                            logger.info(`    Cleaning up ${u.oldFileIds.length} older version(s) of this file...`);
                            for (const oldId of u.oldFileIds) {
                                try {
                                    await api.deleteFile(oldId);
                                }
                                catch (cleanupErr) {
                                    logger.warn(`    ⚠️ Failed to cleanup old file ID ${oldId}: ${cleanupErr.message}`);
                                }
                            }
                        }
                    }
                    catch (uploadErr) {
                        logger.error(`Failed to sync file "${u.relativePath}"`, uploadErr);
                    }
                }
            }
            // Execute deletions if appropriate
            if (deleteQueue.length > 0) {
                if (!options.delete) {
                    logger.info(`\n⚠️ Note: ${deleteQueue.length} obsolete remote file(s) detected, but --delete flag was not specified. Skipping deletions.`);
                    for (const d of deleteQueue) {
                        result.deleted.push({ file: d.remoteName, id: d.fileId }); // Mark as deleted in dry/skipped metadata
                    }
                }
                else {
                    let proceedDelete = options.yes;
                    if (!proceedDelete) {
                        const promptMsg = `\n❓ Are you sure you want to delete ${deleteQueue.length} file(s) from the remote folder? (y/n): `;
                        proceedDelete = await confirmAction(promptMsg);
                    }
                    if (!proceedDelete) {
                        logger.info("Deletions skipped by user.");
                    }
                    else {
                        logger.info("Executing deletions...");
                        for (const d of deleteQueue) {
                            logger.info(`  [-] Deleting remote: ${d.remoteName} (ID: ${d.fileId})...`);
                            try {
                                await api.deleteFile(d.fileId);
                                logger.info(`  ✔ Deleted.`);
                                result.deleted.push({ file: d.remoteName, id: d.fileId });
                            }
                            catch (delErr) {
                                logger.error(`Failed to delete remote file "${d.remoteName}"`, delErr);
                            }
                        }
                    }
                }
            }
            logger.output(result, (res) => {
                console.log("\n✔ Synchronization completed successfully.");
            });
        }
        catch (err) {
            logger.fatal("Synchronization failed", err);
        }
    });
}
