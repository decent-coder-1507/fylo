export interface ListFilesQuery {
    page?: number;
    limit?: number;

    folderId?: string;

    search?: string;

    // Developer Artifact Filters
    projectName?: string;
    projectVersion?: string;
    commitHash?: string;
    branchName?: string;
    buildEnv?: string;
    tags?: string | string[];
    uploaderName?: string;
    uploaderEmail?: string;

    sortBy?: "createdAt" | "created_at" | "name" | "size" | "projectName" | "projectVersion";
    sortOrder?: "asc" | "desc";
}