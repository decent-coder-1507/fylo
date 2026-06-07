export interface CreateShareLinkInput {
    fileId: string;
    expiresInHours?: number; // hours from now
    maxUses?: number;
}
