import { Router } from "express";
import { createShareLinkController, downloadShareLinkController, getShareLinkInfoController } from "./share.controller";

const router = Router();

router.post("/", createShareLinkController);
router.get("/:token", getShareLinkInfoController);
router.get("/:token/download", downloadShareLinkController);

export default router;
