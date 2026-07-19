import { Router } from "express";
import { listFilesController, downloadFileController, deleteFileController, searchFilesController } from "./files.controller";
import { 
    getFilePreviewController, 
    getFileThumbnailAssetController, 
    getFilePreviewAssetController 
} from "../previews/previews.controller";
import uploadsRouter from "../uploads/uploads.routes";

const router = Router();

// Delegate uploads to the new uploads router
router.use("/upload", uploadsRouter);

router.get("/search", searchFilesController);
router.get("/", listFilesController);
router.get("/:id/download", downloadFileController);
router.delete("/:id", deleteFileController);

// File Preview Routes
router.get("/:id/preview", getFilePreviewController);
router.get("/:id/preview/thumbnail", getFileThumbnailAssetController);
router.get("/:id/preview/content", getFilePreviewAssetController);

export default router;