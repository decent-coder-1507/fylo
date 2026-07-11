import { getConfig } from "../config/config.js";
import fs from "fs";
import path from "path";

export interface SessionResponse {
    id: string;
    fileName: string;
    mimeType?: string;
    size: number;
    folderId?: string;
    status: string;
    checksum?: string;
    isChunked: boolean;
    totalChunks: number;
    plan?: any;
    fileId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FileResponse {
    id: string;
    name: string;
    mimeType?: string;
    size: number;
    telegramMessageId: number;
    checksum?: string;
    createdAt: string;
}

class ApiClient {
    private getHeaders() {
        const config = getConfig();
        const headers: Record<string, string> = {};
        if (config.token) {
            headers["Authorization"] = `Bearer ${config.token}`;
        }
        return headers;
    }

    private getApiUrl(endpoint: string) {
        const config = getConfig();
        // Ensure no double slashes
        const base = config.apiUrl.endsWith("/") ? config.apiUrl.slice(0, -1) : config.apiUrl;
        const sub = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        return `${base}${sub}`;
    }

    /**
     * Verifies connection and checks auth status.
     */
    public async checkStatus(): Promise<any> {
        const url = this.getApiUrl("/auth/status");
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
    }

    /**
     * Creates an upload session.
     */
    public async createSession(
        fileName: string,
        size: number,
        mimeType?: string,
        folderId?: string
    ): Promise<SessionResponse> {
        const url = this.getApiUrl("/uploads/sessions");
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...this.getHeaders(),
            },
            body: JSON.stringify({ fileName, size, mimeType, folderId }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to create session (HTTP ${res.status})`);
        }
        return res.json() as Promise<SessionResponse>;
    }

    /**
     * Gets session status and details.
     */
    public async getSession(id: string): Promise<SessionResponse> {
        const url = this.getApiUrl(`/uploads/sessions/${id}`);
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to retrieve session (HTTP ${res.status})`);
        }
        return res.json() as Promise<SessionResponse>;
    }

    /**
     * Lists recent upload sessions.
     */
    public async listSessions(): Promise<SessionResponse[]> {
        const url = this.getApiUrl("/uploads/sessions");
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Failed to list sessions (HTTP ${res.status})`);
        }
        return res.json() as Promise<SessionResponse[]>;
    }

    /**
     * Performs a direct file upload using FormData.
     */
    public async uploadFile(
        filePath: string,
        folderId?: string,
        sessionId?: string
    ): Promise<FileResponse> {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(absolutePath);
        const fileName = path.basename(absolutePath);
        const fileBuffer = fs.readFileSync(absolutePath);
        const blob = new Blob([fileBuffer]);

        const formData = new FormData();
        formData.append("file", blob, fileName);
        if (folderId) {
            formData.append("folderId", folderId);
        }
        if (sessionId) {
            formData.append("sessionId", sessionId);
        }

        const url = this.getApiUrl("/uploads");
        const res = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: formData,
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Upload failed (HTTP ${res.status})`);
        }

        return res.json() as Promise<FileResponse>;
    }
}

export const api = new ApiClient();
