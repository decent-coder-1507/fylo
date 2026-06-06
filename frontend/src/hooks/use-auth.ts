import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as authService from "@/services/auth.service";

export const useAuth = () => {
    return useQuery({
        queryKey: ["auth-status"],
        queryFn: authService.getAuthStatus,
        refetchInterval: (query) => {
            const data = query.state.data;
            if (data && (data.status === "waiting_code" || data.status === "waiting_password")) {
                return 3000;
            }
            return false;
        }
    });
};

export const useSendCode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (phoneNumber: string) => authService.sendCode(phoneNumber),
        onSuccess: (data) => {
            queryClient.setQueryData(["auth-status"], data);
        }
    });
};

export const useSubmitCode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (code: string) => authService.submitCode(code),
        onSuccess: (data) => {
            queryClient.setQueryData(["auth-status"], data);
        }
    });
};

export const useSubmitPassword = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (password: string) => authService.submitPassword(password),
        onSuccess: (data) => {
            queryClient.setQueryData(["auth-status"], data);
        }
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            queryClient.setQueryData(["auth-status"], {
                authenticated: false,
                status: "idle",
            });
            queryClient.invalidateQueries();
        }
    });
};
