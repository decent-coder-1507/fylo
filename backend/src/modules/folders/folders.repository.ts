import prisma from "../../lib/db/prisma";

export const createFolderRecord = async (data: {
    name: string;
    telegramId: bigint;
    accessHash?: string;
}) => {
    return prisma.folder.create({
        data
    });
};

export const findFolders = async () => {
    return prisma.folder.findMany({
        orderBy: {
            createdAt: "desc",
        },

        include: {
            _count: {
                select: {
                    files: true
                }
            }
        }
    })
}

export const findFolderById = async (id: string) => {
    return prisma.folder.findUnique({
        where: {
            id
        },

        include: {
            files: {
                orderBy: {
                    createdAt: "desc"
                },
                include: {
                    uploadSession: true,
                    aiProcessing: true,
                }
            }
        }
    })
}

export const deleteFolderRecord = async (id: string) => {
    return prisma.folder.delete({
        where: { id }
    })
}
