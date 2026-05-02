import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Debug "mo:base/Debug";

module {
    func principalOps() : OrderedMap.Operations<Principal> {
        OrderedMap.Make<Principal>(Principal.compare);
    };

    func natOps() : OrderedMap.Operations<Nat> {
        OrderedMap.Make<Nat>(Nat.compare);
    };

    public type PlatformRole = {
        #platformAdmin;
    };

    public type CommunityRole = {
        #communityAdmin;
        #member;
    };

    public type CommunityAccess = {
        communityRole : ?CommunityRole;
        isPlatformAdmin : Bool;
        canManageMembership : Bool;
        canCreateProposal : Bool;
        canVoteOnProposal : Bool;
        canCreateCampaign : Bool;
        canContributeToCampaign : Bool;
        canLeaveCommunity : Bool;
    };

    public type MembershipState = {
        var platformAdminsImported : Bool;
        var platformAdmins : OrderedMap.Map<Principal, PlatformRole>;
        var importedCommunities : OrderedMap.Map<Nat, Bool>;
        var communityRoles : OrderedMap.Map<Nat, OrderedMap.Map<Principal, CommunityRole>>;
    };

    public func initState() : MembershipState {
        let principalMap = principalOps();
        let natMap = natOps();
        {
            var platformAdminsImported = false;
            var platformAdmins = principalMap.empty<PlatformRole>();
            var importedCommunities = natMap.empty<Bool>();
            var communityRoles = natMap.empty<OrderedMap.Map<Principal, CommunityRole>>();
        };
    };

    public func requireAuthenticated(caller : Principal) {
        if (Principal.isAnonymous(caller)) {
            Debug.trap("Anonymous callers are not allowed");
        };
    };

    public func isPlatformAdminsImported(state : MembershipState) : Bool {
        state.platformAdminsImported;
    };

    public func isCommunityImported(state : MembershipState, communityId : Nat) : Bool {
        let natMap = natOps();
        switch (natMap.get(state.importedCommunities, communityId)) {
            case (?_) { true };
            case null { false };
        };
    };

    public func getCallerPlatformRole(
        state : MembershipState,
        caller : Principal,
        legacyPlatformAdmin : Bool,
    ) : ?PlatformRole {
        let principalMap = principalOps();
        if (Principal.isAnonymous(caller)) {
            return null;
        };

        switch (principalMap.get(state.platformAdmins, caller)) {
            case (?role) { ?role };
            case null {
                if (legacyPlatformAdmin and not state.platformAdminsImported) {
                    ?#platformAdmin;
                } else {
                    null;
                };
            };
        };
    };

    public func isPlatformAdmin(
        state : MembershipState,
        caller : Principal,
        legacyPlatformAdmin : Bool,
    ) : Bool {
        switch (getCallerPlatformRole(state, caller, legacyPlatformAdmin)) {
            case (?_) { true };
            case null { false };
        };
    };

    public func listPlatformAdmins(
        state : MembershipState,
        legacyPlatformAdmins : [Principal],
    ) : [Principal] {
        let principalMap = principalOps();
        if (state.platformAdminsImported) {
            return Iter.toArray(principalMap.keys(state.platformAdmins));
        };

        var admins = Iter.toArray(principalMap.keys(state.platformAdmins));
        for (legacyAdmin in legacyPlatformAdmins.vals()) {
            if (Array.find<Principal>(admins, func(existing) { existing == legacyAdmin }) == null) {
                admins := Array.append(admins, [legacyAdmin]);
            };
        };
        admins;
    };

    public func importLegacyPlatformAdmins(
        state : MembershipState,
        legacyPlatformAdmins : [Principal],
    ) {
        let principalMap = principalOps();
        if (state.platformAdminsImported) {
            return;
        };

        var admins = state.platformAdmins;
        for (legacyAdmin in legacyPlatformAdmins.vals()) {
            if (not Principal.isAnonymous(legacyAdmin)) {
                admins := principalMap.put(admins, legacyAdmin, #platformAdmin);
            };
        };

        state.platformAdmins := admins;
        state.platformAdminsImported := true;
    };

    public func bootstrapPlatformAdmin(
        state : MembershipState,
        caller : Principal,
    ) {
        requireAuthenticated(caller);
        importLegacyPlatformAdmins(state, []);
        let principalMap = principalOps();
        state.platformAdmins := principalMap.put(state.platformAdmins, caller, #platformAdmin);
    };

    public func setPlatformAdmin(
        state : MembershipState,
        user : Principal,
        enabled : Bool,
    ) {
        requireAuthenticated(user);
        let principalMap = principalOps();
        if (enabled) {
            state.platformAdmins := principalMap.put(state.platformAdmins, user, #platformAdmin);
        } else {
            state.platformAdmins := principalMap.delete(state.platformAdmins, user);
        };
    };

    public func countImportedPlatformAdmins(state : MembershipState) : Nat {
        let principalMap = principalOps();
        Iter.size(principalMap.keys(state.platformAdmins));
    };

    func getExplicitCommunityRole(
        state : MembershipState,
        communityId : Nat,
        caller : Principal,
    ) : ?CommunityRole {
        let natMap = natOps();
        let principalMap = principalOps();
        switch (natMap.get(state.communityRoles, communityId)) {
            case null { null };
            case (?roleMap) { principalMap.get(roleMap, caller) };
        };
    };

    public func importLegacyCommunityRoles(
        state : MembershipState,
        communityId : Nat,
        legacyCommunityAdmin : Principal,
        legacyCommunityMembers : [Principal],
    ) {
        let natMap = natOps();
        let principalMap = principalOps();
        if (isCommunityImported(state, communityId)) {
            return;
        };

        var roleMap = switch (natMap.get(state.communityRoles, communityId)) {
            case null { principalMap.empty<CommunityRole>() };
            case (?existing) { existing };
        };

        if (not Principal.isAnonymous(legacyCommunityAdmin)) {
            roleMap := principalMap.put(roleMap, legacyCommunityAdmin, #communityAdmin);
        };

        for (legacyMember in legacyCommunityMembers.vals()) {
            if (not Principal.isAnonymous(legacyMember)) {
                switch (principalMap.get(roleMap, legacyMember)) {
                    case (?existingRole) {
                        if (existingRole != #communityAdmin) {
                            roleMap := principalMap.put(roleMap, legacyMember, #member);
                        };
                    };
                    case null {
                        roleMap := principalMap.put(roleMap, legacyMember, #member);
                    };
                };
            };
        };

        state.communityRoles := natMap.put(state.communityRoles, communityId, roleMap);
        state.importedCommunities := natMap.put(state.importedCommunities, communityId, true);
    };

    public func getCallerCommunityRole(
        state : MembershipState,
        caller : Principal,
        communityId : Nat,
        legacyCommunityAdmin : Principal,
        legacyCommunityMembers : [Principal],
    ) : ?CommunityRole {
        if (Principal.isAnonymous(caller)) {
            return null;
        };

        switch (getExplicitCommunityRole(state, communityId, caller)) {
            case (?role) { ?role };
            case null {
                if (isCommunityImported(state, communityId)) {
                    null;
                } else if (caller == legacyCommunityAdmin) {
                    ?#communityAdmin;
                } else if (Array.find<Principal>(legacyCommunityMembers, func(member) { member == caller }) != null) {
                    ?#member;
                } else {
                    null;
                };
            };
        };
    };

    func mergeRoleEntries(
        entries : [(Principal, CommunityRole)],
        principal : Principal,
        role : CommunityRole,
    ) : [(Principal, CommunityRole)] {
        switch (Array.find<(Principal, CommunityRole)>(entries, func((existingPrincipal, _)) { existingPrincipal == principal })) {
            case null {
                Array.append(entries, [(principal, role)]);
            };
            case (?_) {
                Array.map<(Principal, CommunityRole), (Principal, CommunityRole)>(
                    entries,
                    func((existingPrincipal, existingRole)) {
                        if (existingPrincipal != principal) {
                            (existingPrincipal, existingRole);
                        } else {
                            switch (existingRole, role) {
                                case (#communityAdmin, _) {
                                    (existingPrincipal, #communityAdmin);
                                };
                                case (_, #communityAdmin) {
                                    (existingPrincipal, #communityAdmin);
                                };
                                case _ {
                                    (existingPrincipal, role);
                                };
                            };
                        };
                    },
                );
            };
        };
    };

    public func listCommunityRoleEntries(
        state : MembershipState,
        communityId : Nat,
        legacyCommunityAdmin : Principal,
        legacyCommunityMembers : [Principal],
    ) : [(Principal, CommunityRole)] {
        let natMap = natOps();
        let principalMap = principalOps();
        var entries = switch (natMap.get(state.communityRoles, communityId)) {
            case null { [] };
            case (?roleMap) { Iter.toArray(principalMap.entries(roleMap)) };
        };

        if (isCommunityImported(state, communityId)) {
            return entries;
        };

        if (not Principal.isAnonymous(legacyCommunityAdmin)) {
            entries := mergeRoleEntries(entries, legacyCommunityAdmin, #communityAdmin);
        };

        for (legacyMember in legacyCommunityMembers.vals()) {
            if (not Principal.isAnonymous(legacyMember)) {
                entries := mergeRoleEntries(entries, legacyMember, #member);
            };
        };

        entries;
    };

    public func getCommunityAccess(
        state : MembershipState,
        caller : Principal,
        communityId : Nat,
        legacyPlatformAdmin : Bool,
        legacyCommunityAdmin : Principal,
        legacyCommunityMembers : [Principal],
    ) : CommunityAccess {
        let communityRole = getCallerCommunityRole(
            state,
            caller,
            communityId,
            legacyCommunityAdmin,
            legacyCommunityMembers,
        );
        let platformAdmin = isPlatformAdmin(state, caller, legacyPlatformAdmin);
        let communityAdmin = switch (communityRole) {
            case (?#communityAdmin) { true };
            case _ { false };
        };
        let participant = switch (communityRole) {
            case (?_) { true };
            case null { false };
        };
        let canParticipate = platformAdmin or participant;

        {
            communityRole;
            isPlatformAdmin = platformAdmin;
            canManageMembership = platformAdmin or communityAdmin;
            canCreateProposal = canParticipate;
            canVoteOnProposal = canParticipate;
            canCreateCampaign = canParticipate;
            canContributeToCampaign = canParticipate;
            canLeaveCommunity = switch (communityRole) {
                case (?#member) { true };
                case _ { false };
            };
        };
    };

    public func setCommunityRole(
        state : MembershipState,
        communityId : Nat,
        user : Principal,
        role : ?CommunityRole,
    ) {
        requireAuthenticated(user);
        let natMap = natOps();
        let principalMap = principalOps();

        var roleMap = switch (natMap.get(state.communityRoles, communityId)) {
            case null { principalMap.empty<CommunityRole>() };
            case (?existing) { existing };
        };

        switch (role) {
            case null {
                roleMap := principalMap.delete(roleMap, user);
            };
            case (?value) {
                roleMap := principalMap.put(roleMap, user, value);
            };
        };

        state.communityRoles := natMap.put(state.communityRoles, communityId, roleMap);
        state.importedCommunities := natMap.put(state.importedCommunities, communityId, true);
    };

    public func removeCommunityRole(
        state : MembershipState,
        communityId : Nat,
        user : Principal,
    ) {
        requireAuthenticated(user);
        setCommunityRole(state, communityId, user, null);
    };
}
