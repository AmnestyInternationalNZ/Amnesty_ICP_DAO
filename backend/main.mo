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
}
