export type AppPage = 'hub' | 'community' | 'proposals' | 'fundraise' | 'workspace' | 'boards' | 'calendar' | 'admin' | 'profile' | 'publicBoard' | 'publicEvent' | 'publicCampaign';

export interface ParsedAppRoute {
  page: AppPage;
  communityId: bigint | null;
  documentId?: bigint;
  campaignId?: bigint;
  campaignCreate?: boolean;
  boardId?: bigint;
  eventId?: bigint;
  publicCampaignToken?: string;
  publicBoardToken?: string;
  publicEventToken?: string;
  canonicalPath?: string;
}

function parseBigIntSegment(value: string | undefined): bigint | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function splitPath(pathname: string): string[] {
  return pathname
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
}

export const routePaths = {
  hub: () => '/',
  profile: () => '/profile',
  admin: () => '/admin',
  community: (communityId: bigint) => `/communities/${communityId.toString()}`,
  proposals: (communityId: bigint) => `/communities/${communityId.toString()}/proposals`,
  fundraise: (communityId: bigint) => `/communities/${communityId.toString()}/fundraise`,
  newCampaign: (communityId: bigint) => `/communities/${communityId.toString()}/fundraise/new`,
  campaign: (communityId: bigint, campaignId: bigint) =>
    `/communities/${communityId.toString()}/fundraise/campaigns/${campaignId.toString()}`,
  publicCampaign: (token: string) => `/campaigns/public/${encodeURIComponent(token)}`,
  workspace: (communityId: bigint) => `/communities/${communityId.toString()}/workspace`,
  document: (communityId: bigint, documentId: bigint) =>
    `/communities/${communityId.toString()}/workspace/docs/${documentId.toString()}`,
  boards: (communityId: bigint) => `/communities/${communityId.toString()}/workspace/boards`,
  board: (communityId: bigint, boardId: bigint) =>
    `/communities/${communityId.toString()}/workspace/boards/${boardId.toString()}`,
  publicBoard: (token: string) => `/boards/public/${encodeURIComponent(token)}`,
  calendar: (communityId: bigint) => `/communities/${communityId.toString()}/workspace/calendar`,
  event: (communityId: bigint, eventId: bigint) =>
    `/communities/${communityId.toString()}/workspace/calendar/events/${eventId.toString()}`,
  publicEvent: (token: string) => `/calendar/public/${encodeURIComponent(token)}`,
};

export function parseAppPath(pathname: string, legacyCommunityId: bigint | null = null): ParsedAppRoute {
  const segments = splitPath(pathname);
  if (segments.length === 0) return { page: 'hub', communityId: null };
  if (segments[0] === 'boards' && segments[1] === 'public' && segments[2]) {
    return { page: 'publicBoard', communityId: null, publicBoardToken: segments[2] };
  }
  if (segments[0] === 'campaigns' && segments[1] === 'public' && segments[2]) {
    return { page: 'publicCampaign', communityId: null, publicCampaignToken: segments[2] };
  }
  if (segments[0] === 'calendar' && segments[1] === 'public' && segments[2]) {
    return { page: 'publicEvent', communityId: null, publicEventToken: segments[2] };
  }
  if (segments[0] === 'profile') return { page: 'profile', communityId: null };
  if (segments[0] === 'admin') return { page: 'admin', communityId: null };

  const legacyDocumentId = segments[0] === 'workspace' && segments[1] === 'doc' ? parseBigIntSegment(segments[2]) : undefined;
  if (legacyDocumentId !== undefined && legacyCommunityId !== null) {
    return {
      page: 'workspace',
      communityId: legacyCommunityId,
      documentId: legacyDocumentId,
      canonicalPath: routePaths.document(legacyCommunityId, legacyDocumentId),
    };
  }

  if (segments[0] !== 'communities') return { page: 'hub', communityId: null };
  const communityId = parseBigIntSegment(segments[1]);
  if (communityId === undefined) return { page: 'hub', communityId: null };
  if (segments.length === 2) return { page: 'community', communityId };
  if (segments[2] === 'proposals') return { page: 'proposals', communityId };
  if (segments[2] === 'fundraise' || segments[2] === 'campaigns') {
    if (segments[3] === 'new') return { page: 'fundraise', communityId, campaignCreate: true };
    const campaignId = segments[3] === 'campaigns' || segments[3] === 'campaign'
      ? parseBigIntSegment(segments[4])
      : parseBigIntSegment(segments[3]);
    return campaignId === undefined
      ? { page: 'fundraise', communityId }
      : { page: 'fundraise', communityId, campaignId };
  }

  if (segments[2] !== 'workspace') return { page: 'community', communityId };
  if (segments.length === 3) return { page: 'workspace', communityId };

  if (segments[3] === 'docs' || segments[3] === 'doc') {
    const documentId = parseBigIntSegment(segments[4]);
    return documentId === undefined
      ? { page: 'workspace', communityId }
      : { page: 'workspace', communityId, documentId };
  }

  if (segments[3] === 'boards' || segments[3] === 'board') {
    const boardId = parseBigIntSegment(segments[4]);
    return boardId === undefined ? { page: 'boards', communityId } : { page: 'boards', communityId, boardId };
  }

  if (segments[3] === 'calendar') {
    const eventId = segments[4] === 'events' || segments[4] === 'event' ? parseBigIntSegment(segments[5]) : undefined;
    return eventId === undefined ? { page: 'calendar', communityId } : { page: 'calendar', communityId, eventId };
  }

  return { page: 'workspace', communityId };
}
