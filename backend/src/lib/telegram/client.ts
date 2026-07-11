import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { env } from "../../config/env";
import fs from 'fs';
import path from 'path';

const SESSION_FILE_PATH = path.join(process.cwd(), '.session');
const PROXY_CACHE_FILE_PATH = path.join(process.cwd(), '.session.proxy');

let sessionString = "";
if (fs.existsSync(SESSION_FILE_PATH)) {
    try {
        sessionString = fs.readFileSync(SESSION_FILE_PATH, 'utf8').trim();
    } catch (err) {
        console.error("⚠️ Failed to read .session file:", err);
    }
} else if (process.env.TELEGRAM_SESSION) {
    sessionString = process.env.TELEGRAM_SESSION.trim();
}

const stringSession = new StringSession(sessionString);

export interface ProxyConfig {
    ip: string;
    port: number;
    MTProxy: boolean;
    secret?: string;
    socksType?: number;
    username?: string;
    password?: string;
    rawString?: string;
}

// Hardcoded fallback list in case GitHub is blocked/down
const HARDCODED_FALLBACK_PROXIES: ProxyConfig[] = [
    { ip: "general.irancell-ir.cfd", port: 443, MTProxy: true, secret: "ee1603010200010001fc030386e24c3add626973636F7474692E79656B74616E65742E636F6D", rawString: "general.irancell-ir.cfd" },
    { ip: "www.merco-karco.website", port: 443, MTProxy: true, secret: "ee1603010200010001fc030386e24c3add626973636F7474692E79656B74616E65742E636F6D", rawString: "www.merco-karco.website" },
    { ip: "collider.web-yektanet-com.info", port: 443, MTProxy: true, secret: "ee1603010200010001fc030386e24c3add626973636F7474692E79656B74616E65742E636F6D", rawString: "collider.web-yektanet-com.info" },
    { ip: "87.229.56.249", port: 443, MTProxy: true, secret: "ee1603010200010001fc030386e24c3add626973636f7474692e79656b74616e65742e636f6d", rawString: "87.229.56.249" },
    { ip: "65.109.251.32", port: 443, MTProxy: true, secret: "dd79ee65acf6c575bd6f8b3c1ddc7107a3", rawString: "65.109.251.32" }
];

export function parseProxyString(str: string): ProxyConfig | null {
    str = str.trim();
    if (!str) return null;

    try {
        if (str.startsWith('tg://proxy') || str.startsWith('https://t.me/proxy') || str.startsWith('http://t.me/proxy')) {
            const cleanUrl = str.replace('tg://', 'https://');
            const url = new URL(cleanUrl);
            const server = url.searchParams.get('server');
            const port = url.searchParams.get('port');
            const secret = url.searchParams.get('secret');
            if (server && port) {
                return {
                    ip: server,
                    port: parseInt(port, 10),
                    MTProxy: true,
                    secret: secret || undefined,
                    rawString: str
                };
            }
        }

        const url = new URL(str);
        const protocol = url.protocol.toLowerCase().replace(':', '');
        const ip = url.hostname;
        const port = parseInt(url.port, 10);
        
        if (!ip || isNaN(port)) return null;

        if (protocol === 'socks5' || protocol === 'socks' || protocol === 'socks4') {
            const config: ProxyConfig = {
                ip,
                port,
                MTProxy: false,
                socksType: protocol === 'socks4' ? 4 : 5,
                rawString: str
            };
            if (url.username) {
                config.username = decodeURIComponent(url.username);
            }
            if (url.password) {
                config.password = decodeURIComponent(url.password);
            }
            return config;
        } else if (protocol === 'mtproto' || protocol === 'mtproxy') {
            const secret = url.username ? decodeURIComponent(url.username) : url.searchParams.get('secret');
            return {
                ip,
                port,
                MTProxy: true,
                secret: secret || undefined,
                rawString: str
            };
        }
    } catch (e) {
        // Simple host:port parsing
        const parts = str.split(':');
        if (parts.length === 2) {
            const port = parseInt(parts[1], 10);
            if (!isNaN(port)) {
                return {
                    ip: parts[0],
                    port,
                    MTProxy: false,
                    socksType: 5,
                    rawString: str
                };
            }
        }
    }
    return null;
}

// Global active client instance
let activeClient: TelegramClient | null = null;
let currentProxy: ProxyConfig | null = null;

function normalizeSecret(secret?: string): string | undefined {
    if (!secret) return undefined;
    const clean = secret.trim();
    if (clean.length === 32) {
        return clean;
    }
    if (clean.length === 34 && clean.toLowerCase().startsWith('dd')) {
        return clean.slice(2);
    }
    if (clean.length > 34 && clean.toLowerCase().startsWith('ee')) {
        return clean.slice(2, 34);
    }
    if (clean.toLowerCase().startsWith('dd') && clean.length > 32) {
        const sub = clean.slice(2);
        const match = sub.match(/[0-9a-fA-F]{32}/);
        if (match) return match[0];
    }
    if (clean.toLowerCase().startsWith('ee') && clean.length > 32) {
        const sub = clean.slice(2);
        const match = sub.match(/[0-9a-fA-F]{32}/);
        if (match) return match[0];
    }
    const match = clean.match(/[0-9a-fA-F]{32}/);
    if (match) {
        return match[0];
    }
    return clean;
}

// Initialize standard client instance (defaults to direct connection)
function initClientInstance(proxy: ProxyConfig | null = null, retries = 5) {
    if (activeClient) {
        try {
            activeClient.disconnect();
        } catch (e) {
            // Ignore disconnect errors
        }
    }

    currentProxy = proxy;
    
    // Set useWSS to false when proxy is enabled
    const clientOptions: any = { 
        connectionRetries: retries,
        useWSS: false
    };

    if (proxy) {
        clientOptions.proxy = {
            ip: proxy.ip,
            port: proxy.port,
            MTProxy: proxy.MTProxy,
            secret: normalizeSecret(proxy.secret),
            socksType: proxy.socksType || 5,
            username: proxy.username,
            password: proxy.password
        };
    }

    activeClient = new TelegramClient(
        stringSession,
        env.apiId,
        env.apiHash,
        clientOptions
    );
}

// Load cached proxy configuration
function getCachedConnection(): { direct: boolean; proxy: ProxyConfig | null } | null {
    if (fs.existsSync(PROXY_CACHE_FILE_PATH)) {
        try {
            const cached = JSON.parse(fs.readFileSync(PROXY_CACHE_FILE_PATH, 'utf8'));
            if (cached.direct) {
                return { direct: true, proxy: null };
            }
            if (cached.proxy) {
                return { direct: false, proxy: cached.proxy };
            }
        } catch (e) {
            console.warn("⚠️ Failed to parse proxy cache file:", e);
        }
    }
    return null;
}

// Save working connection to cache
function saveConnectionToCache(direct: boolean, proxy: ProxyConfig | null) {
    try {
        fs.writeFileSync(
            PROXY_CACHE_FILE_PATH,
            JSON.stringify({ direct, proxy }),
            'utf8'
        );
    } catch (e) {
        console.warn("⚠️ Failed to save connection cache:", e);
    }
}

// Fetch public MTProto proxy list from GitHub
async function fetchPublicProxies(): Promise<ProxyConfig[]> {
    console.log("🌐 Fetching latest public verified MTProto proxies from GitHub...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
    
    try {
        const res = await fetch("https://raw.githubusercontent.com/SoliSpirit/mtproto/master/all_proxies.txt", {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const text = await res.text();
        const lines = text.split('\n');
        const list: ProxyConfig[] = [];
        for (const line of lines) {
            const parsed = parseProxyString(line);
            if (parsed) {
                list.push(parsed);
            }
        }
        console.log(`✅ Loaded ${list.length} public proxies from GitHub.`);
        return list;
    } catch (e: any) {
        clearTimeout(timeoutId);
        console.warn(`⚠️ Failed to fetch public proxies from GitHub: ${e.message || e}`);
        return [];
    }
}

// Core smart connection fallback function
async function connectWithFallback(): Promise<void> {
    const mode = env.telegramProxyMode;
    console.log(`🔌 Initializing Telegram client connection (Mode: ${mode.toUpperCase()})...`);

    // Helper to test a single candidate connection (for cache, direct, or custom proxy check)
    const trySingleCandidate = async (cand: { name: string; direct: boolean; proxy: ProxyConfig | null }, timeoutMs = 8000): Promise<boolean> => {
        console.log(`🔄 Attempting: ${cand.name}...`);
        try {
            initClientInstance(cand.proxy, 1);
            await Promise.race([
                activeClient!.connect(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), timeoutMs))
            ]);
            // Verify packet flow
            await activeClient!.isUserAuthorized();
            console.log(`✅ Success! Telegram client connected using: ${cand.name}`);
            saveConnectionToCache(cand.direct, cand.proxy);
            return true;
        } catch (e: any) {
            console.warn(`❌ Failed for ${cand.name}: ${e.message || e}`);
            return false;
        }
    };

    // 1. Check cache first in 'auto' mode
    if (mode === 'auto') {
        const cached = getCachedConnection();
        if (cached) {
            console.log(`🕒 Trying last cached working connection: ${cached.direct ? "DIRECT" : `PROXY (${cached.proxy?.ip}:${cached.proxy?.port})`}`);
            const success = await trySingleCandidate({
                name: cached.direct ? "Cached Direct Connection" : `Cached Proxy (${cached.proxy?.ip}:${cached.proxy?.port})`,
                direct: cached.direct,
                proxy: cached.proxy
            }, 6000);
            if (success) return;
            console.warn(`⚠️ Cached connection is no longer working. Finding alternatives.`);
        }
    }

    // 2. Try Direct connection first if allowed
    if (mode === 'auto' || mode === 'direct') {
        const success = await trySingleCandidate({ name: "Direct Connection", direct: true, proxy: null }, 6000);
        if (success) return;
        if (mode === 'direct') {
            throw new Error("🔴 Telegram connection failed: Direct connection timed out and Mode is set to DIRECT only.");
        }
    }

    // 3. Try custom proxies configured in .env (if any)
    if (mode === 'auto' || mode === 'proxy') {
        if (env.telegramProxies) {
            const customProxyStrings = env.telegramProxies.split(',');
            const customCandidates: { name: string; direct: boolean; proxy: ProxyConfig | null }[] = [];
            for (const proxyStr of customProxyStrings) {
                const parsed = parseProxyString(proxyStr);
                if (parsed) {
                    customCandidates.push({
                        name: `Custom Proxy (${parsed.ip}:${parsed.port})`,
                        direct: false,
                        proxy: parsed
                    });
                }
            }

            if (customCandidates.length > 0) {
                console.log(`📋 Trying user-configured custom proxies...`);
                for (const cand of customCandidates) {
                    if (await trySingleCandidate(cand, 8000)) {
                        return;
                    }
                }
            }
        }
    }

    // 4. Fallback to public proxies in parallel batches
    if ((mode === 'auto' || mode === 'proxy') && env.telegramFetchPublicProxies) {
        console.log("⚠️ Direct and custom proxy connections failed/not-set. Activating parallel public proxy autodiscovery...");

        // Fetch fresh proxies
        const publicProxies = await fetchPublicProxies();
        
        // Combine fetched ones and hardcoded fallbacks
        const allFallbacks = [...publicProxies, ...HARDCODED_FALLBACK_PROXIES];

        // Deduplicate proxies by IP and Port
        const seen = new Set<string>();
        const uniqueFallbacks: ProxyConfig[] = [];
        for (const p of allFallbacks) {
            const key = `${p.ip}:${p.port}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueFallbacks.push(p);
            }
        }

        const batchSize = 10;
        const maxProxiesToScan = Math.min(uniqueFallbacks.length, 50); // limit scan to top 50 proxies
        console.log(`📋 Will scan up to ${maxProxiesToScan} unique public proxies in parallel batches of ${batchSize}...`);

        for (let i = 0; i < maxProxiesToScan; i += batchSize) {
            const batch = uniqueFallbacks.slice(i, i + batchSize);
            console.log(`📡 Scanning proxy batch ${Math.floor(i / batchSize) + 1} (${batch.length} proxies in parallel)...`);

            // Map each proxy in the batch to a connection attempt promise
            const promises = batch.map(async (proxy, index) => {
                const globalIndex = i + index + 1;
                const proxyName = `Public MTProto Proxy #${globalIndex} (${proxy.ip}:${proxy.port})`;
                
                const clientOptions: any = { 
                    connectionRetries: 1, // fast fail
                    useWSS: false
                };

                clientOptions.proxy = {
                    ip: proxy.ip,
                    port: proxy.port,
                    MTProxy: proxy.MTProxy,
                    secret: normalizeSecret(proxy.secret),
                    socksType: proxy.socksType || 5,
                    username: proxy.username,
                    password: proxy.password
                };

                const tempClient = new TelegramClient(
                    stringSession,
                    env.apiId,
                    env.apiHash,
                    clientOptions
                );

                try {
                    // Timeout connection attempt at 6 seconds
                    await Promise.race([
                        tempClient.connect(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000))
                    ]);

                    // Verify we can send packets
                    await tempClient.isUserAuthorized();

                    return { proxy, tempClient, name: proxyName };
                } catch (err) {
                    try {
                        await tempClient.disconnect();
                    } catch (_) {}
                    throw err;
                }
            });

            try {
                // Wait for the first client in the batch to successfully connect
                const winner = await Promise.any(promises);
                console.log(`🎉 Winner found: ${winner.name}`);

                // Success! Clean up other connections in the batch
                promises.forEach(async (p) => {
                    try {
                        const result = await p;
                        if (result.tempClient !== winner.tempClient) {
                            await result.tempClient.disconnect();
                        }
                    } catch (_) {}
                });

                // Assign the winning client to our activeClient reference
                activeClient = winner.tempClient;
                currentProxy = winner.proxy;
                saveConnectionToCache(false, winner.proxy);
                return;
            } catch (err) {
                // All connection attempts in this batch failed, proceed to next batch
                console.warn(`❌ Batch ${Math.floor(i / batchSize) + 1} failed. All proxies were unreachable.`);
            }
        }
    }

    throw new Error("🔴 Telegram connection failed: Direct connection and all tested SOCKS5/MTProto proxies were unreachable.");
}

// JS Proxy wrapper for the client singleton
export const client = new Proxy({}, {
    get(target, prop, receiver) {
        if (!activeClient) {
            initClientInstance();
        }
        
        // Intercept connect method
        if (prop === 'connect') {
            return connectWithFallback;
        }

        // Helper properties for diagnostics
        if (prop === '_getCurrentProxy') {
            return () => currentProxy;
        }
        if (prop === '_isDirect') {
            return () => !currentProxy;
        }

        const value = Reflect.get(activeClient!, prop);
        if (typeof value === 'function') {
            return value.bind(activeClient);
        }
        return value;
    },
    set(target, prop, value, receiver) {
        if (!activeClient) {
            initClientInstance();
        }
        return Reflect.set(activeClient!, prop, value);
    }
}) as TelegramClient & {
    _getCurrentProxy: () => ProxyConfig | null;
    _isDirect: () => boolean;
};

export { SESSION_FILE_PATH };