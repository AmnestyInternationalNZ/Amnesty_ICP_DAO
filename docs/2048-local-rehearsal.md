# 2048 local Working Group rehearsal

The current branch, `codex/2048-working-group-pilot`, presents a working local POC with fictional material. The five stages are a default framework; access roles, contribution formats, consultation audiences and guidance can be adapted in the existing screens. Legacy DAO functionality remains available in DAO mode.

## Start locally

```sh
pnpm install --frozen-lockfile
pnpm backend:network:start:isolated
pnpm backend:deploy:isolated
pnpm frontend:env:isolated
pnpm dev --host 127.0.0.1
```

Open http://127.0.0.1:5173/2048. The isolated network uses port 4954 and local Internet Identity. Local deployment upgrades the existing canister without resetting its data. No remote deployment is required.

An existing platform administrator can choose **Create illustrative groups**. The first authenticated account can bootstrap administration only if no administrator exists. A local canister controller can also call `commissionSetupDemo`, followed by `commissionAssignRole` to give a tester group access. Setup preserves existing communities and platform administrators.

Add the named fictional rehearsal after group setup:

```sh
pnpm rehearsal:2048:setup
pnpm rehearsal:2048:flexible
```

These actions retain existing data and return without duplicating a completed rehearsal. Local identities and private return credentials live in ignored `.local-rehearsal/` files with restricted file permissions. The persona endpoint is available only on the loopback development server with a loopback backend, and is excluded from production builds. It is a local testing convenience, not production authentication.

For the original interface, restart the frontend with:

```sh
VITE_APP_MODE=dao pnpm dev --host 127.0.0.1
```

## Rehearse the default journey and adaptations

1. **Sense-Making:** choose Maya Chen. Inspect the group purpose and stage discussion. Browse each stage, then use **Set this as the current stage** when deliberately changing the recorded stage. Stage changes do not close consultations.
2. **Participants and access:** rename or duplicate a role and edit its capabilities. The default Facilitator assigned to Tomas can record consultations and discuss internal material, but cannot edit recommendations, publish or open workspace tools. Public Contributor capabilities remain submission-scoped; renaming that role cannot grant anonymous visitors internal access. The last group manager is protected.
3. **Inquiry:** inspect Samira's written case, Amina's collective input, Tomas's roundtable and Ruth's document reference. All seven starting contribution formats use the same records and discussion system. Managers can rename formats, edit guidance and add a named format using the written, collective, event or document layout. Renaming preserves identifiers.
4. Submit fictional input without sign-in. Collective input requires a non-sensitive description and confirmation of authority to represent it. Event formats require the facilitated-recording capability. Document input uses an HTTPS reference or an accessible existing workspace document plus a summary; private uploads are not included.
5. Save the private return link. Its fragment contains a random 256-bit credential, removed from the address bar after loading and retained in browser storage. Possession permits access to that submission only, including withdrawal. It is not a verified identity and cannot be recovered automatically after loss. Rehearsal receipts are separated by persona.
6. **Co-Design:** Amina reads the selected review copy and proposes individual and collective responses with time for community discussion. Ruth replies, explains the accepted change and revises the recommendation. A selected copy is governed by the consultation audience; it never exposes the internal working draft or other contributors' discussions.
7. Inspect Amina's **process suggestion** and Maya's response. Members can filter the consultation's private contributions to show process suggestions. Managers apply agreed changes through consultation settings or contribution guidance and explain the outcome in the same thread. Inspect Maya's added **Community circle** format and Amina's contribution through it; Ruth explains how differing views within the circle will be retained.
8. **Synthesis:** members create insights, tensions or proposals with readable source selection. Select which findings inform the recommendation. Keep disagreement and unresolved questions alongside the human-edited draft. Roles without synthesis capability see read-only controls.
9. **Deliver:** a publishing role approves a separate public snapshot with its sources. Source quotation consent is checked, including sources of the findings informing the recommendation. Open a further consultation for public response. Original input, internal comments and the working draft are not automatically published.
10. Test withdrawal after publication. Original input, comments and document references are removed. The identifier, withdrawal time and dependency references remain. Affected findings and the recommendation require review; affected publication and selected review copies are withheld. Review findings, revise the recommendation and explicitly confirm review before publishing a revised snapshot. A withheld-publication marker remains; withdrawal does not automatically reverse every conclusion.
11. Use the hamburger menu for documents, boards and calendars. The **2048 rehearsal feedback** board and **POC feedback: the 2048 experience** consultation collect practical tester responses. Changes remain subject to human review.

Group access and consultation audiences are distinct. An Advisor's shared-participation capability permits explicitly shared stages and partner-audience consultations, plus their own submissions. It does not expose another contributor's private thread. Access applies per group. Workspace access also requires its own capability and the retained document/board/event permissions.

The Digital Futures withdrawal example has been reviewed during the browser walkthrough: its original source remains withdrawn, its old publication remains marked withheld and its revised output uses remaining evidence. A new setup creates the example before that review, with review flags ready to inspect. Testers can reproduce the path with another fictional submission.

## Persistence, consent and boundaries

Additive persistent configuration and lifecycle records sit beside existing Commission and legacy records. Existing groups, assignments, submissions and credentials keep their identifiers. Defaults initialise idempotently; effective permissions are checked in the backend and used by the frontend. Private caches are scoped to the current identity and group, including retained workspace tools.

Internal-use consent, quotation consent and attribution consent are distinct. Attribution remains an editorial responsibility: the software cannot detect a private comment or unlisted quotation manually copied into free text. Published text must be deliberately selected and reviewed. Withdrawal cannot retract copies already downloaded.

The language selector and right-to-left support remain. Navigation has initial translations across the ten languages; new explanatory text uses the existing English fallback. Contributions retain their original language. Translation services and language-specific moderation require later scoping.

This POC adds no Fractal Sortition engine, AI synthesis, voting engine, arbitrary workflow builder, collaborative recommendation editor, private file uploads, multimedia storage or SuperDAO factory.

## Verification, 6 October 2026

```sh
pnpm backend:bindings
pnpm test:backend
pnpm test:frontend
pnpm exec tsc -p frontend/tsconfig.json --noEmit
pnpm check:locales
pnpm build
```

- 23 backend integration tests pass, including legacy behavior, configurable capabilities, protection of the final manager, cross-group isolation, private return credentials, all contribution formats, workspace reference access, selected draft sharing, process suggestions, withdrawal provenance, review before republication and persistence across upgrade.
- 58 frontend tests, TypeScript, checks for ten locales and the production build pass.
- The desktop rehearsal covers anonymous collective submission and withdrawal, return-link access, member replies, community draft feedback, Advisor isolation, Facilitator restrictions, all five recorded stages and revisiting them, source selection, explicit review and republication.
- Documents load through the Commission persona; a feedback board card and shared calendar event were created through the retained tools.
- Source selection is keyboard accessible. Arabic consultation navigation renders right to left at 390px without horizontal overflow.
- Re-running flexible setup preserves existing records. Production output is checked for exclusion of local persona secrets.

`backend:bindings` regenerates Candid and frontend/test declarations from Motoko using the existing Mops toolchain and `didc`. Regenerate it whenever public backend methods change.

## Article and PDF

The updated article uses actual application screenshots, captioned with each person's role and action. Its three connected scenarios cover the five-stage journey, adapting participation, and a separate source-withdrawal review. It shows configurable access, several input routes, an added Community circle format, community revision and process feedback. Its focus is the Amnesty Working Group workflow; Fractal Sortition appears within Samira's public example. It includes no video or mechanism bibliography. The client edition has 21 pages and 25 captioned application captures, with Amnesty branding and fonts, participant cards, stage ribbons, role and visibility labels, and readable screenshot framing.

Outputs are local artifacts in `output/2048-article/`, `output/pdf/2048-working-group-2-article.pdf` and `output/2048-article.zip`. `scripts/build-2048-article.py` holds the narrative and rebuilds the article and PDF using the layout in `scripts/article_design.py`; it requires ReportLab, Pillow and pypdf. The ZIP contains the article, PDF, referenced screenshots and branding assets, excluding rehearsal credentials and old media.
