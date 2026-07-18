import { Request, Response } from "express";
import { 
    listProjectsService, 
    listProjectVersionsService, 
    listTagsSummaryService 
} from "./artifacts.service";

/**
 * Controller to list all projects with build details.
 */
export const listProjectsController = async (req: Request, res: Response) => {
    try {
        const result = await listProjectsService();
        res.json(result);
    } catch (err: any) {
        console.error("❌ List projects controller error:", err);
        res.status(500).json({ error: err.message || "Failed to list projects" });
    }
};

/**
 * Controller to list all versions of a specific project.
 */
export const listProjectVersionsController = async (req: Request, res: Response) => {
    try {
        const { projectName } = req.params;
        const result = await listProjectVersionsService(projectName as string);
        res.json(result);
    } catch (err: any) {
        console.error(`❌ List project versions controller error for ${req.params.projectName}:`, err);
        res.status(500).json({ error: err.message || "Failed to list project versions" });
    }
};

/**
 * Controller to get tags summary across all artifacts.
 */
export const listTagsSummaryController = async (req: Request, res: Response) => {
    try {
        const result = await listTagsSummaryService();
        res.json(result);
    } catch (err: any) {
        console.error("❌ List tags summary controller error:", err);
        res.status(500).json({ error: err.message || "Failed to fetch tags summary" });
    }
};
