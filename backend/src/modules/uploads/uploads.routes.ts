import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
    uploadFileController,
    createUploadSessionController,
    getUploadSessionController,
    listUploadSessionsController,
} from "./uploads.controller";

const router = Router();

// Configure multer storage to preserve original file extension/name in a unique subdirectory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const uniqueSubdir = path.join(uploadDir, `${Date.now()}_${Math.round(Math.random() * 1e9)}`);
        fs.mkdirSync(uniqueSubdir, { recursive: true });
        cb(null, uniqueSubdir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Single file upload routes
router.post("/", upload.single("file"), uploadFileController);
router.post("/upload", upload.single("file"), uploadFileController);

// Upload Session workflow routes
router.post("/sessions", createUploadSessionController);
router.get("/sessions", listUploadSessionsController);
router.get("/sessions/:id", getUploadSessionController);

export default router;
