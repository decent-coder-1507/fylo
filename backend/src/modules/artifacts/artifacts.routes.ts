import { Router } from "express";
import { 
    listProjectsController, 
    listProjectVersionsController, 
    listTagsSummaryController 
} from "./artifacts.controller";

const router = Router();

// Routes for developer artifacts
router.get("/projects", listProjectsController);
router.get("/tags", listTagsSummaryController);
router.get("/projects/:projectName/versions", listProjectVersionsController);

export default router;
