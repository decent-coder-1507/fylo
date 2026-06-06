import { api } from "@/app/lib/axios";

export interface AuthStatus {
    authenticated: boolean;
    status: 'idle' | 'waiting_code' | 'waiting_password' | 'authenticated' | 'error';
    error?: string;
    user?: {
        id: string;
        firstName: string;
        lastName?: string;
        username?: string;
        phone?: string;
    } | null;
}

export const getAuthStatus = async (): Promise<AuthStatus> => {
    const res = await api.get("/auth/status");
    return res.data;
};

export const sendCode = async (phoneNumber: string): Promise<AuthStatus> => {
    const res = await api.post("/auth/send-code", { phoneNumber });
    return res.data;
};

export const submitCode = async (code: string): Promise<AuthStatus> => {
    const res = await api.post("/auth/submit-code", { code });
    return res.data;
};

export const submitPassword = async (password: string): Promise<AuthStatus> => {
    const res = await api.post("/auth/submit-password", { password });
    return res.data;
};

export const logout = async (): Promise<{ success: boolean }> => {
    const res = await api.post("/auth/logout");
    return res.data;
};
