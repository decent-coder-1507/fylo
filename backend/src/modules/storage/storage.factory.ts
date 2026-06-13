import { StorageProvider } from "./storage.provider";
import { LocalStorageProvider } from "./local.provider";
import { CloudinaryStorageProvider } from "./cloudinary.provider";
import { R2StorageProvider } from "./r2.provider";

/**
 * StorageFactory responsible for instantiating the active StorageProvider.
 * Evaluates STORAGE_PROVIDER, CLOUDINARY_*, and R2_* environment variables.
 */
export class StorageFactory {
    /**
     * Instantiates the active storage provider based on environment configuration.
     */
    public static createProvider(): StorageProvider {
        const providerName = (process.env.STORAGE_PROVIDER || "").toLowerCase();

        // 1. Cloudinary resolution
        if (
            providerName === "cloudinary" || 
            process.env.CLOUDINARY_URL || 
            process.env.CLOUDINARY_CLOUD_NAME
        ) {
            console.log("☁️  [StorageFactory] Initializing CloudinaryStorageProvider...");
            return new CloudinaryStorageProvider();
        }

        // 2. Cloudflare R2 resolution
        if (
            providerName === "r2" || 
            process.env.R2_ENDPOINT || 
            process.env.R2_ACCESS_KEY_ID
        ) {
            console.log("☁️  [StorageFactory] Initializing R2StorageProvider...");
            return new R2StorageProvider();
        }

        // 3. Fallback to local storage
        console.log("📁 [StorageFactory] Initializing LocalStorageProvider (fallback/dev)...");
        return new LocalStorageProvider();
    }
}

// Global active storage provider instance for application-wide use
export const globalStorageProvider = StorageFactory.createProvider();
