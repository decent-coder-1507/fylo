import express from "express";
import cors from "cors";
import filesRoutes from "./modules/files/files.routes";
import foldersRoutes from "./modules/folders/folders.routes";
import authRoutes from "./modules/auth/auth.routes";
import shareRoutes from "./modules/share/share.routes";
import uploadsRoutes from "./modules/uploads/uploads.routes";

// Patch BigInt serialization to prevent errors when returning DB objects
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
})); // Allow requests from frontend with credentials
app.use(express.json());

app.use("/api/files", filesRoutes);
app.use("/api/folders", foldersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/share", shareRoutes);
app.use("/api/uploads", uploadsRoutes);


export default app;