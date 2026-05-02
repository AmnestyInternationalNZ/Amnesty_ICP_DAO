import { useInternetIdentity } from './useInternetIdentity';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { type backendInterface } from '../backend';
import { createActorWithConfig } from '../config';

const ACTOR_QUERY_KEY = 'actor';

export function useActor() {
    const { identity } = useInternetIdentity();
    const queryClient = useQueryClient();

    const actorQuery = useQuery<backendInterface>({
        queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString() ?? 'anonymous'],
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
        enabled: true
    });

    useEffect(() => {
        if (actorQuery.data) {
            queryClient.invalidateQueries({
                predicate: (query) => !query.queryKey.includes(ACTOR_QUERY_KEY)
            });
        }
    }, [actorQuery.data, queryClient]);

    return {
        actor: actorQuery.data ?? null,
        isFetching: actorQuery.isFetching,
        isAuthenticated: !!identity
    };
}
