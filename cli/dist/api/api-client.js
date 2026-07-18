import { getConfig } from "../config/config.js";
import fs from "fs";
import path from "path";
class ApiClient {
    getHeaders() {
        const config = getConfig();
        const headers = {};
        if (config.token) {
            headers["Authorization"] = `Bearer ${config.token}`;
        }
        return headers;
    }
    getApiUrl(endpoint) {
        const config = getConfig();
        // Ensure no double slashes
        const base = config.apiUrl.endsWith("/") ? config.apiUrl.slice(0, -1) : config.apiUrl;
        const sub = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        return `${base}${sub}`;
    }
    /**
     * Verifies connection and checks auth status.
     */
    async checkStatus() {
        const url = this.getApiUrl("/auth/status");
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
    }
    async createSession(fileName, size, mimeType, folderId, checksum, artifactMetadata) {
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
        return res.json();
    }
    /**
     * Gets session status and details.
     */
    async getSession(id) {
        const url = this.getApiUrl(`/uploads/sessions/${id}`);
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Failed to retrieve session (HTTP ${res.status})`);
        }
        return res.json();
    }
    /**
     * Lists recent upload sessions.
     */
    async listSessions() {
        const url = this.getApiUrl("/uploads/sessions");
        const res = await fetch(url, {
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            throw new Error(`Failed to list sessions (HTTP ${res.status})`);
        }
        return res.json();
    }
    async uploadFile(filePath, folderId, sessionId, artifactMetadata, customFileName) {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const stats = fs.statSync(absolutePath);
        const fileName = customFileName || path.basename(absolutePath);
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
        return res.json();
    }
    /**
     * Uploads a specific chunk of a session with integrity header.
     */
    async uploadChunk(sessionId, index, buffer, checksum) {
        const formData = new FormData();
        const blob = new Blob([buffer]);
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
    async verifySession(sessionId) {
        const url = this.getApiUrl(`/uploads/sessions/${sessionId}/verify`);
        const res = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Session verification failed (HTTP ${res.status})`);
        }
        return res.json();
    }
    /**
     * Retrieves all grouped developer projects.
     */
    async getProjects() {
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
    async getProjectVersions(projectName) {
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
    async getArtifactTags() {
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
    async getFolder(folderId) {
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
    async createFolder(name) {
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
    async listFolders() {
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
    async deleteFile(fileId) {
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
