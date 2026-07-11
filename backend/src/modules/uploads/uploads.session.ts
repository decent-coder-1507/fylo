import prisma from "../../lib/db/prisma";
import { UploadSessionStatus } from "@prisma/client";
import { globalUploadPlanner } from "./uploads.planner";
import { UploadSession } from "./uploads.types";

/**
 * Service managing the lifecycle of Upload Sessions.
 * Tracks upload execution workflows through CREATED, UPLOADING, COMPLETED, and FAILED states.
 */
export class UploadSessionService {
    /**
     * Creates a new upload session, generates the initial plan, and persists it.
     */
    public async createSession(
        fileName: string,
        size: number,
        mimeType?: string,
        folderId?: string
    ): Promise<UploadSession> {
        // Generate plan without filePath (handshake stage)
        const plan = await globalUploadPlanner.createPlan(undefined, fileName, size, mimeType);

        const dbSession = await prisma.uploadSession.create({
            data: {
                fileName,
                mimeType: mimeType || null,
                size,
                folderId: folderId || null,
                status: UploadSessionStatus.CREATED,
                checksum: null,
                isChunked: plan.isChunked,
                totalChunks: plan.totalChunks,
                plan: plan as any,
            },
        });

        return this.mapDbSession(dbSession);
    }

    /**
     * Retrieves an upload session by ID.
     */
    public async getSession(id: string): Promise<UploadSession | null> {
        const dbSession = await prisma.uploadSession.findUnique({
            where: { id },
        });

        if (!dbSession) return null;
        return this.mapDbSession(dbSession);
    }

    /**
     * Updates status, checksum, or file relations of a session.
     */
    public async updateSessionStatus(
        id: string,
        status: UploadSessionStatus,
        data?: { checksum?: string; fileId?: string; plan?: any }
    ): Promise<UploadSession> {
        const dbSession = await prisma.uploadSession.update({
            where: { id },
            data: {
                status,
                checksum: data?.checksum || undefined,
                fileId: data?.fileId || undefined,
                plan: data?.plan ? (data.plan as any) : undefined,
            },
        });

        return this.mapDbSession(dbSession);
    }

    /**
     * Lists active or completed upload sessions.
     */
    public async listSessions(): Promise<UploadSession[]> {
        const dbSessions = await prisma.uploadSession.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return dbSessions.map((session) => this.mapDbSession(session));
    }

    /**
     * Maps the Prisma UploadSession model to the domain type.
     */
    private mapDbSession(dbSession: any): UploadSession {
        return {
            id: dbSession.id,
            fileName: dbSession.fileName,
            mimeType: dbSession.mimeType || undefined,
            size: dbSession.size,
            folderId: dbSession.folderId || undefined,
            status: dbSession.status,
            checksum: dbSession.checksum || undefined,
            isChunked: dbSession.isChunked,
            totalChunks: dbSession.totalChunks,
            plan: dbSession.plan ? (dbSession.plan as any) : undefined,
            fileId: dbSession.fileId || undefined,
            createdAt: dbSession.createdAt,
            updatedAt: dbSession.updatedAt,
        };
    }
}

// Export a default global instance
export const globalUploadSessionService = new UploadSessionService();
