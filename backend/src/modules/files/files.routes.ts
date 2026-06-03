import { Router } from "express";
import multer from "multer";
import { uploadFileController, listFilesController, downloadFileController } from "./files.controller";
import fs from "fs";
import path from "path";

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

router.post("/upload", upload.single("file"), uploadFileController);
router.get("/", listFilesController);
router.get("/:id/download", downloadFileController);

export default router;