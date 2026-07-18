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
    deduplicated: boolean;
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
    deduplicated?: boolean;
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

    public async createSession(
        fileName: string,
        size: number,
        mimeType?: string,
        folderId?: string,
        checksum?: string,
        artifactMetadata?: any
    ): Promise<SessionResponse> {
        const url = this.getApiUrl("/uploads/sessions");
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...this.getHeaders(),
            },
            body: JSON.stringify({ fileName, size, mimeType, folderId, checksum, artifactMetadata }),
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

    public async uploadFile(
        filePath: string,
        folderId?: string,
        sessionId?: string,
        artifactMetadata?: any,
        customFileName?: string
    ): Promise<FileResponse> {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const stats = fs.statSync(absolutePath);
        const fileName = customFileName || path.basename(absolutePath);
        const fileBuffer = fs.readFileSync(absolutePath);
        const blob = new Blob([fileBuffer as any]);

        const formData = new FormData();
        formData.append("file", blob, fileName);
        if (folderId) {
            formData.append("folderId", folderId);
        }
        if (sessionId) {
            formData.append("sessionId", sessionId);
        }
        if (artifactMetadata) {
            formData.append("artifactMetadata", JSON.stringify(artifactMetadata));
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

    /**
     * Uploads a specific chunk of a session with integrity header.
     */
    public async uploadChunk(
        sessionId: string,
        index: number,
        buffer: Buffer,
        checksum: string
    ): Promise<any> {
        const formData = new FormData();
        const blob = new Blob([buffer as any]);
        formData.append("chunk", blob, `part-${index}`);

        const url = this.getApiUrl(`/uploads/sessions/${sessionId}/chunks/${index}`);
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "x-chunk-checksum": checksum,
                ...this.getHeaders(),
            },
            body: formData,
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Chunk ${index} upload failed (HTTP ${res.status})`);
        }

        return res.json();
    }

    /**
     * Verifies and completes a chunked upload session.
     */
    public async verifySession(sessionId: string): Promise<FileResponse> {
        const url = this.getApiUrl(`/uploads/sessions/${sessionId}/verify`);
        const res = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Session verification failed (HTTP ${res.status})`);
        }

        return res.json() as Promise<FileResponse>;
    }

    /**
     * Retrieves all grouped developer projects.
     */
    public async getProjects(): Promise<any[]> {
        const url = this.getApiUrl("/artifacts/projects");
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch projects (HTTP ${res.status})`);
        }
        return res.json();
    }

    /**
     * Retrieves all versions for a project.
     */
    public async getProjectVersions(projectName: string): Promise<any[]> {
        const url = this.getApiUrl(`/artifacts/projects/${encodeURIComponent(projectName)}/versions`);
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch project versions (HTTP ${res.status})`);
        }
        return res.json();
    }

    /**
     * Retrieves tags summary.
     */
    public async getArtifactTags(): Promise<any[]> {
        const url = this.getApiUrl("/artifacts/tags");
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Failed to fetch tags (HTTP ${res.status})`);
        }
        return res.json();
    }

    /**
     * Gets a folder details including its files.
     */
    public async getFolder(folderId: string): Promise<any> {
        const url = this.getApiUrl(`/folders/${folderId}`);
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to retrieve folder details (HTTP ${res.status})`);
        }
        return res.json();
    }

    /**
     * Creates a new folder.
     */
    public async createFolder(name: string): Promise<any> {
        const url = this.getApiUrl("/folders");
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...this.getHeaders(),
            },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to create folder (HTTP ${res.status})`);
        }
        return res.json();
    }

    /**
     * Lists all folders.
     */
    public async listFolders(): Promise<any[]> {
        const url = this.getApiUrl("/folders");
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Failed to list folders (HTTP ${res.status})`);
        }
        return res.json();
    }

    /**
     * Deletes a remote file by ID.
     */
    public async deleteFile(fileId: string): Promise<any> {
        const url = this.getApiUrl(`/files/${fileId}`);
        const res = await fetch(url, {
            method: "DELETE",
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to delete file (HTTP ${res.status})`);
        }
        return res.json();
    }
}

export const api = new ApiClient();
