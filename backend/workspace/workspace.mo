import Array "mo:base/Array";
import Blob "mo:base/Blob";
import Debug "mo:base/Debug";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Time "mo:base/Time";

module {
    public type CommunityRole = {
        #communityAdmin;
        #member;
    };

    public type CallerAccess = {
        communityRole : ?CommunityRole;
        isPlatformAdmin : Bool;
    };

    public type WorkspaceRole = {
        #owner;
        #editor;
        #viewer;
    };

    public type WorkspaceAccessEntry = {
        user : Principal;
        role : WorkspaceRole;
    };

    public type VersionedUpdate = {
        version : Nat;
        update : Blob;
    };

    public type CommunityDocument = {
        id : Nat;
        communityId : Nat;
        title : Text;
        owner : Principal;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        access : [WorkspaceAccessEntry];
        communityShare : ?WorkspaceRole;
        parentId : ?Nat;
        version : Nat;
        snapshot : ?Blob;
        updates : [VersionedUpdate];
    };

    public type CommunityDocumentSummary = {
        id : Nat;
        communityId : Nat;
        title : Text;
        owner : Principal;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        role : WorkspaceRole;
        communityShare : ?WorkspaceRole;
        parentId : ?Nat;
        version : Nat;
    };

    public type CommunityDocumentPayload = {
        id : Nat;
        communityId : Nat;
        title : Text;
        owner : Principal;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        role : WorkspaceRole;
        access : [WorkspaceAccessEntry];
        communityShare : ?WorkspaceRole;
        parentId : ?Nat;
        version : Nat;
        snapshot : ?Blob;
        updates : [Blob];
    };

    public type KanbanColumn = {
        id : Nat;
        title : Text;
        cardIds : [Nat];
    };

    public type KanbanCardInput = {
        title : Text;
        description : ?Text;
        assignedTo : [Principal];
        docId : ?Nat;
        eventId : ?Nat;
        dueDateUtc : ?Int;
    };

    public type KanbanCard = {
        id : Nat;
        title : Text;
        description : ?Text;
        createdBy : Principal;
        assignedTo : [Principal];
        docId : ?Nat;
        eventId : ?Nat;
        dueDateUtc : ?Int;
        createdAt : Int;
        updatedAt : Int;
    };

    public type CommunityBoard = {
        id : Nat;
        communityId : Nat;
        title : Text;
        owner : Principal;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        access : [WorkspaceAccessEntry];
        communityShare : ?WorkspaceRole;
        columns : [KanbanColumn];
        cards : [KanbanCard];
        nextColumnId : Nat;
        nextCardId : Nat;
    };

    public type CommunityBoardPublicLink = {
        boardId : Nat;
        token : Text;
    };

    public type CommunityBoardSummary = {
        id : Nat;
        communityId : Nat;
        title : Text;
        owner : Principal;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        role : WorkspaceRole;
        communityShare : ?WorkspaceRole;
        columnCount : Nat;
        cardCount : Nat;
    };

    public type CommunityBoardPayload = {
        id : Nat;
        communityId : Nat;
        title : Text;
        owner : Principal;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        role : WorkspaceRole;
        access : [WorkspaceAccessEntry];
        communityShare : ?WorkspaceRole;
        publicToken : ?Text;
        columns : [KanbanColumn];
        cards : [KanbanCard];
    };

    public type CommunityEventInput = {
        title : Text;
        description : ?Text;
        location : ?Text;
        startUtc : Int;
        endUtc : Int;
        allDay : Bool;
    };

    public type CommunityEvent = {
        id : Nat;
        communityId : Nat;
        title : Text;
        description : ?Text;
        location : ?Text;
        owner : Principal;
        startUtc : Int;
        endUtc : Int;
        allDay : Bool;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        access : [WorkspaceAccessEntry];
        communityShare : ?WorkspaceRole;
    };

    public type CommunityEventPayload = {
        id : Nat;
        communityId : Nat;
        title : Text;
        description : ?Text;
        location : ?Text;
        owner : Principal;
        startUtc : Int;
        endUtc : Int;
        allDay : Bool;
        createdAt : Int;
        updatedAt : Int;
        archived : Bool;
        role : WorkspaceRole;
        access : [WorkspaceAccessEntry];
        communityShare : ?WorkspaceRole;
    };

    public type WorkspaceState = {
        var nextDocumentId : Nat;
        var documents : [CommunityDocument];
        var nextBoardId : Nat;
        var boards : [CommunityBoard];
        var nextEventId : Nat;
        var events : [CommunityEvent];
    };

    let MAX_TITLE_SIZE : Nat = 160;
    let MAX_DOCS_PER_OWNER : Nat = 100;
    let MAX_BOARDS_PER_OWNER : Nat = 50;
    let MAX_EVENTS_PER_OWNER : Nat = 500;
    let MAX_COLUMNS_PER_BOARD : Nat = 24;
    let MAX_CARDS_PER_BOARD : Nat = 500;
    let MAX_CARD_DESCRIPTION_SIZE : Nat = 64_000;
    let MAX_EVENT_TEXT_SIZE : Nat = 1_000;
    let MAX_CARD_ASSIGNEES : Nat = 20;
    let MAX_ACCESS_ENTRIES : Nat = 50;
    let MAX_UPDATE_SIZE : Nat = 131_072;
    let MAX_UPDATES_PER_DOC : Nat = 500;
    let MAX_SNAPSHOT_SIZE : Nat = 1_048_576;
    let MIN_PUBLIC_TOKEN_SIZE : Nat = 32;
    let MAX_PUBLIC_TOKEN_SIZE : Nat = 160;

    public func initState() : WorkspaceState {
        {
            var nextDocumentId = 0;
            var documents = [];
            var nextBoardId = 0;
            var boards = [];
            var nextEventId = 0;
            var events = [];
        };
    };

    func requireAuthenticated(caller : Principal) {
        if (Principal.isAnonymous(caller)) {
            Debug.trap("Anonymous callers are not allowed");
        };
    };

    func isCommunityAdmin(access : CallerAccess) : Bool {
        switch (access.communityRole) {
            case (?#communityAdmin) true;
            case _ false;
        };
    };

    func canUseWorkspace(access : CallerAccess) : Bool {
        access.isPlatformAdmin or access.communityRole != null;
    };

    func hasAdminOverride(access : CallerAccess) : Bool {
        access.isPlatformAdmin or isCommunityAdmin(access);
    };

    func requireWorkspaceParticipant(caller : Principal, access : CallerAccess) {
        requireAuthenticated(caller);
        if (not canUseWorkspace(access)) {
            Debug.trap("Unauthorized: Community workspace access requires a community role");
        };
    };

    func validateTitle(title : Text) {
        let size = Text.size(title);
        if (size == 0 or size > MAX_TITLE_SIZE) {
            Debug.trap("Title must be between 1 and 160 characters");
        };
    };

    func validatePublicToken(token : Text) {
        let size = Text.size(token);
        if (size < MIN_PUBLIC_TOKEN_SIZE or size > MAX_PUBLIC_TOKEN_SIZE) {
            Debug.trap("Public link token must be between 32 and 160 characters");
        };
    };

    func validateOptionalText(value : ?Text, maxSize : Nat, fieldLabel : Text) {
        switch (value) {
            case (?text) {
                if (Text.size(text) > maxSize) {
                    Debug.trap(fieldLabel # " is too large");
                };
            };
            case null {};
        };
    };

    func validateBlobSize(value : Blob, maxSize : Nat, fieldLabel : Text) {
        if (Array.size(Blob.toArray(value)) > maxSize) {
            Debug.trap(fieldLabel # " is too large");
        };
    };

    func validateShareRole(role : WorkspaceRole) {
        switch (role) {
            case (#owner) Debug.trap("Owner role cannot be granted");
            case (#editor) {};
            case (#viewer) {};
        };
    };

    func validateGrantTarget(user : Principal, targetIsCommunityParticipant : Bool) {
        if (Principal.isAnonymous(user)) {
            Debug.trap("Cannot grant access to anonymous principal");
        };
        if (not targetIsCommunityParticipant) {
            Debug.trap("Access grants are restricted to current members of this community");
        };
    };

    func validateCardInput(input : KanbanCardInput) {
        validateTitle(input.title);
        validateOptionalText(input.description, MAX_CARD_DESCRIPTION_SIZE, "Card description");
        if (Array.size(input.assignedTo) > MAX_CARD_ASSIGNEES) {
            Debug.trap("Too many card assignees");
        };
        for (assignee in input.assignedTo.vals()) {
            if (Principal.isAnonymous(assignee)) {
                Debug.trap("Card assignees must be authenticated principals");
            };
        };
    };

    func validateEventInput(input : CommunityEventInput) {
        validateTitle(input.title);
        validateOptionalText(input.description, MAX_EVENT_TEXT_SIZE, "Event description");
        validateOptionalText(input.location, MAX_EVENT_TEXT_SIZE, "Event location");
        if (input.endUtc <= input.startUtc) {
            Debug.trap("Event end must be after start");
        };
    };

    func accessEntryRole(entries : [WorkspaceAccessEntry], caller : Principal) : ?WorkspaceRole {
        for (entry in entries.vals()) {
            if (entry.user == caller) {
                return ?entry.role;
            };
        };
        null;
    };

    func effectiveRole(
        owner : Principal,
        entries : [WorkspaceAccessEntry],
        communityShare : ?WorkspaceRole,
        caller : Principal,
        access : CallerAccess,
    ) : ?WorkspaceRole {
        if (not canUseWorkspace(access)) {
            return null;
        };
        if (owner == caller) {
            return ?#owner;
        };
        if (hasAdminOverride(access)) {
            return ?#editor;
        };
        switch (accessEntryRole(entries, caller)) {
            case (?role) ?role;
            case null communityShare;
        };
    };

    func canEdit(role : WorkspaceRole) : Bool {
        switch (role) {
            case (#owner) true;
            case (#editor) true;
            case (#viewer) false;
        };
    };

    func requireRole(role : ?WorkspaceRole, missingMessage : Text) : WorkspaceRole {
        switch (role) {
            case (?value) value;
            case null Debug.trap(missingMessage);
        };
    };

    func requireEditor(role : ?WorkspaceRole, resourceLabel : Text) : WorkspaceRole {
        let value = requireRole(role, resourceLabel # " not found");
        if (not canEdit(value)) {
            Debug.trap("Caller cannot edit this " # resourceLabel);
        };
        value;
    };

    func requireManager(owner : Principal, caller : Principal, access : CallerAccess, resourceLabel : Text) {
        if (owner != caller and not hasAdminOverride(access)) {
            Debug.trap("Caller cannot manage this " # resourceLabel);
        };
    };

    func setAccess(entries : [WorkspaceAccessEntry], user : Principal, role : ?WorkspaceRole) : [WorkspaceAccessEntry] {
        var existed = false;
        var next : [WorkspaceAccessEntry] = [];
        for (entry in entries.vals()) {
            if (entry.user == user) {
                existed := true;
            } else {
                next := Array.append(next, [entry]);
            };
        };

        switch (role) {
            case null next;
            case (?value) {
                validateShareRole(value);
                if (not existed and Array.size(entries) >= MAX_ACCESS_ENTRIES) {
                    Debug.trap("Access list is full");
                };
                Array.append(next, [{ user; role = value }]);
            };
        };
    };

    func documentIndex(state : WorkspaceState, documentId : Nat) : ?Nat {
        var index : Nat = 0;
        for (document in state.documents.vals()) {
            if (document.id == documentId) {
                return ?index;
            };
            index += 1;
        };
        null;
    };

    func boardIndex(state : WorkspaceState, boardId : Nat) : ?Nat {
        var index : Nat = 0;
        for (board in state.boards.vals()) {
            if (board.id == boardId) {
                return ?index;
            };
            index += 1;
        };
        null;
    };

    func eventIndex(state : WorkspaceState, eventId : Nat) : ?Nat {
        var index : Nat = 0;
        for (event in state.events.vals()) {
            if (event.id == eventId) {
                return ?index;
            };
            index += 1;
        };
        null;
    };

    func getDocumentOrTrap(state : WorkspaceState, communityId : Nat, documentId : Nat) : CommunityDocument {
        switch (documentIndex(state, documentId)) {
            case null Debug.trap("Document not found");
            case (?index) {
                let document = state.documents[index];
                if (document.communityId != communityId) {
                    Debug.trap("Document does not belong to this community");
                };
                document;
            };
        };
    };

    func getBoardOrTrap(state : WorkspaceState, communityId : Nat, boardId : Nat) : CommunityBoard {
        switch (boardIndex(state, boardId)) {
            case null Debug.trap("Board not found");
            case (?index) {
                let board = state.boards[index];
                if (board.communityId != communityId) {
                    Debug.trap("Board does not belong to this community");
                };
                board;
            };
        };
    };

    func getEventOrTrap(state : WorkspaceState, communityId : Nat, eventId : Nat) : CommunityEvent {
        switch (eventIndex(state, eventId)) {
            case null Debug.trap("Event not found");
            case (?index) {
                let event = state.events[index];
                if (event.communityId != communityId) {
                    Debug.trap("Event does not belong to this community");
                };
                event;
            };
        };
    };

    func replaceDocument(state : WorkspaceState, updated : CommunityDocument) {
        state.documents := Array.map<CommunityDocument, CommunityDocument>(
            state.documents,
            func(document) {
                if (document.id == updated.id) {
                    updated;
                } else {
                    document;
                };
            },
        );
    };

    func replaceBoard(state : WorkspaceState, updated : CommunityBoard) {
        state.boards := Array.map<CommunityBoard, CommunityBoard>(
            state.boards,
            func(board) {
                if (board.id == updated.id) {
                    updated;
                } else {
                    board;
                };
            },
        );
    };

    func replaceEvent(state : WorkspaceState, updated : CommunityEvent) {
        state.events := Array.map<CommunityEvent, CommunityEvent>(
            state.events,
            func(event) {
                if (event.id == updated.id) {
                    updated;
                } else {
                    event;
                };
            },
        );
    };

    func countDocumentsFor(state : WorkspaceState, communityId : Nat, owner : Principal) : Nat {
        var count : Nat = 0;
        for (document in state.documents.vals()) {
            if (document.communityId == communityId and document.owner == owner and not document.archived) {
                count += 1;
            };
        };
        count;
    };

    func countBoardsFor(state : WorkspaceState, communityId : Nat, owner : Principal) : Nat {
        var count : Nat = 0;
        for (board in state.boards.vals()) {
            if (board.communityId == communityId and board.owner == owner and not board.archived) {
                count += 1;
            };
        };
        count;
    };

    func countEventsFor(state : WorkspaceState, communityId : Nat, owner : Principal) : Nat {
        var count : Nat = 0;
        for (event in state.events.vals()) {
            if (event.communityId == communityId and event.owner == owner and not event.archived) {
                count += 1;
            };
        };
        count;
    };

    func documentRole(document : CommunityDocument, caller : Principal, access : CallerAccess) : ?WorkspaceRole {
        if (document.archived) {
            return null;
        };
        effectiveRole(document.owner, document.access, document.communityShare, caller, access);
    };

    func boardRole(board : CommunityBoard, caller : Principal, access : CallerAccess) : ?WorkspaceRole {
        if (board.archived) {
            return null;
        };
        effectiveRole(board.owner, board.access, board.communityShare, caller, access);
    };

    func eventRole(event : CommunityEvent, caller : Principal, access : CallerAccess) : ?WorkspaceRole {
        if (event.archived) {
            return null;
        };
        effectiveRole(event.owner, event.access, event.communityShare, caller, access);
    };

    func toDocumentSummary(document : CommunityDocument, role : WorkspaceRole) : CommunityDocumentSummary {
        {
            id = document.id;
            communityId = document.communityId;
            title = document.title;
            owner = document.owner;
            createdAt = document.createdAt;
            updatedAt = document.updatedAt;
            archived = document.archived;
            role;
            communityShare = document.communityShare;
            parentId = document.parentId;
            version = document.version;
        };
    };

    func toDocumentPayload(document : CommunityDocument, role : WorkspaceRole) : CommunityDocumentPayload {
        {
            id = document.id;
            communityId = document.communityId;
            title = document.title;
            owner = document.owner;
            createdAt = document.createdAt;
            updatedAt = document.updatedAt;
            archived = document.archived;
            role;
            access = document.access;
            communityShare = document.communityShare;
            parentId = document.parentId;
            version = document.version;
            snapshot = document.snapshot;
            updates = Array.map<VersionedUpdate, Blob>(document.updates, func(entry) { entry.update });
        };
    };

    func toBoardSummary(board : CommunityBoard, role : WorkspaceRole) : CommunityBoardSummary {
        {
            id = board.id;
            communityId = board.communityId;
            title = board.title;
            owner = board.owner;
            createdAt = board.createdAt;
            updatedAt = board.updatedAt;
            archived = board.archived;
            role;
            communityShare = board.communityShare;
            columnCount = Array.size(board.columns);
            cardCount = Array.size(board.cards);
        };
    };

    func boardPublicTokenFor(boardPublicLinks : [CommunityBoardPublicLink], boardId : Nat) : ?Text {
        for (link in boardPublicLinks.vals()) {
            if (link.boardId == boardId) {
                return ?link.token;
            };
        };
        null;
    };

    func publicTokenAlreadyUsed(boardPublicLinks : [CommunityBoardPublicLink], boardId : Nat, token : Text) : Bool {
        for (link in boardPublicLinks.vals()) {
            if (link.token == token and link.boardId != boardId) {
                return true;
            };
        };
        false;
    };

    func setBoardPublicToken(boardPublicLinks : [CommunityBoardPublicLink], boardId : Nat, token : ?Text) : [CommunityBoardPublicLink] {
        var nextLinks = Array.filter<CommunityBoardPublicLink>(
            boardPublicLinks,
            func(link) {
                link.boardId != boardId;
            },
        );
        switch (token) {
            case null {};
            case (?value) {
                nextLinks := Array.append(nextLinks, [{ boardId; token = value }]);
            };
        };
        nextLinks;
    };

    func toBoardPayload(
        boardPublicLinks : [CommunityBoardPublicLink],
        board : CommunityBoard,
        role : WorkspaceRole,
        includeAccess : Bool,
        includeCommunityShare : Bool,
        includePublicToken : Bool,
    ) : CommunityBoardPayload {
        {
            id = board.id;
            communityId = board.communityId;
            title = board.title;
            owner = board.owner;
            createdAt = board.createdAt;
            updatedAt = board.updatedAt;
            archived = board.archived;
            role;
            access = if (includeAccess) board.access else [];
            communityShare = if (includeCommunityShare) board.communityShare else null;
            publicToken = if (includePublicToken) boardPublicTokenFor(boardPublicLinks, board.id) else null;
            columns = board.columns;
            cards = board.cards;
        };
    };

    func toEventPayload(event : CommunityEvent, role : WorkspaceRole) : CommunityEventPayload {
        {
            id = event.id;
            communityId = event.communityId;
            title = event.title;
            description = event.description;
            location = event.location;
            owner = event.owner;
            startUtc = event.startUtc;
            endUtc = event.endUtc;
            allDay = event.allDay;
            createdAt = event.createdAt;
            updatedAt = event.updatedAt;
            archived = event.archived;
            role;
            access = event.access;
            communityShare = event.communityShare;
        };
    };

    func parentFor(state : WorkspaceState, documentId : Nat) : ?Nat {
        switch (documentIndex(state, documentId)) {
            case null null;
            case (?index) state.documents[index].parentId;
        };
    };

    func wouldCreateParentCycle(state : WorkspaceState, documentId : Nat, parentId : Nat) : Bool {
        var cursor : ?Nat = ?parentId;
        var guard : Nat = 0;
        while (guard < Array.size(state.documents)) {
            switch (cursor) {
                case null return false;
                case (?current) {
                    if (current == documentId) {
                        return true;
                    };
                    cursor := parentFor(state, current);
                };
            };
            guard += 1;
        };
        true;
    };

    func columnIndex(columns : [KanbanColumn], columnId : Nat) : ?Nat {
        var index : Nat = 0;
        for (column in columns.vals()) {
            if (column.id == columnId) {
                return ?index;
            };
            index += 1;
        };
        null;
    };

    func cardIndex(cards : [KanbanCard], cardId : Nat) : ?Nat {
        var index : Nat = 0;
        for (card in cards.vals()) {
            if (card.id == cardId) {
                return ?index;
            };
            index += 1;
        };
        null;
    };

    func containsNat(values : [Nat], value : Nat) : Bool {
        for (candidate in values.vals()) {
            if (candidate == value) {
                return true;
            };
        };
        false;
    };

    func insertCardId(cardIds : [Nat], cardId : Nat, targetIndex : Nat) : [Nat] {
        var result : [Nat] = [];
        var index = targetIndex;
        if (index > Array.size(cardIds)) {
            index := Array.size(cardIds);
        };

        var i : Nat = 0;
        var inserted = false;
        while (i < Array.size(cardIds)) {
            if (i == index) {
                result := Array.append(result, [cardId]);
                inserted := true;
            };
            result := Array.append(result, [cardIds[i]]);
            i += 1;
        };

        if (not inserted) {
            result := Array.append(result, [cardId]);
        };
        result;
    };

    func validateLinkedDocument(state : WorkspaceState, communityId : Nat, documentId : ?Nat) {
        switch (documentId) {
            case null {};
            case (?id) {
                let document = getDocumentOrTrap(state, communityId, id);
                if (document.archived) {
                    Debug.trap("Linked document is archived");
                };
            };
        };
    };

    func validateLinkedEvent(state : WorkspaceState, communityId : Nat, eventId : ?Nat) {
        switch (eventId) {
            case null {};
            case (?id) {
                let event = getEventOrTrap(state, communityId, id);
                if (event.archived) {
                    Debug.trap("Linked event is archived");
                };
            };
        };
    };

    public func createDocument(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, title : Text) : Nat {
        requireWorkspaceParticipant(caller, access);
        validateTitle(title);
        if (countDocumentsFor(state, communityId, caller) >= MAX_DOCS_PER_OWNER) {
            Debug.trap("Document quota reached");
        };

        let now = Time.now();
        let id = state.nextDocumentId;
        state.nextDocumentId += 1;
        let document : CommunityDocument = {
            id;
            communityId;
            title;
            owner = caller;
            createdAt = now;
            updatedAt = now;
            archived = false;
            access = [];
            communityShare = null;
            parentId = null;
            version = 0;
            snapshot = null;
            updates = [];
        };
        state.documents := Array.append(state.documents, [document]);
        id;
    };

    public func listDocuments(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess) : [CommunityDocumentSummary] {
        requireWorkspaceParticipant(caller, access);
        var visible : [CommunityDocumentSummary] = [];
        for (document in state.documents.vals()) {
            if (document.communityId == communityId and not document.archived) {
                switch (documentRole(document, caller, access)) {
                    case (?role) visible := Array.append(visible, [toDocumentSummary(document, role)]);
                    case null {};
                };
            };
        };
        visible;
    };

    public func getDocument(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat) : ?CommunityDocumentPayload {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        switch (documentRole(document, caller, access)) {
            case (?role) ?toDocumentPayload(document, role);
            case null null;
        };
    };

    public func renameDocument(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat, title : Text) {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        validateTitle(title);
        ignore requireEditor(documentRole(document, caller, access), "document");
        replaceDocument(state, { document with title; updatedAt = Time.now() });
    };

    public func appendDocumentUpdate(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat, update : Blob) : Nat {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        validateBlobSize(update, MAX_UPDATE_SIZE, "Document update");
        ignore requireEditor(documentRole(document, caller, access), "document");
        if (Array.size(document.updates) >= MAX_UPDATES_PER_DOC) {
            Debug.trap("Too many uncompacted document updates");
        };
        let nextVersion = document.version + 1;
        let updated = {
            document with
            updatedAt = Time.now();
            version = nextVersion;
            updates = Array.append(document.updates, [{ version = nextVersion; update }]);
        };
        replaceDocument(state, updated);
        nextVersion;
    };

    public func saveDocumentSnapshot(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat, snapshot : Blob, compactThroughVersion : Nat) {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        validateBlobSize(snapshot, MAX_SNAPSHOT_SIZE, "Document snapshot");
        ignore requireEditor(documentRole(document, caller, access), "document");
        if (compactThroughVersion > document.version) {
            Debug.trap("Cannot compact beyond current document version");
        };
        replaceDocument(
            state,
            {
                document with
                updatedAt = Time.now();
                snapshot = ?snapshot;
                updates = Array.filter<VersionedUpdate>(
                    document.updates,
                    func(entry) { entry.version > compactThroughVersion },
                );
            },
        );
    };

    public func setDocumentParent(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat, parentId : ?Nat) : ?Nat {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        requireManager(document.owner, caller, access, "document");
        switch (parentId) {
            case null {};
            case (?value) {
                if (value == documentId) {
                    Debug.trap("Document cannot be its own parent");
                };
                let parent = getDocumentOrTrap(state, communityId, value);
                if (parent.archived) {
                    Debug.trap("Parent document is archived");
                };
                if (wouldCreateParentCycle(state, documentId, value)) {
                    Debug.trap("Document parent would create a cycle");
                };
            };
        };
        replaceDocument(state, { document with parentId; updatedAt = Time.now() });
        parentId;
    };

    public func setDocumentShare(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat, role : ?WorkspaceRole) : ?WorkspaceRole {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        switch (role) {
            case (?value) validateShareRole(value);
            case null {};
        };
        requireManager(document.owner, caller, access, "document");
        replaceDocument(state, { document with communityShare = role; updatedAt = Time.now() });
        role;
    };

    public func setDocumentGrant(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat, user : Principal, role : ?WorkspaceRole, targetIsCommunityParticipant : Bool) {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        switch (role) {
            case null {
                if (Principal.isAnonymous(user)) {
                    Debug.trap("Cannot revoke access for anonymous principal");
                };
            };
            case (?_) validateGrantTarget(user, targetIsCommunityParticipant);
        };
        if (document.owner == user) {
            Debug.trap("Owner role is derived and cannot be granted");
        };
        requireManager(document.owner, caller, access, "document");
        replaceDocument(state, { document with access = setAccess(document.access, user, role); updatedAt = Time.now() });
    };

    public func archiveDocument(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, documentId : Nat) {
        requireAuthenticated(caller);
        let document = getDocumentOrTrap(state, communityId, documentId);
        requireWorkspaceParticipant(caller, access);
        requireManager(document.owner, caller, access, "document");
        replaceDocument(state, { document with archived = true; updatedAt = Time.now(); parentId = null });
    };

    public func createBoard(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, title : Text) : Nat {
        requireWorkspaceParticipant(caller, access);
        validateTitle(title);
        if (countBoardsFor(state, communityId, caller) >= MAX_BOARDS_PER_OWNER) {
            Debug.trap("Board quota reached");
        };
        let now = Time.now();
        let id = state.nextBoardId;
        state.nextBoardId += 1;
        let board : CommunityBoard = {
            id;
            communityId;
            title;
            owner = caller;
            createdAt = now;
            updatedAt = now;
            archived = false;
            access = [];
            communityShare = null;
            columns = [
                { id = 0; title = "To do"; cardIds = [] },
                { id = 1; title = "Doing"; cardIds = [] },
                { id = 2; title = "Done"; cardIds = [] },
            ];
            cards = [];
            nextColumnId = 3;
            nextCardId = 0;
        };
        state.boards := Array.append(state.boards, [board]);
        id;
    };

    public func listBoards(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess) : [CommunityBoardSummary] {
        requireWorkspaceParticipant(caller, access);
        var visible : [CommunityBoardSummary] = [];
        for (board in state.boards.vals()) {
            if (board.communityId == communityId and not board.archived) {
                switch (boardRole(board, caller, access)) {
                    case (?role) visible := Array.append(visible, [toBoardSummary(board, role)]);
                    case null {};
                };
            };
        };
        visible;
    };

    public func getBoard(state : WorkspaceState, boardPublicLinks : [CommunityBoardPublicLink], caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat) : ?CommunityBoardPayload {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        switch (boardRole(board, caller, access)) {
            case (?role) ?toBoardPayload(boardPublicLinks, board, role, true, true, board.owner == caller);
            case null null;
        };
    };

    public func getPublicBoard(state : WorkspaceState, boardPublicLinks : [CommunityBoardPublicLink], token : Text) : ?CommunityBoardPayload {
        validatePublicToken(token);
        for (link in boardPublicLinks.vals()) {
            if (link.token == token) {
                switch (boardIndex(state, link.boardId)) {
                    case null return null;
                    case (?index) {
                        let board = state.boards[index];
                        if (board.archived) {
                            return null;
                        };
                        return ?toBoardPayload(boardPublicLinks, board, #viewer, false, false, false);
                    };
                };
            };
        };
        null;
    };

    public func renameBoard(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, title : Text) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        validateTitle(title);
        ignore requireEditor(boardRole(board, caller, access), "board");
        replaceBoard(state, { board with title; updatedAt = Time.now() });
    };

    public func setBoardShare(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, role : ?WorkspaceRole) : ?WorkspaceRole {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        switch (role) {
            case (?value) validateShareRole(value);
            case null {};
        };
        requireManager(board.owner, caller, access, "board");
        replaceBoard(state, { board with communityShare = role; updatedAt = Time.now() });
        role;
    };

    public func setBoardPublicLink(state : WorkspaceState, boardPublicLinks : [CommunityBoardPublicLink], caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, token : ?Text) : ([CommunityBoardPublicLink], ?Text) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        if (board.archived) {
            Debug.trap("Board not found");
        };
        if (board.owner != caller) {
            Debug.trap("Only the board owner can manage public links");
        };
        switch (token) {
            case null {};
            case (?value) {
                validatePublicToken(value);
                if (publicTokenAlreadyUsed(boardPublicLinks, boardId, value)) {
                    Debug.trap("Public link token is already in use");
                };
            };
        };
        let nextPublicLinks = setBoardPublicToken(boardPublicLinks, board.id, token);
        replaceBoard(state, { board with updatedAt = Time.now() });
        (nextPublicLinks, token);
    };

    public func setBoardGrant(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, user : Principal, role : ?WorkspaceRole, targetIsCommunityParticipant : Bool) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        switch (role) {
            case null {
                if (Principal.isAnonymous(user)) {
                    Debug.trap("Cannot revoke access for anonymous principal");
                };
            };
            case (?_) validateGrantTarget(user, targetIsCommunityParticipant);
        };
        if (board.owner == user) {
            Debug.trap("Owner role is derived and cannot be granted");
        };
        requireManager(board.owner, caller, access, "board");
        replaceBoard(state, { board with access = setAccess(board.access, user, role); updatedAt = Time.now() });
    };

    public func addBoardColumn(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, title : Text) : KanbanColumn {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        validateTitle(title);
        ignore requireEditor(boardRole(board, caller, access), "board");
        if (Array.size(board.columns) >= MAX_COLUMNS_PER_BOARD) {
            Debug.trap("Too many board columns");
        };
        let column : KanbanColumn = { id = board.nextColumnId; title; cardIds = [] };
        replaceBoard(state, { board with columns = Array.append(board.columns, [column]); nextColumnId = board.nextColumnId + 1; updatedAt = Time.now() });
        column;
    };

    public func renameBoardColumn(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, columnId : Nat, title : Text) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        validateTitle(title);
        ignore requireEditor(boardRole(board, caller, access), "board");
        if (columnIndex(board.columns, columnId) == null) {
            Debug.trap("Column not found");
        };
        replaceBoard(
            state,
            {
                board with
                columns = Array.map<KanbanColumn, KanbanColumn>(
                    board.columns,
                    func(column) {
                        if (column.id == columnId) { { column with title } } else { column };
                    },
                );
                updatedAt = Time.now();
            },
        );
    };

    public func deleteBoardColumn(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, columnId : Nat) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        ignore requireEditor(boardRole(board, caller, access), "board");
        let column = switch (columnIndex(board.columns, columnId)) {
            case null Debug.trap("Column not found");
            case (?index) board.columns[index];
        };
        if (Array.size(column.cardIds) > 0) {
            Debug.trap("Cannot delete a column that still has cards");
        };
        replaceBoard(state, { board with columns = Array.filter<KanbanColumn>(board.columns, func(candidate) { candidate.id != columnId }); updatedAt = Time.now() });
    };

    public func reorderBoardColumns(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, columnIds : [Nat]) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        ignore requireEditor(boardRole(board, caller, access), "board");
        if (Array.size(columnIds) != Array.size(board.columns)) {
            Debug.trap("Column order must include every column");
        };
        var reordered : [KanbanColumn] = [];
        var seen : [Nat] = [];
        for (columnId in columnIds.vals()) {
            if (containsNat(seen, columnId)) {
                Debug.trap("Column order contains duplicates");
            };
            let column = switch (columnIndex(board.columns, columnId)) {
                case null Debug.trap("Column not found");
                case (?index) board.columns[index];
            };
            seen := Array.append(seen, [columnId]);
            reordered := Array.append(reordered, [column]);
        };
        replaceBoard(state, { board with columns = reordered; updatedAt = Time.now() });
    };

    public func addBoardCard(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, columnId : Nat, input : KanbanCardInput) : KanbanCard {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        validateCardInput(input);
        validateLinkedDocument(state, communityId, input.docId);
        validateLinkedEvent(state, communityId, input.eventId);
        ignore requireEditor(boardRole(board, caller, access), "board");
        if (Array.size(board.cards) >= MAX_CARDS_PER_BOARD) {
            Debug.trap("Too many board cards");
        };
        if (columnIndex(board.columns, columnId) == null) {
            Debug.trap("Column not found");
        };
        let now = Time.now();
        let card : KanbanCard = {
            id = board.nextCardId;
            title = input.title;
            description = input.description;
            createdBy = caller;
            assignedTo = input.assignedTo;
            docId = input.docId;
            eventId = input.eventId;
            dueDateUtc = input.dueDateUtc;
            createdAt = now;
            updatedAt = now;
        };
        let columns = Array.map<KanbanColumn, KanbanColumn>(
            board.columns,
            func(column) {
                if (column.id == columnId) {
                    { column with cardIds = Array.append(column.cardIds, [card.id]) };
                } else {
                    column;
                };
            },
        );
        replaceBoard(state, { board with columns; cards = Array.append(board.cards, [card]); nextCardId = board.nextCardId + 1; updatedAt = now });
        card;
    };

    public func updateBoardCard(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, cardId : Nat, input : KanbanCardInput) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        validateCardInput(input);
        validateLinkedDocument(state, communityId, input.docId);
        validateLinkedEvent(state, communityId, input.eventId);
        ignore requireEditor(boardRole(board, caller, access), "board");
        if (cardIndex(board.cards, cardId) == null) {
            Debug.trap("Card not found");
        };
        let now = Time.now();
        replaceBoard(
            state,
            {
                board with
                cards = Array.map<KanbanCard, KanbanCard>(
                    board.cards,
                    func(card) {
                        if (card.id == cardId) {
                            {
                                card with
                                title = input.title;
                                description = input.description;
                                assignedTo = input.assignedTo;
                                docId = input.docId;
                                eventId = input.eventId;
                                dueDateUtc = input.dueDateUtc;
                                updatedAt = now;
                            };
                        } else {
                            card;
                        };
                    },
                );
                updatedAt = now;
            },
        );
    };

    public func deleteBoardCard(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, cardId : Nat) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        ignore requireEditor(boardRole(board, caller, access), "board");
        if (cardIndex(board.cards, cardId) == null) {
            Debug.trap("Card not found");
        };
        replaceBoard(
            state,
            {
                board with
                columns = Array.map<KanbanColumn, KanbanColumn>(
                    board.columns,
                    func(column) {
                        { column with cardIds = Array.filter<Nat>(column.cardIds, func(id) { id != cardId }) };
                    },
                );
                cards = Array.filter<KanbanCard>(board.cards, func(card) { card.id != cardId });
                updatedAt = Time.now();
            },
        );
    };

    public func moveBoardCard(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat, cardId : Nat, toColumnId : Nat, toIndex : Nat) {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        ignore requireEditor(boardRole(board, caller, access), "board");
        if (cardIndex(board.cards, cardId) == null) {
            Debug.trap("Card not found");
        };
        if (columnIndex(board.columns, toColumnId) == null) {
            Debug.trap("Column not found");
        };
        let withoutCard = Array.map<KanbanColumn, KanbanColumn>(
            board.columns,
            func(column) {
                { column with cardIds = Array.filter<Nat>(column.cardIds, func(id) { id != cardId }) };
            },
        );
        let nextColumns = Array.map<KanbanColumn, KanbanColumn>(
            withoutCard,
            func(column) {
                if (column.id == toColumnId) {
                    { column with cardIds = insertCardId(column.cardIds, cardId, toIndex) };
                } else {
                    column;
                };
            },
        );
        replaceBoard(state, { board with columns = nextColumns; updatedAt = Time.now() });
    };

    public func archiveBoard(state : WorkspaceState, boardPublicLinks : [CommunityBoardPublicLink], caller : Principal, communityId : Nat, access : CallerAccess, boardId : Nat) : [CommunityBoardPublicLink] {
        requireAuthenticated(caller);
        let board = getBoardOrTrap(state, communityId, boardId);
        requireWorkspaceParticipant(caller, access);
        requireManager(board.owner, caller, access, "board");
        let nextPublicLinks = setBoardPublicToken(boardPublicLinks, board.id, null);
        replaceBoard(state, { board with archived = true; updatedAt = Time.now() });
        nextPublicLinks;
    };

    public func createEvent(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, input : CommunityEventInput) : Nat {
        requireWorkspaceParticipant(caller, access);
        validateEventInput(input);
        if (countEventsFor(state, communityId, caller) >= MAX_EVENTS_PER_OWNER) {
            Debug.trap("Event quota reached");
        };
        let now = Time.now();
        let id = state.nextEventId;
        state.nextEventId += 1;
        let event : CommunityEvent = {
            id;
            communityId;
            title = input.title;
            description = input.description;
            location = input.location;
            owner = caller;
            startUtc = input.startUtc;
            endUtc = input.endUtc;
            allDay = input.allDay;
            createdAt = now;
            updatedAt = now;
            archived = false;
            access = [];
            communityShare = null;
        };
        state.events := Array.append(state.events, [event]);
        id;
    };

    public func listEvents(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess) : [CommunityEventPayload] {
        requireWorkspaceParticipant(caller, access);
        var visible : [CommunityEventPayload] = [];
        for (event in state.events.vals()) {
            if (event.communityId == communityId and not event.archived) {
                switch (eventRole(event, caller, access)) {
                    case (?role) visible := Array.append(visible, [toEventPayload(event, role)]);
                    case null {};
                };
            };
        };
        visible;
    };

    public func getEvent(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, eventId : Nat) : ?CommunityEventPayload {
        requireAuthenticated(caller);
        let event = getEventOrTrap(state, communityId, eventId);
        requireWorkspaceParticipant(caller, access);
        switch (eventRole(event, caller, access)) {
            case (?role) ?toEventPayload(event, role);
            case null null;
        };
    };

    public func updateEvent(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, eventId : Nat, input : CommunityEventInput) {
        requireAuthenticated(caller);
        let event = getEventOrTrap(state, communityId, eventId);
        requireWorkspaceParticipant(caller, access);
        validateEventInput(input);
        ignore requireEditor(eventRole(event, caller, access), "event");
        replaceEvent(
            state,
            {
                event with
                title = input.title;
                description = input.description;
                location = input.location;
                startUtc = input.startUtc;
                endUtc = input.endUtc;
                allDay = input.allDay;
                updatedAt = Time.now();
            },
        );
    };

    public func setEventShare(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, eventId : Nat, role : ?WorkspaceRole) : ?WorkspaceRole {
        requireAuthenticated(caller);
        let event = getEventOrTrap(state, communityId, eventId);
        requireWorkspaceParticipant(caller, access);
        switch (role) {
            case (?value) validateShareRole(value);
            case null {};
        };
        requireManager(event.owner, caller, access, "event");
        replaceEvent(state, { event with communityShare = role; updatedAt = Time.now() });
        role;
    };

    public func setEventGrant(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, eventId : Nat, user : Principal, role : ?WorkspaceRole, targetIsCommunityParticipant : Bool) {
        requireAuthenticated(caller);
        let event = getEventOrTrap(state, communityId, eventId);
        requireWorkspaceParticipant(caller, access);
        switch (role) {
            case null {
                if (Principal.isAnonymous(user)) {
                    Debug.trap("Cannot revoke access for anonymous principal");
                };
            };
            case (?_) validateGrantTarget(user, targetIsCommunityParticipant);
        };
        if (event.owner == user) {
            Debug.trap("Owner role is derived and cannot be granted");
        };
        requireManager(event.owner, caller, access, "event");
        replaceEvent(state, { event with access = setAccess(event.access, user, role); updatedAt = Time.now() });
    };

    public func archiveEvent(state : WorkspaceState, caller : Principal, communityId : Nat, access : CallerAccess, eventId : Nat) {
        requireAuthenticated(caller);
        let event = getEventOrTrap(state, communityId, eventId);
        requireWorkspaceParticipant(caller, access);
        requireManager(event.owner, caller, access, "event");
        replaceEvent(state, { event with archived = true; updatedAt = Time.now() });
    };
};
