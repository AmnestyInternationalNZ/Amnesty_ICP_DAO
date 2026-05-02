import AccessControl "authorization/access-control";
import Membership "authorization/membership";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";

persistent actor {
    let accessControlState = AccessControl.initState();
    let membershipState = Membership.initState();

    transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

    public type PlatformRole = Membership.PlatformRole;
    public type CommunityRole = Membership.CommunityRole;
    public type CommunityAccess = Membership.CommunityAccess;

    public type UserProfile = {
        name : Text;
    };

    public type Community = {
        id : Nat;
        name : Text;
        policy : Text;
        admin : Principal;
        members : [Principal];
    };

    public type CommunityMember = {
        principal : Principal;
        role : CommunityRole;
        profile : ?UserProfile;
    };

    public type ProposalState = {
        #active;
        #pendingFinalization;
        #passed;
        #failed;
    };

    public type ProposalOverrides = {
        windowNs : ?Nat;
        quorum : ?Nat;
        passPct : ?Nat;
    };

    public type Proposal = {
        id : Nat;
        title : Text;
        description : Text;
        creator : Principal;
        communityId : Nat;
        yes : Nat;
        no : Nat;
        state : ProposalState;
        startNs : Int;
        endNs : Int;
        quorum : Nat;
        passPct : Nat;
    };

    public type CampaignState = {
        #active;
        #successful;
        #failed;
        #expired;
    };

    public type Campaign = {
        id : Nat;
        title : Text;
        description : Text;
        creator : Principal;
        communityId : Nat;
        goalAmount : Nat;
        deadlineNs : Int;
        state : CampaignState;
        totalRaised : Nat;
        createdNs : Int;
    };

    public type Contribution = {
        contributor : Principal;
        amount : Nat;
        timestampNs : Int;
    };

    public type CampaignUpdate = {
        id : Nat;
        campaignId : Nat;
        creator : Principal;
        content : Text;
        timestampNs : Int;
    };

    var userProfiles = principalMap.empty<UserProfile>();

    var communities = natMap.empty<Community>();
    var nextCommunityId : Nat = 0;

    var proposals = natMap.empty<Proposal>();
    var nextProposalId : Nat = 0;
    var votersByProposal = natMap.empty<[Principal]>();

    var campaigns = natMap.empty<Campaign>();
    var nextCampaignId : Nat = 0;
    var contributionsByCampaign = natMap.empty<[Contribution]>();
    var campaignUpdates = natMap.empty<CampaignUpdate>();
    var nextUpdateId : Nat = 0;

    var configuration : ?Stripe.StripeConfiguration = null;

    func requireAuthenticated(caller : Principal) {
        Membership.requireAuthenticated(caller);
    };

    func getLegacyPlatformAdmins() : [Principal] {
        let adminEntries = Array.filter<(Principal, AccessControl.UserRole)>(
            Iter.toArray(principalMap.entries(accessControlState.userRoles)),
            func((_, role)) {
                switch (role) {
                    case (#admin) { true };
                    case _ { false };
                };
            },
        );

        Array.map<(Principal, AccessControl.UserRole), Principal>(
            adminEntries,
            func((principal, _)) { principal },
        );
    };

    func isLegacyPlatformAdmin(user : Principal) : Bool {
        if (Principal.isAnonymous(user)) {
            return false;
        };

        switch (principalMap.get(accessControlState.userRoles, user)) {
            case (?#admin) { true };
            case _ { false };
        };
    };

    func callerIsPlatformAdmin(caller : Principal) : Bool {
        Membership.isPlatformAdmin(membershipState, caller, isLegacyPlatformAdmin(caller));
    };

    func listEffectivePlatformAdmins() : [Principal] {
        Membership.listPlatformAdmins(membershipState, getLegacyPlatformAdmins());
    };

    func getCommunityOrTrap(communityId : Nat) : Community {
        switch (natMap.get(communities, communityId)) {
            case null { Debug.trap("Community not found") };
            case (?community) { community };
        };
    };

    func getCommunityRoleEntries(communityId : Nat) : [(Principal, CommunityRole)] {
        let community = getCommunityOrTrap(communityId);
        Membership.listCommunityRoleEntries(
            membershipState,
            communityId,
            community.admin,
            community.members,
        );
    };

    func syncCommunityMembersField(communityId : Nat) {
        switch (natMap.get(communities, communityId)) {
            case null {};
            case (?community) {
                let compatibilityMembers = Array.map<(Principal, CommunityRole), Principal>(
                    getCommunityRoleEntries(communityId),
                    func((principal, _)) { principal },
                );

                let updatedCommunity = {
                    community with
                    members = compatibilityMembers;
                };
                communities := natMap.put(communities, communityId, updatedCommunity);
            };
        };
    };

    func ensurePlatformAdminsImported() {
        Membership.importLegacyPlatformAdmins(membershipState, getLegacyPlatformAdmins());
    };

    func ensureCommunityImported(communityId : Nat) : Community {
        let community = getCommunityOrTrap(communityId);
        Membership.importLegacyCommunityRoles(
            membershipState,
            communityId,
            community.admin,
            community.members,
        );
        syncCommunityMembersField(communityId);
        getCommunityOrTrap(communityId);
    };

    func getCommunityAccessForCaller(caller : Principal, communityId : Nat) : CommunityAccess {
        let community = getCommunityOrTrap(communityId);
        Membership.getCommunityAccess(
            membershipState,
            caller,
            communityId,
            isLegacyPlatformAdmin(caller),
            community.admin,
            community.members,
        );
    };

    func requirePlatformAdmin(caller : Principal) {
        requireAuthenticated(caller);
        if (not callerIsPlatformAdmin(caller)) {
            Debug.trap("Unauthorized: Only platform admins can perform this action");
        };
    };

    func requireCommunityCapability(caller : Principal, communityId : Nat, allowed : Bool, message : Text) {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        if (not allowed) {
            Debug.trap(message);
        };
    };

    func resolveCommunityMembers(communityId : Nat) : [CommunityMember] {
        Array.map<(Principal, CommunityRole), CommunityMember>(
            getCommunityRoleEntries(communityId),
            func((principal, role)) {
                {
                    principal;
                    role;
                    profile = principalMap.get(userProfiles, principal);
                };
            },
        );
    };

    public shared ({ caller }) func bootstrapPlatformAdmin() : async () {
        requireAuthenticated(caller);
        if (Array.size(listEffectivePlatformAdmins()) > 0) {
            Debug.trap("Platform admin already configured");
        };
        Membership.bootstrapPlatformAdmin(membershipState, caller);
    };

    public query ({ caller }) func getCallerPlatformRole() : async ?PlatformRole {
        Membership.getCallerPlatformRole(
            membershipState,
            caller,
            isLegacyPlatformAdmin(caller),
        );
    };

    public query ({ caller }) func isCallerPlatformAdmin() : async Bool {
        callerIsPlatformAdmin(caller);
    };

    public query ({ caller }) func listPlatformAdmins() : async [Principal] {
        requireAuthenticated(caller);
        listEffectivePlatformAdmins();
    };

    public shared ({ caller }) func setPlatformAdmin(user : Principal, enabled : Bool) : async () {
        requireAuthenticated(caller);
        ensurePlatformAdminsImported();
        requirePlatformAdmin(caller);

        if (not enabled and Membership.countImportedPlatformAdmins(membershipState) == 1 and Membership.isPlatformAdmin(membershipState, user, false)) {
            Debug.trap("Cannot remove the last platform admin");
        };

        Membership.setPlatformAdmin(membershipState, user, enabled);
    };

    public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
        if (Principal.isAnonymous(caller)) {
            return null;
        };
        principalMap.get(userProfiles, caller);
    };

    public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
        requireAuthenticated(caller);
        principalMap.get(userProfiles, user);
    };

    public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
        requireAuthenticated(caller);
        userProfiles := principalMap.put(userProfiles, caller, profile);
    };

    public query ({ caller }) func listAllUsers() : async [(Principal, UserProfile)] {
        requireAuthenticated(caller);
        Iter.toArray(principalMap.entries(userProfiles));
    };

    public shared ({ caller }) func createCommunity(name : Text, policy : Text) : async () {
        requirePlatformAdmin(caller);

        let communityId = nextCommunityId;
        let community : Community = {
            id = communityId;
            name;
            policy;
            admin = caller;
            members = [caller];
        };

        communities := natMap.put(communities, communityId, community);
        nextCommunityId += 1;

        Membership.setCommunityRole(membershipState, communityId, caller, ?#communityAdmin);
        syncCommunityMembersField(communityId);
    };

    public query ({ caller }) func listCommunities() : async [Community] {
        requireAuthenticated(caller);
        Iter.toArray(natMap.vals(communities));
    };

    public query ({ caller }) func getCommunityById(id : Nat) : async ?Community {
        requireAuthenticated(caller);
        natMap.get(communities, id);
    };

    public query ({ caller }) func getCallerCommunityRole(communityId : Nat) : async ?CommunityRole {
        requireAuthenticated(caller);
        let community = getCommunityOrTrap(communityId);
        Membership.getCallerCommunityRole(
            membershipState,
            caller,
            communityId,
            community.admin,
            community.members,
        );
    };

    public query ({ caller }) func getCommunityAccess(communityId : Nat) : async CommunityAccess {
        requireAuthenticated(caller);
        getCommunityAccessForCaller(caller, communityId);
    };

    public query ({ caller }) func listCommunityMembers(communityId : Nat) : async [CommunityMember] {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        resolveCommunityMembers(communityId);
    };

    public shared ({ caller }) func setCommunityRole(
        communityId : Nat,
        user : Principal,
        role : ?CommunityRole,
    ) : async () {
        requireAuthenticated(caller);
        let community = ensureCommunityImported(communityId);
        let access = Membership.getCommunityAccess(
            membershipState,
            caller,
            communityId,
            false,
            community.admin,
            community.members,
        );

        if (not access.canManageMembership) {
            Debug.trap("Unauthorized: Only platform admins or community admins can manage community membership");
        };

        let currentRole = Membership.getCallerCommunityRole(
            membershipState,
            user,
            communityId,
            community.admin,
            community.members,
        );

        if (user == caller) {
            switch (currentRole, role) {
                case (?#communityAdmin, null) {
                    Debug.trap("Community admins must be demoted or removed by another admin");
                };
                case (?#communityAdmin, ?#member) {
                    Debug.trap("Community admins must be demoted by another admin");
                };
                case _ {};
            };
        };

        Membership.setCommunityRole(membershipState, communityId, user, role);
        syncCommunityMembersField(communityId);
    };

    public shared ({ caller }) func leaveCommunity(communityId : Nat) : async () {
        requireAuthenticated(caller);
        let community = ensureCommunityImported(communityId);
        let currentRole = Membership.getCallerCommunityRole(
            membershipState,
            caller,
            communityId,
            community.admin,
            community.members,
        );

        switch (currentRole) {
            case (?#member) {
                Membership.removeCommunityRole(membershipState, communityId, caller);
                syncCommunityMembersField(communityId);
            };
            case (?#communityAdmin) {
                Debug.trap("Community admins must be demoted or removed by another admin before leaving");
            };
            case null {
                Debug.trap("Not a member of this community");
            };
        };
    };

    public shared ({ caller }) func createProposal(
        communityId : Nat,
        title : Text,
        description : Text,
        overrides : ?ProposalOverrides,
    ) : async () {
        let access = getCommunityAccessForCaller(caller, communityId);
        requireCommunityCapability(
            caller,
            communityId,
            access.canCreateProposal,
            "Unauthorized: Only community participants can create proposals",
        );

        let now = Time.now();
        let defaultWindow = 3_000_000_000_000;
        let defaultQuorum = 1;
        let defaultPassPct = 50;

        let resolvedWindow = switch (overrides) {
            case null { defaultWindow };
            case (?value) {
                switch (value.windowNs) {
                    case null { defaultWindow };
                    case (?windowNs) { windowNs };
                };
            };
        };

        let resolvedQuorum = switch (overrides) {
            case null { defaultQuorum };
            case (?value) {
                switch (value.quorum) {
                    case null { defaultQuorum };
                    case (?quorum) { quorum };
                };
            };
        };

        let resolvedPassPct = switch (overrides) {
            case null { defaultPassPct };
            case (?value) {
                switch (value.passPct) {
                    case null { defaultPassPct };
                    case (?passPct) { passPct };
                };
            };
        };

        let proposal : Proposal = {
            id = nextProposalId;
            title;
            description;
            creator = caller;
            communityId;
            yes = 0;
            no = 0;
            state = #active;
            startNs = now;
            endNs = now + resolvedWindow;
            quorum = resolvedQuorum;
            passPct = resolvedPassPct;
        };

        proposals := natMap.put(proposals, nextProposalId, proposal);
        votersByProposal := natMap.put(votersByProposal, nextProposalId, []);
        nextProposalId += 1;
    };

    public query ({ caller }) func listProposalsByCommunity(communityId : Nat) : async [Proposal] {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        let allProposals = Iter.toArray(natMap.vals(proposals));
        Array.filter<Proposal>(
            allProposals,
            func(proposal) { proposal.communityId == communityId },
        );
    };

    public shared ({ caller }) func voteOnProposal(proposalId : Nat, voteYes : Bool) : async () {
        requireAuthenticated(caller);

        switch (natMap.get(proposals, proposalId)) {
            case null {
                Debug.trap("Proposal not found");
            };
            case (?proposal) {
                let access = getCommunityAccessForCaller(caller, proposal.communityId);
                requireCommunityCapability(
                    caller,
                    proposal.communityId,
                    access.canVoteOnProposal,
                    "Unauthorized: Only community participants can vote on proposals",
                );

                let now = Time.now();
                if (now < proposal.startNs) {
                    Debug.trap("Voting has not started yet");
                };
                if (now > proposal.endNs) {
                    Debug.trap("Voting window has closed");
                };

                switch (natMap.get(votersByProposal, proposalId)) {
                    case null {
                        Debug.trap("Voter tracking not initialized for this proposal");
                    };
                    case (?voterList) {
                        if (Array.find<Principal>(voterList, func(voter) { voter == caller }) != null) {
                            Debug.trap("You have already voted on this proposal");
                        };

                        let updatedVoterList = Array.append(voterList, [caller]);
                        votersByProposal := natMap.put(votersByProposal, proposalId, updatedVoterList);

                        let updatedProposal = if (voteYes) {
                            {
                                proposal with
                                yes = proposal.yes + 1;
                            };
                        } else {
                            {
                                proposal with
                                no = proposal.no + 1;
                            };
                        };
                        proposals := natMap.put(proposals, proposalId, updatedProposal);
                    };
                };
            };
        };
    };

    public shared ({ caller }) func finalizeProposal(proposalId : Nat) : async () {
        requireAuthenticated(caller);

        switch (natMap.get(proposals, proposalId)) {
            case null {
                Debug.trap("Proposal not found");
            };
            case (?proposal) {
                let access = getCommunityAccessForCaller(caller, proposal.communityId);
                requireCommunityCapability(
                    caller,
                    proposal.communityId,
                    access.canVoteOnProposal,
                    "Unauthorized: Only community participants can finalize proposals",
                );

                let now = Time.now();
                if (now <= proposal.endNs) {
                    Debug.trap("Voting window is still open");
                };

                if (proposal.state != #active) {
                    Debug.trap("Proposal is not in active state");
                };

                let totalVotes = proposal.yes + proposal.no;
                let passThreshold = if (totalVotes == 0) {
                    0;
                } else {
                    (proposal.yes * 100) / totalVotes;
                };

                let newState = if (totalVotes >= proposal.quorum and totalVotes > 0 and passThreshold >= proposal.passPct) {
                    #passed;
                } else {
                    #failed;
                };

                let updatedProposal = {
                    proposal with
                    state = newState;
                };
                proposals := natMap.put(proposals, proposalId, updatedProposal);
            };
        };
    };

    public query ({ caller }) func getProposalById(proposalId : Nat) : async ?Proposal {
        requireAuthenticated(caller);
        natMap.get(proposals, proposalId);
    };

    public shared ({ caller }) func createCampaign(
        communityId : Nat,
        title : Text,
        description : Text,
        goalAmount : Nat,
        deadlineNs : Int,
    ) : async () {
        let access = getCommunityAccessForCaller(caller, communityId);
        requireCommunityCapability(
            caller,
            communityId,
            access.canCreateCampaign,
            "Unauthorized: Only community participants can create campaigns",
        );

        let now = Time.now();
        let campaign : Campaign = {
            id = nextCampaignId;
            title;
            description;
            creator = caller;
            communityId;
            goalAmount;
            deadlineNs;
            state = #active;
            totalRaised = 0;
            createdNs = now;
        };

        campaigns := natMap.put(campaigns, nextCampaignId, campaign);
        contributionsByCampaign := natMap.put(contributionsByCampaign, nextCampaignId, []);
        nextCampaignId += 1;
    };

    public query ({ caller }) func listCampaignsByCommunity(communityId : Nat) : async [Campaign] {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        let allCampaigns = Iter.toArray(natMap.vals(campaigns));
        Array.filter<Campaign>(
            allCampaigns,
            func(campaign) { campaign.communityId == communityId },
        );
    };

    public shared ({ caller }) func contributeToCampaign(campaignId : Nat, amount : Nat) : async () {
        requireAuthenticated(caller);

        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                let access = getCommunityAccessForCaller(caller, campaign.communityId);
                requireCommunityCapability(
                    caller,
                    campaign.communityId,
                    access.canContributeToCampaign,
                    "Unauthorized: Only community participants can contribute to campaigns",
                );

                let now = Time.now();
                if (now > campaign.deadlineNs) {
                    Debug.trap("Campaign deadline has passed");
                };
                if (campaign.state != #active) {
                    Debug.trap("Campaign is not active");
                };

                switch (natMap.get(contributionsByCampaign, campaignId)) {
                    case null {
                        Debug.trap("Contribution tracking not initialized for this campaign");
                    };
                    case (?contributions) {
                        let contribution : Contribution = {
                            contributor = caller;
                            amount;
                            timestampNs = now;
                        };

                        let updatedContributions = Array.append(contributions, [contribution]);
                        contributionsByCampaign := natMap.put(contributionsByCampaign, campaignId, updatedContributions);

                        let updatedCampaign = {
                            campaign with
                            totalRaised = campaign.totalRaised + amount;
                        };
                        campaigns := natMap.put(campaigns, campaignId, updatedCampaign);
                    };
                };
            };
        };
    };

    public shared ({ caller }) func addCampaignUpdate(campaignId : Nat, content : Text) : async () {
        requireAuthenticated(caller);

        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                let access = getCommunityAccessForCaller(caller, campaign.communityId);
                requireCommunityCapability(
                    caller,
                    campaign.communityId,
                    access.canCreateCampaign,
                    "Unauthorized: Only community participants can update campaigns",
                );

                if (campaign.creator != caller) {
                    Debug.trap("Only campaign creators can add updates");
                };

                let now = Time.now();
                let update : CampaignUpdate = {
                    id = nextUpdateId;
                    campaignId;
                    creator = caller;
                    content;
                    timestampNs = now;
                };

                campaignUpdates := natMap.put(campaignUpdates, nextUpdateId, update);
                nextUpdateId += 1;
            };
        };
    };

    public query ({ caller }) func getCampaignUpdates(campaignId : Nat) : async [CampaignUpdate] {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap((switch (natMap.get(campaigns, campaignId)) {
            case null { Debug.trap("Campaign not found") };
            case (?campaign) { campaign.communityId };
        }));
        let allUpdates = Iter.toArray(natMap.vals(campaignUpdates));
        Array.filter<CampaignUpdate>(
            allUpdates,
            func(update) { update.campaignId == campaignId },
        );
    };

    public query ({ caller }) func getCampaignById(campaignId : Nat) : async ?Campaign {
        requireAuthenticated(caller);
        natMap.get(campaigns, campaignId);
    };

    public query ({ caller }) func getCampaignContributions(campaignId : Nat) : async [Contribution] {
        requireAuthenticated(caller);
        switch (natMap.get(campaigns, campaignId)) {
            case null { Debug.trap("Campaign not found") };
            case (?_) {};
        };
        switch (natMap.get(contributionsByCampaign, campaignId)) {
            case null { [] };
            case (?contributions) { contributions };
        };
    };

    public shared ({ caller }) func finalizeCampaign(campaignId : Nat) : async () {
        requireAuthenticated(caller);

        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                if (campaign.creator != caller) {
                    Debug.trap("Only the campaign creator can finalize the campaign");
                };

                if (campaign.state != #active) {
                    Debug.trap("Campaign is not in active state");
                };

                if (campaign.totalRaised < campaign.goalAmount) {
                    Debug.trap("Campaign goal has not been reached yet");
                };

                let updatedCampaign = {
                    campaign with
                    state = #successful;
                };
                campaigns := natMap.put(campaigns, campaignId, updatedCampaign);
            };
        };
    };

    public query ({ caller }) func canFinalizeCampaign(campaignId : Nat) : async Bool {
        requireAuthenticated(caller);

        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                if (campaign.creator != caller) {
                    return false;
                };

                if (campaign.state == #active and campaign.totalRaised >= campaign.goalAmount) {
                    return true;
                };

                false;
            };
        };
    };

    public query ({ caller }) func isStripeConfigured() : async Bool {
        requireAuthenticated(caller);
        configuration != null;
    };

    public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
        requirePlatformAdmin(caller);
        configuration := ?config;
    };

    func getStripeConfiguration() : Stripe.StripeConfiguration {
        switch (configuration) {
            case null { Debug.trap("Stripe needs to be first configured") };
            case (?value) { value };
        };
    };

    public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
        requireAuthenticated(caller);
        await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
    };

    public shared ({ caller }) func createCheckoutSession(
        items : [Stripe.ShoppingItem],
        successUrl : Text,
        cancelUrl : Text,
    ) : async Text {
        requireAuthenticated(caller);
        await Stripe.createCheckoutSession(
            getStripeConfiguration(),
            caller,
            items,
            successUrl,
            cancelUrl,
            transform,
        );
    };

    public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
        OutCall.transform(input);
    };
}
