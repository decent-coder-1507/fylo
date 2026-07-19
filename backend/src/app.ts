import express from "express";
import cors from "cors";
import filesRoutes from "./modules/files/files.routes";
import foldersRoutes from "./modules/folders/folders.routes";
import authRoutes from "./modules/auth/auth.routes";
import shareRoutes from "./modules/share/share.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";
import artifactsRoutes from "./modules/artifacts/artifacts.routes";
import aiRoutes from "./modules/ai-processing/ai-processing.routes";
import chatRoutes from "./modules/chat/chat.routes";

// Patch BigInt serialization to prevent errors when returning DB objects
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
})); // Allow requests from frontend with credentials
app.use(express.json());

app.use("/api/files", filesRoutes);
app.use("/api/folders", foldersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/artifacts", artifactsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/chat", chatRoutes);

export default app;