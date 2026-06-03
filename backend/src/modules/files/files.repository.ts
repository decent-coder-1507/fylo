import prisma from "../../lib/db/prisma";
import { ListFilesQuery } from "./files.types";

export const findFiles = async (query: ListFilesQuery) => {
    const {
        page,
        limit,
        folderId,
        search,
        sortBy = "createdAt",
        sortOrder = "desc"
    } = query;

    console.log("QUERY params received for fetch files listing: ", query)

    const pageNum = (!page || isNaN(page)) ? 1 : page;
    const limitNum = (!limit || isNaN(limit)) ? 20 : limit;

    const skip = (pageNum - 1) * limitNum;

    const where = {
        ...(folderId && { folderId }),

        ...(search && {
            name: {
                contains: search,
            }
        })
    };

    console.log("where clause received for fetch files listing (skip,where): ", skip, "\n", where)

    const [files, total] = await Promise.all([
        prisma.file.findMany({
            where,
            skip,
            take: limitNum,

            orderBy: {
                [sortBy]: sortOrder,
            },

            include: {
                folder: true,
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
    }
};