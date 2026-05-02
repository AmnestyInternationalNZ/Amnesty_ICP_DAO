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
});
