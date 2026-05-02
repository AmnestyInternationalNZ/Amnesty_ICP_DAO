import { createActor, type backendInterface, type CreateActorOptions } from './backend';
import { HttpAgent } from '@icp-sdk/core/agent';

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

let configCache: Config | null = null;
export const DELEGATION_EXPIRED_EVENT = 'amnesty:delegation-expired';

export async function loadConfig(): Promise<Config> {
    if (configCache) {
        return configCache;
    }
    const backendCanisterId = process.env.CANISTER_ID_BACKEND;
    try {
        const response = await fetch('./env.json');
        const config = (await response.json()) as JsonConfig;
        if (!backendCanisterId && config.backend_canister_id === 'undefined') {
            console.error('CANISTER_ID_BACKEND is not set');
            throw new Error('CANISTER_ID_BACKEND is not set');
        }

        const fullConfig = {
            backend_host: config.backend_host == 'undefined' ? undefined : config.backend_host,
            backend_canister_id: (config.backend_canister_id == 'undefined'
                ? backendCanisterId
                : config.backend_canister_id) as string,
            ii_url: config.ii_url == 'undefined' ? undefined : config.ii_url,
            ii_derivation_origin: config.ii_derivation_origin == 'undefined' ? undefined : config.ii_derivation_origin
        };
        configCache = fullConfig;
        return fullConfig;
    } catch {
        if (!backendCanisterId) {
            console.error('CANISTER_ID_BACKEND is not set');
            throw new Error('CANISTER_ID_BACKEND is not set');
        }
        const fallbackConfig = {
            backend_host: undefined,
            backend_canister_id: backendCanisterId,
            ii_url: process.env.II_URL || undefined,
            ii_derivation_origin: undefined
        };
        return fallbackConfig;
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
        (normalized.includes('delegation') &&
            (normalized.includes('invalid') || normalized.includes('signature') || normalized.includes('certificate')))
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
    const agent = new HttpAgent({
        ...resolvedOptions.agentOptions,
        host: config.backend_host
    });
    if (config.backend_host?.includes('localhost')) {
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
