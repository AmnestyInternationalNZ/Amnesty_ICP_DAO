import AccessControl "authorization/access-control";
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
    // Initialize the user system state
    let accessControlState = AccessControl.initState();

    // Initialize auth (first caller becomes admin, others become users)
    public shared ({ caller }) func initializeAccessControl() : async () {
        AccessControl.initialize(accessControlState, caller);
    };

    public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
        AccessControl.getUserRole(accessControlState, caller);
    };

    public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
        AccessControl.assignRole(accessControlState, caller, user, role);
    };

    public query ({ caller }) func isCallerAdmin() : async Bool {
        AccessControl.isAdmin(accessControlState, caller);
    };

    public type UserProfile = {
        name : Text;
        // Other user metadata if needed
    };

    transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
    var userProfiles = principalMap.empty<UserProfile>();

    public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
        principalMap.get(userProfiles, caller);
    };

    public query func getUserProfile(user : Principal) : async ?UserProfile {
        principalMap.get(userProfiles, user);
    };

    public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
        userProfiles := principalMap.put(userProfiles, caller, profile);
    };

    // New function to list all users with their profiles
    public query func listAllUsers() : async [(Principal, UserProfile)] {
        Iter.toArray(principalMap.entries(userProfiles));
    };

    // Community Management
    public type Community = {
        id : Nat;
        name : Text;
        policy : Text;
        admin : Principal;
        members : [Principal];
    };

    transient let natMap = OrderedMap.Make<Nat>(Nat.compare);
    var communities = natMap.empty<Community>();
    var nextCommunityId : Nat = 0;

    public shared ({ caller }) func createCommunity(name : Text, policy : Text) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can create communities");
        };

        let community : Community = {
            id = nextCommunityId;
            name;
            policy;
            admin = caller;
            members = [caller];
        };

        communities := natMap.put(communities, nextCommunityId, community);
        nextCommunityId += 1;
    };

    public query func listCommunities() : async [Community] {
        Iter.toArray(natMap.vals(communities));
    };

    public query func getCommunityById(id : Nat) : async ?Community {
        natMap.get(communities, id);
    };

    public shared ({ caller }) func joinCommunity(communityId : Nat) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can join communities");
        };

        switch (natMap.get(communities, communityId)) {
            case null {
                Debug.trap("Community not found");
            };
            case (?community) {
                // Check if caller is already a member
                if (Array.find<Principal>(community.members, func(member) { member == caller }) != null) {
                    Debug.trap("Already a member of the community");
                };

                let updatedMembers = Array.append(community.members, [caller]);
                let updatedCommunity = {
                    community with members = updatedMembers
                };
                communities := natMap.put(communities, communityId, updatedCommunity);
            };
        };
    };

    // New function to allow members to leave a community
    public shared ({ caller }) func leaveCommunity(communityId : Nat) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
            Debug.trap("Unauthorized: Only users can leave communities");
        };

        switch (natMap.get(communities, communityId)) {
            case null {
                Debug.trap("Community not found");
            };
            case (?community) {
                // Check if caller is actually a member
                if (Array.find<Principal>(community.members, func(member) { member == caller }) == null) {
                    Debug.trap("Not a member of the community");
                };

                // Remove the caller from the members array
                let updatedMembers = Array.filter<Principal>(
                    community.members,
                    func(member) { member != caller },
                );

                let updatedCommunity = {
                    community with members = updatedMembers
                };
                communities := natMap.put(communities, communityId, updatedCommunity);
            };
        };
    };

    // New function to allow admins to remove any member from a community
    public shared ({ caller }) func removeMemberFromCommunity(communityId : Nat, memberToRemove : Principal) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can remove members from communities");
        };

        switch (natMap.get(communities, communityId)) {
            case null {
                Debug.trap("Community not found");
            };
            case (?community) {
                // Check if the member to remove is actually a member
                if (Array.find<Principal>(community.members, func(member) { member == memberToRemove }) == null) {
                    Debug.trap("User is not a member of the community");
                };

                // Remove the member from the members array
                let updatedMembers = Array.filter<Principal>(
                    community.members,
                    func(member) { member != memberToRemove },
                );

                let updatedCommunity = {
                    community with members = updatedMembers
                };
                communities := natMap.put(communities, communityId, updatedCommunity);
            };
        };
    };

    // Community Portal
    public query ({ caller }) func enterCommunityPortal(communityId : Nat) : async Community {
        switch (natMap.get(communities, communityId)) {
            case null {
                Debug.trap("Community not found");
            };
            case (?community) {
                if (not (Array.find<Principal>(community.members, func(member) { member == caller }) != null)) {
                    Debug.trap("Access denied: Not a community member");
                };
                community;
            };
        };
    };

    // Proposals and Voting
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

    var proposals = natMap.empty<Proposal>();
    var nextProposalId : Nat = 0;

    // Revert to using arrays for tracking voters
    var votersByProposal = natMap.empty<[Principal]>();

    public shared ({ caller }) func createProposal(communityId : Nat, title : Text, description : Text, overrides : ?ProposalOverrides) : async () {
        switch (natMap.get(communities, communityId)) {
            case null {
                Debug.trap("Community not found");
            };
            case (?community) {
                if (not (Array.find<Principal>(community.members, func(member) { member == caller }) != null)) {
                    Debug.trap("Only community members can create proposals");
                };

                let now = Time.now();
                let defaultWindow = 3_000_000_000_000; // 3 days in nanoseconds
                let defaultQuorum = 1;
                let defaultPassPct = 50;

                let resolvedWindow = switch (overrides) {
                    case null { defaultWindow };
                    case (?o) {
                        switch (o.windowNs) {
                            case null { defaultWindow };
                            case (?w) { w };
                        };
                    };
                };

                let resolvedQuorum = switch (overrides) {
                    case null { defaultQuorum };
                    case (?o) {
                        switch (o.quorum) {
                            case null { defaultQuorum };
                            case (?q) { q };
                        };
                    };
                };

                let resolvedPassPct = switch (overrides) {
                    case null { defaultPassPct };
                    case (?o) {
                        switch (o.passPct) {
                            case null { defaultPassPct };
                            case (?p) { p };
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

                // Initialize an empty voter list for this proposal
                votersByProposal := natMap.put(votersByProposal, nextProposalId, []);

                nextProposalId += 1;
            };
        };
    };

    public query func listProposalsByCommunity(communityId : Nat) : async [Proposal] {
        let allProposals = Iter.toArray(natMap.vals(proposals));
        Array.filter<Proposal>(
            allProposals,
            func(p) { p.communityId == communityId },
        );
    };

    public shared ({ caller }) func voteOnProposal(proposalId : Nat, voteYes : Bool) : async () {
        switch (natMap.get(proposals, proposalId)) {
            case null {
                Debug.trap("Proposal not found");
            };
            case (?proposal) {
                switch (natMap.get(communities, proposal.communityId)) {
                    case null {
                        Debug.trap("Community not found");
                    };
                    case (?community) {
                        if (not (Array.find<Principal>(community.members, func(member) { member == caller }) != null)) {
                            Debug.trap("Only community members can vote");
                        };

                        let now = Time.now();
                        if (now < proposal.startNs) {
                            Debug.trap("Voting has not started yet");
                        };
                        if (now > proposal.endNs) {
                            Debug.trap("Voting window has closed");
                        };

                        // Check if the caller has already voted on this proposal
                        switch (natMap.get(votersByProposal, proposalId)) {
                            case null {
                                Debug.trap("Voter tracking not initialized for this proposal");
                            };
                            case (?voterList) {
                                if (Array.find<Principal>(voterList, func(voter) { voter == caller }) != null) {
                                    Debug.trap("You have already voted on this proposal");
                                };

                                // Add the caller to the voter list
                                let updatedVoterList = Array.append(voterList, [caller]);
                                votersByProposal := natMap.put(votersByProposal, proposalId, updatedVoterList);

                                // Update the proposal vote count
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
        };
    };

    public shared func finalizeProposal(proposalId : Nat) : async () {
        switch (natMap.get(proposals, proposalId)) {
            case null {
                Debug.trap("Proposal not found");
            };
            case (?proposal) {
                let now = Time.now();
                if (now <= proposal.endNs) {
                    Debug.trap("Voting window is still open");
                };

                if (proposal.state != #active) {
                    Debug.trap("Proposal is not in active state");
                };

                let totalVotes = proposal.yes + proposal.no;
                let passThreshold = (proposal.yes * 100) / totalVotes;

                let newState = if (totalVotes >= proposal.quorum and passThreshold >= proposal.passPct) {
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

    public query func getProposalById(proposalId : Nat) : async ?Proposal {
        natMap.get(proposals, proposalId);
    };

    // Fundraising Campaigns
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

    var campaigns = natMap.empty<Campaign>();
    var nextCampaignId : Nat = 0;

    var contributionsByCampaign = natMap.empty<[Contribution]>();
    var campaignUpdates = natMap.empty<CampaignUpdate>();
    var nextUpdateId : Nat = 0;

    public shared ({ caller }) func createCampaign(communityId : Nat, title : Text, description : Text, goalAmount : Nat, deadlineNs : Int) : async () {
        switch (natMap.get(communities, communityId)) {
            case null {
                Debug.trap("Community not found");
            };
            case (?community) {
                if (not (Array.find<Principal>(community.members, func(member) { member == caller }) != null)) {
                    Debug.trap("Only community members can create campaigns");
                };

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

                // Initialize empty contributions for this campaign
                contributionsByCampaign := natMap.put(contributionsByCampaign, nextCampaignId, []);

                nextCampaignId += 1;
            };
        };
    };

    public query func listCampaignsByCommunity(communityId : Nat) : async [Campaign] {
        let allCampaigns = Iter.toArray(natMap.vals(campaigns));
        Array.filter<Campaign>(
            allCampaigns,
            func(c) { c.communityId == communityId },
        );
    };

    public shared ({ caller }) func contributeToCampaign(campaignId : Nat, amount : Nat) : async () {
        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                switch (natMap.get(communities, campaign.communityId)) {
                    case null {
                        Debug.trap("Community not found");
                    };
                    case (?community) {
                        if (not (Array.find<Principal>(community.members, func(member) { member == caller }) != null)) {
                            Debug.trap("Only community members can contribute");
                        };

                        let now = Time.now();
                        if (now > campaign.deadlineNs) {
                            Debug.trap("Campaign deadline has passed");
                        };

                        // Add the contribution
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

                                // Update the campaign total raised
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
        };
    };

    public shared ({ caller }) func addCampaignUpdate(campaignId : Nat, content : Text) : async () {
        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                if (campaign.creator != caller) {
                    Debug.trap("Only campaign creator can add updates");
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

    public query func getCampaignUpdates(campaignId : Nat) : async [CampaignUpdate] {
        let allUpdates = Iter.toArray(natMap.vals(campaignUpdates));
        Array.filter<CampaignUpdate>(
            allUpdates,
            func(u) { u.campaignId == campaignId },
        );
    };

    public query func getCampaignById(campaignId : Nat) : async ?Campaign {
        natMap.get(campaigns, campaignId);
    };

    public query func getCampaignContributions(campaignId : Nat) : async [Contribution] {
        switch (natMap.get(contributionsByCampaign, campaignId)) {
            case null { [] };
            case (?contributions) { contributions };
        };
    };

    // Updated finalizeCampaign function to allow finalization when goal is met, regardless of deadline
    public shared ({ caller }) func finalizeCampaign(campaignId : Nat) : async () {
        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                // Only the campaign creator can finalize
                if (campaign.creator != caller) {
                    Debug.trap("Only campaign creator can finalize the campaign");
                };

                // Check if the campaign is still active
                if (campaign.state != #active) {
                    Debug.trap("Campaign is not in active state");
                };

                // Allow finalization if goal is met, regardless of deadline
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

    // New function to check if campaign can be finalized
    public query ({ caller }) func canFinalizeCampaign(campaignId : Nat) : async Bool {
        switch (natMap.get(campaigns, campaignId)) {
            case null {
                Debug.trap("Campaign not found");
            };
            case (?campaign) {
                // Only the creator can finalize
                if (campaign.creator != caller) {
                    return false;
                };

                // Can finalize if goal is met and campaign is active
                if (campaign.state == #active and campaign.totalRaised >= campaign.goalAmount) {
                    return true;
                };

                false;
            };
        };
    };

    // Stripe integration
    var configuration : ?Stripe.StripeConfiguration = null;

    public query func isStripeConfigured() : async Bool {
        configuration != null;
    };

    public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
        if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
            Debug.trap("Unauthorized: Only admins can perform this action");
        };
        configuration := ?config;
    };

    func getStripeConfiguration() : Stripe.StripeConfiguration {
        switch (configuration) {
            case null Debug.trap("Stripe needs to be first configured");
            case (?value) value;
        };
    };

    public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
        await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
    };

    public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
        await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
    };

    public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
        OutCall.transform(input);
    };
};

