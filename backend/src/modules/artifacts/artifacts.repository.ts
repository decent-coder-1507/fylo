import prisma from "../../lib/db/prisma";

/**
 * Retrieves a list of all distinct project names with their build/version count and latest build metadata.
 */
export const getProjectsGrouped = async () => {
    const projects = await prisma.file.groupBy({
        by: ["projectName"],
        where: {
            projectName: { not: null }
        },
        _count: {
            id: true
        }
    });

    const projectDetails = await Promise.all(
        projects.map(async (p) => {
            const latestFile = await prisma.file.findFirst({
                where: { projectName: p.projectName },
                orderBy: { createdAt: "desc" }
            });
            return {
                projectName: p.projectName,
                buildsCount: p._count.id,
                latestVersion: latestFile?.projectVersion || null,
                latestBranch: latestFile?.branchName || null,
                latestCommit: latestFile?.commitHash || null,
                latestEnv: latestFile?.buildEnv || null,
                updatedAt: latestFile?.createdAt,
                tags: latestFile?.tags || [],
            };
        })
    );

    // Sort projects by latest updated time desc
    return projectDetails.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
    });
};

/**
 * Retrieves all artifact records for a specific project name.
 */
export const getProjectVersions = async (projectName: string) => {
    return await prisma.file.findMany({
        where: {
            projectName: { equals: projectName, mode: "insensitive" }
        },
        orderBy: [
            { createdAt: "desc" }
        ]
    });
};

/**
 * Retrieves all distinct tags used across all artifacts, along with their usage count.
 */
export const getArtifactTagsSummary = async () => {
    // Fetch all files that have at least one tag
    const filesWithTags = await prisma.file.findMany({
        where: {
            tags: { isEmpty: false }
        },
        select: {
            tags: true
        }
    });

    const tagCounts: Record<string, number> = {};
    for (const file of filesWithTags) {
        for (const tag of file.tags) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
    }

    return Object.entries(tagCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
};
