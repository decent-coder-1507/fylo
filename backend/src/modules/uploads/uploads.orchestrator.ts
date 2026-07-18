import { TelegramUploadProvider } from "./providers/telegram.provider";
import { UploadPayload, UploadResult, IUploadStorageProvider, UploadPlan } from "./uploads.types";
import { validateUploadPayload } from "./uploads.validation";
import { cleanupTempFile } from "./uploads.utils";
import { globalUploadPlanner } from "./uploads.planner";
import { globalUploadSessionService } from "./uploads.session";
import { UploadStrategyRegistry } from "./strategies/upload.strategy";

/**
 * UploadOrchestrator manages the end-to-end orchestration logic for file uploads.
 * It validates requests, resolves targets, executes strategies, and ensures local temp cleanup.
 */
export class UploadOrchestrator {
    private readonly storageProvider: IUploadStorageProvider;

    constructor(storageProvider: IUploadStorageProvider = new TelegramUploadProvider()) {
        this.storageProvider = storageProvider;
    }

    /**
     * Executes the orchestrated upload pipeline.
     */
    public async orchestrate(payload: UploadPayload): Promise<UploadResult> {
        // 1. Validation
        await validateUploadPayload(payload);

        const { filePath, originalName, mimeType, size, folderId, sessionId, artifactMetadata } = payload;

        // 2. Initialize or retrieve Upload Session
        let session = sessionId ? await globalUploadSessionService.getSession(sessionId) : null;
        if (!session) {
            session = await globalUploadSessionService.createSession(
                originalName,
                size,
                mimeType,
                folderId,
                undefined,
                artifactMetadata
            );
        }

        let plan: UploadPlan | null = null;

        try {
            // Update session status to UPLOADING
            await globalUploadSessionService.updateSessionStatus(session.id, "UPLOADING");

            // 3. Generate Upload Plan (calculates checksum and decides strategy)
            const finalName = session ? session.fileName : originalName;
            plan = await globalUploadPlanner.createPlan(filePath, finalName, size, mimeType);
            console.log(`[UploadOrchestrator] Generated upload plan for session ${plan.sessionId}:`, JSON.stringify(plan, null, 2));

            // Sync calculated plan and checksum to the session
            await globalUploadSessionService.updateSessionStatus(session.id, "UPLOADING", {
                checksum: plan.metadata.checksum,
                plan: plan,
            });

            // 4. Resolve and execute resolved strategy
            console.log(`[UploadOrchestrator] Resolving strategy for type: ${plan.strategy}`);
            const strategy = UploadStrategyRegistry.getStrategy(plan.strategy);
            
            const result = await strategy.execute(session, plan, payload, this.storageProvider);
            return result;
        } catch (error) {
            // Set session status to FAILED on any processing error
            if (session) {
                try {
                    await globalUploadSessionService.updateSessionStatus(session.id, "FAILED");
                } catch (sessionErr) {
                    console.error("⚠️ Failed to mark session status as FAILED:", sessionErr);
                }
            }
            throw error;
        } finally {
            // 5. Cleanup local temp file and directory after upload attempts
            await cleanupTempFile(filePath);
            if (plan?.targetFilePath && plan.targetFilePath !== filePath) {
                await cleanupTempFile(plan.targetFilePath);
            }
        }
    }
}

// Export a default global instance of the orchestrator
export const globalUploadOrchestrator = new UploadOrchestrator();
