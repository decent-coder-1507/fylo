import { Router } from "express";
import {
    getAuthStatusController,
    sendCodeController,
    submitCodeController,
    submitPasswordController,
    logoutController
} from "./auth.controller";

const router = Router();

router.get("/status", getAuthStatusController);
router.post("/send-code", sendCodeController);
router.post("/submit-code", submitCodeController);
router.post("/submit-password", submitPasswordController);
router.post("/logout", logoutController);

export default router;
