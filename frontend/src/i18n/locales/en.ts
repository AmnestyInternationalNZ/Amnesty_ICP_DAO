export const en = {
    common: {
        actions: {
            back: 'Back',
            cancel: 'Cancel',
            close: 'Close',
            continue: 'Continue',
            contribute: 'Contribute',
            create: 'Create',
            createCampaign: 'Create campaign',
            createCommunity: 'Create community',
            createFirstCampaign: 'Create first campaign',
            createFirstCommunity: 'Create first community',
            createFirstProposal: 'Create first proposal',
            createProposal: 'Create proposal',
            enterPrincipal: 'Enter principal',
            finalizeCampaign: 'Finalize campaign',
            finalizeProposal: 'Finalize proposal',
            leaveCommunity: 'Leave community',
            logIn: 'Log in',
            logOut: 'Log out',
            lookUp: 'Look up',
            openCommunity: 'Open community',
            postUpdate: 'Post update',
            save: 'Save',
            saveAssignment: 'Save assignment',
            selectFromList: 'Select from list',
            viewDetails: 'View details'
        },
        labels: {
            accessModel: 'Access model',
            by: 'By {{name}}',
            campaign: 'Campaign',
            campaignId: 'Campaign ID: {{id}}',
            characters: '{{count}}/{{max}} characters',
            community: 'Community',
            contribution: 'Contribution',
            principal: 'Principal',
            proposal: 'Proposal',
            roleAccess: 'Role access',
            platformAccess: 'Platform access',
            scope: 'Scope: {{scope}}',
            signedIn: 'Signed in',
            totalVotes: 'Total votes',
            unknown: 'Unknown',
            updates: 'Updates',
            viewerOnly: 'Viewer only'
        },
        loading: {
            checkingAccess: 'Checking access',
            checkingRole: 'Checking role',
            checkingStatus: 'Checking finalization status...',
            contributing: 'Contributing...',
            creating: 'Creating...',
            finalizing: 'Finalizing...',
            leaving: 'Leaving...',
            loggingIn: 'Logging in...',
            posting: 'Posting...',
            saving: 'Saving...',
            voting: 'Voting...'
        },
        empty: {
            noCampaigns: 'No campaigns yet',
            noCommunities: 'No communities have been published yet.',
            noContributions: 'No contributions yet.',
            noProposals: 'No proposals yet',
            noUpdates: 'No updates posted yet.',
            noUsers: 'No saved user profiles yet.'
        },
        errors: {
            genericVote: 'An error occurred while processing your vote. Please try again.',
            genericFinalizeProposal: 'An error occurred while finalizing the proposal. Please try again.'
        },
        roles: {
            platformAdmin: 'Platform admin',
            communityAdmin: 'Community admin',
            member: 'Member',
            viewer: 'Viewer'
        },
        states: {
            proposal: {
                active: 'Active',
                pendingFinalization: 'Pending finalization',
                passed: 'Passed',
                failed: 'Failed'
            },
            campaign: {
                active: 'Active',
                successful: 'Successful',
                failed: 'Failed',
                expired: 'Expired'
            }
        },
        buttons: {
            proposalAccessLocked: 'Proposal access locked',
            campaignAccessLocked: 'Campaign access locked'
        }
    },
    auth: {
        action: {
            login: 'Log in',
            logout: 'Log out',
            loggingIn: 'Logging in...'
        }
    },
    app: {
        nav: {
            communities: 'Communities',
            proposals: 'Proposals',
            campaigns: 'Campaigns',
            dashboard: 'Dashboard',
            platform: 'Platform'
        },
        landing: {
            statement: 'Community voice, visible accountability, and collective action belong in the same place.',
            heroKicker: 'A human rights movement in Aotearoa',
            heroTitle: 'People power for community governance',
            heroBody:
                'Bring Amnesty communities together to organise local events, debate proposals, and fund urgent action with visible accountability.',
            accessBody:
                'Viewers can explore every community. Assigned members and community admins can propose, vote, and contribute together.',
            artKicker: 'People power',
            artTitle: 'If you care enough to question, you care enough to act.',
            artBody:
                'Shape collective decisions, support urgent campaigns, and keep community action grounded in accountability.',
            joinKicker: 'Join Amnesty Community',
            joinTitle: 'Meet other human rights advocates',
            joinBody:
                'Communities create a shared place to organise around local action, clear participation, and practical solidarity.',
            visibilityTitle: 'When community voice becomes visible, action can move faster.',
            visibilityBody:
                'Read community spaces, understand the local kaupapa, and see where you can help organise proposals, campaigns, and people power.',
            visibilityCallout: 'View communities openly. Take part where you are trusted with a role.',
            actionKicker: 'Take action together',
            actionTitle: 'Build local momentum across communities, proposals, and campaigns.',
            actionBody:
                'The live Amnesty site balances urgency with openness. This application now follows that same rhythm: more editorial space, clearer calls to action, and less of the boxed dashboard feel.',
            cards: {
                communitiesTitle: 'Build local momentum',
                communitiesBody:
                    'Organise community spaces, invite participation deliberately, and keep human rights work rooted in people power.',
                proposalsTitle: 'Use community voice',
                proposalsBody:
                    'Move ideas from discussion to decision with clear windows, visible voting results, and community accountability.',
                campaignsTitle: 'Practice generosity',
                campaignsBody:
                    'Support urgent work together with shared targets, visible progress, and community-led fundraising decisions.'
            }
        },
        footer: {
            intro:
                'A local expression of Amnesty Community, shaped for proposals, campaigns, and people power across Aotearoa.',
            communityTitle: 'Community',
            communityBody:
                'Browse community spaces, read the kaupapa behind each group, and see where you can take part.',
            governanceTitle: 'Governance',
            governanceBody:
                'Debate proposals with visible voting windows, quorum settings, and clearly attributed decisions.',
            actionTitle: 'Action',
            actionBody:
                'Support campaigns, fund urgent work together, and keep community action grounded in accountability.'
        }
    },
    profile: {
        kicker: 'Amnesty Community',
        title: 'Welcome to the movement',
        body:
            'Add the name other advocates should see when proposals, campaigns, and decisions are attributed across the platform.',
        nameLabel: 'Your name',
        namePlaceholder: 'How should the community know you?',
        saveError: 'We could not save your profile yet.'
    },
    mainTabs: {
        kicker: 'Amnesty Community',
        title: 'Take action together',
        body:
            'Read communities as a viewer, step into decision-making wherever you hold a role, and keep platform participation grounded in people power.',
        yourAccess: 'Your access',
        yourAccessBody:
            'Viewers can read across the platform. Community roles unlock proposals, voting, fundraising, and membership stewardship.',
        platformRoles: 'Platform roles',
        platformRolesBody:
            'Platform admins manage platform-wide access and can support membership across every community.',
        setupKicker: 'Platform setup',
        setupTitle: 'Claim the first platform admin',
        setupBody:
            'No platform admin exists yet. Claim the first role explicitly before communities and member assignments can be managed.',
        claimAction: 'Claim platform admin',
        tabs: {
            dashboard: 'Dashboard',
            platformAdmin: 'Platform admin'
        },
        roleModelKicker: 'Role model',
        roleModelBody:
            'Platform-wide access is reserved for the people stewarding community roles. Participation itself remains community-scoped, so members can focus on local organising and decision-making.'
    },
    communities: {
        kicker: 'Communities',
        title: 'Read every community. Participate where you are trusted to act.',
        body:
            'Community roles are explicit, but browsing stays open to every authenticated person so ideas, campaigns, and local context remain visible.',
        setupKicker: 'Community setup',
        emptyAdmin:
            'Create the first community to start assigning roles, shaping proposals, and coordinating campaigns.',
        emptyViewer:
            'A platform admin needs to create the first community before members can be assigned.',
        card: {
            kicker: 'Community space',
            accessLoading: 'We are checking your community access.',
            accessViewer: 'You have read-only viewer access here until a role is assigned.',
            accessParticipant: 'You can help shape proposals and campaigns in this community.',
            assignedCount: '{{count}} assigned'
        },
        portal: {
            kicker: 'Community portal',
            loadErrorTitle: 'We could not load this community.',
            loadErrorBody: 'The requested community is missing or could not be loaded right now.',
            backToCommunities: 'Back to communities',
            roleAccessTitle: 'Role access',
            platformAccessTitle: 'Platform access',
            accessBanners: {
                platformAdminTitle: 'Platform-wide stewardship',
                platformAdminBody:
                    'You can participate here and manage community membership because you hold the platform admin role.',
                communityAdminTitle: 'Community stewardship',
                communityAdminBody:
                    'You can participate in governance and manage community role assignments inside this space.',
                memberTitle: 'Community participation',
                memberBody:
                    'You can create proposals, vote, contribute to campaigns, and step back from this community if needed.',
                viewerTitle: 'Viewer access',
                viewerBody:
                    'You can read community context, proposals, and campaigns. Participation opens once a role is assigned.'
            },
            assignedParticipants: 'Assigned participants',
            capabilities: 'Your capabilities',
            capabilitiesEnabled: 'Create proposals, vote, and help shape community action.',
            capabilitiesViewer: 'Read the full community context while you remain in viewer mode.',
            createProposalLockedTitle: 'Only assigned community members and admins can create proposals',
            createCampaignLockedTitle: 'Only assigned community members and admins can create campaigns',
            campaignsKicker: 'Campaigns',
            campaignsTitle: 'Fund local action',
            campaignsBodyEnabled: 'Support campaigns or launch a new one for this community.',
            campaignsBodyViewer: 'Follow campaign progress here. Contribution opens once a community role is assigned.',
            emptyCampaignsAdmin:
                'Start the first fundraising campaign for this community when the moment calls for collective support.',
            emptyCampaignsViewer: 'No campaigns have been created for this community yet.',
            proposalsKicker: 'Proposals',
            proposalsTitle: 'Shape community decisions',
            proposalsBodyEnabled: 'Create a proposal or vote on the direction this community should take next.',
            proposalsBodyViewer: 'Read the current proposal slate and watch decision-making stay visible.',
            emptyProposalsAdmin: 'Be the first to bring a proposal into this community space.',
            emptyProposalsViewer: 'No proposals have been created for this community yet.'
        },
        membership: {
            title: 'Community membership',
            loadError: 'Unable to load community membership information.',
            kicker: 'Role model',
            body: 'Role-based membership assignments for this community.',
            viewerAccessTitle: 'Viewer access stays implicit',
            viewerAccessBody:
                'Viewers are implicit and are not listed here. This roster shows only the principals with an assigned community role: community admins and members.',
            communityAdmins: 'Community admins',
            members: 'Members',
            emptyCommunityAdmins: 'No community admins assigned.',
            emptyMembers: 'No members assigned to this community.',
            unnamedMember: 'Unnamed member'
        },
        create: {
            title: 'Create new community',
            nameLabel: 'Community name *',
            namePlaceholder: 'Enter community name',
            policyLabel: 'Community policy *',
            policyPlaceholder: "Describe the community's purpose, governance rules, and guidelines...",
            panelTitle: 'Community creation',
            panelBody:
                'You will become the first community admin and be automatically assigned to the community. Platform admins can still oversee the community, but local membership management starts here.',
            error: 'Failed to create community. Please check your permissions and try again.'
        },
        leave: {
            title: 'Leave community',
            warningTitle: 'Confirm community departure',
            warningIntro: 'You are about to leave "{{communityName}}". This action will:',
            bulletRemove: "Remove you from the community's member list",
            bulletViewer: 'Return you to read-only viewer access in this community',
            bulletProposal: 'Revoke your ability to create new proposals in this community',
            bulletVote: 'Revoke your ability to vote on proposals in this community',
            bulletBrowse: 'Allow you to continue viewing the community as an authenticated viewer',
            bulletPreserve: 'Preserve your historical proposals and votes (they will remain visible)',
            warningOutro:
                'You will need admin assistance to rejoin as a member if you wish to participate again.',
            confirmLabel: 'Type "LEAVE" to confirm *',
            confirmPlaceholder: 'Type LEAVE to confirm',
            confirmHelp: 'This confirmation helps prevent accidental community departure.',
            leaving: 'Leaving...',
            errorTitle: 'Failed to leave community. Please check your permissions and try again.',
            errorBody:
                'Make sure you are a member of this community and have the correct permissions to leave.',
            successTitle: 'Successfully left the community!',
            successBody:
                'You have been removed from the community member list and can now view it as a read-only viewer. Your historical contributions remain preserved.'
        }
    },
    admin: {
        heroKicker: 'Platform stewardship',
        heroTitle: 'Assign platform admins and community roles from one place.',
        heroBody:
            'Review who holds platform-wide access, inspect local rosters, and shift people between viewer, member, and community admin roles without leaving this space.',
        focusKicker: 'Current focus',
        platformAdminsCount: 'Platform admins',
        workingScope: 'Working scope',
        selectedScopeFallback: 'Community',
        focusBody:
            'Platform admins can manage any community. Community roles stay local to the selected community space.',
        stewardsKicker: 'Platform admins',
        stewardsTitle: 'Current stewards',
        noPlatformAdmins: 'No platform admins are currently assigned.',
        rosterKicker: 'Community roster',
        chooseScopeTitle: 'Choose a working scope',
        scopeLabel: 'Working scope',
        rosterPrompt:
            'Choose a community scope to inspect its current role assignments. Viewer access remains implicit and is never listed in the roster.',
        rosterNobody: 'Nobody has an assigned role in this community yet.',
        rosterShowing: 'Showing {{visible}} of {{total}} assigned people in this community.',
        selectedUserKicker: 'Selected user',
        currentInScope: 'Current in scope: {{assignment}}',
        whatChangesKicker: 'What changes here',
        whatChangesPlatform:
            'Platform admin changes affect platform-wide stewardship only. Any community-specific roles remain intact.',
        whatChangesCommunity:
            'Community role changes affect only the selected community. Platform admin access, if any, remains unchanged.',
        assignmentKicker: 'Assignment',
        assignmentTitle: 'Update access for this scope',
        assignmentLabel: 'Assignment',
        assignmentEffectTitle: 'What this does',
        assignmentEffects: {
            platformAdmin:
                'Grant platform-wide admin privileges. This person will be able to create communities and manage membership across the platform.',
            removePlatformAdmin:
                'Remove platform-wide admin privileges while leaving community-scoped assignments untouched.',
            viewer:
                'Remove any assigned community role. The person will still be able to read the community as an authenticated viewer.',
            communityAdmin: 'Assign community admin privileges for the selected community.',
            member: 'Assign member participation for the selected community.'
        },
        userSelectionKicker: 'User selection',
        userSelectionTitle: 'Choose who to update',
        principalLabel: 'User principal ID',
        principalPlaceholder: 'Enter a principal ID',
        principalHelp:
            'Enter a valid principal to manage a user who does not yet appear in the saved profile list.',
        roles: {
            viewerOnly: 'Viewer only'
        },
        errors: {
            lookup: 'Failed to lookup user profile:',
            save: 'Failed to save role assignment:'
        }
    },
    proposals: {
        create: {
            title: 'Create new proposal',
            titleLabel: 'Proposal title *',
            titlePlaceholder: 'Enter proposal title',
            descriptionLabel: 'Proposal description *',
            descriptionPlaceholder:
                'Describe your proposal in detail. What are you proposing? Why should the community support it?',
            customizeGovernance: 'Customize governance settings',
            defaultSettings: 'Default settings',
            votingWindow: 'Voting window',
            quorum: 'Quorum',
            passThreshold: 'Pass threshold',
            defaultVotingWindow: '3 days',
            defaultQuorum: '1 vote minimum',
            defaultPassThreshold: '50% of votes must be yes',
            votingWindowDaysLabel: 'Voting window (days)',
            votingWindowHelp: 'How long members can vote (1-30 days)',
            minimumVotesLabel: 'Minimum votes (quorum)',
            minimumVotesHelp: 'Minimum total votes required for proposal to be valid',
            passThresholdLabel: 'Pass threshold (%)',
            passThresholdHelp: 'Percentage of yes votes needed to pass (1-100%)',
            submissionTitle: 'Proposal submission',
            submissionBody:
                'Once submitted, community members will be able to vote yes or no on your proposal during the voting window. After the voting period ends, any member can finalize the proposal to determine if it passed or failed.',
            error: 'Failed to create proposal. Please check your permissions and try again.'
        },
        card: {
            creatorUnknown: 'Unknown member',
            yourProposal: 'Your proposal',
            governanceSettings: 'Governance settings',
            votingWindow: 'Voting window',
            quorum: 'Quorum',
            passThreshold: 'Pass threshold',
            daysCount: '{{count}} days',
            votesMinimum: '{{count}} votes minimum',
            passThresholdValue: '{{count}}% yes votes',
            timeRemaining: 'Time remaining: {{value}}',
            votingResults: 'Voting results',
            yes: 'Yes: {{count}} ({{percentage}}%)',
            no: 'No: {{count}} ({{percentage}}%)',
            totalVotesRequired: 'Total votes: {{total}} / {{required}} required',
            votedBadge: 'You have voted',
            votingClosed: 'Voting closed',
            votingNotStarted: 'Voting not started',
            alreadyVotedTitle: 'You have already voted on this proposal',
            alreadyVotedBody:
                'The system enforces one vote per person per proposal. Your vote has been recorded and counted.',
            alreadyVotedCreator: 'As the proposal creator, you were able to vote on your own proposal.',
            voteSuccessTitle: 'Vote cast successfully!',
            voteSuccessBody:
                'Your vote has been recorded. The system ensures one vote per person per proposal.',
            voteSuccessCreator: 'As the proposal creator, you successfully voted on your own proposal.',
            voteErrorTitle: 'Failed to vote. Please try again.',
            finalizeErrorTitle: 'Failed to finalize proposal.',
            finalizeSuccessTitle: 'Proposal finalized successfully!',
            finalizeSuccessBody:
                'The proposal has been finalized and its final status has been determined based on the voting results.',
            voteButtonTitles: {
                alreadyVoted: 'You have already voted on this proposal',
                votingClosed: 'The voting window has closed',
                votingNotStarted: 'Voting has not started yet',
                viewer: 'Only assigned community members and admins can vote',
                yes: 'Vote yes on this proposal',
                no: 'Vote no on this proposal'
            },
            voteYes: 'Vote yes',
            voteNo: 'Vote no',
            viewerAccess: 'Viewer access',
            lessThanMinute: 'Less than 1m remaining',
            timeDaysHours: '{{days}}d {{hours}}h remaining',
            timeHoursMinutes: '{{hours}}h {{minutes}}m remaining',
            timeMinutes: '{{minutes}}m remaining'
        }
    },
    campaigns: {
        create: {
            title: 'Create fundraising campaign',
            fundingTitle: 'All-or-nothing funding',
            fundingBody:
                'Your campaign will follow an all-or-nothing model. Funds are only collected if the target amount is met by the deadline. If the goal is not reached, no funds will be collected.',
            titleLabel: 'Campaign title *',
            titlePlaceholder: 'Enter campaign title',
            goalLabel: 'Goal amount ($) *',
            goalPlaceholder: 'Enter target amount',
            durationLabel: 'Campaign duration (days) *',
            durationPlaceholder: 'Enter number of days',
            storyLabel: 'Campaign story *',
            storyHelp: 'Include narrative, who benefits, and budget outline',
            storyPlaceholder: 'Describe your campaign, who it will help, and how the funds will be used...',
            validationAllFields: 'Please fill in all fields',
            validationGoalAmount: 'Please enter a valid goal amount',
            validationDays: 'Please enter a valid number of days',
            error: 'Failed to create campaign: {{message}}'
        },
        card: {
            yourCampaign: 'Your campaign',
            progress: '{{raised}} / {{goal}}',
            progressPercentage: '{{percentage}}%',
            ended: 'Ended',
            daysLeft: '{{days}} days left',
            allOrNothing:
                'All-or-nothing: Funds are only collected if the target is met by the deadline.',
            contributeLockedTitle: 'Only assigned community members and admins can contribute to campaigns'
        },
        detail: {
            goalReached: 'Funding goal reached! Campaign can now be finalized.',
            detailsTab: 'Details',
            updatesTab: 'Updates ({{count}})',
            contributionsTab: 'Contributions ({{count}})',
            storyTitle: 'Campaign story',
            fundingTitle: 'All-or-nothing funding',
            fundingBody:
                'This campaign follows an all-or-nothing model. Funds are only collected if the target amount is met by the deadline or if the campaign creator finalizes it early once the goal is reached. If the goal is not reached, no funds will be collected.',
            contributeTitle: 'Contribute to this campaign',
            amountLabel: 'Amount ($)',
            amountPlaceholder: 'Enter amount',
            creatorActionsTitle: 'Creator actions',
            creatorTooltip: {
                notCreator: 'Only the campaign creator can finalize the campaign',
                notActive: 'Campaign has already been finalized',
                goalNotMet: 'Campaign can only be finalized once the funding goal is reached',
                ready: 'Finalize campaign now that the funding goal has been reached'
            },
            finalizeStatusReady: 'Campaign can be finalized now that the funding goal has been reached.',
            finalizeStatusGoalMet: 'Campaign goal has been met! You can finalize the campaign.',
            finalizeStatusPending: 'Campaign can be finalized once the funding goal of {{goal}} is reached.',
            goalReachedNote:
                'The funding goal has been reached. The campaign creator can now finalize this campaign.',
            noteLabel: 'Note:',
            postUpdateTitle: 'Post an update',
            postUpdatePlaceholder: 'Share progress, outcomes, or other updates with backers...',
            updateLabel: 'Update #{{id}}',
            campaignEnded: 'Campaign ended',
            stateLabel: 'State: {{state}}',
            progressSummary: '{{raised}} / {{goal}}',
            contributionValidation: 'Please enter a valid contribution amount',
            updateValidation: 'Please enter update content',
            contributeSuccess: 'Contribution successful!',
            contributeError: 'Failed to contribute: {{message}}',
            updateSuccess: 'Update posted successfully!',
            updateError: 'Failed to post update: {{message}}',
            finalizeConfirm:
                'Are you sure you want to finalize this campaign? This will mark the campaign as successful and complete. This action cannot be undone.',
            finalizeSuccess: 'Campaign finalized successfully!',
            finalizeError: 'Failed to finalize campaign: {{message}}'
        }
    }
} as const;

export type EnglishCatalog = typeof en;
