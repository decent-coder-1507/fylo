import { Request, Response } from "express";
import * as authService from "./auth.service";

export const getAuthStatusController = async (req: Request, res: Response) => {
    try {
        const status = await authService.getAuthStatus();
        return res.json(status);
    } catch (err: any) {
        console.error("Error checking auth status:", err);
        return res.status(500).json({ error: "Failed to check authentication status" });
    }
};

export const sendCodeController = async (req: Request, res: Response) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required" });
        }
        const status = await authService.sendCode(phoneNumber);
        return res.json(status);
    } catch (err: any) {
        console.error("Error sending code:", err);
        return res.status(500).json({ error: err.message || "Failed to initiate login flow" });
    }
};

export const submitCodeController = async (req: Request, res: Response) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: "Verification code (OTP) is required" });
        }
        const status = await authService.submitCode(code);
        return res.json(status);
    } catch (err: any) {
        console.error("Error submitting code:", err);
        return res.status(500).json({ error: err.message || "Failed to verify code" });
    }
};

export const submitPasswordController = async (req: Request, res: Response) => {
    try {
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: "Password is required" });
        }
        const status = await authService.submitPassword(password);
        return res.json(status);
    } catch (err: any) {
        console.error("Error submitting password:", err);
        return res.status(500).json({ error: err.message || "Failed to verify password" });
    }
};

export const logoutController = async (req: Request, res: Response) => {
    try {
        const result = await authService.logout();
        return res.json(result);
    } catch (err: any) {
        console.error("Error during logout:", err);
        return res.status(500).json({ error: "Failed to log out" });
    }
};
