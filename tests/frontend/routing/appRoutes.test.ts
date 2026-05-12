import { describe, expect, it } from 'vitest';
import { parseAppPath, routePaths } from '../../../frontend/src/routing/appRoutes';

describe('app routes', () => {
  it('builds community-scoped workspace document URLs', () => {
    expect(routePaths.document(12n, 34n)).toBe('/communities/12/workspace/docs/34');
    expect(parseAppPath('/communities/12/workspace/docs/34')).toMatchObject({
      page: 'workspace',
      communityId: 12n,
      documentId: 34n,
    });
  });

  it('keeps board routes unique per community', () => {
    expect(routePaths.board(1n, 7n)).toBe('/communities/1/workspace/boards/7');
    expect(routePaths.board(2n, 7n)).toBe('/communities/2/workspace/boards/7');
    expect(parseAppPath('/communities/2/workspace/boards/7')).toMatchObject({
      page: 'boards',
      communityId: 2n,
      boardId: 7n,
    });
  });

  it('builds and parses public read-only board routes', () => {
    expect(routePaths.publicBoard('abc-123')).toBe('/boards/public/abc-123');
    expect(parseAppPath('/boards/public/abc-123')).toMatchObject({
      page: 'publicBoard',
      communityId: null,
      publicBoardToken: 'abc-123',
    });
  });

  it('builds and parses community-scoped calendar event routes', () => {
    expect(routePaths.event(9n, 44n)).toBe('/communities/9/workspace/calendar/events/44');
    expect(parseAppPath('/communities/9/workspace/calendar/events/44')).toMatchObject({
      page: 'calendar',
      communityId: 9n,
      eventId: 44n,
    });
  });

  it('builds and parses public read-only calendar event routes', () => {
    expect(routePaths.publicEvent('event-token')).toBe('/calendar/public/event-token');
    expect(parseAppPath('/calendar/public/event-token')).toMatchObject({
      page: 'publicEvent',
      communityId: null,
      publicEventToken: 'event-token',
    });
  });

  it('builds and parses community-scoped fundraising campaign routes', () => {
    expect(routePaths.fundraise(3n)).toBe('/communities/3/fundraise');
    expect(routePaths.newCampaign(3n)).toBe('/communities/3/fundraise/new');
    expect(routePaths.campaign(3n, 12n)).toBe('/communities/3/fundraise/campaigns/12');
    expect(parseAppPath('/communities/3/fundraise')).toMatchObject({
      page: 'fundraise',
      communityId: 3n,
    });
    expect(parseAppPath('/communities/3/fundraise/new')).toMatchObject({
      page: 'fundraise',
      communityId: 3n,
      campaignCreate: true,
    });
    expect(parseAppPath('/communities/3/fundraise/campaigns/12')).toMatchObject({
      page: 'fundraise',
      communityId: 3n,
      campaignId: 12n,
    });
  });

  it('builds and parses public read-only campaign routes', () => {
    expect(routePaths.publicCampaign('campaign-token')).toBe('/campaigns/public/campaign-token');
    expect(parseAppPath('/campaigns/public/campaign-token')).toMatchObject({
      page: 'publicCampaign',
      communityId: null,
      publicCampaignToken: 'campaign-token',
    });
  });

  it('parses community-level workspace pages', () => {
    expect(parseAppPath('/communities/5')).toMatchObject({ page: 'community', communityId: 5n });
    expect(parseAppPath('/communities/5/proposals')).toMatchObject({ page: 'proposals', communityId: 5n });
    expect(parseAppPath('/communities/5/fundraise')).toMatchObject({ page: 'fundraise', communityId: 5n });
    expect(parseAppPath('/communities/5/workspace')).toMatchObject({ page: 'workspace', communityId: 5n });
    expect(parseAppPath('/communities/5/workspace/calendar')).toMatchObject({ page: 'calendar', communityId: 5n });
  });

  it('canonicalizes the legacy workspace document route when the last community is known', () => {
    expect(parseAppPath('/workspace/doc/9', 4n)).toMatchObject({
      page: 'workspace',
      communityId: 4n,
      documentId: 9n,
      canonicalPath: '/communities/4/workspace/docs/9',
    });
  });
});
