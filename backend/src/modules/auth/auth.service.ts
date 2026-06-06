import { client, SESSION_FILE_PATH } from "../../lib/telegram/client";
import fs from "fs";
import { Api } from "telegram";

interface AuthSessionState {
    phoneNumber?: string;
    phoneCodeResolver?: (code: string) => void;
    passwordResolver?: (password: string) => void;
    status: 'idle' | 'waiting_code' | 'waiting_password' | 'authenticated' | 'error';
    error?: string;
}

export const authSession: AuthSessionState = {
    status: 'idle'
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getAuthStatus = async () => {
    try {
        const authenticated = await client.isUserAuthorized();
        if (authenticated) {
            let me = null;
            try {
                me = await client.getMe();
            } catch (e) {
                // Ignore if it fails (not fully connected or temporary issue)
            }
            return {
                authenticated: true,
                status: 'authenticated',
                user: me ? {
                    id: me.id.toString(),
                    firstName: me.firstName,
                    lastName: me.lastName,
                    username: me.username,
                    phone: me.phone
                } : null
            };
        }
        return {
            authenticated: false,
            status: authSession.status,
            error: authSession.error
        };
    } catch (err: any) {
        return {
            authenticated: false,
            status: 'error',
            error: err.message || String(err)
        };
    }
};

export const sendCode = async (phoneNumber: string) => {
    // Reset state
    authSession.phoneNumber = phoneNumber;
    authSession.status = 'idle';
    authSession.error = undefined;
    authSession.phoneCodeResolver = undefined;
    authSession.passwordResolver = undefined;

    if (!client.connected) {
        await client.connect();
    }

    // Run client.start in the background
    client.start({
        phoneNumber: async () => authSession.phoneNumber!,
        phoneCode: async () => {
            authSession.status = 'waiting_code';
            return new Promise<string>((resolve) => {
                authSession.phoneCodeResolver = resolve;
            });
        },
        password: async () => {
            authSession.status = 'waiting_password';
            return new Promise<string>((resolve) => {
                authSession.passwordResolver = resolve;
            });
        },
        onError: (err) => {
            authSession.status = 'error';
            authSession.error = err.message || String(err);
            console.error("Auth error in client.start:", err);
        }
    }).then(async () => {
        authSession.status = 'authenticated';
        const sessionString = client.session.save() as unknown as string;
        fs.writeFileSync(SESSION_FILE_PATH, sessionString, "utf8");
        console.log("✅ Telegram connected successfully via Web UI!");
    }).catch((err) => {
        authSession.status = 'error';
        authSession.error = err.message || String(err);
        console.error("Auth failed in client.start:", err);
    });

    // Wait a brief moment to allow the connection to set up and request the OTP
    await sleep(2000);

    return getAuthStatus();
};

export const submitCode = async (code: string) => {
    if (!authSession.phoneCodeResolver) {
        throw new Error("No active OTP code verification request");
    }

    authSession.phoneCodeResolver(code);
    
    // Wait for the auth flow to process the code and transit to next state
    await sleep(2000);

    return getAuthStatus();
};

export const submitPassword = async (password: string) => {
    if (!authSession.passwordResolver) {
        throw new Error("No active Two-Step Verification (2FA) password request");
    }

    authSession.passwordResolver(password);

    // Wait for the auth flow to process the password and transit to next state
    await sleep(2000);

    return getAuthStatus();
};

export const logout = async () => {
    if (!client.connected) {
        await client.connect();
    }

    try {
        await client.invoke(new Api.auth.LogOut());
    } catch (err) {
        console.error("Error during Telegram client logOut:", err);
    }

    if (fs.existsSync(SESSION_FILE_PATH)) {
        try {
            fs.unlinkSync(SESSION_FILE_PATH);
        } catch (err) {
            console.error("Failed to delete session file:", err);
        }
    }

    // Reset local auth session state
    authSession.phoneNumber = undefined;
    authSession.status = 'idle';
    authSession.error = undefined;
    authSession.phoneCodeResolver = undefined;
    authSession.passwordResolver = undefined;

    return { success: true };
};
