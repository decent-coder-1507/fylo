import prisma from "../../lib/db/prisma";
import { ListFilesQuery } from "./files.types";

export const findFiles = async (query: ListFilesQuery) => {
    const {
        page,
        limit,
        folderId,
        search,
        projectName,
        projectVersion,
        commitHash,
        branchName,
        buildEnv,
        tags,
        uploaderName,
        uploaderEmail,
        sortBy = "createdAt",
        sortOrder = "desc"
    } = query;

    console.log("QUERY params received for fetch files listing: ", query);

    const pageNum = (!page || isNaN(Number(page))) ? 1 : Number(page);
    const limitNum = (!limit || isNaN(Number(limit))) ? 20 : Number(limit);

    const skip = (pageNum - 1) * limitNum;

    // Map sorting keys
    let mappedSortBy = sortBy;
    if (sortBy === ("created_at" as any)) {
        mappedSortBy = "createdAt";
    }

    const where: any = {
        ...(folderId && { folderId }),
        ...(projectName && { projectName: { equals: projectName, mode: "insensitive" } }),
        ...(projectVersion && { projectVersion: { equals: projectVersion } }),
        ...(commitHash && { commitHash: { equals: commitHash, mode: "insensitive" } }),
        ...(branchName && { branchName: { equals: branchName, mode: "insensitive" } }),
        ...(buildEnv && { buildEnv: { equals: buildEnv, mode: "insensitive" } }),
        ...(uploaderName && { uploaderName: { contains: uploaderName, mode: "insensitive" } }),
        ...(uploaderEmail && { uploaderEmail: { contains: uploaderEmail, mode: "insensitive" } }),
    };

    // Handle tag filtering
    if (tags) {
        if (Array.isArray(tags)) {
            where.tags = { hasSome: tags };
        } else if (typeof tags === "string") {
            const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);
            if (tagsArray.length > 1) {
                where.tags = { hasSome: tagsArray };
            } else if (tagsArray.length === 1) {
                where.tags = { has: tagsArray[0] };
            }
        }
    }

    // Handle general search across name, project, commit, and tags
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { projectName: { contains: search, mode: "insensitive" } },
            { commitHash: { contains: search, mode: "insensitive" } },
            { branchName: { contains: search, mode: "insensitive" } },
            { tags: { has: search } }
        ];
    }

    console.log("where clause generated for fetch files listing: ", JSON.stringify(where, null, 2));

    const [files, total] = await Promise.all([
        prisma.file.findMany({
            where,
            skip,
            take: limitNum,

            orderBy: {
                [mappedSortBy]: sortOrder,
            },

            include: {
                folder: true,
                aiProcessing: true,
            },
        }),

        prisma.file.count({
            where
        })
    ]);

    return {
        files,
        pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        }
    };
};
