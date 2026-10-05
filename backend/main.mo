import Prim "mo:prim";
import AccessControl "authorization/access-control";
import Membership "authorization/membership";
import Workspace "workspace/workspace";
import Blob "mo:base/Blob";
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
    let workspaceState = Workspace.initState();
    var boardPublicLinks : [Workspace.CommunityBoardPublicLink] = [];
    var eventPublicLinks : [Workspace.CommunityEventPublicLink] = [];

    transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

    public type PlatformRole = Membership.PlatformRole;
    public type CommunityRole = Membership.CommunityRole;
    public type CommunityAccess = Membership.CommunityAccess;
    public type WorkspaceRole = Workspace.WorkspaceRole;
    public type WorkspaceAccessEntry = Workspace.WorkspaceAccessEntry;
    public type CommunityDocumentSummary = Workspace.CommunityDocumentSummary;
    public type CommunityDocumentPayload = Workspace.CommunityDocumentPayload;
    public type KanbanColumn = Workspace.KanbanColumn;
    public type KanbanCardInput = Workspace.KanbanCardInput;
    public type KanbanCard = Workspace.KanbanCard;
    public type CommunityBoardPublicLink = Workspace.CommunityBoardPublicLink;
    public type CommunityBoardSummary = Workspace.CommunityBoardSummary;
    public type CommunityBoardPayload = Workspace.CommunityBoardPayload;
    public type CommunityEventPublicLink = Workspace.CommunityEventPublicLink;
    public type CommunityEventInput = Workspace.CommunityEventInput;
    public type CommunityEventPayload = Workspace.CommunityEventPayload;

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

    public type CampaignVisibility = {
        #community;
        #publicCampaign;
    };

    public type FundraisingCampaignInput = {
        title : Text;
        shortDescription : Text;
        story : Text;
        fundsUse : Text;
        impact : Text;
        mediaUrl : ?Text;
        creatorName : Text;
        creatorContact : ?Text;
        currency : Text;
        goalAmount : Nat;
        deadlineNs : Int;
        visibility : CampaignVisibility;
    };

    public type ProposalExecutionState = {
        #notApplicable;
        #pending;
        #applied;
        #failed : Text;
    };

    public type RoleChangeProposalInput = {
        target : Principal;
        role : ?CommunityRole;
        reason : Text;
    };

    public type ProposalBody = {
        #motion : { description : Text };
        #fundraising : FundraisingCampaignInput;
        #roleChange : RoleChangeProposalInput;
    };

    public type ProposalLinkedResource = {
        #campaign : Nat;
        #communityRole : Principal;
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
        body : ProposalBody;
        executionState : ProposalExecutionState;
        linkedResource : ?ProposalLinkedResource;
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

    public type CampaignMetadata = {
        campaignId : Nat;
        shortDescription : Text;
        story : Text;
        fundsUse : Text;
        impact : Text;
        mediaUrl : ?Text;
        creatorName : Text;
        creatorContact : ?Text;
        visibility : CampaignVisibility;
        archived : Bool;
        updatedNs : Int;
    };

    public type CampaignPublicLink = {
        campaignId : Nat;
        token : Text;
    };

    public type CampaignContributionPayload = {
        amount : Nat;
        timestampNs : Int;
        contributorName : Text;
    };

    public type CampaignUpdatePayload = {
        id : Nat;
        campaignId : Nat;
        creatorName : Text;
        content : Text;
        timestampNs : Int;
    };

    public type FundraisingCampaignPayload = {
        id : Nat;
        title : Text;
        shortDescription : Text;
        story : Text;
        fundsUse : Text;
        impact : Text;
        mediaUrl : ?Text;
        creator : ?Principal;
        creatorName : Text;
        creatorContact : ?Text;
        communityId : Nat;
        currency : Text;
        goalAmount : Nat;
        deadlineNs : Int;
        state : CampaignState;
        totalRaised : Nat;
        createdNs : Int;
        updatedNs : Int;
        visibility : CampaignVisibility;
        archived : Bool;
        publicToken : ?Text;
        canEdit : Bool;
        canContribute : Bool;
        canManagePublicLink : Bool;
        contributions : [CampaignContributionPayload];
        updates : [CampaignUpdatePayload];
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
    var campaignMetadataByCampaign = natMap.empty<CampaignMetadata>();
    var campaignCurrencyByCampaign = natMap.empty<Text>();
    var campaignPublicLinks : [CampaignPublicLink] = [];
    var nextUpdateId : Nat = 0;

    var configuration : ?Stripe.StripeConfiguration = null;

    let MAX_CAMPAIGN_TITLE_SIZE : Nat = 160;
    let MAX_CAMPAIGN_SHORT_DESCRIPTION_SIZE : Nat = 240;
    let MAX_CAMPAIGN_STORY_SIZE : Nat = 8_000;
    let MAX_CAMPAIGN_METADATA_SIZE : Nat = 2_000;
    let MAX_CAMPAIGN_MEDIA_URL_SIZE : Nat = 1_000;
    let MAX_CAMPAIGN_CREATOR_SIZE : Nat = 240;
    let MIN_PUBLIC_TOKEN_SIZE : Nat = 32;
    let MAX_PUBLIC_TOKEN_SIZE : Nat = 160;
    let NANOSECONDS_PER_SECOND : Nat = 1_000_000_000;
    let MIN_PROPOSAL_WINDOW_NS : Nat = 5 * 60 * NANOSECONDS_PER_SECOND;
    let DEFAULT_PROPOSAL_WINDOW_NS : Nat = 3 * 24 * 60 * 60 * NANOSECONDS_PER_SECOND;
    let MAX_PROPOSAL_WINDOW_NS : Nat = 30 * 24 * 60 * 60 * NANOSECONDS_PER_SECOND;
    let DEFAULT_CAMPAIGN_CURRENCY : Text = "NZD";
    let SUPPORTED_CAMPAIGN_CURRENCIES : [Text] = ["NZD", "USD", "EUR", "GBP", "AUD", "CAD", "JPY"];

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

    func getWorkspaceAccessForCaller(caller : Principal, communityId : Nat) : Workspace.CallerAccess {
        if(Array.find<CommissionGroup>(commissionGroups,func(g){g.id==communityId})!=null and not capable(caller,communityId,"workspace")) Debug.trap("Workspace capability required");
        let access = getCommunityAccessForCaller(caller, communityId);
        {
            communityRole = access.communityRole;
            isPlatformAdmin = access.isPlatformAdmin;
        };
    };

    func getCommunityRoleForPrincipal(user : Principal, communityId : Nat) : ?CommunityRole {
        let community = ensureCommunityImported(communityId);
        Membership.getCallerCommunityRole(
            membershipState,
            user,
            communityId,
            community.admin,
            community.members,
        );
    };

    func isAssignedCommunityParticipant(user : Principal, communityId : Nat) : Bool {
        if (Principal.isAnonymous(user)) {
            return false;
        };
        switch (getCommunityRoleForPrincipal(user, communityId)) {
            case (?_) true;
            case null false;
        };
    };

    func validateWorkspaceAssignees(communityId : Nat, input : KanbanCardInput) {
        for (assignee in input.assignedTo.vals()) {
            if (not isAssignedCommunityParticipant(assignee, communityId)) {
                Debug.trap("Card assignees must be current members of this community");
            };
        };
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

    func isCommunityAdmin(access : CommunityAccess) : Bool {
        switch (access.communityRole) {
            case (?#communityAdmin) true;
            case _ false;
        };
    };

    func canManageCampaign(caller : Principal, campaign : Campaign, access : CommunityAccess) : Bool {
        campaign.creator == caller or access.isPlatformAdmin or isCommunityAdmin(access);
    };

    func requireDirectCampaignLaunchAccess(caller : Principal, communityId : Nat) : CommunityAccess {
        let access = getCommunityAccessForCaller(caller, communityId);
        requireCommunityCapability(
            caller,
            communityId,
            access.isPlatformAdmin or isCommunityAdmin(access),
            "Unauthorized: Only community admins or platform admins can launch campaigns directly",
        );
        access;
    };

    func getCampaignOrTrap(campaignId : Nat) : Campaign {
        switch (natMap.get(campaigns, campaignId)) {
            case null { Debug.trap("Campaign not found") };
            case (?campaign) { campaign };
        };
    };

    func campaignPublicTokenFor(campaignId : Nat) : ?Text {
        for (link in campaignPublicLinks.vals()) {
            if (link.campaignId == campaignId) {
                return ?link.token;
            };
        };
        null;
    };

    func campaignPublicTokenAlreadyUsed(campaignId : Nat, token : Text) : Bool {
        for (link in campaignPublicLinks.vals()) {
            if (link.campaignId != campaignId and link.token == token) {
                return true;
            };
        };
        false;
    };

    func setCampaignPublicToken(campaignId : Nat, token : ?Text) : [CampaignPublicLink] {
        var nextLinks = Array.filter<CampaignPublicLink>(
            campaignPublicLinks,
            func(link) { link.campaignId != campaignId },
        );
        switch (token) {
            case null {};
            case (?value) {
                nextLinks := Array.append(nextLinks, [{ campaignId; token = value }]);
            };
        };
        nextLinks;
    };

    func campaignIsArchived(campaignId : Nat) : Bool {
        switch (natMap.get(campaignMetadataByCampaign, campaignId)) {
            case (?metadata) metadata.archived;
            case null false;
        };
    };

    func principalDisplayName(user : Principal, fallback : Text) : Text {
        switch (principalMap.get(userProfiles, user)) {
            case (?profile) {
                if (Text.size(profile.name) > 0) {
                    profile.name;
                } else {
                    fallback;
                };
            };
            case null { fallback };
        };
    };

    func getCampaignMetadata(campaign : Campaign) : CampaignMetadata {
        switch (natMap.get(campaignMetadataByCampaign, campaign.id)) {
            case (?metadata) metadata;
            case null {
                {
                    campaignId = campaign.id;
                    shortDescription = campaign.description;
                    story = campaign.description;
                    fundsUse = "";
                    impact = "";
                    mediaUrl = null;
                    creatorName = principalDisplayName(campaign.creator, "Campaign creator");
                    creatorContact = null;
                    visibility = #community;
                    archived = false;
                    updatedNs = campaign.createdNs;
                };
            };
        };
    };

    func getCampaignCurrency(campaignId : Nat) : Text {
        switch (natMap.get(campaignCurrencyByCampaign, campaignId)) {
            case (?currency) currency;
            case null DEFAULT_CAMPAIGN_CURRENCY;
        };
    };

    func validateRequiredText(value : Text, maxSize : Nat, fieldLabel : Text) {
        let size = Text.size(value);
        if (size == 0 or size > maxSize) {
            Debug.trap(fieldLabel # " must be between 1 and " # Nat.toText(maxSize) # " characters");
        };
    };

    func validateOptionalText(value : ?Text, maxSize : Nat, fieldLabel : Text) {
        switch (value) {
            case null {};
            case (?text) {
                if (Text.size(text) > maxSize) {
                    Debug.trap(fieldLabel # " is too large");
                };
            };
        };
    };

    func validatePublicToken(token : Text) {
        let size = Text.size(token);
        if (size < MIN_PUBLIC_TOKEN_SIZE or size > MAX_PUBLIC_TOKEN_SIZE) {
            Debug.trap("Public link token must be between 32 and 160 characters");
        };
    };

    func validateMediaUrl(value : ?Text) {
        validateOptionalText(value, MAX_CAMPAIGN_MEDIA_URL_SIZE, "Campaign media URL");
        switch (value) {
            case null {};
            case (?url) {
                if (Text.size(url) > 0 and not (Text.contains(url, #text "://") or Text.contains(url, #char '/'))) {
                    Debug.trap("Campaign media URL must be a URL or path");
                };
            };
        };
    };

    func validateCampaignCurrency(currency : Text) {
        let supported = Array.find<Text>(
            SUPPORTED_CAMPAIGN_CURRENCIES,
            func(candidate) { candidate == currency },
        );
        switch (supported) {
            case null Debug.trap("Unsupported campaign currency");
            case (?_) {};
        };
    };

    func validateCampaignInput(input : FundraisingCampaignInput) {
        validateRequiredText(input.title, MAX_CAMPAIGN_TITLE_SIZE, "Campaign title");
        validateRequiredText(input.shortDescription, MAX_CAMPAIGN_SHORT_DESCRIPTION_SIZE, "Campaign short description");
        validateRequiredText(input.story, MAX_CAMPAIGN_STORY_SIZE, "Campaign story");
        validateRequiredText(input.creatorName, MAX_CAMPAIGN_CREATOR_SIZE, "Campaign creator name");
        validateOptionalText(?input.fundsUse, MAX_CAMPAIGN_METADATA_SIZE, "Funds use");
        validateOptionalText(?input.impact, MAX_CAMPAIGN_METADATA_SIZE, "Campaign impact");
        validateOptionalText(input.creatorContact, MAX_CAMPAIGN_CREATOR_SIZE, "Campaign creator contact");
        validateMediaUrl(input.mediaUrl);
        validateCampaignCurrency(input.currency);
        if (input.goalAmount == 0) {
            Debug.trap("Campaign goal amount must be greater than zero");
        };
        if (input.deadlineNs <= Time.now()) {
            Debug.trap("Campaign deadline must be in the future");
        };
    };

    func proposalBodyDescription(body : ProposalBody) : Text {
        switch (body) {
            case (#motion(value)) { value.description };
            case (#fundraising(input)) { input.story };
            case (#roleChange(input)) { input.reason };
        };
    };

    func initialProposalExecutionState(body : ProposalBody) : ProposalExecutionState {
        switch (body) {
            case (#motion(_)) { #notApplicable };
            case _ { #pending };
        };
    };

    func resolveProposalGovernance(overrides : ?ProposalOverrides) : (Nat, Nat, Nat) {
        let defaultWindow = DEFAULT_PROPOSAL_WINDOW_NS;
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

        if (resolvedWindow < MIN_PROPOSAL_WINDOW_NS) {
            Debug.trap("Voting window must be at least 5 minutes");
        };
        if (resolvedWindow > MAX_PROPOSAL_WINDOW_NS) {
            Debug.trap("Voting window must be 30 days or less");
        };
        if (resolvedQuorum == 0) {
            Debug.trap("Proposal quorum must be at least one vote");
        };
        if (resolvedPassPct == 0 or resolvedPassPct > 100) {
            Debug.trap("Proposal pass threshold must be between 1 and 100 percent");
        };

        (resolvedWindow, resolvedQuorum, resolvedPassPct);
    };

    func validateRoleChangeProposalInput(communityId : Nat, input : RoleChangeProposalInput) {
        ignore getCommunityOrTrap(communityId);
        if (Principal.isAnonymous(input.target)) {
            Debug.trap("Role change target cannot be anonymous");
        };
        validateRequiredText(input.reason, MAX_CAMPAIGN_METADATA_SIZE, "Role change reason");
    };

    func createCampaignFromInput(creator : Principal, communityId : Nat, input : FundraisingCampaignInput) : Nat {
        validateCampaignInput(input);

        let now = Time.now();
        let campaignId = nextCampaignId;
        let campaign : Campaign = {
            id = campaignId;
            title = input.title;
            description = input.story;
            creator;
            communityId;
            goalAmount = input.goalAmount;
            deadlineNs = input.deadlineNs;
            state = #active;
            totalRaised = 0;
            createdNs = now;
        };
        let metadata : CampaignMetadata = {
            campaignId;
            shortDescription = input.shortDescription;
            story = input.story;
            fundsUse = input.fundsUse;
            impact = input.impact;
            mediaUrl = input.mediaUrl;
            creatorName = input.creatorName;
            creatorContact = input.creatorContact;
            visibility = input.visibility;
            archived = false;
            updatedNs = now;
        };

        campaigns := natMap.put(campaigns, campaignId, campaign);
        campaignMetadataByCampaign := natMap.put(campaignMetadataByCampaign, campaignId, metadata);
        campaignCurrencyByCampaign := natMap.put(campaignCurrencyByCampaign, campaignId, input.currency);
        contributionsByCampaign := natMap.put(contributionsByCampaign, campaignId, []);
        nextCampaignId += 1;
        campaignId;
    };

    func wouldRemoveLastCommunityAdmin(communityId : Nat, target : Principal, nextRole : ?CommunityRole) : Bool {
        let currentRole = getCommunityRoleForPrincipal(target, communityId);
        let targetIsAdmin = switch (currentRole) {
            case (?#communityAdmin) { true };
            case _ { false };
        };
        let removesAdmin = switch (nextRole) {
            case null { true };
            case (?#member) { true };
            case (?#communityAdmin) { false };
        };
        if (not targetIsAdmin or not removesAdmin) {
            return false;
        };

        var adminCount : Nat = 0;
        for ((_, role) in getCommunityRoleEntries(communityId).vals()) {
            switch (role) {
                case (#communityAdmin) { adminCount += 1 };
                case _ {};
            };
        };
        adminCount <= 1;
    };

    func applyRoleChangeProposal(communityId : Nat, input : RoleChangeProposalInput) : ?Text {
        ignore ensureCommunityImported(communityId);
        if (Principal.isAnonymous(input.target)) {
            return ?"Role change target cannot be anonymous";
        };
        if (wouldRemoveLastCommunityAdmin(communityId, input.target, input.role)) {
            return ?"Cannot remove the last community admin";
        };

        Membership.setCommunityRole(membershipState, communityId, input.target, input.role);
        syncCommunityMembersField(communityId);
        null;
    };

    func createProposalRecord(
        caller : Principal,
        communityId : Nat,
        title : Text,
        body : ProposalBody,
        overrides : ?ProposalOverrides,
    ) : Nat {
        let access = getCommunityAccessForCaller(caller, communityId);
        requireCommunityCapability(
            caller,
            communityId,
            access.canCreateProposal,
            "Unauthorized: Only community participants can create proposals",
        );

        validateRequiredText(title, MAX_CAMPAIGN_TITLE_SIZE, "Proposal title");
        switch (body) {
            case (#motion(value)) {
                validateRequiredText(value.description, MAX_CAMPAIGN_STORY_SIZE, "Proposal description");
            };
            case (#fundraising(input)) {
                validateCampaignInput(input);
            };
            case (#roleChange(input)) {
                validateRoleChangeProposalInput(communityId, input);
            };
        };

        let now = Time.now();
        let (resolvedWindow, resolvedQuorum, resolvedPassPct) = resolveProposalGovernance(overrides);
        let proposalId = nextProposalId;
        let proposal : Proposal = {
            id = proposalId;
            title;
            description = proposalBodyDescription(body);
            creator = caller;
            communityId;
            yes = 0;
            no = 0;
            state = #active;
            startNs = now;
            endNs = now + resolvedWindow;
            quorum = resolvedQuorum;
            passPct = resolvedPassPct;
            body;
            executionState = initialProposalExecutionState(body);
            linkedResource = null;
        };

        proposals := natMap.put(proposals, proposalId, proposal);
        votersByProposal := natMap.put(votersByProposal, proposalId, []);
        nextProposalId += 1;
        proposalId;
    };

    func toCampaignContributionPayload(contribution : Contribution, publicView : Bool) : CampaignContributionPayload {
        {
            amount = contribution.amount;
            timestampNs = contribution.timestampNs;
            contributorName = if (publicView) {
                "Community supporter";
            } else {
                principalDisplayName(contribution.contributor, "Community supporter");
            };
        };
    };

    func campaignContributionPayloads(campaignId : Nat, publicView : Bool) : [CampaignContributionPayload] {
        switch (natMap.get(contributionsByCampaign, campaignId)) {
            case null { [] };
            case (?contributions) {
                Array.map<Contribution, CampaignContributionPayload>(
                    contributions,
                    func(contribution) { toCampaignContributionPayload(contribution, publicView) },
                );
            };
        };
    };

    func campaignUpdatePayloads(campaignId : Nat, publicView : Bool) : [CampaignUpdatePayload] {
        let allUpdates = Iter.toArray(natMap.vals(campaignUpdates));
        let matchingUpdates = Array.filter<CampaignUpdate>(
            allUpdates,
            func(update) { update.campaignId == campaignId },
        );
        Array.map<CampaignUpdate, CampaignUpdatePayload>(
            matchingUpdates,
            func(update) {
                {
                    id = update.id;
                    campaignId = update.campaignId;
                    creatorName = if (publicView) {
                        "Campaign team";
                    } else {
                        principalDisplayName(update.creator, "Campaign team");
                    };
                    content = update.content;
                    timestampNs = update.timestampNs;
                };
            },
        );
    };

    func toFundraisingCampaignPayload(
        campaign : Campaign,
        caller : ?Principal,
        access : ?CommunityAccess,
        includePublicToken : Bool,
        publicView : Bool,
    ) : FundraisingCampaignPayload {
        let metadata = getCampaignMetadata(campaign);
        let editable = switch (caller, access) {
            case (?user, ?callerAccess) { canManageCampaign(user, campaign, callerAccess) };
            case _ false;
        };
        let owner = switch (caller) {
            case (?user) { campaign.creator == user };
            case null false;
        };
        let canContribute = switch (access) {
            case (?callerAccess) {
                callerAccess.canContributeToCampaign and campaign.state == #active and not metadata.archived and Time.now() <= campaign.deadlineNs;
            };
            case null false;
        };
        {
            id = campaign.id;
            title = campaign.title;
            shortDescription = metadata.shortDescription;
            story = metadata.story;
            fundsUse = metadata.fundsUse;
            impact = metadata.impact;
            mediaUrl = metadata.mediaUrl;
            creator = if (publicView) null else ?campaign.creator;
            creatorName = metadata.creatorName;
            creatorContact = metadata.creatorContact;
            communityId = campaign.communityId;
            currency = getCampaignCurrency(campaign.id);
            goalAmount = campaign.goalAmount;
            deadlineNs = campaign.deadlineNs;
            state = campaign.state;
            totalRaised = campaign.totalRaised;
            createdNs = campaign.createdNs;
            updatedNs = metadata.updatedNs;
            visibility = metadata.visibility;
            archived = metadata.archived;
            publicToken = if (includePublicToken) campaignPublicTokenFor(campaign.id) else null;
            canEdit = editable;
            canContribute;
            canManagePublicLink = owner;
            contributions = campaignContributionPayloads(campaign.id, publicView);
            updates = campaignUpdatePayloads(campaign.id, publicView);
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
        ignore createProposalRecord(caller, communityId, title, #motion({ description }), overrides);
    };

    public shared ({ caller }) func createMotionProposal(
        communityId : Nat,
        title : Text,
        description : Text,
        overrides : ?ProposalOverrides,
    ) : async Nat {
        createProposalRecord(caller, communityId, title, #motion({ description }), overrides);
    };

    public shared ({ caller }) func createFundraisingProposal(
        communityId : Nat,
        input : FundraisingCampaignInput,
        overrides : ?ProposalOverrides,
    ) : async Nat {
        createProposalRecord(caller, communityId, input.title, #fundraising(input), overrides);
    };

    public shared ({ caller }) func createRoleChangeProposal(
        communityId : Nat,
        title : Text,
        input : RoleChangeProposalInput,
        overrides : ?ProposalOverrides,
    ) : async Nat {
        createProposalRecord(caller, communityId, title, #roleChange(input), overrides);
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
                    return;
                };

                let totalVotes = proposal.yes + proposal.no;
                let passThreshold = if (totalVotes == 0) {
                    0;
                } else {
                    (proposal.yes * 100) / totalVotes;
                };

                let passed = totalVotes >= proposal.quorum and totalVotes > 0 and passThreshold >= proposal.passPct;

                let updatedProposal = if (passed) {
                    switch (proposal.body) {
                        case (#motion(_)) {
                            {
                                proposal with
                                state = #passed;
                                executionState = #notApplicable;
                            };
                        };
                        case (#fundraising(input)) {
                            switch (proposal.linkedResource) {
                                case (?#campaign(_)) {
                                    {
                                        proposal with
                                        state = #passed;
                                        executionState = #applied;
                                    };
                                };
                                case _ {
                                    if (input.deadlineNs <= Time.now()) {
                                        {
                                            proposal with
                                            state = #passed;
                                            executionState = #failed("Campaign deadline has passed before launch");
                                        };
                                    } else {
                                        let campaignId = createCampaignFromInput(proposal.creator, proposal.communityId, input);
                                        {
                                            proposal with
                                            state = #passed;
                                            executionState = #applied;
                                            linkedResource = ?#campaign(campaignId);
                                        };
                                    };
                                };
                            };
                        };
                        case (#roleChange(input)) {
                            switch (proposal.linkedResource) {
                                case (?#communityRole(_)) {
                                    {
                                        proposal with
                                        state = #passed;
                                        executionState = #applied;
                                    };
                                };
                                case _ {
                                    switch (applyRoleChangeProposal(proposal.communityId, input)) {
                                        case null {
                                            {
                                                proposal with
                                                state = #passed;
                                                executionState = #applied;
                                                linkedResource = ?#communityRole(input.target);
                                            };
                                        };
                                        case (?message) {
                                            {
                                                proposal with
                                                state = #passed;
                                                executionState = #failed(message);
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                } else {
                    {
                        proposal with
                        state = #failed;
                        executionState = #notApplicable;
                    };
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
        ignore requireDirectCampaignLaunchAccess(caller, communityId);

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

    public shared ({ caller }) func createFundraisingCampaign(
        communityId : Nat,
        input : FundraisingCampaignInput,
    ) : async Nat {
        ignore requireDirectCampaignLaunchAccess(caller, communityId);
        createCampaignFromInput(caller, communityId, input);
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

    public query ({ caller }) func listFundraisingCampaigns(communityId : Nat) : async [FundraisingCampaignPayload] {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        let access = getCommunityAccessForCaller(caller, communityId);
        var visible : [FundraisingCampaignPayload] = [];
        for (campaign in natMap.vals(campaigns)) {
            if (campaign.communityId == communityId) {
                let metadata = getCampaignMetadata(campaign);
                if (not metadata.archived or canManageCampaign(caller, campaign, access)) {
                    visible := Array.append(
                        visible,
                        [toFundraisingCampaignPayload(campaign, ?caller, ?access, campaign.creator == caller, false)],
                    );
                };
            };
        };
        visible;
    };

    public query ({ caller }) func getFundraisingCampaign(communityId : Nat, campaignId : Nat) : async ?FundraisingCampaignPayload {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        let access = getCommunityAccessForCaller(caller, communityId);
        switch (natMap.get(campaigns, campaignId)) {
            case null null;
            case (?campaign) {
                if (campaign.communityId != communityId) {
                    null;
                } else {
                    let metadata = getCampaignMetadata(campaign);
                    if (metadata.archived and not canManageCampaign(caller, campaign, access)) {
                        null;
                    } else {
                        ?toFundraisingCampaignPayload(campaign, ?caller, ?access, campaign.creator == caller, false);
                    };
                };
            };
        };
    };

    public query func getPublicCampaign(token : Text) : async ?FundraisingCampaignPayload {
        validatePublicToken(token);
        for (link in campaignPublicLinks.vals()) {
            if (link.token == token) {
                switch (natMap.get(campaigns, link.campaignId)) {
                    case null { return null };
                    case (?campaign) {
                        let metadata = getCampaignMetadata(campaign);
                        let isPublic = switch (metadata.visibility) {
                            case (#publicCampaign) true;
                            case (_) false;
                        };
                        if (metadata.archived or not isPublic) {
                            return null;
                        };
                        return ?toFundraisingCampaignPayload(campaign, null, null, false, true);
                    };
                };
            };
        };
        null;
    };

    public shared ({ caller }) func updateFundraisingCampaign(
        communityId : Nat,
        campaignId : Nat,
        input : FundraisingCampaignInput,
    ) : async () {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        validateCampaignInput(input);
        let access = getCommunityAccessForCaller(caller, communityId);
        let campaign = getCampaignOrTrap(campaignId);
        if (campaign.communityId != communityId) {
            Debug.trap("Campaign not found in this community");
        };
        if (not canManageCampaign(caller, campaign, access)) {
            Debug.trap("Only campaign creators and community admins can edit campaigns");
        };
        let now = Time.now();
        campaigns := natMap.put(
            campaigns,
            campaignId,
            {
                campaign with
                title = input.title;
                description = input.story;
                goalAmount = input.goalAmount;
                deadlineNs = input.deadlineNs;
            },
        );
        campaignMetadataByCampaign := natMap.put(
            campaignMetadataByCampaign,
            campaignId,
            {
                campaignId;
                shortDescription = input.shortDescription;
                story = input.story;
                fundsUse = input.fundsUse;
                impact = input.impact;
                mediaUrl = input.mediaUrl;
                creatorName = input.creatorName;
                creatorContact = input.creatorContact;
                visibility = input.visibility;
                archived = getCampaignMetadata(campaign).archived;
                updatedNs = now;
            },
        );
        campaignCurrencyByCampaign := natMap.put(campaignCurrencyByCampaign, campaignId, input.currency);
    };

    public shared ({ caller }) func archiveCampaign(communityId : Nat, campaignId : Nat) : async () {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        let access = getCommunityAccessForCaller(caller, communityId);
        let campaign = getCampaignOrTrap(campaignId);
        if (campaign.communityId != communityId) {
            Debug.trap("Campaign not found in this community");
        };
        if (not canManageCampaign(caller, campaign, access)) {
            Debug.trap("Only campaign creators and community admins can archive campaigns");
        };
        let metadata = getCampaignMetadata(campaign);
        campaignMetadataByCampaign := natMap.put(
            campaignMetadataByCampaign,
            campaignId,
            { metadata with archived = true; updatedNs = Time.now() },
        );
        campaignPublicLinks := setCampaignPublicToken(campaignId, null);
    };

    public shared ({ caller }) func setCampaignPublicLink(communityId : Nat, campaignId : Nat, token : ?Text) : async ?Text {
        requireAuthenticated(caller);
        ignore getCommunityOrTrap(communityId);
        let campaign = getCampaignOrTrap(campaignId);
        if (campaign.communityId != communityId) {
            Debug.trap("Campaign not found in this community");
        };
        if (campaign.creator != caller) {
            Debug.trap("Only the campaign creator can manage public links");
        };
        let metadata = getCampaignMetadata(campaign);
        if (metadata.archived) {
            Debug.trap("Archived campaigns cannot be shared publicly");
        };
        switch (token) {
            case null {};
            case (?value) {
                validatePublicToken(value);
                if (campaignPublicTokenAlreadyUsed(campaignId, value)) {
                    Debug.trap("Public link token is already in use");
                };
            };
        };
        campaignPublicLinks := setCampaignPublicToken(campaignId, token);
        campaignMetadataByCampaign := natMap.put(
            campaignMetadataByCampaign,
            campaignId,
            { metadata with updatedNs = Time.now(); visibility = switch (token) { case null metadata.visibility; case (?_) #publicCampaign } },
        );
        token;
    };

    func recordCampaignContribution(caller : Principal, campaignId : Nat, campaign : Campaign, amount : Nat) {
        if (amount == 0) {
            Debug.trap("Contribution amount must be greater than zero");
        };

        let now = Time.now();
        if (now > campaign.deadlineNs) {
            Debug.trap("Campaign deadline has passed");
        };
        if (campaign.state != #active) {
            Debug.trap("Campaign is not active");
        };
        if (campaignIsArchived(campaign.id)) {
            Debug.trap("Campaign is archived");
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

                recordCampaignContribution(caller, campaignId, campaign, amount);
            };
        };
    };

    public shared ({ caller }) func contributeToPublicCampaign(token : Text, amount : Nat) : async () {
        // Temporary bridge until formal Stripe support lands: public links can bypass
        // community membership, but canister-ledger writes still require an authenticated
        // principal to avoid anonymous state spam. When Stripe is integrated, replace
        // this endpoint with guest checkout and record only Stripe-confirmed donations
        // as external/payment-backed contributions from the checkout/webhook flow.
        requireAuthenticated(caller);
        validatePublicToken(token);

        for (link in campaignPublicLinks.vals()) {
            if (link.token == token) {
                switch (natMap.get(campaigns, link.campaignId)) {
                    case null {
                        Debug.trap("Campaign not found");
                    };
                    case (?campaign) {
                        let metadata = getCampaignMetadata(campaign);
                        switch (metadata.visibility) {
                            case (#publicCampaign) {};
                            case (_) {
                                Debug.trap("Public campaign link is not available");
                            };
                        };
                        recordCampaignContribution(caller, campaign.id, campaign, amount);
                        return;
                    };
                };
            };
        };

        Debug.trap("Public campaign link is not available");
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
                    access.canContributeToCampaign,
                    "Unauthorized: Only community participants can update campaigns",
                );

                if (campaign.creator != caller) {
                    Debug.trap("Only campaign creators can add updates");
                };
                if (campaignIsArchived(campaign.id)) {
                    Debug.trap("Archived campaigns cannot be updated");
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
                if (campaignIsArchived(campaign.id)) {
                    Debug.trap("Archived campaigns cannot be finalized");
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

    public shared ({ caller }) func createCommunityDocument(communityId : Nat, title : Text) : async Nat {
        Workspace.createDocument(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), title);
    };

    public query ({ caller }) func listCommunityDocuments(communityId : Nat) : async [CommunityDocumentSummary] {
        Workspace.listDocuments(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId));
    };

    public query ({ caller }) func getCommunityDocument(communityId : Nat, documentId : Nat) : async ?CommunityDocumentPayload {
        Workspace.getDocument(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), documentId);
    };

    public shared ({ caller }) func renameCommunityDocument(communityId : Nat, documentId : Nat, title : Text) : async () {
        Workspace.renameDocument(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), documentId, title);
    };

    public shared ({ caller }) func appendCommunityDocumentUpdate(communityId : Nat, documentId : Nat, update : Blob) : async Nat {
        Workspace.appendDocumentUpdate(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), documentId, update);
    };

    public shared ({ caller }) func saveCommunityDocumentSnapshot(
        communityId : Nat,
        documentId : Nat,
        snapshot : Blob,
        compactThroughVersion : Nat,
    ) : async () {
        Workspace.saveDocumentSnapshot(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), documentId, snapshot, compactThroughVersion);
    };

    public shared ({ caller }) func setCommunityDocumentParent(communityId : Nat, documentId : Nat, parentId : ?Nat) : async ?Nat {
        Workspace.setDocumentParent(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), documentId, parentId);
    };

    public shared ({ caller }) func setCommunityDocumentShare(communityId : Nat, documentId : Nat, role : ?WorkspaceRole) : async ?WorkspaceRole {
        Workspace.setDocumentShare(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), documentId, role);
    };

    public shared ({ caller }) func setCommunityDocumentGrant(
        communityId : Nat,
        documentId : Nat,
        user : Principal,
        role : ?WorkspaceRole,
    ) : async () {
        Workspace.setDocumentGrant(
            workspaceState,
            caller,
            communityId,
            getWorkspaceAccessForCaller(caller, communityId),
            documentId,
            user,
            role,
            isAssignedCommunityParticipant(user, communityId),
        );
    };

    public shared ({ caller }) func archiveCommunityDocument(communityId : Nat, documentId : Nat) : async () {
        Workspace.archiveDocument(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), documentId);
    };

    public shared ({ caller }) func createCommunityBoard(communityId : Nat, title : Text) : async Nat {
        Workspace.createBoard(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), title);
    };

    public query ({ caller }) func listCommunityBoards(communityId : Nat) : async [CommunityBoardSummary] {
        Workspace.listBoards(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId));
    };

    public query ({ caller }) func getCommunityBoard(communityId : Nat, boardId : Nat) : async ?CommunityBoardPayload {
        Workspace.getBoard(workspaceState, boardPublicLinks, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId);
    };

    public query func getPublicCommunityBoard(token : Text) : async ?CommunityBoardPayload {
        Workspace.getPublicBoard(workspaceState, boardPublicLinks, token);
    };

    public shared ({ caller }) func renameCommunityBoard(communityId : Nat, boardId : Nat, title : Text) : async () {
        Workspace.renameBoard(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, title);
    };

    public shared ({ caller }) func setCommunityBoardShare(communityId : Nat, boardId : Nat, role : ?WorkspaceRole) : async ?WorkspaceRole {
        Workspace.setBoardShare(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, role);
    };

    public shared ({ caller }) func setCommunityBoardPublicLink(communityId : Nat, boardId : Nat, token : ?Text) : async ?Text {
        let (nextLinks, publicToken) = Workspace.setBoardPublicLink(workspaceState, boardPublicLinks, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, token);
        boardPublicLinks := nextLinks;
        publicToken;
    };

    public shared ({ caller }) func setCommunityBoardGrant(
        communityId : Nat,
        boardId : Nat,
        user : Principal,
        role : ?WorkspaceRole,
    ) : async () {
        Workspace.setBoardGrant(
            workspaceState,
            caller,
            communityId,
            getWorkspaceAccessForCaller(caller, communityId),
            boardId,
            user,
            role,
            isAssignedCommunityParticipant(user, communityId),
        );
    };

    public shared ({ caller }) func addCommunityBoardColumn(communityId : Nat, boardId : Nat, title : Text) : async KanbanColumn {
        Workspace.addBoardColumn(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, title);
    };

    public shared ({ caller }) func renameCommunityBoardColumn(communityId : Nat, boardId : Nat, columnId : Nat, title : Text) : async () {
        Workspace.renameBoardColumn(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, columnId, title);
    };

    public shared ({ caller }) func deleteCommunityBoardColumn(communityId : Nat, boardId : Nat, columnId : Nat) : async () {
        Workspace.deleteBoardColumn(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, columnId);
    };

    public shared ({ caller }) func reorderCommunityBoardColumns(communityId : Nat, boardId : Nat, columnIds : [Nat]) : async () {
        Workspace.reorderBoardColumns(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, columnIds);
    };

    public shared ({ caller }) func addCommunityBoardCard(
        communityId : Nat,
        boardId : Nat,
        columnId : Nat,
        input : KanbanCardInput,
    ) : async KanbanCard {
        validateWorkspaceAssignees(communityId, input);
        Workspace.addBoardCard(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, columnId, input);
    };

    public shared ({ caller }) func updateCommunityBoardCard(
        communityId : Nat,
        boardId : Nat,
        cardId : Nat,
        input : KanbanCardInput,
    ) : async () {
        validateWorkspaceAssignees(communityId, input);
        Workspace.updateBoardCard(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, cardId, input);
    };

    public shared ({ caller }) func deleteCommunityBoardCard(communityId : Nat, boardId : Nat, cardId : Nat) : async () {
        Workspace.deleteBoardCard(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, cardId);
    };

    public shared ({ caller }) func moveCommunityBoardCard(communityId : Nat, boardId : Nat, cardId : Nat, toColumnId : Nat, toIndex : Nat) : async () {
        Workspace.moveBoardCard(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId, cardId, toColumnId, toIndex);
    };

    public shared ({ caller }) func archiveCommunityBoard(communityId : Nat, boardId : Nat) : async () {
        boardPublicLinks := Workspace.archiveBoard(workspaceState, boardPublicLinks, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), boardId);
    };

    public shared ({ caller }) func createCommunityEvent(communityId : Nat, input : CommunityEventInput) : async Nat {
        Workspace.createEvent(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), input);
    };

    public query ({ caller }) func listCommunityEvents(communityId : Nat) : async [CommunityEventPayload] {
        Workspace.listEvents(workspaceState, eventPublicLinks, caller, communityId, getWorkspaceAccessForCaller(caller, communityId));
    };

    public query ({ caller }) func getCommunityEvent(communityId : Nat, eventId : Nat) : async ?CommunityEventPayload {
        Workspace.getEvent(workspaceState, eventPublicLinks, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), eventId);
    };

    public query func getPublicCommunityEvent(token : Text) : async ?CommunityEventPayload {
        Workspace.getPublicEvent(workspaceState, eventPublicLinks, token);
    };

    public shared ({ caller }) func updateCommunityEvent(communityId : Nat, eventId : Nat, input : CommunityEventInput) : async () {
        Workspace.updateEvent(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), eventId, input);
    };

    public shared ({ caller }) func setCommunityEventShare(communityId : Nat, eventId : Nat, role : ?WorkspaceRole) : async ?WorkspaceRole {
        Workspace.setEventShare(workspaceState, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), eventId, role);
    };

    public shared ({ caller }) func setCommunityEventPublicLink(communityId : Nat, eventId : Nat, token : ?Text) : async ?Text {
        let (nextLinks, publicToken) = Workspace.setEventPublicLink(workspaceState, eventPublicLinks, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), eventId, token);
        eventPublicLinks := nextLinks;
        publicToken;
    };

    public shared ({ caller }) func setCommunityEventGrant(
        communityId : Nat,
        eventId : Nat,
        user : Principal,
        role : ?WorkspaceRole,
    ) : async () {
        Workspace.setEventGrant(
            workspaceState,
            caller,
            communityId,
            getWorkspaceAccessForCaller(caller, communityId),
            eventId,
            user,
            role,
            isAssignedCommunityParticipant(user, communityId),
        );
    };

    public shared ({ caller }) func archiveCommunityEvent(communityId : Nat, eventId : Nat) : async () {
        eventPublicLinks := Workspace.archiveEvent(workspaceState, eventPublicLinks, caller, communityId, getWorkspaceAccessForCaller(caller, communityId), eventId);
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

    // Commission records deliberately remain separate from legacy DAO membership.
    public type CommissionRole = {
        #lead;
        #member;
        #partner
    };
    public type CommissionAssignment = {
        principal : Principal;
        role : CommissionRole
    };
    public type CommissionGroup = {
        id : Nat;
        name : Text;
        purpose : Text;
        stage : Nat;
        roles : [CommissionAssignment];
        draft : Text;
        disagreements : Text;
        draftShared : Bool
    };
    public type CommissionPublicGroup = {
        id : Nat;
        name : Text;
        purpose : Text;
        stage : Nat
    };
    public type CommissionConsultation = {
        id : Nat;
        groupId : Nat;
        title : Text;
        purpose : Text;
        questions : [Text];
        audience : Text;
        opens : Int;
        closes : Int;
        guidance : Text;
        closed : Bool
    };
    public type CommissionInput = {
        alias : Text;
        language : Text;
        answers : Text;
        internalConsent : Bool;
        quoteConsent : Bool;
        attributionConsent : Bool;
        format : Text;
        date : Text;
        location : Text;
        participants : Text;
        themes : Text;
        tensions : Text;
        proposals : Text
    };
    public type CommissionComment = {
        author : Text;
        body : Text;
        at : Int
    };
    public type CommissionContribution = {
        id : Nat;
        consultationId : Nat;
        input : CommissionInput;
        comments : [CommissionComment];
        withdrawn : Bool;
        facilitated : Bool;
        owner : ?Principal;
        credential : Text
    };
    public type CommissionSubmission = {
        canWithdraw : Bool;
        id : Nat;
        consultationId : Nat;
        input : CommissionInput;
        comments : [CommissionComment];
        withdrawn : Bool;
        facilitated : Bool
    };
    public type CommissionFinding = {
        id : Nat;
        groupId : Nat;
        kind : Text;
        body : Text;
        sources : [Nat];
        needsReview : Bool
    };
    public type CommissionPublication = {
        groupId : Nat;
        title : Text;
        body : Text;
        disagreements : Text;
        sources : [Nat];
        at : Int
    };
    var commissionGroups : [CommissionGroup] = [];
    var commissionConsultations : [CommissionConsultation] = [];
    var commissionContributions : [CommissionContribution] = [];
    var commissionFindings : [CommissionFinding] = [];
    var commissionPublications : [CommissionPublication] = [];
    public type CommissionStageNote = {
        id : Nat; groupId : Nat; stage : Nat; author : Text;
        role : Text; body : Text; sharedWithAdvisors : Bool; at : Int
    };
    var commissionStageNotes : [CommissionStageNote] = [];
    var commissionParticipantNames : [(Nat, Principal, Text)] = [];
    var commissionConsultationStages : [(Nat, Nat)] = [];
    var commissionAdvisorStages : [(Nat, Nat)] = [];
    func participantName(caller : Principal, groupId : Nat) : Text {
        switch (Array.find<(Nat, Principal, Text)>(commissionParticipantNames, func(x) {
            x.0 == groupId and x.1 == caller
        })) { case (?x) x.2; case null "Working group" }
    };
    public shared ({ caller }) func commissionSetDisplayName(groupId : Nat, name : Text) : async () {
        if (cr(caller, groupId) == null) Debug.trap("Participant access required");
        if (name.size() == 0 or name.size() > 100) Debug.trap("Invalid display name");
        commissionParticipantNames := Array.append(Array.filter<(Nat, Principal, Text)>(commissionParticipantNames, func(x) {
            not (x.0 == groupId and x.1 == caller)
        }), [(groupId, caller, name)])
    };
    public shared query ({ caller }) func commissionDisplayName(groupId : Nat) : async Text {
        if (cr(caller, groupId) == null) return "";
        participantName(caller, groupId)
    };
    func advisorStage(groupId : Nat, stage : Nat) : Bool {
        Array.find<(Nat, Nat)>(commissionAdvisorStages, func(x) { x.0 == groupId and x.1 == stage }) != null
    };
    public shared query ({ caller }) func commissionAdvisorStageShared(groupId : Nat, stage : Nat) : async Bool {
        if (cr(caller, groupId) == null) Debug.trap("Participant access required");
        advisorStage(groupId, stage)
    };
    public shared ({ caller }) func commissionShareAdvisorStage(groupId : Nat, stage : Nat, isShared : Bool) : async () {
        lead(caller, groupId);
        if (stage > 4) Debug.trap("Invalid stage");
        commissionAdvisorStages := Array.filter<(Nat, Nat)>(commissionAdvisorStages, func(x) { not (x.0 == groupId and x.1 == stage) });
        if (isShared) commissionAdvisorStages := Array.append(commissionAdvisorStages, [(groupId, stage)])
    };
    public shared query ({ caller }) func commissionListStageNotes(groupId : Nat, stage : Nat) : async [CommissionStageNote] {
        let isCore = core(caller, groupId);
        let isAdvisor = not isCore and capable(caller,groupId,"sharedParticipation") and advisorStage(groupId, stage);
        if (not isCore and not isAdvisor) Debug.trap("Stage discussion not shared");
        Array.filter<CommissionStageNote>(commissionStageNotes, func(n) {
            n.groupId == groupId and n.stage == stage and (isCore or n.sharedWithAdvisors)
        })
    };
    public shared ({ caller }) func commissionAddStageNote(groupId : Nat, stage : Nat, body : Text, sharedWithAdvisors : Bool) : async Nat {
        let role = cr(caller, groupId);
        let isCore = core(caller, groupId);
        let isAdvisor = not isCore and capable(caller,groupId,"sharedParticipation") and advisorStage(groupId, stage);
        if (not isCore and not isAdvisor) Debug.trap("Stage discussion not shared");
        if (stage > 4 or body.size() == 0 or body.size() > 10000) Debug.trap("Invalid stage comment");
        if (sharedWithAdvisors and not capable(caller,groupId,"manageGroup") and not (isAdvisor and not isCore)) Debug.trap("Only leads may share internal comments");
        let id = commissionId();
        commissionStageNotes := Array.append(commissionStageNotes, [{
            id; groupId; stage; body; author = participantName(caller, groupId);
            role = definition(roleId(caller,groupId),roleDefinitions(groupId)).name;
            sharedWithAdvisors = sharedWithAdvisors or isAdvisor; at = Time.now()
        }]); id
    };
    public shared ({ caller }) func commissionSetConsultationStage(id : Nat, stage : Nat) : async () {
        lead(caller, cc(id).groupId);
        if (stage > 4) Debug.trap("Invalid stage");
        commissionConsultationStages := Array.append(Array.filter<(Nat, Nat)>(commissionConsultationStages, func(x) { x.0 != id }), [(id, stage)])
    };
    public shared query ({ caller }) func commissionStageConsultations(groupId : Nat, stage : Nat) : async [CommissionConsultation] {
        ignore cg(groupId);
        Array.filter<CommissionConsultation>(commissionConsultations, func(c) {
            c.groupId == groupId and visibleConsultation(caller, c) and
            (switch(Array.find<(Nat, Nat)>(commissionConsultationStages, func(x) { x.0 == c.id })) { case (?x) x.1; case null 1 }) == stage
        })
    };

    // Additive POC configuration. Existing role assignments and return links remain valid.
    public type CommissionRoleDefinition = { id : Text; name : Text; capabilities : [Text] };
    public type CommissionAccess = { roleId : Text; name : Text; capabilities : [Text]; revision : Nat };
    public type CommissionParticipant = { principal : Principal; roleId : Text; name : Text };
    public type CommissionContributionType = { id : Text; name : Text; guidance : Text; layout : Text };
    public type CommissionContributionDetail = { id : Nat; typeId : Text; documentReference : Text; processSuggestion : Bool; withdrawnAt : ?Int };
    public type CommissionReviewCopy = { consultationId : Nat; title : Text; body : Text; sources : [Nat]; needsReview : Bool };
    public type CommissionDraftEvidence = { groupId : Nat; findings : [Nat]; needsReview : Bool };
    public type CommissionProvenanceLink = {groupId : Nat; sourceId : Nat; targetKind : Text; targetId : Nat};
    var commissionProvenanceLinks : [CommissionProvenanceLink] = [];
    public type CommissionPublicationMarker = { id : Nat; groupId : Nat; at : Int; sources : [Nat]; status : Text };
    var commissionRoleDefinitions : [(Nat, [CommissionRoleDefinition])] = [];
    var commissionRoleIds : [(Nat, Principal, Text)] = [];
    var commissionTypeDefinitions : [(Nat, [CommissionContributionType])] = [];
    var commissionDetails : [CommissionContributionDetail] = [];
    var commissionReviewCopies : [CommissionReviewCopy] = [];
    var commissionDraftEvidence : [CommissionDraftEvidence] = [];
    var commissionPublicationMarkers : [CommissionPublicationMarker] = [];
    var commissionAccessRevision : Nat = 0;
    func includes(xs : [Text], value : Text) : Bool { Array.find<Text>(xs, func(x) { x == value }) != null };
    func defaultRoles() : [CommissionRoleDefinition] { [
        {id="lead";name="Lead";capabilities=["manageGroup","internalAccess","sharedParticipation","recordFacilitated","editSynthesis","publish","workspace"]},
        {id="member";name="Member";capabilities=["internalAccess","sharedParticipation","recordFacilitated","editSynthesis","workspace"]},
        {id="partner";name="Advisor";capabilities=["sharedParticipation"]},
        {id="contributor";name="Contributor";capabilities=[]}
    ] };
    func roleDefinitions(groupId : Nat) : [CommissionRoleDefinition] {
        switch (Array.find<(Nat,[CommissionRoleDefinition])>(commissionRoleDefinitions, func(x) {x.0 == groupId})) {case (?x) x.1;case null defaultRoles()}
    };
    func roleId(caller : Principal, groupId : Nat) : Text {
        if (Principal.isAnonymous(caller)) return "contributor";
        switch (Array.find<(Nat,Principal,Text)>(commissionRoleIds, func(x) {x.0 == groupId and x.1 == caller})) {
            case (?x) x.2;
            case null switch (cr(caller,groupId)) {case (?#lead) "lead";case (?#member) "member";case (?#partner) "partner";case null "contributor"}
        }
    };
    func definition(id : Text, definitions : [CommissionRoleDefinition]) : CommissionRoleDefinition {
        switch (Array.find<CommissionRoleDefinition>(definitions, func(x) {x.id == id})) {case (?x) x;case null ({id="contributor";name="Contributor";capabilities=[]})}
    };
    func capable(caller : Principal, groupId : Nat, capability : Text) : Bool {
        not Principal.isAnonymous(caller) and roleId(caller,groupId) != "contributor" and includes(definition(roleId(caller,groupId),roleDefinitions(groupId)).capabilities,capability)
    };
    func requireCapability(caller : Principal, groupId : Nat, capability : Text) {
        if (not capable(caller,groupId,capability)) Debug.trap("Permission required: " # capability)
    };
    func managerRemains(groupId : Nat, defs : [CommissionRoleDefinition], assignments : [CommissionAssignment]) {
        if (Array.find<CommissionAssignment>(assignments,func(a) {includes(definition(roleId(a.principal,groupId),defs).capabilities,"manageGroup")}) == null) Debug.trap("Keep at least one lead or group manager")
    };
    func defaultTypes() : [CommissionContributionType] {[
        {id="written";name="Written submission";guidance="Share your experience or proposal in your own words.";layout="written"},
        {id="collective";name="Collective input";guidance="Describe the collective without identifying individuals. Confirm you are authorised to represent this input.";layout="collective"},
        {id="discussion";name="Facilitated discussion";guidance="Record the discussion and preserve disagreement.";layout="event"},
        {id="roundtable";name="Roundtable";guidance="Summarise themes, tensions and proposals from the roundtable.";layout="event"},
        {id="harvest";name="Consultation harvest";guidance="Record the findings of a consultation without personal participant lists.";layout="event"},
        {id="document";name="Document reference";guidance="Provide a document link or workspace document ID and explain its relevance.";layout="document"},
        {id="other";name="Other";guidance="Describe the format and share your input.";layout="written"}
    ]};
    func contributionTypes(groupId : Nat) : [CommissionContributionType] {
        switch(Array.find<(Nat,[CommissionContributionType])>(commissionTypeDefinitions,func(x){x.0==groupId})) {case (?x) x.1;case null defaultTypes()}
    };
    func ensureCommissionSettings(groupId : Nat) {
        ignore cg(groupId);
        if(Array.find<(Nat,[CommissionRoleDefinition])>(commissionRoleDefinitions,func(x){x.0==groupId})==null) commissionRoleDefinitions:=Array.append(commissionRoleDefinitions,[(groupId,defaultRoles())]);
        if(Array.find<(Nat,[CommissionContributionType])>(commissionTypeDefinitions,func(x){x.0==groupId})==null) commissionTypeDefinitions:=Array.append(commissionTypeDefinitions,[(groupId,defaultTypes())]);
    };
    public shared ({caller}) func commissionInitializeSettings(groupId : Nat) : async () {lead(caller,groupId);ensureCommissionSettings(groupId)};
    public shared query ({caller}) func commissionAccess(groupId : Nat) : async CommissionAccess {
        ignore cg(groupId);let id=roleId(caller,groupId);let d=definition(id,roleDefinitions(groupId));{roleId=id;name=d.name;capabilities=if(Principal.isAnonymous(caller) or id=="contributor") [] else d.capabilities;revision=commissionAccessRevision}
    };
    public shared query ({caller}) func commissionRoles(groupId : Nat) : async [CommissionRoleDefinition] {lead(caller,groupId);roleDefinitions(groupId)};
    public shared query ({caller}) func commissionParticipants(groupId : Nat) : async [CommissionParticipant] {
        lead(caller,groupId);Array.map<CommissionAssignment,CommissionParticipant>(cg(groupId).roles,func(a){{principal=a.principal;roleId=roleId(a.principal,groupId);name=participantName(a.principal,groupId)}})
    };
    public shared ({caller}) func commissionSaveRole(groupId : Nat, input : CommissionRoleDefinition, isNew : Bool) : async Text {
        lead(caller,groupId);ensureCommissionSettings(groupId);
        if(input.name.size()==0 or input.name.size() > 100) Debug.trap("Role name is required (maximum 100 characters)");
        let allowed=["manageGroup","internalAccess","sharedParticipation","recordFacilitated","editSynthesis","publish","workspace"];
        for(c in input.capabilities.vals()) {if(not includes(allowed,c)) Debug.trap("Unknown capability")};
        if((includes(input.capabilities,"editSynthesis") or includes(input.capabilities,"publish")) and not includes(input.capabilities,"internalAccess")) Debug.trap("Synthesis and publication require internal access");
        let id=if(isNew) "role-" # Nat.toText(commissionId()) else input.id;
        if(not isNew and Array.find<CommissionRoleDefinition>(roleDefinitions(groupId),func(r){r.id==id})==null) Debug.trap("Role not found");
        if(id=="contributor" and input.capabilities.size() > 0) Debug.trap("Public contributors retain submission-scoped access only");
        let d={input with id};let defs=Array.append(Array.filter<CommissionRoleDefinition>(roleDefinitions(groupId),func(r){r.id!=id}),[d]);
        managerRemains(groupId,defs,cg(groupId).roles);
        commissionRoleDefinitions:=Array.append(Array.filter<(Nat,[CommissionRoleDefinition])>(commissionRoleDefinitions,func(x){x.0!=groupId}),[(groupId,defs)]);
        for(a in cg(groupId).roles.vals()) {Membership.setCommunityRole(membershipState,groupId,a.principal,if(capable(a.principal,groupId,"workspace")) (if(capable(a.principal,groupId,"manageGroup")) ?#communityAdmin else ?#member) else null)};
        syncCommunityMembersField(groupId);commissionAccessRevision+=1; id
    };
    func assignCommissionRole(caller : Principal, groupId : Nat, principal : Principal, id : ?Text) {
        lead(caller,groupId);ensureCommissionSettings(groupId);
        if(Principal.isAnonymous(principal)) Debug.trap("A signed-in principal is required");
        switch(id) {case (?value) {if(value=="contributor" or Array.find<CommissionRoleDefinition>(roleDefinitions(groupId),func(r){r.id==value})==null) Debug.trap("Choose a signed-in role")};case null {}};
        let g=cg(groupId);let others=Array.filter<CommissionAssignment>(g.roles,func(a){a.principal!=principal});
        commissionRoleIds:=Array.filter<(Nat,Principal,Text)>(commissionRoleIds,func(x){not(x.0==groupId and x.1==principal)});
        let roles=switch(id){case (?value) {commissionRoleIds:=Array.append(commissionRoleIds,[(groupId,principal,value)]);Array.append(others,[{principal;role=if(value=="lead") #lead else if(value=="partner") #partner else #member}])};case null others};
        managerRemains(groupId,roleDefinitions(groupId),roles);
        commissionGroups:=Array.map<CommissionGroup,CommissionGroup>(commissionGroups,func(x){if(x.id==groupId) ({x with roles}) else x});
        Membership.setCommunityRole(membershipState,groupId,principal,if(capable(principal,groupId,"workspace")) (if(capable(principal,groupId,"manageGroup")) ?#communityAdmin else ?#member) else null);
        syncCommunityMembersField(groupId);commissionAccessRevision+=1
    };
    public shared ({caller}) func commissionAssignConfiguredRole(groupId : Nat, principal : Principal, id : ?Text) : async () {assignCommissionRole(caller,groupId,principal,id)};
    public shared query func commissionContributionTypes(groupId : Nat) : async [CommissionContributionType] {ignore cg(groupId);contributionTypes(groupId)};
    public shared ({caller}) func commissionSaveContributionType(groupId : Nat, input : CommissionContributionType, isNew : Bool) : async Text {
        lead(caller,groupId);ensureCommissionSettings(groupId);
        if(input.name.size()==0 or input.name.size() > 100 or input.guidance.size() > 10000 or not includes(["written","collective","event","document"],input.layout)) Debug.trap("Invalid contribution type");
        let id=if(isNew) "type-" # Nat.toText(commissionId()) else input.id;
        if(not isNew and Array.find<CommissionContributionType>(contributionTypes(groupId),func(t){t.id==id})==null) Debug.trap("Contribution type not found");
        let types=Array.append(Array.filter<CommissionContributionType>(contributionTypes(groupId),func(t){t.id!=id}),[{input with id}]);
        commissionTypeDefinitions:=Array.append(Array.filter<(Nat,[CommissionContributionType])>(commissionTypeDefinitions,func(x){x.0!=groupId}),[(groupId,types)]);id
    };
    func rememberSources(groupId : Nat,sources : [Nat],targetKind : Text,targetId : Nat) {
        for(sourceId in sources.vals()) {if(Array.find<CommissionProvenanceLink>(commissionProvenanceLinks,func(x){x.sourceId==sourceId and x.targetKind==targetKind and x.targetId==targetId})==null) commissionProvenanceLinks:=Array.append(commissionProvenanceLinks,[{groupId;sourceId;targetKind;targetId}])}
    };
    public shared query ({caller}) func commissionSourceProvenance(groupId : Nat) : async [CommissionProvenanceLink] {requireCore(caller,groupId);Array.filter<CommissionProvenanceLink>(commissionProvenanceLinks,func(x){x.groupId==groupId})};
    func sourcesOfDraft(groupId : Nat) : [Nat] {
        var sources : [Nat]=[];
        for(id in draftEvidence(groupId).findings.vals()) {switch(Array.find<CommissionFinding>(commissionFindings,func(f){f.id==id and f.groupId==groupId})) {case (?f) {for(n in f.sources.vals()){if(Array.find<Nat>(sources,func(x){x==n})==null) sources:=Array.append(sources,[n])}};case null {}}};sources
    };
    func contributionDetail(id : Nat) : CommissionContributionDetail {
        switch(Array.find<CommissionContributionDetail>(commissionDetails,func(x){x.id==id})) {case (?x) x;case null ({id;typeId=if(cs(id).facilitated) "discussion" else "written";documentReference="";processSuggestion=false;withdrawnAt=null})}
    };
    public shared query ({caller}) func commissionContributionDetail(id : Nat, credential : Text) : async CommissionContributionDetail {
        let c=cs(id);if(not core(caller,cc(c.consultationId).groupId) and not owns(caller,c,credential)) Debug.trap("Private submission");contributionDetail(id)
    };
    public shared query ({caller}) func commissionSubmissionTypes(id : Nat, credential : Text) : async [CommissionContributionType] {
        let c=cs(id);let groupId=cc(c.consultationId).groupId;
        if(not core(caller,groupId) and not owns(caller,c,credential)) Debug.trap("Private submission");
        contributionTypes(groupId)
    };
    public shared query ({caller}) func commissionGroupSources(groupId : Nat) : async [CommissionSubmission] {
        requireCore(caller,groupId);Array.map<CommissionContribution,CommissionSubmission>(Array.filter<CommissionContribution>(commissionContributions,func(c){cc(c.consultationId).groupId==groupId}),func(c){submissionView(c,caller,"")})
    };
    public shared ({caller}) func commissionSubmitFlexible(consultationId : Nat, input : CommissionInput, credential : Text, typeId : Text, reference : Text, processSuggestion : Bool, collectiveAuthority : Bool) : async Nat {
        let groupId=cc(consultationId).groupId;
        let t=switch(Array.find<CommissionContributionType>(contributionTypes(groupId),func(t){t.id==typeId})){case (?x) x;case null Debug.trap("Contribution type not found")};
        if(reference.size() > 2000) Debug.trap("Document reference is too long");
        if(t.layout=="document" and not processSuggestion and not (Text.startsWith(reference,#text "https://") or Text.startsWith(reference,#text "workspace:"))) Debug.trap("Use an HTTPS document link or workspace:document-id reference");
        if(Text.startsWith(reference,#text "workspace:")) {requireCapability(caller,groupId,"workspace"); let id=switch(Nat.fromText(Text.trimStart(reference,#text "workspace:"))){case (?n) n;case null Debug.trap("Invalid workspace reference")};switch(Workspace.getDocument(workspaceState,caller,groupId,getWorkspaceAccessForCaller(caller,groupId),id)){case null Debug.trap("Workspace document access required");case (?_) {}}};
        if(t.layout=="collective" and not processSuggestion and (not collectiveAuthority or input.participants.size()==0)) Debug.trap("Confirm authority and describe the collective");
        let facilitated=t.layout=="event" and not processSuggestion;
        let id=submitCommission(caller,consultationId,{input with format=t.name},credential,facilitated);
        commissionDetails:=Array.append(commissionDetails,[{id;typeId;documentReference=reference;processSuggestion;withdrawnAt=null}]);id
    };
    public shared query ({caller}) func commissionReviewCopy(consultationId : Nat) : async ?CommissionReviewCopy {
        if(not visibleConsultation(caller,cc(consultationId))) Debug.trap("Consultation access required");
        Array.find<CommissionReviewCopy>(commissionReviewCopies,func(x){x.consultationId==consultationId})
    };
    public shared ({caller}) func commissionSaveReviewCopy(input : CommissionReviewCopy) : async () {
        let groupId=cc(input.consultationId).groupId;lead(caller,groupId);
        if(input.title.size()==0 or input.body.size()==0 or input.body.size() > 100000) Debug.trap("A title and selected review text are required");
        validSources(groupId,input.sources,true);
        commissionReviewCopies:=Array.append(Array.filter<CommissionReviewCopy>(commissionReviewCopies,func(x){x.consultationId!=input.consultationId}),[{input with needsReview=false}]);
        rememberSources(groupId,input.sources,"reviewCopy",input.consultationId)
    };
    func draftEvidence(groupId : Nat) : CommissionDraftEvidence {
        switch(Array.find<CommissionDraftEvidence>(commissionDraftEvidence,func(x){x.groupId==groupId})){case (?x) x;case null ({groupId;findings=[];needsReview=false})}
    };
    public shared query ({caller}) func commissionDraftEvidenceState(groupId : Nat) : async CommissionDraftEvidence {requireCore(caller,groupId);draftEvidence(groupId)};
    public shared ({caller}) func commissionSaveDraftEvidence(groupId : Nat, findingIds : [Nat], confirmReview : Bool) : async () {saveDraftEvidence(caller,groupId,findingIds,confirmReview)};
    func saveDraftEvidence(caller : Principal, groupId : Nat, findingIds : [Nat], confirmReview : Bool) {
        requireCapability(caller,groupId,"editSynthesis");
        for(id in findingIds.vals()) {switch(Array.find<CommissionFinding>(commissionFindings,func(f){f.id==id and f.groupId==groupId})){case null Debug.trap("Finding not found in this group");case (?f) {if(f.needsReview) Debug.trap("Review source-linked findings first")}}};
        let prior=draftEvidence(groupId);if(prior.needsReview and not confirmReview) Debug.trap("Confirm review of the recommendation after withdrawal");
        commissionDraftEvidence:=Array.append(Array.filter<CommissionDraftEvidence>(commissionDraftEvidence,func(x){x.groupId!=groupId}),[{groupId;findings=findingIds;needsReview=false}]);
        rememberSources(groupId,sourcesOfDraft(groupId),"recommendation",groupId)
    };
    public shared ({caller}) func commissionSaveRecommendation(groupId : Nat,draft : Text,disagreements : Text,findingIds : [Nat],confirmReview : Bool) : async () {
        requireCapability(caller,groupId,"editSynthesis");
        if(draft.size() > 100000 or disagreements.size() > 100000) Debug.trap("Recommendation text is too long");
        saveDraftEvidence(caller,groupId,findingIds,confirmReview);
        commissionGroups:=Array.map<CommissionGroup,CommissionGroup>(commissionGroups,func(g){if(g.id==groupId) ({g with draft;disagreements;draftShared=false}) else g})
    };
    public shared query ({caller}) func commissionPublicationStatus(groupId : Nat) : async [CommissionPublicationMarker] {requireCore(caller,groupId);Array.filter<CommissionPublicationMarker>(commissionPublicationMarkers,func(x){x.groupId==groupId})};

    var commissionNextId : Nat = 0;
    func commissionId() : Nat {
        let id = commissionNextId;
        commissionNextId += 1;
        id
    };
    func cg(id : Nat) : CommissionGroup {
        switch (Array.find<CommissionGroup>(commissionGroups, func(g) {
            g.id == id
        })) {
            case (?g) g;
            case null Debug.trap("Working group not found")
        }
    };
    func cc(id : Nat) : CommissionConsultation {
        switch (Array.find<CommissionConsultation>(commissionConsultations, func(c) {
            c.id == id
        })) {
            case (?c) c;
            case null Debug.trap("Consultation not found")
        }
    };
    func cs(id : Nat) : CommissionContribution {
        switch (Array.find<CommissionContribution>(commissionContributions, func(c) {
            c.id == id
        })) {
            case (?c) c;
            case null Debug.trap("Submission not found")
        }
    };
    func cr(caller : Principal, id : Nat) : ?CommissionRole {
        if (Principal.isAnonymous(caller)) return null;
        switch (Array.find<CommissionAssignment>(cg(id).roles, func(r) {
            r.principal == caller
        })) {
            case (?r) ?r.role;
            case null null
        }
    };
    func core(caller : Principal, id : Nat) : Bool {capable(caller,id,"internalAccess")};
    func lead(caller : Principal, id : Nat) {if(not capable(caller,id,"manageGroup")) Debug.trap("Only the group lead or manager can do this")};
    func requireCore(caller : Principal, id : Nat) {
        if (not core(caller, id)) Debug.trap("Working group access required")
    };
    func visibleConsultation(caller : Principal, c : CommissionConsultation) : Bool {
        c.audience == "public" or core(caller, c.groupId) or (c.audience == "partners" and capable(caller,c.groupId,"sharedParticipation"))
    };
    func submissionView(c : CommissionContribution, caller : Principal, credential : Text) : CommissionSubmission {
        {
            canWithdraw = owns(caller, c, credential) or (c.facilitated and core(caller, cc(c.consultationId).groupId));
            id = c.id;
            consultationId = c.consultationId;
            input = c.input;
            comments = c.comments;
            withdrawn = c.withdrawn;
            facilitated = c.facilitated
        }
    };
    func owns(caller : Principal, c : CommissionContribution, credential : Text) : Bool {
        (not Principal.isAnonymous(caller) and c.owner == ?caller) or (credential.size() >= 64 and credential == c.credential)
    };
    func validSources(groupId : Nat, sources : [Nat], publication : Bool) {
        for (id in sources.vals()) {
            let c = cs(id);
            if (cc(c.consultationId).groupId != groupId or c.withdrawn or not c.input.internalConsent) Debug.trap("Unavailable source");
            if (publication and not c.input.quoteConsent) Debug.trap("Publication sources require quotation consent")
        }
    };
    public shared query func commissionListGroups() : async [CommissionPublicGroup] {
        Array.map<CommissionGroup, CommissionPublicGroup>(commissionGroups, func(g) {
            {
                id = g.id;
                name = g.name;
                purpose = g.purpose;
                stage = g.stage
            }
        })
    };
    public shared query ({ caller }) func commissionRole(groupId : Nat) : async ?CommissionRole {
        cr(caller, groupId)
    };
    public shared query ({ caller }) func commissionGetGroup(groupId : Nat) : async CommissionGroup {
        if(not core(caller,groupId) and not capable(caller,groupId,"manageGroup")) Debug.trap("Working group access required");
        let g=cg(groupId);if(core(caller,groupId)) g else ({g with draft="";disagreements="";draftShared=false})
    };
    public shared ({caller}) func commissionSaveGroupDetails(groupId : Nat,name : Text,purpose : Text,stage : Nat) : async () {
        lead(caller,groupId);if(name.size()==0 or stage > 4) Debug.trap("Invalid group settings");
        commissionGroups:=Array.map<CommissionGroup,CommissionGroup>(commissionGroups,func(g){if(g.id==groupId) ({g with name;purpose;stage}) else g});
        let community=getCommunityOrTrap(groupId);communities:=natMap.put(communities,groupId,{community with name;policy=purpose})
    };
    public shared query ({ caller }) func commissionSharedDraft(groupId : Nat) : async Text {
        let g = cg(groupId);
        if (not core(caller, groupId) and not (capable(caller,groupId,"sharedParticipation") and g.draftShared)) Debug.trap("Draft not shared");
        g.draft
    };
    public shared ({ caller }) func commissionSaveGroup(groupId : Nat, name : Text, purpose : Text, stage : Nat, draft : Text, disagreements : Text, draftShared : Bool) : async () {
        let g = cg(groupId);
        if(draft != g.draft or disagreements != g.disagreements) requireCapability(caller,groupId,"editSynthesis");
        if(not core(caller,groupId) and not capable(caller,groupId,"manageGroup")) Debug.trap("Working group access required");
        if (name != g.name or purpose != g.purpose or stage != g.stage or draftShared != g.draftShared) lead(caller, groupId);
        if (stage > 4 or name.size() == 0) Debug.trap("Invalid group settings");
        commissionGroups := Array.map<CommissionGroup, CommissionGroup>(commissionGroups, func(x) {
            if (x.id == groupId) {
                {
                    x with name;
                    purpose;
                    stage;
                    draft;
                    disagreements;
                    draftShared
                }
            } else x
        });
        let community = getCommunityOrTrap(groupId);
        communities := natMap.put(communities, groupId, { community with name; policy = purpose });
    };
    public shared ({caller}) func commissionAssignRole(groupId : Nat, principal : Principal, role : ?CommissionRole) : async () {
        assignCommissionRole(caller,groupId,principal,switch(role){case (?#lead) ?"lead";case (?#member) ?"member";case (?#partner) ?"partner";case null null})
    };
    public shared query ({ caller }) func commissionListConsultations(groupId : Nat) : async [CommissionConsultation] {
        ignore cg(groupId);
        Array.filter<CommissionConsultation>(commissionConsultations, func(c) {
            c.groupId == groupId and visibleConsultation(caller, c)
        })
    };
    public shared ({ caller }) func commissionSaveConsultation(input : CommissionConsultation, isNew : Bool) : async Nat {
        lead(caller,input.groupId);
        if (input.title.size() == 0 or input.questions.size() == 0 or input.closes <= input.opens or (input.audience != "public" and input.audience != "partners" and input.audience != "core")) Debug.trap("Invalid consultation");
        let id = if (isNew) commissionId() else input.id;
        if (not isNew and cc(id).groupId != input.groupId) Debug.trap("Wrong group");
        let c = {
            input with id
        };
        if (isNew) {
            commissionConsultations := Array.append(commissionConsultations, [c]);
            commissionConsultationStages := Array.append(commissionConsultationStages, [(id, cg(input.groupId).stage)])
        } else {
            commissionConsultations := Array.map<CommissionConsultation, CommissionConsultation>(commissionConsultations, func(x) {
                if (x.id == id) c else x
            })
        };
        id
    };
    public shared ({caller}) func commissionSubmit(consultationId : Nat, input : CommissionInput, credential : Text, facilitated : Bool) : async Nat {submitCommission(caller,consultationId,input,credential,facilitated)};
    func submitCommission(caller : Principal, consultationId : Nat, input : CommissionInput, credential : Text, facilitated : Bool) : Nat {
        let c = cc(consultationId);
        if (not visibleConsultation(caller, c)) Debug.trap("Consultation access required");
        if (c.closed or Time.now() < c.opens or Time.now() > c.closes) Debug.trap("Consultation is closed");
        if (facilitated) {if(not capable(caller,c.groupId,"recordFacilitated")) Debug.trap("Working group access required for facilitated recording")};
        if (not input.internalConsent or input.answers.size() == 0 or input.answers.size() > 100000 or credential.size() != 64) Debug.trap("Answers, internal consent and a private return credential are required");
        if (Array.find<CommissionContribution>(commissionContributions, func(s) {
            s.credential == credential
        }) != null) Debug.trap("Return credential already used");
        let id = commissionId();
        commissionContributions := Array.append(commissionContributions, [{
            id;
            consultationId;
            input;
            credential;
            comments = [];
            withdrawn = false;
            facilitated;
            owner = if (Principal.isAnonymous(caller)) null else ?caller
        }]);
        id
    };
    public shared query ({ caller }) func commissionListSubmissions(consultationId : Nat) : async [CommissionSubmission] {
        requireCore(caller, cc(consultationId).groupId);
        Array.map<CommissionContribution, CommissionSubmission>(Array.filter<CommissionContribution>(commissionContributions, func(s) {
            s.consultationId == consultationId and not s.withdrawn
        }), func(s) { submissionView(s, caller, "") })
    };
    public shared query ({ caller }) func commissionGetSubmission(id : Nat, credential : Text) : async CommissionSubmission {
        let s = cs(id);
        if (not core(caller, cc(s.consultationId).groupId) and not owns(caller, s, credential)) Debug.trap("Private submission");
        submissionView(s, caller, credential)
    };
    public shared ({ caller }) func commissionComment(id : Nat, credential : Text, body : Text) : async () {
        let s = cs(id);
        let groupId = cc(s.consultationId).groupId;
        let staff = core(caller, groupId);
        if (not staff and not owns(caller, s, credential)) Debug.trap("Private submission");
        if (s.withdrawn or body.size() == 0 or body.size() > 10000) Debug.trap("Cannot add comment");
        let comment = {
            author = if (staff) (if (participantName(caller, groupId) == "Working group") "Working group" else participantName(caller, groupId) # " · Working Group") else if (s.input.alias == "") "Contributor" else s.input.alias;
            body;
            at = Time.now()
        };
        commissionContributions := Array.map<CommissionContribution, CommissionContribution>(commissionContributions, func(x) {
            if (x.id == id) {
                {
                    x with comments = Array.append(x.comments, [comment])
                }
            } else x
        })
    };
    public shared ({ caller }) func commissionWithdraw(id : Nat, credential : Text) : async () {
        let s = cs(id);
        if (not owns(caller, s, credential) and not (s.facilitated and core(caller, cc(s.consultationId).groupId))) Debug.trap("Only the contributor may withdraw");
        if(s.withdrawn) return;
        for(p in commissionPublications.vals()) {
            if(Array.find<Nat>(p.sources,func(n){n==id})!=null and Array.find<CommissionPublicationMarker>(commissionPublicationMarkers,func(m){m.groupId==p.groupId and m.at==p.at})==null) commissionPublicationMarkers:=Array.append(commissionPublicationMarkers,[{id=commissionId();groupId=p.groupId;at=p.at;sources=p.sources;status="withheld"}])
        };
        let blank : CommissionInput = {
            alias = "";
            language = "";
            answers = "";
            internalConsent = false;
            quoteConsent = false;
            attributionConsent = false;
            format = "";
            date = "";
            location = "";
            participants = "";
            themes = "";
            tensions = "";
            proposals = ""
        };
        commissionContributions := Array.map<CommissionContribution, CommissionContribution>(commissionContributions, func(x) {
            if (x.id == id) {
                {
                    x with input = blank;
                    comments = [];
                    withdrawn = true;
                    owner = null
                }
            } else x
        });
        commissionFindings := Array.map<CommissionFinding, CommissionFinding>(commissionFindings, func(f) {
            if (Array.find<Nat>(f.sources, func(n) {
                n == id
            }) != null) {
                {
                    f with needsReview = true
                }
            } else f
        });
        commissionPublications := Array.filter<CommissionPublication>(commissionPublications, func(p) {
            Array.find<Nat>(p.sources, func(n) {
                n == id
            }) == null
        });
        let info=contributionDetail(id);
        commissionDetails:=Array.append(Array.filter<CommissionContributionDetail>(commissionDetails,func(x){x.id!=id}),[{info with documentReference="";withdrawnAt=?Time.now()}]);
        let groupId=cc(s.consultationId).groupId;let prior=draftEvidence(groupId);
        let affectsDraft=prior.findings.size()==0 or Array.find<Nat>(prior.findings,func(fid){Array.find<CommissionFinding>(commissionFindings,func(f){f.id==fid and Array.find<Nat>(f.sources,func(n){n==id})!=null})!=null})!=null;
        if(affectsDraft) commissionDraftEvidence:=Array.append(Array.filter<CommissionDraftEvidence>(commissionDraftEvidence,func(x){x.groupId!=groupId}),[{prior with needsReview=true}]);
        commissionPublicationMarkers:=Array.map<CommissionPublicationMarker,CommissionPublicationMarker>(commissionPublicationMarkers,func(m){if(Array.find<Nat>(m.sources,func(n){n==id})!=null) ({m with status="withheld"}) else m});
        commissionReviewCopies:=Array.map<CommissionReviewCopy,CommissionReviewCopy>(commissionReviewCopies,func(r){if(Array.find<Nat>(r.sources,func(n){n==id})!=null) ({r with title="Review copy withheld";body="";needsReview=true}) else r})

    };
    public shared query ({ caller }) func commissionListFindings(groupId : Nat) : async [CommissionFinding] {
        requireCore(caller, groupId);
        Array.filter<CommissionFinding>(commissionFindings, func(f) {
            f.groupId == groupId
        })
    };
    public shared ({ caller }) func commissionSaveFinding(input : CommissionFinding, isNew : Bool) : async Nat {
        requireCapability(caller,input.groupId,"editSynthesis");
        if (input.body.size() == 0 or (input.kind != "insight" and input.kind != "tension" and input.kind != "proposal")) Debug.trap("Invalid finding");
        validSources(input.groupId, input.sources, false);
        let id = if (isNew) commissionId() else input.id;
        if (not isNew) {
            switch (Array.find<CommissionFinding>(commissionFindings, func(f) {
                f.id == id and f.groupId == input.groupId
            })) {
                case null Debug.trap("Finding not found");
                case _ {
                }
            }
        };
        let f = {
            input with id;
            needsReview = false
        };
        rememberSources(input.groupId,input.sources,"finding",id);
        commissionFindings := if (isNew) Array.append(commissionFindings, [f]) else Array.map<CommissionFinding, CommissionFinding>(commissionFindings, func(x) {
            if (x.id == id) f else x
        });
        id
    };
    public shared ({ caller }) func commissionPublish(input : CommissionPublication) : async () {
        if(not capable(caller,input.groupId,"publish")) Debug.trap("Only the group lead or publication role can publish");
        validSources(input.groupId,input.sources,true);
        if(draftEvidence(input.groupId).needsReview) Debug.trap("Review the recommendation after withdrawal before publishing");
        if (input.title.size() == 0 or input.body.size() == 0) Debug.trap("Publication needs a title and body");
        validSources(input.groupId, input.sources, true);
        var sources=input.sources;
        for(n in sourcesOfDraft(input.groupId).vals()){if(Array.find<Nat>(sources,func(x){x==n})==null) sources:=Array.append(sources,[n])};
        validSources(input.groupId,sources,true);
        let p = {input with at = Time.now();sources};
        let publicationId=commissionId();rememberSources(input.groupId,sources,"publication",publicationId);
        commissionPublicationMarkers:=Array.map<CommissionPublicationMarker,CommissionPublicationMarker>(commissionPublicationMarkers,func(m){if(m.groupId==input.groupId and m.status=="published") ({m with status="superseded"}) else m});
        commissionPublicationMarkers:=Array.append(commissionPublicationMarkers,[{id=publicationId;groupId=input.groupId;at=p.at;sources;status="published"}]);
        commissionPublications := Array.append(Array.filter<CommissionPublication>(commissionPublications, func(x) {
            x.groupId != input.groupId
        }), [p])
    };
    public shared query func commissionPublicationsList() : async [CommissionPublication] {
        commissionPublications
    };
    public shared ({ caller }) func commissionSetupDemo() : async [Nat] {
        requireAuthenticated(caller);
        if (not Prim.isController(caller)) requirePlatformAdmin(caller);
        if (commissionGroups.size() > 0) return Array.map<CommissionGroup, Nat>(commissionGroups, func(g) {
            g.id
        });
        var ids : [Nat] = [];
        for (name in ["Accountability Mechanisms", "Digital Futures"].vals()) {
            let id = nextCommunityId;
            nextCommunityId += 1;
            let purpose = "Illustrative 2048 rehearsal working group. Pilot topics are not yet confirmed.";
            communities := natMap.put(communities, id, {
                id;
                name;
                policy = purpose;
                admin = caller;
                members = [caller]
            });
            Membership.setCommunityRole(membershipState, id, caller, ?#communityAdmin);
            commissionGroups := Array.append(commissionGroups, [{
                id;
                name;
                purpose;
                stage = 0;
                roles = [{
                    principal = caller;
                    role = #lead
                }];
                draft = "";
                disagreements = "";
                draftShared = false
            }]);
            let cid = commissionId();
            commissionConsultations := Array.append(commissionConsultations, [{
                id = cid;
                groupId = id;
                title = "Community perspectives — fictional rehearsal";
                purpose = "Explore experiences, accountability and proposals for change.";
                questions = ["What harms need to be named?", "What historical roots shape these harms?", "Where is governance failing?", "Who holds power and who is excluded?", "What would meaningful accountability look like?", "What repair or transformation is needed?", "What risks or co-option should we avoid?", "What is your vision for 2048?", "What concrete proposals or demands do you have?", "What cautions should movements share?"];
                audience = "public";
                opens = 0;
                closes = 4102444800000000000;
                guidance = "Use fictional information only. Your submission and discussion are private; published quotations require separate consent.";
                closed = false
            }]);
            let exampleId = commissionId();
            let exampleInput : CommissionInput = {
                alias = "Fictional community facilitator"; language = "en";
                answers = "FICTIONAL REHEARSAL INPUT: Accountability should include a clear route for affected communities to question how recommendations represent their experience.";
                internalConsent = true; quoteConsent = true; attributionConsent = false;
                format = "public event"; date = "Fictional rehearsal"; location = "Illustrative community";
                participants = "Three fictional participants, no personal information";
                themes = "Representation and accountability"; tensions = "Speed of drafting versus time for community review";
                proposals = "Return a draft to participants and preserve their disagreements";
            };
            commissionContributions := Array.append(commissionContributions, [{
                id = exampleId; consultationId = cid; input = exampleInput; comments = [];
                withdrawn = false; facilitated = true; owner = ?caller; credential = "";
            }]);
            ids := Array.append(ids, [id])
        };
        ids
    };
}
