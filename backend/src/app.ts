import express from "express";
import cors from "cors";
import filesRoutes from "./modules/files/files.routes";
import foldersRoutes from "./modules/folders/folders.routes";

// Patch BigInt serialization to prevent errors when returning DB objects
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();
app.use(cors()); // Allow requests from frontend
app.use(express.json());

app.use("/api/files", filesRoutes);
app.use("/api/folders", foldersRoutes);

export default app;