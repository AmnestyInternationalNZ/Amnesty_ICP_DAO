# Amnesty DAO Application

## Overview
A minimal proof-of-concept DAO (Decentralized Autonomous Organization) application that enables community governance through proposals and voting mechanisms, with integrated fundraising campaign functionality. Each community operates independently with its own proposals, voting system, and fundraising campaigns.

## Authentication
- Internet Identity authentication required for all member interactions
- Members must authenticate to access any functionality beyond viewing public information

## Core Features

### Member Management and Role System
- Members can register and authenticate via Internet Identity
- Dual role system: global roles and per-community roles
- Global roles: guest (default), member, admin
- Per-community roles: guest (default), member, community-admin
- First admin becomes super-admin with admin privileges globally and in all communities
- New members default to guest role globally and in all communities
- Only admins can promote guests to members (globally or per community)
- Only admins can demote members to guests (globally or per community)
- Admins can remove any member from a community using the removeMemberFromCommunity function, reverting them to guest status for that community
- Global members can join any community as a member automatically
- Global guests cannot join communities but can view community information and enter community portals in read-only mode
- Only members (global or community-specific) can participate in community governance activities
- Member status in a community is determined solely by the user's role for that community, not by presence in the members array
- Community members arrays contain exclusively users with the "member" role - no guests, admins, or other roles are included
- Community members arrays contain only unique principals with no duplicates
- When any user's role changes to or from "member" status (globally or per-community), their principal is immediately added to or removed from the appropriate community members arrays
- When a user's role is changed to guest (globally or for a specific community), their principal is immediately and atomically removed from all community members arrays across all communities, including any legacy or previously joined communities
- Role changes are atomic operations that simultaneously update user roles and synchronize all community members arrays across the entire system
- Users demoted from member to guest lose all member privileges but their historical proposals and votes are preserved and remain visible
- Backend enforces strict consistency between user roles and members array membership through atomic operations
- Backend includes comprehensive verification and logging to ensure members arrays only contain users with "member" role after any role change operation
- After any role change, a mandatory consistency check runs to remove any users from all community member lists if their current role is not "member"
- System-wide cleanup ensures no user with non-member role appears in any community members array
- Members can voluntarily leave communities, which removes their principal from the community's members array and sets their role for that specific community to "guest", allowing them to continue viewing the community in read-only mode
- When a user leaves a community, their per-community role is automatically set to "guest" while preserving their historical contributions
- Users who have left communities can still access community portals as guests with all interactive features disabled
- Only members with "member" role (not guests or admins) can leave communities voluntarily
- Community leaving is restricted to prevent guests and admins from using the leave functionality
- Users who have left a community cannot automatically regain member status by re-entering; they require explicit admin promotion or proper role assignment
- Admins can forcibly remove members from communities using the removeMemberFromCommunity function, setting the removed user's role to guest for that community

### Communities
- Communities can be created by admins only (global admins and community admins)
- Each community has a name and policy that define its purpose and governance rules
- Each community maintains a members array containing exclusively users with the "member" role for that community
- Community membership lists are determined by users who are in the members array and have the "member" role for that community
- Community admins can manage their specific communities
- Communities can be deleted using archive or purge modes
- Members can view all available communities in a list format
- Members can retrieve detailed information about specific communities by ID
- Guests can view community information and enter community portals but cannot perform any interactive actions
- Each community operates as an independent governance unit with its own proposals and voting
- Members can leave communities voluntarily, which sets their per-community role to "guest" and removes them from the community's governance participation while maintaining their ability to view the community
- Admins can remove members from communities using the removeMemberFromCommunity function, which sets the removed user's per-community role to "guest" and removes them from the community's governance participation

### Community Portal
- All authenticated users (including guests and users who have left communities) can enter community portals
- Guests and users who have left communities can view community information, proposals, and voting results but cannot interact
- Community members can access full functionality including joining, creating proposals, voting, and leaving communities
- Community portals display community-specific information and governance activities
- Interactive features are disabled for guests and users who have left communities within community portals
- Community portals are optimized for smooth loading with minimal data fetching and efficient rendering to eliminate stuttering and provide seamless user experience
- Community portals display at the bottom of each community page three separate lists with names and principal IDs:
  - Global Admins: Users with global admin role who have governance privileges in this community
  - Community Admins: Users with community-admin role specifically for this community
  - Voting Members: Users who are in the members array and have "member" role for this community (excluding admins to avoid duplication)
- Guests and users who have left communities are excluded from all displayed member lists regardless of their presence in the community
- Each role list clearly indicates the user's role with appropriate badges or labels
- Members (but not guests or admins) can see a "Leave Community" button that allows them to remove themselves from the community and become a guest for that community
- Join community button is disabled or hidden if the user is already a member or is a guest
- Users who have left a community see the community portal in guest mode with clear indication of their previous membership status

### Proposals and Voting
- Community members can create proposals within their specific communities with configurable governance parameters
- Each proposal has individual settings for voting window duration, quorum requirements, and pass threshold percentage
- Default voting window is 3 days but can be customized per proposal using optional overrides
- Default quorum and pass threshold can be overridden per proposal during creation
- Each community maintains its own separate set of proposals
- Proposals are isolated per community - members can only see and interact with proposals from communities they belong to
- Guests and users who have left communities can view proposals and voting results but cannot create proposals or vote
- Members can vote yes or no on proposals within their communities with strict one-person-one-vote enforcement per proposal
- Voting is only allowed during the proposal's active voting window period
- Proposal creators are allowed to vote on their own proposals, just like any other community member
- Each proposal maintains a dedicated voter tracking system that records which principals have voted
- When a proposal is created, an empty voter set is initialized for that proposal along with start and end timestamps
- Before accepting any vote, the system checks if the voter has already voted on that specific proposal and if the voting window is still open
- If a user has already voted on a proposal or the voting window has closed, subsequent vote attempts are rejected
- Only after confirming the user has not voted and the voting window is active is their vote recorded and the vote count incremented
- Voting is restricted to community members only during the active voting period
- Proposal results are visible to all authenticated users including guests and users who have left communities
- Vote tallying tracks both yes and no votes per proposal with individual quorum and pass threshold requirements
- Proposals automatically transition through states: active (during voting window), pending finalization (after voting window closes), passed, or failed
- After the voting window closes, proposals can be finalized by applying quorum and pass threshold logic
- Proposals that meet quorum and pass threshold requirements are marked as passed
- Proposals that fail to meet quorum or pass threshold requirements are marked as failed
- Historical proposals and votes from demoted users and users who have left communities are preserved and remain visible in the system
- Demoted users and users who have left communities lose voting and proposal creation privileges but their past contributions remain accessible
- When members leave communities, their historical proposals and votes are preserved and remain visible
- Voting system enforces strict one-person-one-vote per proposal through dedicated voter tracking, preventing any duplicate votes from the same user
- If a user has already voted on a proposal, the voting interface displays a disabled "Vote" button that is greyed out with a clear message "You have already voted on this proposal"
- The voting interface provides immediate feedback when duplicate votes are attempted or when voting outside the allowed window, showing appropriate error messages without indefinite loading states
- Proposal finalization can be triggered by any authenticated user after the voting window closes to determine final proposal status

### Fundraising Campaigns
- Community members can create fundraising campaigns within their specific communities
- Campaign creation is only available when a community exists and is restricted to community members
- Each campaign has a clear goal amount, deadline, and campaign story including narrative, who benefits, and budget outline
- Campaigns follow an "all-or-nothing" model where funds are only collected if the target is met by the deadline
- Campaign progress is tracked with a progress bar showing percentage funded and days left until deadline
- Campaign creators can post updates to a simple feed so backers can see progress and outcomes
- All campaign logic including creation, funding, updates, and progress tracking is handled on the backend
- Each community maintains its own separate set of fundraising campaigns
- Campaigns are isolated per community - members can only see and interact with campaigns from communities they belong to
- Guests and users who have left communities can view campaigns and updates but cannot create campaigns or contribute funding
- Campaign states include: active (accepting contributions), successful (target met by deadline), failed (target not met by deadline), and expired (deadline passed)
- Campaign contributions are tracked per contributor with funding amounts and timestamps
- Campaign updates are chronologically ordered and display creation timestamps
- Historical campaigns and contributions from demoted users and users who have left communities are preserved and remain visible
- Campaign funding is restricted to community members only during the active campaign period
- Campaign results and updates are visible to all authenticated users including guests and users who have left communities
- Campaign finalization becomes available as soon as the funding target is reached, even if the deadline has not yet passed
- Campaign creators can finalize campaigns immediately upon reaching the funding goal, regardless of remaining time
- Campaign finalization is restricted to campaign creators only and is available when the goal is met

### Navigation and Interface Structure
- Tabbed interface with separate tabs for "Dashboard" and "Admin Panel"
- Tabs are clearly labeled and positioned at the top or side of the application
- Only one tab content is visible at a time, providing focused user experience
- Dashboard tab contains all community-related functionality including proposals, voting, and fundraising campaigns
- Admin Panel tab contains all administrative functions and role management features
- Tab navigation is intuitive and visually distinct from other interface elements
- All existing functionality within each section is maintained while improving navigation experience

### Admin Panel
- Admin interface for role management with dual role system support accessible via dedicated Admin Panel tab
- Member selection by browsing member list showing all registered members with their principal IDs and names
- Community selection dropdown including "global" option for global role assignments
- Display current global and per-community roles for selected members
- Role assignment interface specifying whether assignment is global or community-specific
- Role demotion capabilities allowing admins to change member roles to guest roles
- Member removal functionality using the removeMemberFromCommunity function allowing admins to remove any member from a community, setting their role to guest for that community
- Visual indication of current role assignments for better management
- Atomic role change operations that simultaneously update user roles and synchronize community members arrays across all communities

## Visual Design Requirements

### Color Scheme
- Primary color: Amnesty Yellow (#FFF200) for primary buttons, headers, and highlights
- Text and strong contrast: Deep black (#000000) for text, icons, and backgrounds
- Secondary elements: Grayscale tones for secondary UI components
- High contrast design throughout the interface

### Typography
- Headings and UI elements: Trade Gothic Bold Condensed (or closest web-safe alternative) in uppercase
- Body text: Arial font family
- Clear and spacious headings with consistent spacing
- Legible body copy with proper line spacing

### Branding
- Full Amnesty wordmark (logo with candle icon) positioned in bottom-right corner
- Logo displayed in black, white, or yellow depending on background contrast
- Candle icon alone used when space is limited
- Logo maintains visibility across all pages

### Visual Style
- Bold, high-contrast visuals throughout
- No drop shadows or outlines
- Crisp and clean visual presentation
- Bright, bold, and positive tone
- Consistent spacing and layout patterns

### Language
- All application content displayed in English

## CSS Framework and Styling Requirements
- Ensure CSS framework (Tailwind CSS or equivalent) is properly loaded and configured
- Verify all CSS imports are correctly included in React app entry point and main layout files
- Apply Amnesty design tokens (colors, typography, spacing) consistently throughout the application
- Ensure all icons, buttons, and layout elements render at correct size and with intended formatting
- Fix any missing or broken CSS imports that prevent proper styling
- Maintain responsive design principles across all screen sizes
- Ensure all interactive elements have proper hover and focus states using Amnesty color scheme

## HTML Standards Compliance
- Frontend HTML template must include proper `<!DOCTYPE html>` declaration at the very top of the document
- HTML files must render in standards (No Quirks) mode to ensure proper CSS layout and rendering
- All custom HTML files including `index.html` in the frontend public directory must have correct DOCTYPE declaration
- HTML structure must comply with modern web standards for consistent cross-browser rendering
- Include proper language attribute (`lang="en"`) in HTML root element
- Ensure React root element is properly mounted and configured
- Verify HTML entry point includes all necessary meta tags for proper rendering

## Backend Data Storage
The backend must store and manage:
- Member profiles and authentication data including principal IDs and member names
- Global member roles (guest, member, admin) with guest as default
- Per-community member roles (guest, member, community-admin) with guest as default
- Super-admin designation for the first admin
- Community information including name, policy, and members arrays
- Community members arrays containing exclusively users with the "member" role for that community with unique principals only
- Community-specific proposals with their details, status, governance parameters, and timestamps
- Proposal governance settings including voting window duration, quorum requirements, and pass threshold percentage stored per proposal
- Proposal state tracking (active, pending finalization, passed, failed) with automatic state transitions
- Proposal timing data including start and end timestamps in nanoseconds for voting window enforcement
- Vote records ensuring one-person-one-vote per proposal per community with duplicate vote prevention and time gating
- Yes and no vote counts per proposal with individual tallying
- Voter tracking system using a votersByProposal map that associates each proposal ID with a set of voter principals who have voted on that proposal
- Community-specific fundraising campaigns with goal amount, deadline, campaign story, narrative, beneficiaries, and budget outline
- Campaign state tracking (active, successful, failed, expired) with automatic state transitions based on funding progress and deadlines
- Campaign timing data including creation timestamp and deadline in nanoseconds for precise deadline enforcement
- Campaign contribution records tracking contributor principals, funding amounts, and contribution timestamps
- Campaign progress tracking including total funds raised and percentage of goal achieved
- Campaign update feeds with chronologically ordered updates, timestamps, and creator information
- Campaign finalization eligibility tracking based on funding goal achievement regardless of deadline status
- Historical data for archived communities
- Role assignment history and permissions mapping
- Community membership associations based on members array presence and "member" role status
- Historical proposals, votes, campaigns, and contributions from all users including those who have been demoted or left communities, preserved permanently

## Backend Operations
- Member registration with default guest role assignment globally and per community
- Dual role management system with global and per-community role tracking
- Role promotion logic ensuring only admins can promote guests to members
- Role demotion logic ensuring only admins can demote members to guests
- removeMemberFromCommunity function that allows admins to remove any member from a specific community, reverting their status to guest for that community
- removeMemberFromCommunity function updates the community's member list by removing the user's principal from the members array
- removeMemberFromCommunity function sets the user's per-community role to "guest" while preserving their historical proposals and votes
- removeMemberFromCommunity function enforces admin-only access and validates that the target user is currently a member of the specified community
- Atomic role change operations that simultaneously update user roles and synchronize community members arrays across all communities
- When promoting a user to "member" role (globally or per-community), immediately add their principal to appropriate community members arrays if not already present
- When demoting a user from "member" role to any other role (globally or per-community), immediately remove their principal from all community members arrays across the entire system
- When a user's role is changed to guest (globally or for a specific community), their principal is immediately and atomically removed from all community members arrays across all communities, including any legacy or previously joined communities
- Strict enforcement that community members arrays contain only users with the "member" role across all communities
- Comprehensive verification and logging after every role change to ensure members arrays and user roles are consistent across all communities
- Mandatory consistency check after any role change that removes any users from all community member lists if their current role is not "member"
- System-wide cleanup operations to ensure no user with non-member role appears in any community members array
- Super-admin initialization for first admin member
- Community creation with name and policy (admin-only access)
- Community listing and retrieval by ID accessible to all authenticated users
- Role-based membership management for communities with restriction that only members (not guests) can join
- Community management and deletion (archive/purge modes)
- Community-specific proposal creation with configurable governance parameters including optional overrides for voting window, quorum, and pass threshold
- Proposal creation with automatic initialization of empty voter set, start timestamp, end timestamp calculation, and resolved governance settings storage
- Proposal listing filtered by community accessible to all authenticated users including guests and users who have left communities
- Vote recording and tallying per proposal with comprehensive duplicate vote prevention, time window enforcement, and yes/no vote tracking using votersByProposal map
- Voting window enforcement that rejects votes submitted before proposal start time or after proposal end time
- Strict one-person-one-vote enforcement per proposal through voter tracking system that checks existing votes before accepting new ones, allowing proposal creators to vote on their own proposals
- Vote validation logic that checks if the caller has already voted on the specific proposal and if the voting window is currently active
- Vote rejection mechanism that prevents duplicate votes and out-of-window votes, returning appropriate error messages
- Vote acceptance process that records yes/no votes and increments appropriate counts only after confirming the user has not previously voted and the voting window is active
- Voter set management that adds the caller's principal to the proposal's voter set only after successful vote validation
- Proposal finalization function that applies quorum and pass threshold logic after voting window closes, updating proposal state to passed or failed
- Finalization logic that checks if total votes meet quorum requirement and if yes votes meet pass threshold percentage
- Proposal state management with automatic transitions from active to pending finalization when voting window closes
- Proposal detail retrieval with permission validation based on dual role system, accessible to all authenticated users for viewing
- Backend provides voting status information for each proposal indicating whether the current user has already voted and if voting window is active
- Community-specific fundraising campaign creation with goal amount, deadline, and campaign story (member-only access)
- Campaign creation with automatic initialization of empty contribution records, creation timestamp, deadline calculation, and campaign state tracking
- Campaign listing filtered by community accessible to all authenticated users including guests and users who have left communities
- Campaign contribution recording and tracking per contributor with funding amounts and timestamps
- Campaign progress calculation including total funds raised and percentage of goal achieved
- Campaign deadline enforcement that automatically transitions campaigns to failed or expired state when deadline passes without meeting goal
- Campaign success determination when funding goal is met before deadline, transitioning campaign to successful state
- Campaign finalization logic that allows campaign creators to finalize campaigns as soon as the funding target is reached, regardless of remaining time until deadline
- Campaign finalization availability check that determines if the goal has been met and the caller is the campaign creator
- Campaign finalization function that transitions campaigns to successful state when called by the creator after goal achievement
- Campaign update creation allowing campaign creators to post progress updates with timestamps
- Campaign update listing chronologically ordered for each campaign accessible to all authenticated users
- Campaign detail retrieval with permission validation based on dual role system, accessible to all authenticated users for viewing
- Backend provides campaign status information including funding progress, days remaining, contribution eligibility, and finalization eligibility for campaign creators
- Campaign state management with automatic transitions from active to successful, failed, or expired based on funding progress and deadline
- All-or-nothing funding model enforcement ensuring funds are only collected when target is met by deadline or through early finalization
- Member lookup by Principal ID for admin panel operations
- Member listing query that returns all registered members with their principal IDs and profile information
- Role assignment operations for global and per-community contexts with immediate and atomic members array synchronization across all communities
- Certified queries for all data reads to ensure data integrity
- Role-based access enforcement for all operations with dual role validation
- Permission checks ensuring guests and users who have left communities can view but not interact, while members can fully participate in community governance and fundraising during active periods
- Preservation of historical proposals, votes, campaigns, and contributions when users are demoted from member to guest or leave communities, maintaining data integrity
- Robust error handling and rollback mechanisms to ensure members array consistency during role changes across all communities
- Backend provides complete membership and role information to frontend for all display purposes
- Backend handles all membership status determinations based on members array presence and role status
- Backend provides for each community accurate role information distinguishing between different user types
- Backend excludes all non-member roles from community members arrays regardless of any other factors
- Backend ensures comprehensive synchronization across all communities whenever any user's role changes to or from "member" status
- Backend includes verification mechanisms and logging to confirm that after any role change operation, members arrays contain only users with "member" role across all communities
- Backend safeguard ensures that after any role change, a mandatory consistency check runs to remove any users from all community member lists across the entire system if their current role is not "member"
- Community join functionality that only adds a user if they are not already in the community's members array and only if their role is "member" (not guest), preventing duplicate entries
- Community leave functionality that allows members to remove themselves from a community's members array, automatically sets their per-community role to "guest", and preserves their historical contributions
- Leave community operation removes the user's principal from the specific community's members array, sets their per-community role to "guest", and maintains their ability to view the community in read-only mode
- All community members arrays maintain unique principals with no duplicates through backend enforcement
- leaveCommunity function implementation that verifies the caller has "member" role (not guest or admin) before allowing them to leave the community
- leaveCommunity function removes the user's principal from the community's members array, sets their per-community role to "guest", and updates all relevant membership and voting permissions
- leaveCommunity function preserves the user's historical proposals and votes in the community after they leave
- leaveCommunity function prevents guests and admins from leaving communities, restricting this functionality to members only
- leaveCommunity function ensures atomic operation that maintains data consistency across the community's membership structure while setting the appropriate guest role
- joinCommunity function that only allows non-guests to join and prevents duplicate entries in the members array
- Voting logic that enforces strict one-person-one-vote per proposal using votersByProposal map to track and prevent duplicate votes from the same user, allowing proposal creators to vote on their own proposals during active voting windows
- Role management ensures users who have left communities cannot automatically regain member status without explicit admin intervention or proper role assignment
- Time calculations using nanoseconds for precise voting window management, proposal lifecycle tracking, and campaign deadline enforcement
- Optional override handling for proposal governance parameters using Motoko optionals during proposal creation

## Frontend Functionality
- Internet Identity login interface with Amnesty visual identity
- Tabbed navigation interface with clearly labeled "Dashboard" and "Admin Panel" tabs positioned at the top or side of the application
- Tab switching functionality that displays only one tab content at a time for focused user experience
- Dashboard tab containing all community-related functionality including member activities, proposals, voting, and fundraising campaigns
- Admin Panel tab containing all administrative functions and role management features
- Intuitive and visually distinct tab navigation that improves user experience between dashboard and admin panel
- Community creation form with fields for name and policy (visible only to admins within Dashboard tab)
- Community list display showing all available communities accessible to all authenticated users within Dashboard tab
- Community detail view showing individual community information accessible to all authenticated users within Dashboard tab
- Community browsing interface accessible to all authenticated users within Dashboard tab, with joining restricted to members only
- Community portal interface accessible to all authenticated users including those who have left communities, with role-based interaction capabilities within Dashboard tab
- Guest users and users who have left communities can enter community portals but see disabled interactive elements with clear messaging about their limitations within Dashboard tab
- Community-specific proposal creation form with optional governance parameter overrides (visible only to community members) within Dashboard tab
- Proposal creation interface allowing members to specify custom voting window duration, quorum requirements, and pass threshold percentage within Dashboard tab
- Community-specific proposal listing showing proposals for the current community with state indicators accessible to all authenticated users including those who have left communities within Dashboard tab
- Proposal detail view with voting interface for community members during active voting windows, read-only view for guests and users who have left communities within Dashboard tab
- Vote casting interface with yes/no options and real-time results per proposal (voting restricted to members during active voting window with duplicate vote prevention) within Dashboard tab
- Voting interface displays voting window status and remaining time for active proposals within Dashboard tab
- Voting interface enables the vote button for proposal creators and allows them to vote on their own proposals during active voting windows within Dashboard tab
- Voting interface displays a greyed out and disabled "Vote" button with appropriate messaging when the user has already voted or when voting window is closed within Dashboard tab
- Voting interface provides immediate feedback for duplicate vote attempts and out-of-window voting without indefinite loading states, showing clear error messages when votes are rejected within Dashboard tab
- Proposal finalization interface allowing any authenticated user to trigger finalization after voting window closes within Dashboard tab
- Proposal state display showing current status (active, pending finalization, passed, failed) with appropriate visual indicators within Dashboard tab
- Fundraising campaign creation form with fields for goal amount, deadline, campaign story, narrative, beneficiaries, and budget outline (visible only to community members) within Dashboard tab
- Community-specific campaign listing showing campaigns for the current community with state indicators and progress bars accessible to all authenticated users including those who have left communities within Dashboard tab
- Campaign detail view with funding interface for community members during active campaigns, read-only view for guests and users who have left communities within Dashboard tab
- Campaign progress display with progress bar showing percentage funded and days left until deadline within Dashboard tab
- Campaign contribution interface allowing members to contribute funding during active campaign period within Dashboard tab
- Campaign update creation interface allowing campaign creators to post progress updates within Dashboard tab
- Campaign update feed displaying chronologically ordered updates with timestamps accessible to all authenticated users within Dashboard tab
- Campaign state display showing current status (active, successful, failed, expired) with appropriate visual indicators within Dashboard tab
- Campaign finalization interface that enables the "Finalize Campaign" button for campaign creators when the funding goal is met, regardless of remaining time until deadline within Dashboard tab
- Campaign finalization button is disabled for non-creators and when the funding goal has not been reached within Dashboard tab
- Clear message or tooltip explaining when and why the finalize campaign action is available, indicating that finalization becomes possible once the funding target is reached within Dashboard tab
- Campaign finalization confirmation dialog to prevent accidental early finalization within Dashboard tab
- All-or-nothing funding model clearly communicated in campaign interface with explanation that funds are only collected if target is met by deadline or through early finalization within Dashboard tab
- Role-based UI showing appropriate actions based on member permissions and community membership within Dashboard tab
- Dashboard showing member's communities accessible to all authenticated users with appropriate permission levels within Dashboard tab
- Navigation between different community portals for all authenticated users with appropriate permission levels within Dashboard tab
- Admin Panel with member selection interface displaying a list of all registered members with their principal IDs and names within Admin Panel tab
- Admin Panel community selection dropdown including "global" option within Admin Panel tab
- Admin Panel role assignment interface for global and per-community roles including demotion capabilities within Admin Panel tab
- Admin Panel "Remove Member from Community" functionality that calls the backend removeMemberFromCommunity function for the selected user and community within Admin Panel tab
- Admin Panel member removal functionality allowing admins to remove any member from a selected community using the removeMemberFromCommunity function within Admin Panel tab
- Admin Panel display of current member roles (global and per-community) within Admin Panel tab
- Member profile displays showing principal IDs prominently
- Member lists throughout the application displaying principal IDs alongside member names
- All interface elements styled according to Amnesty International visual identity guidelines with proper CSS framework implementation
- Clear messaging for guests and users who have left communities about their read-only access within community portals and instructions on how to gain member privileges
- Disabled interactive buttons and forms for guests and users who have left communities with appropriate visual indicators and explanatory tooltips
- Optimized community portal performance with efficient data loading, caching strategies, and minimal re-renders to ensure smooth page transitions and eliminate stuttering for seamless user experience
- Historical proposals, votes, campaigns, and contributions remain visible even after users are demoted from member to guest status or leave communities
- Frontend relies exclusively on backend-provided membership and role information for all display purposes
- Frontend does not perform any local membership determinations or checks
- All membership status and role-based UI elements are driven entirely by backend data
- Frontend requests complete membership and role information from backend for accurate display
- Frontend displays only those users as voting members who are confirmed by backend to be present in the community members array and have the "member" role for that community
- No member count displays anywhere in the UI - member counts are not shown to users
- No "YOUR PROPOSALS" card or section displayed anywhere in the application
- No cross-community proposal aggregation or summary views
- Community portal displays at the bottom of each community page three separate lists with names and principal IDs with appropriate role badges
- Guests and users who have left communities are excluded from all displayed member lists regardless of their presence in the community
- Role badges or labels clearly indicate each user's role to distinguish between different types of community participants
- Admins are not shown as regular members to prevent role confusion and duplication in the lists
- Frontend displays only those users as voting members who are confirmed by backend to have "member" role and be present in the community members array
- "Leave Community" button displayed in community portals, visible and functional only to members (not guests or admins)
- Leave community functionality that calls the backend leaveCommunity function and immediately updates the frontend UI to reflect the user's new guest status for that community
- Confirmation dialog for leave community action to prevent accidental removal from the community
- Frontend state updates after successful community leave operation to reflect the user's new guest status and allow continued viewing of the community in read-only mode
- Join community button is only available to non-members with the correct role, and is disabled or hidden for guests or existing members
- Frontend members list displays only unique, non-guest users for each community based on backend data
- Leave community button triggers backend leaveCommunity function call and handles success/error responses appropriately
- UI immediately reflects membership changes after successful leave community operation, updating member lists and user permissions display while maintaining community access in guest mode
- Clear visual indication when a user is viewing a community they have previously left, showing their current guest status
- Prevention of automatic member status restoration when users who have left communities re-enter community portals
- Confirmation dialog for admin-initiated member removal to prevent accidental actions
- Frontend updates after successful admin removal using removeMemberFromCommunity to reflect the removed user's new guest status for that community
- Integration with the removeMemberFromCommunity backend function so that admin-initiated removals work seamlessly through the frontend interface
- Vote casting interface handles duplicate vote prevention and voting window enforcement gracefully by displaying appropriate error messages when users attempt to vote multiple times or outside allowed timeframes
- Frontend voting interface provides clear feedback when votes are rejected due to duplicate voting attempts or closed voting windows
- Real-time vote results display that accurately reflects the one-person-one-vote enforcement and voting window restrictions without showing duplicate or invalid votes
- Frontend checks user's voting status for each proposal and displays appropriate voting interface based on whether they have already voted and if voting window is active
- Voting interface immediately shows disabled state with clear messaging when user has already voted or voting window is closed, preventing confusion and unnecessary API calls
- Frontend enables voting functionality for proposal creators during active voting windows, allowing them to vote on their own proposals with appropriate feedback after voting
- Voting window countdown display showing remaining time for active proposals
- Proposal finalization button available to all authenticated users after voting window closes
- Clear visual indicators for proposal states throughout the interface with appropriate status badges
- Governance parameter display showing voting window duration, quorum requirements, and pass threshold for each proposal
- Campaign creation interface handles form validation and submission for goal amount, deadline, and campaign story fields
- Campaign progress bars with visual indicators showing funding percentage and time remaining
- Campaign contribution interface with amount input and confirmation dialogs
- Campaign update interface allowing creators to post new updates with rich text formatting
- Campaign deadline countdown display showing days and hours remaining for active campaigns
- Campaign status badges and indicators throughout the interface showing current campaign state
- Campaign finalization interface that checks if the user is the campaign creator and if the funding goal has been met to enable the finalization button
- Campaign finalization button displays appropriate tooltips explaining availability conditions: "Available when funding goal is reached" for creators, "Only campaign creator can finalize" for non-creators
- Campaign finalization confirmation dialog with clear messaging about early finalization when goal is met before deadline
- All-or-nothing funding model clearly explained in campaign interface with visual cues about fund collection conditions including early finalization option
- Campaign history preservation showing past campaigns even after users leave communities or are demoted
- HTML template includes proper `<!DOCTYPE html>` declaration at the very top to ensure standards mode rendering
- All HTML files including `index.html` in the frontend public directory have correct DOCTYPE declaration for consistent cross-browser rendering
- HTML structure complies with modern web standards to resolve layout and CSS issues
- HTML root element includes proper language attribute (`lang="en"`) for English content
- React root element is properly mounted and configured in the HTML entry point
- All necessary meta tags included in HTML entry point for proper rendering and responsive design
