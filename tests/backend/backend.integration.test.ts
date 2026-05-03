import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { actorFor, candidPrincipal, communityRoleKey, createBackendFixture, principalText, type BackendFixture } from './fixture';

type ProposalOverridesArg = [] | [{
  windowNs: [] | [bigint];
  quorum: [] | [bigint];
  passPct: [] | [bigint];
}];

describe('Amnesty backend regression baseline', () => {
  let fixture: BackendFixture;

  beforeEach(async () => {
    fixture = await createBackendFixture();
  });

  afterEach(async () => {
    try {
      await fixture.pic.tearDown();
    } catch (error) {
      if (error instanceof Error && /Instance was deleted/.test(error.message)) {
        return;
      }

      throw error;
    }
  });

  it('rejects anonymous callers on authenticated methods', async () => {
    const anonymousActor = actorFor(fixture, fixture.anonymousIdentity);

    await expect(anonymousActor.listCommunities()).rejects.toThrow(
      /Anonymous callers are not allowed/,
    );
    await expect(
      anonymousActor.createCommunity('Anonymous Community', 'No policy'),
    ).rejects.toThrow(/Anonymous callers are not allowed/);
  });

  it('bootstraps the first platform admin once and exposes the role', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await fixture.pic.tick(2);

    expect(await adminActor.getCallerPlatformRole()).toEqual([
      { platformAdmin: null },
    ]);
    expect(await adminActor.isCallerPlatformAdmin()).toBe(true);
    expect(
      (await adminActor.listPlatformAdmins()).map((principal) => principal.toText()),
    ).toEqual([principalText(fixture.adminIdentity)]);

    await expect(outsiderActor.bootstrapPlatformAdmin()).rejects.toThrow(
      /Platform admin already configured/,
    );
  });

  it('lets a platform admin create a community and assign community roles', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.saveCallerUserProfile({ name: 'Admin' });
    await memberActor.saveCallerUserProfile({ name: 'Member' });
    await adminActor.createCommunity('Auckland Community Group', 'Act locally.');

    const community = (await adminActor.getCommunityById(0n))[0];
    expect(community.name).toBe('Auckland Community Group');
    expect(community.policy).toBe('Act locally.');
    expect(community.admin.toText()).toBe(principalText(fixture.adminIdentity));
    expect(community.members.map((principal) => principal.toText())).toEqual([
      principalText(fixture.adminIdentity),
    ]);

    await expect(
      outsiderActor.createCommunity('Viewer Group', 'Blocked'),
    ).rejects.toThrow(/Only platform admins can perform this action/);

    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );

    const members = await adminActor.listCommunityMembers(0n);
    const memberRoles = new Map(
      members.map((entry) => [
        entry.principal.toText(),
        {
          role: communityRoleKey(entry.role),
          profileName: entry.profile[0]?.name ?? null,
        },
      ]),
    );

    expect(memberRoles.get(principalText(fixture.adminIdentity))).toEqual({
      role: 'communityAdmin',
      profileName: 'Admin',
    });
    expect(memberRoles.get(principalText(fixture.memberIdentity))).toEqual({
      role: 'member',
      profileName: 'Member',
    });

    await expect(
      outsiderActor.setCommunityRole(
        0n,
        candidPrincipal(fixture.outsiderIdentity),
        [{ member: null }],
      ),
    ).rejects.toThrow(/Only platform admins or community admins can manage community membership/);
  });

  it('allows community members to create proposals and blocks viewers', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.createCommunity('Proposal Community', 'Debate here.');
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );

    const overrides: ProposalOverridesArg = [{
      windowNs: [1_000_000n],
      quorum: [1n],
      passPct: [50n],
    }];

    await memberActor.createProposal(
      0n,
      'Support local action',
      'Coordinate the next action.',
      overrides,
    );

    const proposal = (await adminActor.getProposalById(0n))[0];
    expect(proposal.title).toBe('Support local action');
    expect(proposal.communityId).toBe(0n);

    await expect(
      outsiderActor.createProposal(
        0n,
        'Blocked proposal',
        'Should not pass auth.',
        overrides,
      ),
    ).rejects.toThrow(/Only community participants can create proposals/);
  });

  it('enforces one-person-one-vote and finalizes proposals with quorum/pass threshold', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.createCommunity('Voting Community', 'Votes matter.');
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );

    const passingOverrides: ProposalOverridesArg = [{
      windowNs: [1_000_000n],
      quorum: [2n],
      passPct: [60n],
    }];

    await memberActor.createProposal(
      0n,
      'Pass this motion',
      'Need two yes votes.',
      passingOverrides,
    );

    await memberActor.voteOnProposal(0n, true);
    await expect(memberActor.voteOnProposal(0n, false)).rejects.toThrow(
      /already voted on this proposal/,
    );
    await expect(outsiderActor.voteOnProposal(0n, true)).rejects.toThrow(
      /Only community participants can vote on proposals/,
    );

    await adminActor.voteOnProposal(0n, true);
    await fixture.pic.advanceTime(2);
    await fixture.pic.tick();
    await memberActor.finalizeProposal(0n);

    expect((await adminActor.getProposalById(0n))[0].state).toEqual({
      passed: null,
    });

    const failingOverrides: ProposalOverridesArg = [{
      windowNs: [1_000_000n],
      quorum: [2n],
      passPct: [75n],
    }];

    await memberActor.createProposal(
      0n,
      'Fail this motion',
      'One no vote should fail it.',
      failingOverrides,
    );
    await memberActor.voteOnProposal(1n, false);
    await fixture.pic.advanceTime(2);
    await fixture.pic.tick();
    await adminActor.finalizeProposal(1n);

    expect((await adminActor.getProposalById(1n))[0].state).toEqual({
      failed: null,
    });
  });

  it('tracks campaign contributions and only finalizes once the goal is reached', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.createCommunity('Campaign Community', 'Raise support.');
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );

    const currentTimeMs = await fixture.pic.getTime();
    const futureDeadlineNs = BigInt(currentTimeMs + 60_000) * 1_000_000n;

    await memberActor.createCampaign(
      0n,
      'Fund campaign materials',
      'Print materials for the next action.',
      100n,
      futureDeadlineNs,
    );

    await expect(
      outsiderActor.contributeToCampaign(0n, 10n),
    ).rejects.toThrow(/Only community participants can contribute to campaigns/);

    await memberActor.contributeToCampaign(0n, 40n);
    await adminActor.contributeToCampaign(0n, 30n);

    expect((await memberActor.getCampaignById(0n))[0].totalRaised).toBe(70n);
    expect(await memberActor.canFinalizeCampaign(0n)).toBe(false);
    await expect(memberActor.finalizeCampaign(0n)).rejects.toThrow(
      /Campaign goal has not been reached yet/,
    );

    await adminActor.contributeToCampaign(0n, 30n);

    const contributions = await adminActor.getCampaignContributions(0n);
    expect(contributions).toHaveLength(3);
    expect((await adminActor.getCampaignById(0n))[0].totalRaised).toBe(100n);
    expect(await memberActor.canFinalizeCampaign(0n)).toBe(true);

    await expect(adminActor.finalizeCampaign(0n)).rejects.toThrow(
      /Only the campaign creator can finalize the campaign/,
    );

    await memberActor.finalizeCampaign(0n);
    expect((await memberActor.getCampaignById(0n))[0].state).toEqual({
      successful: null,
    });
  });

  it('enforces leaveCommunity rules for members, viewers, and community admins', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.createCommunity('Leave Community', 'Membership rules.');
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );

    await expect(outsiderActor.leaveCommunity(0n)).rejects.toThrow(
      /Not a member of this community/,
    );
    await expect(adminActor.leaveCommunity(0n)).rejects.toThrow(
      /Community admins must be demoted or removed by another admin before leaving/,
    );

    await memberActor.leaveCommunity(0n);

    expect(await memberActor.getCallerCommunityRole(0n)).toEqual([]);
    expect(
      (await adminActor.getCommunityById(0n))[0].members.map((principal) => principal.toText()),
    ).toEqual([principalText(fixture.adminIdentity)]);

    await expect(memberActor.leaveCommunity(0n)).rejects.toThrow(
      /Not a member of this community/,
    );
    await expect(
      memberActor.createProposal(
        0n,
        'Former members cannot propose',
        'This should be rejected.',
        [],
      ),
    ).rejects.toThrow(/Only community participants can create proposals/);
  });

  it('enforces community-scoped document permissions, grants, and former-member access loss', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.createCommunity('Workspace Community', 'Work here.');
    await adminActor.createCommunity('Other Community', 'Separate work.');
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );

    const documentId = await memberActor.createCommunityDocument(0n, 'Campaign notes');
    expect(documentId).toBe(0n);

    await expect(outsiderActor.listCommunityDocuments(0n)).rejects.toThrow(
      /workspace access requires a community role/i,
    );
    await expect(memberActor.listCommunityDocuments(1n)).rejects.toThrow(
      /workspace access requires a community role/i,
    );

    await memberActor.appendCommunityDocumentUpdate(0n, documentId, Uint8Array.from([1, 2, 3]));
    let payload = (await memberActor.getCommunityDocument(0n, documentId))[0];
    expect(payload.title).toBe('Campaign notes');
    expect(payload.role).toEqual({ owner: null });
    expect(payload.updates).toHaveLength(1);
    expect(Array.from(payload.updates[0])).toEqual([1, 2, 3]);

    await memberActor.saveCommunityDocumentSnapshot(0n, documentId, Uint8Array.from([9, 9]), 1n);
    payload = (await memberActor.getCommunityDocument(0n, documentId))[0];
    expect(Array.from(payload.snapshot[0])).toEqual([9, 9]);
    expect(payload.updates).toHaveLength(0);

    await expect(
      memberActor.setCommunityDocumentGrant(
        0n,
        documentId,
        candidPrincipal(fixture.outsiderIdentity),
        [{ viewer: null }],
      ),
    ).rejects.toThrow(/current members of this community/i);

    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.outsiderIdentity),
      [{ member: null }],
    );
    await memberActor.setCommunityDocumentGrant(
      0n,
      documentId,
      candidPrincipal(fixture.outsiderIdentity),
      [{ viewer: null }],
    );

    expect((await outsiderActor.getCommunityDocument(0n, documentId))[0].role).toEqual({
      viewer: null,
    });
    await expect(
      outsiderActor.appendCommunityDocumentUpdate(0n, documentId, Uint8Array.from([7])),
    ).rejects.toThrow(/cannot edit this document/i);

    expect((await adminActor.getCommunityDocument(0n, documentId))[0].role).toEqual({
      editor: null,
    });

    await adminActor.setCommunityRole(0n, candidPrincipal(fixture.outsiderIdentity), []);
    await expect(outsiderActor.getCommunityDocument(0n, documentId)).rejects.toThrow(
      /workspace access requires a community role/i,
    );

    await expect(memberActor.getCommunityDocument(1n, documentId)).rejects.toThrow(
      /does not belong to this community/i,
    );
  });

  it('enforces community-scoped board, card, and linked-resource permissions', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);
    const anonymousActor = actorFor(fixture, fixture.anonymousIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.createCommunity('Board Community', 'Plan here.');
    await adminActor.createCommunity('Separate Board Community', 'No leakage.');
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.outsiderIdentity),
      [{ member: null }],
    );

    const docId = await memberActor.createCommunityDocument(0n, 'Linked doc');
    const eventId = await memberActor.createCommunityEvent(0n, {
      title: 'Planning hui',
      description: [],
      location: [],
      startUtc: 1_777_500_000_000_000_000n,
      endUtc: 1_777_503_600_000_000_000n,
      allDay: false,
    });

    const otherDocId = await adminActor.createCommunityDocument(1n, 'Other doc');
    const boardId = await memberActor.createCommunityBoard(0n, 'Action board');
    const column = await memberActor.addCommunityBoardColumn(0n, boardId, 'Backlog');
    const card = await memberActor.addCommunityBoardCard(0n, boardId, column.id, {
      title: 'Draft outreach plan',
      description: ['Write the plan'],
      assignedTo: [candidPrincipal(fixture.memberIdentity)],
      docId: [docId],
      eventId: [eventId],
      dueDateUtc: [],
    });

    expect(card.title).toBe('Draft outreach plan');
    const ownerBoardPayload = (await memberActor.getCommunityBoard(0n, boardId))[0];
    expect(ownerBoardPayload.cards).toHaveLength(1);
    expect(ownerBoardPayload.publicToken).toEqual([]);

    await expect(
      memberActor.addCommunityBoardCard(0n, boardId, column.id, {
        title: 'Bad link',
        description: [],
        assignedTo: [],
        docId: [otherDocId],
        eventId: [],
        dueDateUtc: [],
      }),
    ).rejects.toThrow(/does not belong to this community/i);

    await memberActor.setCommunityBoardGrant(
      0n,
      boardId,
      candidPrincipal(fixture.outsiderIdentity),
      [{ viewer: null }],
    );
    expect((await outsiderActor.getCommunityBoard(0n, boardId))[0].role).toEqual({
      viewer: null,
    });
    await memberActor.setCommunityBoardGrant(
      0n,
      boardId,
      candidPrincipal(fixture.outsiderIdentity),
      [],
    );

    await memberActor.setCommunityBoardShare(0n, boardId, [{ viewer: null }]);
    expect((await outsiderActor.getCommunityBoard(0n, boardId))[0].role).toEqual({
      viewer: null,
    });
    await expect(outsiderActor.addCommunityBoardColumn(0n, boardId, 'Blocked')).rejects.toThrow(
      /cannot edit this board/i,
    );

    await memberActor.setCommunityBoardShare(0n, boardId, [{ editor: null }]);
    await outsiderActor.moveCommunityBoardCard(0n, boardId, card.id, 0n, 0n);

    await expect(
      outsiderActor.setCommunityBoardPublicLink(0n, boardId, ['b'.repeat(32)]),
    ).rejects.toThrow(/Only the board owner can manage public links/i);
    await expect(
      memberActor.setCommunityBoardPublicLink(0n, boardId, ['short']),
    ).rejects.toThrow(/Public link token must be between 32 and 160 characters/i);

    const token = 'a'.repeat(32);
    expect(await memberActor.setCommunityBoardPublicLink(0n, boardId, [token])).toEqual([token]);
    expect((await memberActor.getCommunityBoard(0n, boardId))[0].publicToken).toEqual([token]);

    const publicBoard = (await anonymousActor.getPublicCommunityBoard(token))[0];
    expect(publicBoard.title).toBe('Action board');
    expect(publicBoard.role).toEqual({ viewer: null });
    expect(publicBoard.access).toEqual([]);
    expect(publicBoard.communityShare).toEqual([]);
    expect(publicBoard.publicToken).toEqual([]);

    expect(await memberActor.setCommunityBoardPublicLink(0n, boardId, [])).toEqual([]);
    expect(await anonymousActor.getPublicCommunityBoard(token)).toEqual([]);

    await expect(outsiderActor.getCommunityBoard(1n, boardId)).rejects.toThrow(
      /does not belong to this community/i,
    );
  });

  it('enforces community-scoped calendar permissions and invalid range validation', async () => {
    const adminActor = actorFor(fixture, fixture.adminIdentity);
    const memberActor = actorFor(fixture, fixture.memberIdentity);
    const outsiderActor = actorFor(fixture, fixture.outsiderIdentity);
    const anonymousActor = actorFor(fixture, fixture.anonymousIdentity);

    await adminActor.bootstrapPlatformAdmin();
    await adminActor.createCommunity('Calendar Community', 'Events here.');
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.memberIdentity),
      [{ member: null }],
    );
    await adminActor.setCommunityRole(
      0n,
      candidPrincipal(fixture.outsiderIdentity),
      [{ member: null }],
    );

    await expect(
      memberActor.createCommunityEvent(0n, {
        title: 'Invalid event',
        description: [],
        location: [],
        startUtc: 10n,
        endUtc: 10n,
        allDay: false,
      }),
    ).rejects.toThrow(/end must be after start/i);

    const eventId = await memberActor.createCommunityEvent(0n, {
      title: 'Community meeting',
      description: ['Plan the next action'],
      location: ['Library'],
      startUtc: 1_777_500_000_000_000_000n,
      endUtc: 1_777_503_600_000_000_000n,
      allDay: false,
    });

    expect((await memberActor.getCommunityEvent(0n, eventId))[0].role).toEqual({
      owner: null,
    });
    expect((await memberActor.getCommunityEvent(0n, eventId))[0].publicToken).toEqual([]);
    expect((await outsiderActor.getCommunityEvent(0n, eventId))).toEqual([]);

    await memberActor.setCommunityEventGrant(
      0n,
      eventId,
      candidPrincipal(fixture.outsiderIdentity),
      [{ viewer: null }],
    );
    expect((await outsiderActor.getCommunityEvent(0n, eventId))[0].role).toEqual({
      viewer: null,
    });
    await memberActor.setCommunityEventGrant(
      0n,
      eventId,
      candidPrincipal(fixture.outsiderIdentity),
      [],
    );
    expect((await outsiderActor.getCommunityEvent(0n, eventId))).toEqual([]);

    await memberActor.setCommunityEventShare(0n, eventId, [{ viewer: null }]);
    expect((await outsiderActor.getCommunityEvent(0n, eventId))[0].role).toEqual({
      viewer: null,
    });
    await expect(
      outsiderActor.updateCommunityEvent(0n, eventId, {
        title: 'Blocked edit',
        description: [],
        location: [],
        startUtc: 1_777_500_000_000_000_000n,
        endUtc: 1_777_503_600_000_000_000n,
        allDay: false,
      }),
    ).rejects.toThrow(/cannot edit this event/i);

    await memberActor.setCommunityEventShare(0n, eventId, [{ editor: null }]);
    await outsiderActor.updateCommunityEvent(0n, eventId, {
      title: 'Edited by member',
      description: [],
      location: [],
      startUtc: 1_777_500_000_000_000_000n,
      endUtc: 1_777_503_600_000_000_000n,
      allDay: false,
    });
    expect((await adminActor.getCommunityEvent(0n, eventId))[0].title).toBe('Edited by member');

    await expect(
      outsiderActor.setCommunityEventPublicLink(0n, eventId, ['b'.repeat(32)]),
    ).rejects.toThrow(/Only the event owner can manage public links/i);
    await expect(
      memberActor.setCommunityEventPublicLink(0n, eventId, ['short']),
    ).rejects.toThrow(/Public link token must be between 32 and 160 characters/i);

    const token = 'c'.repeat(32);
    expect(await memberActor.setCommunityEventPublicLink(0n, eventId, [token])).toEqual([token]);
    expect((await memberActor.getCommunityEvent(0n, eventId))[0].publicToken).toEqual([token]);

    const publicEvent = (await anonymousActor.getPublicCommunityEvent(token))[0];
    expect(publicEvent.title).toBe('Edited by member');
    expect(publicEvent.role).toEqual({ viewer: null });
    expect(publicEvent.access).toEqual([]);
    expect(publicEvent.communityShare).toEqual([]);
    expect(publicEvent.publicToken).toEqual([]);

    expect(await memberActor.setCommunityEventPublicLink(0n, eventId, [])).toEqual([]);
    expect(await anonymousActor.getPublicCommunityEvent(token)).toEqual([]);

    const archiveToken = 'd'.repeat(32);
    await memberActor.setCommunityEventPublicLink(0n, eventId, [archiveToken]);
    await memberActor.archiveCommunityEvent(0n, eventId);
    expect(await anonymousActor.getPublicCommunityEvent(archiveToken)).toEqual([]);
  });
});
