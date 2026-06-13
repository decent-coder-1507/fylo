/**
 * Options configuration for uploading a file to a StorageProvider.
 */
export interface UploadOptions {
    /**
     * The target file name (including extension).
     */
    fileName: string;

    /**
     * The MIME type of the file (e.g. image/jpeg).
     */
    mimeType: string;

    /**
     * Optional subfolder name/prefix to categorize the asset (e.g. "previews/thumbnails").
     */
    folder?: string;
}

/**
 * StorageProvider contract defining the storage strategy.
 * Allows switching between Local, Cloudinary, and Cloudflare R2 storage backends seamlessly.
 */
export interface StorageProvider {
    /**
     * The unique identifier/name of the storage strategy (e.g. 'local', 'cloudinary', 'r2').
     */
    readonly name: string;

    /**
     * Uploads the file content buffer and returns a publicly accessible URL.
     * 
     * @param buffer - The raw file contents as a Buffer
     * @param options - Upload parameters like fileName, mimeType, and folder
     * @returns Promise<string> - The public URL of the uploaded asset
     */
    upload(buffer: Buffer, options: UploadOptions): Promise<string>;

    /**
     * Deletes the asset associated with the given public URL or storage path.
     * 
     * @param url - The public URL or path of the asset to delete
     */
    delete(url: string): Promise<void>;
}
