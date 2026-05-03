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

  it('parses community-level workspace pages', () => {
    expect(parseAppPath('/communities/5')).toMatchObject({ page: 'community', communityId: 5n });
    expect(parseAppPath('/communities/5/proposals')).toMatchObject({ page: 'proposals', communityId: 5n });
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
