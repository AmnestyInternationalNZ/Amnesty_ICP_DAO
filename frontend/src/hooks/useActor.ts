import { useInternetIdentity } from './useInternetIdentity';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';

const ACTOR_QUERY_KEY = 'actor';
let lastActorPrincipal: string | undefined;

export function useActor() {
    const { identity } = useInternetIdentity();
    const queryClient = useQueryClient();
    const principalKey = identity?.getPrincipal().toString() ?? 'anonymous';

    const actorQuery = useQuery<backendInterface>({
        queryKey: [ACTOR_QUERY_KEY, principalKey],
        queryFn: async () => {
            if (!identity) {
                return await createActorWithConfig();
            }

            return await createActorWithConfig({
                agentOptions: {
                    identity
                }
            });
        },
        staleTime: Infinity,
        retry: false,
        enabled: true
    });

    useEffect(() => {
        if (!actorQuery.data) {
            return;
        }

        if (lastActorPrincipal === undefined) {
            lastActorPrincipal = principalKey;
            return;
        }

        if (lastActorPrincipal !== principalKey) {
            lastActorPrincipal = principalKey;
            queryClient.invalidateQueries({
                predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY)
            });
        }
    }, [actorQuery.data, principalKey, queryClient]);

    return {
        actor: actorQuery.data ?? null,
        isFetching: actorQuery.isFetching,
        isAuthenticated: !!identity
    };
}
