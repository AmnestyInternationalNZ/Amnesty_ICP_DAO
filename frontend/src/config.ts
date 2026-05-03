import { createActor, type backendInterface, type CreateActorOptions } from './backend';
import { HttpAgent, type HttpAgentOptions } from '@icp-sdk/core/agent';

interface JsonConfig {
    backend_host: string;
    backend_canister_id: string;
    ii_url: string;
    ii_derivation_origin: string;
}

interface Config {
    backend_host?: string;
    backend_canister_id: string;
    ii_url?: string;
    ii_derivation_origin?: string;
}

const LOCAL_BACKEND_CANISTER_ID = 't63gs-up777-77776-aaaba-cai';
const LOCAL_INTERNET_IDENTITY_CANISTER_ID = 'rdmx6-jaaaa-aaaaa-aaadq-cai';
export const RUNTIME_CONFIG_PATH = '/env.json';

let configCache: Config | null = null;
export const DELEGATION_EXPIRED_EVENT = 'amnesty:delegation-expired';

function cleanConfigValue(value?: string): string | undefined {
    if (!value || value === 'undefined' || value === 'null') {
        return undefined;
    }

    return value;
}

function runtimeEnv(): Record<string, string | undefined> {
    const viteEnv = import.meta.env as unknown as Record<string, string | undefined>;
    const processEnv =
        typeof process === 'undefined' ? {} : (process.env as Record<string, string | undefined>);
    return {
        ...processEnv,
        ...viteEnv
    };
}

function readCookieValue(name: string): string | undefined {
    if (typeof document === 'undefined') {
        return undefined;
    }

    return document.cookie
        .split(';')
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${name}=`))
        ?.slice(name.length + 1);
}

function readIcEnvCookie(): Record<string, string | undefined> {
    const encodedCookie = readCookieValue('ic_env');
    if (!encodedCookie) {
        return {};
    }

    try {
        const parsed = JSON.parse(decodeURIComponent(encodedCookie));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, string | undefined>;
        }
    } catch {
        return {};
    }

    return {};
}

function isLocalBrowser(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function localBackendHost(): string | undefined {
    if (!isLocalBrowser()) {
        return undefined;
    }

    const { hostname, port, protocol } = window.location;
    if (port === '4944' || port === '4954') {
        return `${protocol}//${hostname}:${port}`;
    }

    return `http://${hostname}:4944`;
}

function localInternetIdentityUrl(host?: string): string | undefined {
    return host ? `${host}/?canisterId=${LOCAL_INTERNET_IDENTITY_CANISTER_ID}` : undefined;
}

async function readJsonConfig(): Promise<Partial<JsonConfig>> {
    try {
        const response = await fetch(RUNTIME_CONFIG_PATH, { cache: 'no-store' });
        if (!response.ok) {
            return {};
        }

        return (await response.json()) as Partial<JsonConfig>;
    } catch {
        return {};
    }
}

export async function loadConfig(): Promise<Config> {
    if (configCache) {
        return configCache;
    }

    const config = await readJsonConfig();
    const env = runtimeEnv();
    const icEnv = readIcEnvCookie();
    const backendHost =
        cleanConfigValue(config.backend_host) ??
        cleanConfigValue(env.BACKEND_HOST) ??
        cleanConfigValue(env.VITE_BACKEND_HOST) ??
        cleanConfigValue(icEnv.BACKEND_HOST) ??
        cleanConfigValue(icEnv.PUBLIC_BACKEND_HOST) ??
        localBackendHost();
    const backendCanisterId =
        cleanConfigValue(config.backend_canister_id) ??
        cleanConfigValue(env.CANISTER_ID_BACKEND) ??
        cleanConfigValue(env.VITE_CANISTER_ID_BACKEND) ??
        cleanConfigValue(env.VITE_BACKEND_CANISTER_ID) ??
        cleanConfigValue(icEnv['PUBLIC_CANISTER_ID:backend']) ??
        cleanConfigValue(icEnv.CANISTER_ID_BACKEND) ??
        cleanConfigValue(icEnv.BACKEND_CANISTER_ID) ??
        (isLocalBrowser() ? LOCAL_BACKEND_CANISTER_ID : undefined);

    if (!backendCanisterId) {
        throw new Error(
            'Backend canister ID is not configured. Set CANISTER_ID_BACKEND, VITE_BACKEND_CANISTER_ID, or serve the app from an ICP asset canister with the ic_env cookie.'
        );
    }

    const fullConfig = {
        backend_host: backendHost,
        backend_canister_id: backendCanisterId,
        ii_url:
            cleanConfigValue(config.ii_url) ??
            cleanConfigValue(env.II_URL) ??
            cleanConfigValue(env.VITE_II_URL) ??
            cleanConfigValue(icEnv.II_URL) ??
            cleanConfigValue(icEnv.PUBLIC_II_URL) ??
            localInternetIdentityUrl(backendHost),
        ii_derivation_origin:
            cleanConfigValue(config.ii_derivation_origin) ??
            cleanConfigValue(env.II_DERIVATION_ORIGIN) ??
            cleanConfigValue(env.VITE_II_DERIVATION_ORIGIN) ??
            cleanConfigValue(icEnv.II_DERIVATION_ORIGIN) ??
            cleanConfigValue(icEnv.PUBLIC_II_DERIVATION_ORIGIN)
    };
    configCache = fullConfig;
    return fullConfig;
}

function isLocalAgentHost(host?: string): boolean {
    if (!host) {
        return false;
    }

    try {
        const hostname = new URL(host).hostname;
        return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1' || hostname === '::1';
    } catch {
        return /(^|\.)localhost(:|\/|$)|127\.0\.0\.1|^\[?::1\]?(:|\/|$)/.test(host);
    }
}

function extractAgentErrorMessage(error: string): string {
    const errorString = String(error);
    const match = errorString.match(/with message:\s*'([^']+)'/s);
    return match ? match[1] : errorString;
}

function isExpiredDelegationError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
        normalized.includes('invalid delegation expiry') ||
        normalized.includes('sender delegation has expired') ||
        normalized.includes('delegation has expired') ||
        normalized.includes('delegation expired')
    );
}

function notifyDelegationExpired(message: string) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent(DELEGATION_EXPIRED_EVENT, { detail: { message } }));
}

function processError(e: unknown): never {
    if (e && typeof e === 'object' && 'message' in e) {
        const message = extractAgentErrorMessage(e['message'] as string);
        if (isExpiredDelegationError(message)) {
            notifyDelegationExpired(message);
            throw new Error('Your Internet Identity session has expired. Please log in again.');
        }
        throw new Error(message);
    } else throw e;
}

export async function createActorWithConfig(options?: CreateActorOptions): Promise<backendInterface> {
    const config = await loadConfig();
    const resolvedOptions = options ?? {};
    const isLocalHost = isLocalAgentHost(config.backend_host);
    const agentOptions: HttpAgentOptions = {
        ...resolvedOptions.agentOptions,
        host: config.backend_host
    };
    if (isLocalHost && agentOptions.verifyQuerySignatures === undefined) {
        agentOptions.verifyQuerySignatures = false;
    }
    const agent = new HttpAgent({
        ...agentOptions
    });
    if (isLocalHost) {
        await agent.fetchRootKey().catch((err) => {
            console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
            console.error(err);
        });
    }
    return createActor(config.backend_canister_id, {
        ...resolvedOptions,
        agent: agent,
        processError
    });
}
