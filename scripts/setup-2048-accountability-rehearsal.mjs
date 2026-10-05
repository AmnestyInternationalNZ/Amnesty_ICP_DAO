import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Actor, HttpAgent, AnonymousIdentity } from '@icp-sdk/core/agent';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { Principal } from '@icp-sdk/core/principal';
import { idlFactory } from '../declarations/backend/backend.did.js';
const config = JSON.parse(readFileSync('frontend/public/env.json','utf8'));
if (!['localhost','127.0.0.1'].includes(new URL(config.backend_host).hostname)) throw new Error('This setup only targets the isolated local network.');
const manifestPath = '.local-rehearsal/personas.json';
if (existsSync(manifestPath)) { console.log('Accountability rehearsal already exists; existing records and identities retained.'); process.exit(0); }
mkdirSync('.local-rehearsal', {recursive:true});
const identitiesPath='.local-rehearsal/identities.json';
const savedIdentities=existsSync(identitiesPath)?JSON.parse(readFileSync(identitiesPath,'utf8')):null;
const identities = Object.fromEntries(['maya','ruth','leo'].map(key=>[key,savedIdentities?Ed25519KeyIdentity.fromJSON(JSON.stringify(savedIdentities[key])):Ed25519KeyIdentity.generate()]));
writeFileSync(identitiesPath,JSON.stringify(Object.fromEntries(Object.entries(identities).map(([key,id])=>[key,id.toJSON()]))),{mode:0o600});
const groupId=1n;
for (const [key,role] of [['maya','lead'],['ruth','member'],['leo','partner']]) {
 execFileSync('pnpm',['exec','icp','canister','call','backend','commissionAssignRole',`(${groupId}, principal "${identities[key].getPrincipal().toText()}", opt variant { ${role} })`,'-e','amnesty-local'],{stdio:'pipe'});
}
async function actor(identity) {
 const agent = new HttpAgent({host:config.backend_host,identity,verifyQuerySignatures:false}); await agent.fetchRootKey();
 return Actor.createActor(idlFactory,{agent,canisterId:config.backend_canister_id});
}
const maya=await actor(identities.maya),ruth=await actor(identities.ruth),leo=await actor(identities.leo),samira=await actor(new AnonymousIdentity());
await maya.commissionSetDisplayName(groupId,'Maya Chen'); await ruth.commissionSetDisplayName(groupId,'Ruth Okafor'); await leo.commissionSetDisplayName(groupId,'Dr Leo Mensah');
let g=await maya.commissionGetGroup(groupId);
const name='Working Group 2: Accountability mechanisms for a new world';
const purpose='Explore community experiences, accountability proposals and recommendations for a more accountable world. Fictional consultation rehearsal.';
async function stage(i,draft=g.draft,disagreements=g.disagreements,shared=g.draftShared) {
 await maya.commissionSaveGroup(groupId,name,purpose,BigInt(i),draft,disagreements,shared); g=await maya.commissionGetGroup(groupId);
}
async function consultation(i,title,audience,questions) {
 await stage(i);
 const id=await maya.commissionSaveConsultation({id:0n,groupId,title,purpose,questions,audience,opens:BigInt(Date.now()-60000)*1000000n,closes:BigInt(Date.now()+30*86400000)*1000000n,guidance:'Fictional rehearsal. Input and discussions remain private; publication requires separate consent.',closed:false},true);
 return id;
}
const crypto=await import('node:crypto');
const receipt=()=>crypto.randomBytes(32).toString('hex');
function input(alias,answers){return {alias,language:'en',answers,internalConsent:true,quoteConsent:true,attributionConsent:false,format:'written/digital',date:'',location:'',participants:'',themes:'',tensions:'',proposals:''};}
const c0=await consultation(0,'Sense-Making: where accountability breaks down','public',['What accountability failure have you experienced?','Who should hold the power to challenge it?']);
const k0=receipt();const s0=await samira.commissionSubmit(c0,input('Samira Ali','People are asked for input but cannot revoke the authority of those who act in their name. We need capable people to do the work, with the wider membership retaining a real way to remove them.'),k0,false);
await maya.commissionAddStageNote(groupId,0n,'Maya: Our question is how communities can delegate real authority without losing control of that mandate. Samira’s framing contribution identifies the gap.',false);
await ruth.commissionAddStageNote(groupId,0n,'Ruth: Include members who do not want to stand for leadership. Accountability must remain available to them too.',false);
const c1=await consultation(1,'Inquiry: public accountability proposals','public',['What accountability mechanism or experience would you like the group to consider?','How can people challenge or change decisions under this approach?']);
const k1=receipt();const s1=await samira.commissionSubmit(c1,input('Samira Ali','Selection: volunteers are randomly assigned to small groups. They discuss role-specific questions and assess one another. Each group nominates a peer. Nominees are randomly regrouped into further PlayUp rounds until a vetted shortlist remains. A final random draw appoints the steward.\n\nAccountability: general eligible members retain non-confidence powers. A successful member decision removes the steward’s mandate before the term ends. A replacement is randomly drawn from the remaining vetted pool. Those removing a steward do not get to name their preferred successor.\n\nThe steward has defined authority to act, not merely a duty to listen. Selection does not give a permanent entitlement to power.'),k1,false);
await maya.commissionComment(s1,'','If the steward stops reporting or acts outside the mandate, how do members end that authority?');
await samira.commissionComment(s1,k1,'An eligible member initiates the agreed non-confidence process. A successful membership vote removes the authority; it is not just a request to the steward. Replacement comes from the vetted pool through a fresh random draw.');
await ruth.commissionComment(s1,'','This distinction is useful: PlayUp vets candidates; a final draw appoints; membership non-confidence can remove. We should preserve all three in the finding.');
await maya.commissionAddStageNote(groupId,1n,'Samira’s proposal includes random grouping, PlayUp, a final random appointment and membership-controlled non-confidence. The private thread clarifies enforceable removal and replacement.',false);
const draft='Explore a community-designed Fractal Sortition trial for a defined stewardship role. Retain random group formation, peer-vetted PlayUp, a final random appointment, member-controlled non-confidence and random replacement from the remaining vetted pool. Define the mandate, electorate, thresholds, terms, enforcement and pool renewal before starting.';
const disagreements='Selection bias, participation barriers and cultural fit need examination. Recall controls the community’s delegate; an external institution must separately recognise that mandate or commit to respond.';
await stage(2,draft,disagreements,true);
await maya.commissionShareAdvisorStage(groupId,2n,true);
await maya.commissionAddStageNote(groupId,2n,'Maya: Advisors are invited to examine the selected draft and the removal safeguards. Private public submissions are not shared.',true);
await leo.commissionAddStageNote(groupId,2n,'Leo: The membership’s removal power is central. Specify who can initiate non-confidence, how votes are counted, what turnout is required, and who enforces loss of authority. Protect participants from retaliation.',true);
await ruth.commissionAddStageNote(groupId,2n,'Ruth: Internal drafting note: preserve Samira’s contribution without public attribution. This note is not shared with Advisors.',false);
const c2=await consultation(2,'Co-Design: invited Advisor feedback','partners',['What makes non-confidence usable and fair?','What mandate and replacement rules need specifying?']);
const k2=receipt();const s2=await leo.commissionSubmit(c2,input('Dr Leo Mensah','Preserve the model’s removal and replacement powers. Specify an eligible electorate, initiation threshold, turnout, decision rule, evidence access, deadlines and enforcement. The membership should not need the incumbent’s permission to remove them. A final random draw and a waiting pool are essential to the proposal. Recall of a community steward does not automatically bind an outside government or corporation.'),k2,false);
await maya.commissionComment(s2,'','Thank you, Leo. We will turn these into explicit design requirements, rather than omitting the removal mechanism from the recommendation.');
await leo.commissionComment(s2,'','Also specify how the pool is replenished and what happens if no eligible replacement remains.');
await stage(3,draft,disagreements,true);
await maya.commissionSaveFinding({id:0n,groupId,kind:'insight',body:'Fractal Sortition links peer-vetted random appointment to ongoing democratic deselection. The wider membership retains the power to withdraw a mandate; replacement draws from a vetted pool support continuity.',sources:[s1],needsReview:false},true);
await ruth.commissionSaveFinding({id:0n,groupId,kind:'tension',body:'Removal powers must be accessible and enforceable. Electorate, thresholds, term rules, pool renewal and external recognition require community-specific design.',sources:[s1,s2],needsReview:false},true);
await maya.commissionAddStageNote(groupId,3n,'Maya: The finding preserves the full mechanism. The draft recommends exploration of a defined governance role, not a generic listening panel.',false);
await ruth.commissionAddStageNote(groupId,3n,'Ruth: Record Leo’s conditions alongside the proposal. Do not describe a formal right of recall as proven protection against capture or retaliation.',false);
await maya.commissionPublish({groupId,title:'Example recommendation: accountable community stewardship',body:draft,disagreements,sources:[s1,s2],at:0n});
const c4=await consultation(4,'Deliver: public feedback on the approved recommendation','public',['Does the public summary represent the proposal accurately?','What should change before a trial?']);
const k4=receipt();const s4=await samira.commissionSubmit(c4,input('Samira Ali','The summary now preserves the accountability mechanism: sortition appoints, while the wider membership can withdraw authority. Please keep final random selection and replacement continuity explicit. Communities should set rules that make removal safe and usable.'),k4,false);
await maya.commissionComment(s4,'','Thank you. We will keep these requirements visible and use feedback to revise the trial design.');
await maya.commissionAddStageNote(groupId,4n,'Maya: A separate approved public snapshot is published. A further public consultation lets Samira and others respond; private comments remain private.',false);
await stage(0,draft,disagreements,true);
const manifest={groupId:String(groupId),submissionId:String(s1),receipt:k1,advisorSubmissionId:String(s2),advisorReceipt:k2,consultations:[c0,c1,c2,c4].map(String),framingSubmissionId:String(s0),feedbackSubmissionId:String(s4),feedbackReceipt:k4,personas:[{key:'maya',name:'Maya Chen',role:'Working Group lead',identity:identities.maya.toJSON()},{key:'ruth',name:'Ruth Okafor',role:'Working Group member',identity:identities.ruth.toJSON()},{key:'leo',name:'Dr Leo Mensah',role:'Advisor',identity:identities.leo.toJSON()},{key:'samira',name:'Samira Ali',role:'Public contributor'}]};
writeFileSync(manifestPath,JSON.stringify(manifest,null,2),{mode:0o600});
console.log('Created the five-stage accountability rehearsal with named participants and persisted real backend records.');
