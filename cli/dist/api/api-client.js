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
    /**
     * Creates an upload session.
     */
    async createSession(fileName, size, mimeType, folderId) {
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
    /**
     * Performs a direct file upload using FormData.
     */
    async uploadFile(filePath, folderId, sessionId) {
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
        return res.json();
    }
}
export const api = new ApiClient();
