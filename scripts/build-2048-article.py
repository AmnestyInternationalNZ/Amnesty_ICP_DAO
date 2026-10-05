"""Build the rehearsal article from real, captioned application screenshots.

Requires reportlab, Pillow and pypdf. No video or private rehearsal credentials
are included in the article or its distribution archive.
"""
from pathlib import Path
import sys

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "output/2048-article"
SHOTS = ARTICLE / "screenshots-live"
TITLE = "Working Group 2: Accountability mechanisms for a new world"
INTRO = "An Amnesty DAO for 2048: a flexible consultation rehearsal"
OPENING = (
    "This example shows how the adapted Amnesty DAO supports a Working Group from its initial questions "
    "to public feedback on a recommendation. The five stages provide a shared framework, while roles, "
    "contribution formats and consultation guidance can change as the Commission learns what works. "
    "The screenshots show the working local application and fictional participants."
)
SCENARIOS = [
    "Consultation journey: the Working Group moves through all five stages, bringing public input, Advisor challenges and community revisions into a source-linked recommendation.",
    "Adapting participation: Maya configures a Facilitator role and a Community circle contribution format; Amina questions the participation route and Ruth responds to disagreement within the circle.",
    "Evidence review: a separate Digital Futures example shows withdrawal, withheld publication, explicit review and a revised public output without interrupting the main journey.",
]
CAST = [
    ("Maya Chen", "Working Group lead", "Frames consultations, configures access, shares selected drafts and approves publication."),
    ("Ruth Okafor", "Working Group member", "Clarifies input, connects findings to sources and edits the recommendation."),
    ("Dr Leo Mensah", "Advisor", "Challenges assumptions through explicitly shared discussions and consultations."),
    ("Samira Ali", "Public contributor", "Proposes an accountability mechanism and answers the group’s questions."),
    ("Amina Diallo", "Community contributor", "Brings collective input, challenges the draft and suggests a different participation route."),
    ("Tomas Silva", "Facilitator", "Records a roundtable with consent and non-sensitive event information."),
]

# Narrative chapters. The layout adapts to keep actual application captures readable.
PAGES = [
    ("Before the consultation", "A few real choices, in one workspace",
     "Maya starts with Lead, Member, Advisor and Contributor roles. She can rename a role, duplicate it and change a bounded set of capabilities. Here, a Facilitator can read internal input and record consultations, but cannot edit recommendations or publish. Contribution format names and guidance are also editable, using existing form layouts. Documents, boards and calendars remain in the menu.",
     [("00-configurable-roles.png", "Maya Chen, lead, configures the Facilitator role. Internal discussion and facilitated recording are enabled; synthesis editing, publication and workspace tools are not. These are working permissions checked by the backend.")]),
    ("Before the consultation / adaptable formats", "Maya adds a community-specific route",
     "Maya adds Community circle using the existing collective form layout. She supplies guidance that welcomes several views and unresolved disagreement. The new name appears in the contribution form immediately. Existing formats can also be renamed and their guidance changed without changing the identifiers of earlier contributions. This makes a modest, practical adaptation visible during testing.",
     [("00-configurable-formats.png", "Maya Chen, lead, adds and edits Community circle in the existing contribution-format settings. The collective layout supplies the relevant fields; her guidance describes how to represent the circle without naming participants.")]),
    ("1. Sense-Making", "Maya and Ruth frame the inquiry",
     "The group starts by identifying the accountability problem, affected communities and the questions it needs to explore. Maya and Ruth discuss that framing in the stage workspace and connect it to a consultation. Browsing another stage does not change the group’s recorded stage; Maya changes that explicitly. Earlier consultations remain available.",
     [("01-sense-making.png", "Maya Chen and Ruth Okafor, Working Group, discuss whose authority is being delegated and who can challenge it. Their named comments sit beside the consultation associated with Sense-Making.")]),
    ("2. Inquiry", "Samira makes the Fractal Sortition case",
     "Samira proposes Fractal Sortition as one possible accountability mechanism. Randomly formed small groups discuss and nominate peers; repeated PlayUp rounds produce a vetted shortlist, followed by a final random appointment to a defined role. She emphasises continuing accountability: eligible members can use a non-confidence process to remove the steward’s authority, with random replacement from the remaining vetted pool. The group needs to understand this proposal accurately before assessing it.",
     [("02-inquiry-samira.png", "Samira Ali, public contributor, describes appointment, delegated authority, removal and replacement. Her input stays private to her and the group. Quotation consent and attribution consent are separate; a private return link lets her revisit the submission without an account.")]),
    ("2. Inquiry / clarification", "Members ask; Samira explains",
     "Maya asks what happens if the appointed steward stops reporting or acts outside the mandate. Samira explains how removal and replacement would work. Ruth records the distinction between candidate assessment, appointment and continuing removal powers. This conversation belongs to the original contributor and authorised members of this Working Group; other public contributors and Advisors cannot browse it.",
     [("03-inquiry-discussion.png", "Maya questions the proposal, Samira answers and Ruth checks the interpretation. The named private discussion gives members a way to clarify a contribution before linking it to a finding.")]),
    ("2. Inquiry / several contribution routes", "Amina and Ruth bring different input",
     "Amina submits collective input; Ruth links a briefing with a summary. Written, collective, facilitated, roundtable, harvest, document and Other inputs share the same discussion and evidence links. Original-language content is preserved.",
     [("03-inquiry-collective.png", "Amina Diallo represents a fictional community circle. Its description identifies the collective without listing participants."),
      ("03-inquiry-document.png", "Ruth Okafor contributes a document summary and workspace reference. The briefing can support findings alongside other input.")]),
    ("2. Inquiry / facilitated recording", "Tomas records a roundtable",
     "Tomas records an offline roundtable using the event layout. Date, location, participant description, themes, tensions and proposals accompany the summary. His Facilitator role permits this recording without giving him authority to edit the recommendation or publish. Managers can add a named contribution format using one of the existing layouts.",
     [("03-inquiry-roundtable.png", "Tomas Silva, Facilitator, records the fictional roundtable. Event metadata and consent are retained with the contribution, and the interface distinguishes facilitator-entered material from a direct submission.")]),
    ("3. Co-Design", "Maya invites advice; Leo tests the assumptions",
     "Maya explicitly shares a stage discussion with Advisors. Leo can read the shared notes, ask practical questions and contribute through an invited consultation. His role does not expose internal comments or contributors’ private threads. Advice supplements the Working Group’s deliberation, while communities also receive their own opportunity to shape the draft.",
     [("04-co-design-advisor.png", "Dr Leo Mensah, Advisor, challenges practical safeguards and access barriers in the selected discussion. The shared visibility indicators show what Maya has opened to Advisors. Ruth’s internal note is absent from this view.")]),
    ("3. Co-Design / community revision", "Amina changes the emerging wording",
     "Maya shares a selected draft. Amina's circle asks for individual and collective responses, with time for community discussion. Ruth accepts the change and keeps language support unresolved. The internal draft and other contributors' threads remain private.",
     [("04-co-design-selected-copy.png", "Amina reads the selected public copy. The internal recommendation workspace remains private."),
      ("05-co-design-community-feedback.png", "Amina proposes new wording; Ruth confirms its inclusion. Amina follows up about time for collective review.")]),
    ("3. Co-Design / changing the consultation", "Participants can challenge the process too",
     "Amina uses Suggest a change to this consultation to request a collective or facilitated route. Maya updates the guidance and explains the change. Ruth filters the contributions to find requests about how the consultation works.",
     [("05-process-suggestion.png", "Amina challenges the participation route; Maya explains the agreed change in its private thread."),
      ("05-process-filter.png", "Ruth filters the consultation to its process suggestions and finds Amina's request.")]),
    ("Adaptation scenario / a community circle", "Amina uses the new route; Ruth preserves its different views",
     "Amina uses the Community circle format to respond to the selected draft. Her circle welcomes the collective route but asks the group not to force a single shared view. Ruth agrees to keep different perspectives and unresolved disagreement visible alongside the recommendation. The custom format still uses the same consent choices, private discussion and source-linking system as every other contribution.",
     [("03-inquiry-custom-format.png", "Amina Diallo submits through the newly named Community circle route. Ruth Okafor, member, explains how the circle’s disagreement will be handled. The format label, collective description, consent and named response are visible in the working application.")]),
    ("4. Synthesis", "Ruth keeps insight and tension distinct",
     "Ruth links insights, tensions and proposals to their contributions. She keeps public proposals, Advisor concerns and community perspectives distinct. Readable source selection connects her interpretation to the evidence; the group makes the judgement.",
     [("07-synthesis-findings.png", "Ruth keeps insights and tensions separate, with links to the contributions informing each finding."),
      ("07-synthesis-source-selection.png", "Ruth selects collective input, a roundtable, a document and community feedback as sources for a participation finding.")]),
    ("4. Synthesis / recommendation", "The community’s change appears in the draft",
     "The human-edited recommendation now includes individual and collective routes, time for community discussion and a return of selected drafts before finalisation. Members select which findings inform it and record disagreement and unresolved questions alongside the proposed action. The emerging recommendation remains internal until a lead deliberately shares a copy or approves a public snapshot.",
     [("08-synthesis-draft.png", "Ruth Okafor edits the recommendation and its linked findings. Amina’s requested wording appears in the draft. Language support, review time and disagreement within communities remain explicit.")]),
    ("5. Deliver", "Maya approves publication and keeps a return path",
     "Maya publishes a deliberately selected public snapshot. Publication checks source consent and excludes private discussion. A separate feedback consultation asks readers to check the interpretation and suggest further changes. Deliver remains connected to earlier stages, so the group can return to Inquiry or Co-Design when feedback warrants it.",
     [("09-deliver.png", "Maya Chen, lead, connects Deliver to a public feedback consultation. Publication opens another exchange instead of ending participation. The other consultations remain available.")]),
    ("5. Deliver / public response", "Amina checks the result and asks for the next change",
     "Amina reads the approved output without sign-in and asks for practical language support and review time. Maya proposes returning to Co-Design. The public snapshot and Amina's private discussion remain separate.",
     [("10-deliver-publication.png", "Amina reads the approved recommendation and unresolved questions. Only the selected public text is shown."),
      ("11-deliver-public-feedback.png", "Amina asks for language support and collective review time; Maya explains the next step in their private thread.")]),
    ("When a source is withdrawn", "Remove the original; review what it informed",
     "A separate fictional Digital Futures rehearsal tests withdrawal after publication. The original content and comments are removed, while a minimal source reference and withdrawal time remain. Linked findings and the recommendation require review, and the affected publication is withheld. Withdrawal does not automatically reverse every conclusion: members must assess what can still be supported.",
     [("12-withdrawn-original.png", "The withdrawn original contains only the minimal source marker and withdrawal time; its text and comments are no longer available."),
      ("12-withheld-publication.png", "The affected public snapshot is withheld. Its status marker and source reference remain available to the Working Group.")]),
    ("After review", "A lead can publish a revised, supported output",
     "Maya reviews the finding against remaining evidence, confirms the recommendation review and publishes a revised snapshot. The earlier publication stays marked withheld.",
     [("12-withdrawal-review.png", "Maya must review linked findings and confirm the recommendation review before republication."),
      ("13-reviewed-publication.png", "Maya publishes a revised snapshot supported by remaining evidence. The withheld record remains.")]),
]

# Keep narrative data separate from the client-facing page design.
from article_design import build_article
build_article(ROOT, ARTICLE, SHOTS, TITLE, INTRO, OPENING, SCENARIOS, CAST, PAGES)
