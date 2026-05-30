import { Request, Response } from "express";
import { createFolderService, listFoldersService, getFolderByIdService, deleteFolderService } from "./folders.service"

export const createFolderController = async (req: Request, res: Response) => {

    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Name is required to create Folder" })
        }

        const folder = await createFolderService(name);
        return res.status(201).json(folder);
    } catch (err) {
        console.error(`Error while creating folder ${err}`);

        return res.status(500).json({
            error: "Failed to create folder",
        })
    }
}

export const listFoldersController = async (req: Request, res: Response) => {
    try {
        const folders = await listFoldersService();

        res.json(folders);
    } catch (err) {
        console.error(`Error while loading folder ${err}`);

        return res.status(500).json({
            error: "Failed to load folder",
        })
    }
}

export const getFolderByIdController = async (req: Request, res: Response) => {
    try {
        const folder = await getFolderByIdService(req.params.id as string);

        if (!folder) {
            console.error(`Failed to retrieve folder with ID: ${req.params.id}`)
            return res.status(404).json({
                error: "Folder not found",
            });
        }

        res.json(folder);
    } catch (err) {
        res.status(500).json({
            error: "Failed to retrieve folder"
        })

    }
}

export const deleteFolderController = async (req: Request, res: Response) => {
    try {
        await deleteFolderService(req.params.id as string);

        res.json({
            success: true
        })
    } catch (err) {
        res.status(500).json({
            error: "Failed to delete folder"
        })
    }
}