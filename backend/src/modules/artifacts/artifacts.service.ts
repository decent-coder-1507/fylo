import { 
    getProjectsGrouped, 
    getProjectVersions, 
    getArtifactTagsSummary 
} from "./artifacts.repository";

export const listProjectsService = async () => {
    return await getProjectsGrouped();
};

export const listProjectVersionsService = async (projectName: string) => {
    if (!projectName) {
        throw new Error("Project name is required");
    }
    return await getProjectVersions(projectName);
};

export const listTagsSummaryService = async () => {
    return await getArtifactTagsSummary();
};
