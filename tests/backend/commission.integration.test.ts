import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createIdentity } from "@dfinity/pic";
import {
  actorFor,
  createBackendFixture,
  candidPrincipal,
  type BackendFixture,
} from "./fixture";
import type {
  CommissionInput,
  CommissionConsultation,
} from "../../declarations/backend/backend.did";

const input = (quoteConsent = true): CommissionInput => ({
  alias: "Fictional contributor",
  language: "sw",
  answers: "Fictional testimony: affected people should shape accountability.",
  internalConsent: true,
  quoteConsent,
  attributionConsent: false,
  format: "written/digital",
  date: "",
  location: "",
  participants: "",
  themes: "",
  tensions: "",
  proposals: "",
});
const credential = "a".repeat(64);
describe("2048 Commission rehearsal", () => {
  let f: BackendFixture;
  beforeEach(async () => {
    f = await createBackendFixture();
  });
  afterEach(async () => {
    await f.pic.tearDown();
  });
  async function setup() {
    const lead = actorFor(f, f.adminIdentity);
    await lead.bootstrapPlatformAdmin();
    const ids = await lead.commissionSetupDemo();
    const group = ids[0];
    const c = (await lead.commissionListConsultations(group))[0];
    return {
      lead,
      group,
      second: ids[1],
      c,
      publicActor: actorFor(f, f.anonymousIdentity),
      member: actorFor(f, f.memberIdentity),
      partner: actorFor(f, f.outsiderIdentity),
    };
  }
  it("configures named roles, enforces capabilities and protects the final manager", async () => {
    const {lead,group,second,member,publicActor,c} = await setup();
    await lead.commissionInitializeSettings(group);
    await lead.commissionInitializeSettings(group);
    const facilitator=await lead.commissionSaveRole(group,{id:"member",name:"Facilitator",capabilities:["internalAccess","recordFacilitated","sharedParticipation"]},true);
    await lead.commissionAssignConfiguredRole(group,candidPrincipal(f.memberIdentity),[facilitator]);
    expect((await member.commissionAccess(group)).name).toBe("Facilitator");
    await member.commissionSubmitFlexible(c.id,input(),"c".repeat(64),"roundtable","",false,false);
    await expect(member.commissionSaveRecommendation(group,"No edit","",[],false)).rejects.toThrow(/editSynthesis/);
    await expect(member.commissionSaveFinding({id:0n,groupId:group,kind:"insight",body:"Cannot edit",sources:[],needsReview:false},true)).rejects.toThrow(/editSynthesis/);
    await expect(member.commissionPublish({groupId:group,title:"Cannot publish",body:"No",disagreements:"",sources:[],at:0n})).rejects.toThrow(/Only the group lead/);
    await expect(member.listCommunityDocuments(group)).rejects.toThrow(/Workspace capability/);
    await expect(member.commissionGetGroup(second)).rejects.toThrow(/access required/);
    await expect(publicActor.commissionSaveRole(group,{id:"contributor",name:"Anyone",capabilities:["internalAccess"]},false)).rejects.toThrow(/Only the group lead/);
    await expect(lead.commissionSaveRole(group,{id:"contributor",name:"Public",capabilities:["internalAccess"]},false)).rejects.toThrow(/submission-scoped/);
    await expect(lead.commissionSaveRole(group,{id:"lead",name:"Coordinator",capabilities:[]},false)).rejects.toThrow(/at least one/);
    const r=(await lead.commissionRoles(group)).find(r=>r.id===facilitator)!;
    await lead.commissionSaveRole(group,{...r,name:"Community recorder"},false);
    expect((await member.commissionAccess(group)).name).toBe("Community recorder");
    await lead.commissionSaveRole(group,{...r,capabilities:[]},false);
    await expect(member.commissionListSubmissions(c.id)).rejects.toThrow(/access required/);
    expect((await publicActor.commissionAccess(group)).capabilities).toEqual([]);
  });
  it("supports all shared contribution layouts, stable labels and credential isolation", async () => {
    const {lead,group,c,publicActor,member}=await setup();
    const types=await publicActor.commissionContributionTypes(group);
    expect(types.map(t=>t.id)).toEqual(["written","collective","discussion","roundtable","harvest","document","other"]);
    let counter=10;
    for(const t of types) {
      const caller=t.layout==="event"?lead:publicActor;
      const key=(++counter).toString(16).padStart(64,"0");
      const id=await caller.commissionSubmitFlexible(c.id,{...input(),participants:"Fictional collective"},key,t.id,t.layout==="document"?"https://example.org/fictional-report.pdf":"",false,true);
      expect((await caller.commissionContributionDetail(id,key)).typeId).toBe(t.id);
      expect((await caller.commissionSubmissionTypes(id,key)).map(type=>type.id)).toContain(t.id);
      await expect(publicActor.commissionSubmissionTypes(id,"f".repeat(64))).rejects.toThrow(/Private submission/);
      await expect(publicActor.commissionContributionDetail(id,"f".repeat(64))).rejects.toThrow(/Private submission/);
    }
    await expect(publicActor.commissionSubmitFlexible(c.id,input(),"1".repeat(64),"collective","",false,false)).rejects.toThrow(/Confirm authority/);
    await expect(publicActor.commissionSubmitFlexible(c.id,input(),"2".repeat(64),"roundtable","",false,false)).rejects.toThrow(/facilitated recording/);
    await expect(publicActor.commissionSubmitFlexible(c.id,input(),"3".repeat(64),"document","javascript:alert(1)",false,false)).rejects.toThrow(/HTTPS/);
    const id=await publicActor.commissionSubmitFlexible(c.id,input(),"4".repeat(64),"written","",false,false);
    await lead.commissionSaveContributionType(group,{...types[0],name:"Community testimony"},false);
    expect((await publicActor.commissionContributionDetail(id,"4".repeat(64))).typeId).toBe("written");
    const newType=await lead.commissionSaveContributionType(group,{id:"",name:"Community circle",guidance:"Preserve differences",layout:"collective"},true);
    expect((await publicActor.commissionContributionTypes(group)).find(t=>t.id===newType)?.layout).toBe("collective");
    await lead.commissionAssignConfiguredRole(group,candidPrincipal(f.memberIdentity),["member"]);
    const privateDoc=await lead.createCommunityDocument(group,"Private fictional document");
    await expect(member.commissionSubmitFlexible(c.id,input(),"5".repeat(64),"document",`workspace:${privateDoc}`,false,false)).rejects.toThrow(/document access/);
    await lead.setCommunityDocumentShare(group,privateDoc,[{viewer:null}]);
    await expect(member.commissionSubmitFlexible(c.id,input(),"5".repeat(64),"document",`workspace:${privateDoc}`,false,false)).resolves.toBeTypeOf("bigint");
  });
  it("shares only a selected review copy and supports community and process feedback", async () => {
    const {lead,group,c,publicActor,partner}=await setup();
    const g=await lead.commissionGetGroup(group);
    await lead.commissionSaveGroup(group,g.name,g.purpose,g.stage,"SECRET INTERNAL DRAFT","Internal disagreement",false);
    const id=await publicActor.commissionSubmitFlexible(c.id,input(),credential,"written","",false,false);
    await lead.commissionSaveReviewCopy({consultationId:c.id,title:"Selected draft",body:"Public review wording",sources:[id],needsReview:false});
    expect((await publicActor.commissionReviewCopy(c.id))[0]?.body).toBe("Public review wording");
    await expect(publicActor.commissionSharedDraft(group)).rejects.toThrow(/not shared/);
    const feedback=await publicActor.commissionSubmitFlexible(c.id,{...input(),answers:"Please include community review before finalisation"},"b".repeat(64),"written","",false,false);
    await lead.commissionComment(feedback,"","Accepted: the recommendation now includes community review.");
    const suggestion=await publicActor.commissionSubmitFlexible(c.id,{...input(),answers:"Please invite collective inputs"},"c".repeat(64),"written","",true,false);
    expect((await publicActor.commissionContributionDetail(suggestion,"c".repeat(64))).processSuggestion).toBe(true);
    await expect(partner.commissionGetSubmission(feedback,"")).rejects.toThrow(/Private submission/);
    const core=await lead.commissionSaveConsultation({...c,audience:"core",title:"Internal"},true);
    await lead.commissionSaveReviewCopy({consultationId:core,title:"Private selected copy",body:"Not public",sources:[],needsReview:false});
    await expect(publicActor.commissionReviewCopy(core)).rejects.toThrow(/access required/);
    await expect(publicActor.commissionSaveReviewCopy({consultationId:c.id,title:"Override",body:"No",sources:[],needsReview:false})).rejects.toThrow(/Only the group lead/);
  });
  it("preserves provenance and blocks republication until derived work is reviewed", async () => {
    const {lead,group,c,publicActor}=await setup();
    const id=await publicActor.commissionSubmitFlexible(c.id,input(),credential,"document","https://example.org/fictional.pdf",false,false);
    const finding=await lead.commissionSaveFinding({id:0n,groupId:group,kind:"insight",body:"An example finding",sources:[id],needsReview:false},true);
    await lead.commissionSaveRecommendation(group,"Recommendation based on evidence","Unresolved questions",[finding],false);
    await lead.commissionSaveReviewCopy({consultationId:c.id,title:"Review copy",body:"An excerpt",sources:[id],needsReview:false});
    await lead.commissionPublish({groupId:group,title:"Approved",body:"Selected public text",disagreements:"",sources:[],at:0n});
    expect((await publicActor.commissionPublicationsList())[0].sources).toContain(id);
    await publicActor.commissionWithdraw(id,credential);
    const detail=await publicActor.commissionContributionDetail(id,credential);
    expect(detail.withdrawnAt).toHaveLength(1);expect(detail.documentReference).toBe("");
    expect((await lead.commissionDraftEvidenceState(group)).needsReview).toBe(true);
    expect((await lead.commissionPublicationStatus(group))[0].status).toBe("withheld");
    expect((await publicActor.commissionReviewCopy(c.id))[0]?.body).toBe("");
    expect((await lead.commissionSourceProvenance(group)).map(x=>x.targetKind)).toEqual(["finding","recommendation","reviewCopy","publication"]);
    await expect(lead.commissionPublish({groupId:group,title:"No bypass",body:"No",disagreements:"",sources:[],at:0n})).rejects.toThrow(/Review the recommendation/);
    await expect(lead.commissionSaveRecommendation(group,"Revised","",[finding],true)).rejects.toThrow(/findings first/);
    await lead.commissionSaveFinding({id:finding,groupId:group,kind:"insight",body:"Revised independently supported analysis",sources:[],needsReview:false},false);
    await expect(lead.commissionSaveRecommendation(group,"Revised","",[finding],false)).rejects.toThrow(/Confirm review/);
    await lead.commissionSaveRecommendation(group,"Revised after review","",[finding],true);
    await lead.commissionPublish({groupId:group,title:"Revised",body:"Approved revision",disagreements:"",sources:[],at:0n});
    expect((await publicActor.commissionPublicationsList())[0].title).toBe("Revised");
    expect((await lead.commissionSourceProvenance(group)).some(x=>x.sourceId===id&&x.targetKind==="finding")).toBe(true);
    // Repeated withdrawal must not invalidate a later reviewed recommendation.
    await publicActor.commissionWithdraw(id,credential);
    expect((await lead.commissionDraftEvidenceState(group)).needsReview).toBe(false);
    await f.pic.upgradeCanister({canisterId:f.canisterId,wasm:readFileSync(".icp/cache/artifacts/backend"),upgradeModeOptions:{wasm_memory_persistence:[{keep:null}],skip_pre_upgrade:[]}});
    expect((await lead.commissionPublicationStatus(group)).map(x=>x.status)).toEqual(["withheld","published"]);
    expect((await publicActor.commissionContributionDetail(id,credential)).withdrawnAt).toEqual(detail.withdrawnAt);
  });
  it("scopes stage discussions, attributes comments and shares only selected Advisor material", async () => {
    const {lead, group, second, member, partner, c, publicActor} = await setup();
    await lead.commissionAssignRole(group, candidPrincipal(f.memberIdentity), [{member:null}]);
    await lead.commissionAssignRole(group, candidPrincipal(f.outsiderIdentity), [{partner:null}]);
    await lead.commissionSetDisplayName(group, "Maya Chen");
    await member.commissionSetDisplayName(group, "Ruth Okafor");
    await partner.commissionSetDisplayName(group, "Dr Leo Mensah");
    await lead.commissionAddStageNote(group, 2n, "Internal only", false);
    await lead.commissionAddStageNote(group, 2n, "Selected draft for Advisors", true);
    await expect(partner.commissionListStageNotes(group,2n)).rejects.toThrow(/not shared/);
    await expect(partner.commissionShareAdvisorStage(group,2n,true)).rejects.toThrow(/Only the group lead/);
    await lead.commissionShareAdvisorStage(group,2n,true);
    await partner.commissionAddStageNote(group,2n,"Advice about recall",false);
    const shared = await partner.commissionListStageNotes(group,2n);
    expect(shared.map(n=>n.body)).toEqual(["Selected draft for Advisors","Advice about recall"]);
    expect(shared[1].author).toBe("Dr Leo Mensah");
    expect(shared[1].role).toBe("Advisor");
    expect((await member.commissionListStageNotes(group,2n)).length).toBe(3);
    await expect(member.commissionAddStageNote(group,2n,"Cannot expose internal material",true)).rejects.toThrow(/Only leads/);
    await expect(publicActor.commissionListStageNotes(group,2n)).rejects.toThrow(/not shared/);
    await expect(partner.commissionListStageNotes(second,2n)).rejects.toThrow(/not shared/);
    await lead.commissionShareAdvisorStage(group,2n,false);
    await expect(partner.commissionAddStageNote(group,2n,"No longer invited",true)).rejects.toThrow(/not shared/);
    await lead.commissionSetConsultationStage(c.id,0n);
    expect((await publicActor.commissionStageConsultations(group,0n)).map(x=>x.id)).toContain(c.id);
    expect(await publicActor.commissionStageConsultations(group,1n)).toEqual([]);
    await expect(partner.commissionSetConsultationStage(c.id,1n)).rejects.toThrow(/Only the group lead/);
    const id = await publicActor.commissionSubmit(c.id,input(),credential,false);
    await member.commissionComment(id,"","Clarification");
    expect((await publicActor.commissionGetSubmission(id,credential)).comments[0].author).toBe("Ruth Okafor · Working Group");
  });

  it("allows an authenticated controller to set up without replacing existing administrators", async () => {
    const admin = actorFor(f, f.adminIdentity);
    await admin.bootstrapPlatformAdmin();
    await f.pic.updateCanisterSettings({
      canisterId: f.canisterId,
      controllers: [f.memberIdentity.getPrincipal()],
    });
    const controller = actorFor(f, f.memberIdentity);
    const ids = await controller.commissionSetupDemo();
    expect(await controller.commissionRole(ids[0])).toEqual([{ lead: null }]);
    expect(await controller.isCallerPlatformAdmin()).toBe(false);
    expect(
      (await controller.listPlatformAdmins()).map((p) => p.toText()),
    ).toEqual([f.adminIdentity.getPrincipal().toText()]);
    await expect(
      actorFor(f, f.anonymousIdentity).commissionSetupDemo(),
    ).rejects.toThrow(/Anonymous callers/);
  });

  it("sets up idempotently, preserves existing communities, scopes roles and protects the last lead", async () => {
    const lead = actorFor(f, f.adminIdentity);
    await lead.bootstrapPlatformAdmin();
    await lead.createCommunity("Existing DAO", "Keep me");
    const ids = await lead.commissionSetupDemo();
    expect(ids).toEqual([1n, 2n]);
    expect(await lead.commissionSetupDemo()).toEqual(ids);
    expect((await lead.listCommunities()).map((g) => g.name)).toContain(
      "Existing DAO",
    );
    await lead.commissionAssignRole(ids[0], candidPrincipal(f.memberIdentity), [
      { member: null },
    ]);
    const member = actorFor(f, f.memberIdentity);
    expect(await member.commissionRole(ids[0])).toEqual([{ member: null }]);
    expect(await member.commissionRole(ids[1])).toEqual([]);
    await expect(member.commissionGetGroup(ids[1])).rejects.toThrow(
      /access required/,
    );
    await expect(
      lead.commissionAssignRole(ids[0], candidPrincipal(f.adminIdentity), []),
    ).rejects.toThrow(/at least one lead/);
    for (let stage = 0n; stage < 5n; stage++) {
      const g = await lead.commissionGetGroup(ids[0]);
      await lead.commissionSaveGroup(
        g.id,
        g.name,
        g.purpose,
        stage,
        g.draft,
        g.disagreements,
        false,
      );
      expect((await lead.commissionGetGroup(ids[0])).stage).toBe(stage);
    }
  });
  it("isolates anonymous return credentials and lets the entire working group discuss a submission", async () => {
    const { lead, group, second, c, publicActor, member, partner } =
      await setup();
    await lead.commissionAssignRole(group, candidPrincipal(f.memberIdentity), [
      { member: null },
    ]);
    await lead.commissionAssignRole(
      second,
      candidPrincipal(f.outsiderIdentity),
      [{ member: null }],
    );
    const id = await publicActor.commissionSubmit(
      c.id,
      input(),
      credential,
      false,
    );
    const anotherId = await publicActor.commissionSubmit(
      c.id,
      input(),
      "b".repeat(64),
      false,
    );
    await expect(publicActor.commissionGetSubmission(id, "")).rejects.toThrow(
      /Private submission/,
    );
    await expect(
      publicActor.commissionGetSubmission(anotherId, credential),
    ).rejects.toThrow(/Private submission/);
    await expect(partner.commissionGetSubmission(id, "")).rejects.toThrow(
      /Private submission/,
    );
    await expect(publicActor.commissionListSubmissions(c.id)).rejects.toThrow(
      /access required/,
    );
    await publicActor.commissionComment(
      id,
      credential,
      "Please preserve the disagreement.",
    );
    await member.commissionComment(id, "", "What would repair look like?");
    await lead.commissionComment(id, "", "We will include the tension.");
    const submission = await publicActor.commissionGetSubmission(
      id,
      credential,
    );
    expect(submission.comments).toHaveLength(3);
    expect(submission.canWithdraw).toBe(true);
    expect((await member.commissionGetSubmission(id, "")).canWithdraw).toBe(
      false,
    );
    expect(submission.input.language).toBe("sw");
    expect(submission).not.toHaveProperty("credential");
    expect(submission).not.toHaveProperty("owner");
    await expect(
      partner.commissionComment(id, "", "Not allowed"),
    ).rejects.toThrow(/Private submission/);
  });
  it("shares selected consultations and drafts with partners without exposing internal deliberation", async () => {
    const { lead, group, c, publicActor, partner } = await setup();
    await lead.commissionAssignRole(
      group,
      candidPrincipal(f.outsiderIdentity),
      [{ partner: null }],
    );
    const restricted: CommissionConsultation = {
      ...c,
      title: "Invited partners",
      audience: "partners",
    };
    const id = await lead.commissionSaveConsultation(restricted, true);
    const coreId = await lead.commissionSaveConsultation(
      { ...c, title: "Core deliberation", audience: "core" },
      true,
    );
    expect(
      (await partner.commissionListConsultations(group)).map((c) => c.id),
    ).toContain(id);
    expect(
      (await partner.commissionListConsultations(group)).map((c) => c.id),
    ).not.toContain(coreId);
    expect(
      (await publicActor.commissionListConsultations(group)).map((c) => c.id),
    ).not.toContain(id);
    await expect(
      publicActor.commissionSubmit(id, input(), credential, false),
    ).rejects.toThrow(/access required/);
    const contribution = await partner.commissionSubmit(
      id,
      input(),
      credential,
      false,
    );
    await partner.commissionComment(contribution, "", "Partner clarification");
    await expect(partner.commissionGetGroup(group)).rejects.toThrow(
      /access required/,
    );
    await expect(partner.commissionListSubmissions(id)).rejects.toThrow(
      /access required/,
    );
    await expect(partner.commissionSharedDraft(group)).rejects.toThrow(
      /not shared/,
    );
    const g = await lead.commissionGetGroup(group);
    await lead.commissionSaveGroup(
      group,
      g.name,
      g.purpose,
      2n,
      "Shared draft",
      "Internal disagreement",
      true,
    );
    expect(await partner.commissionSharedDraft(group)).toBe("Shared draft");
    await expect(partner.commissionSaveConsultation(c, false)).rejects.toThrow(
      /Only the group lead/,
    );
    await partner.commissionWithdraw(contribution, "");
    await expect(
      partner.commissionGetSubmission(contribution, ""),
    ).rejects.toThrow(/Private submission/);
    expect(
      (await partner.commissionGetSubmission(contribution, credential))
        .withdrawn,
    ).toBe(true);
  });
  it("checks source consent, restricts publication and withdraws dependent public snapshots", async () => {
    const { lead, group, second, c, publicActor, member } = await setup();
    await lead.commissionAssignRole(group, candidPrincipal(f.memberIdentity), [
      { member: null },
    ]);
    const id = await publicActor.commissionSubmit(
      c.id,
      input(),
      credential,
      false,
    );
    const privateId = await publicActor.commissionSubmit(
      c.id,
      input(false),
      "b".repeat(64),
      false,
    );
    await member.commissionSaveFinding(
      {
        id: 0n,
        groupId: group,
        kind: "tension",
        body: "Preserve divergent views.",
        sources: [id],
        needsReview: false,
      },
      true,
    );
    const publication = {
      groupId: group,
      title: "Approved draft",
      body: "Consented quotation.",
      disagreements: "No unanimity assumed.",
      sources: [id],
      at: 0n,
    };
    await expect(member.commissionPublish(publication)).rejects.toThrow(
      /Only the group lead/,
    );
    await expect(
      lead.commissionPublish({ ...publication, sources: [privateId] }),
    ).rejects.toThrow(/quotation consent/);
    await expect(
      lead.commissionPublish({ ...publication, groupId: second }),
    ).rejects.toThrow(/Unavailable source/);
    await lead.commissionPublish(publication);
    expect(await publicActor.commissionPublicationsList()).toHaveLength(1);
    await expect(member.commissionWithdraw(id, "")).rejects.toThrow(
      /Only the contributor/,
    );
    await publicActor.commissionWithdraw(id, credential);
    const withdrawn = await publicActor.commissionGetSubmission(id, credential);
    expect(withdrawn.withdrawn).toBe(true);
    expect(withdrawn.input.answers).toBe("");
    expect(withdrawn.comments).toEqual([]);
    expect((await member.commissionListFindings(group))[0].needsReview).toBe(
      true,
    );
    expect(await publicActor.commissionPublicationsList()).toEqual([]);
    expect(
      (await lead.commissionListSubmissions(c.id)).map((s) => s.id),
    ).not.toContain(id);
    await expect(lead.commissionPublish(publication)).rejects.toThrow(
      /Unavailable source/,
    );
    await expect(
      publicActor.commissionComment(id, credential, "Revive"),
    ).rejects.toThrow(/Cannot add comment/);
  });
  it("records facilitated input, honours closure and persists across upgrades", async () => {
    const { lead, group, c, publicActor } = await setup();
    await expect(
      publicActor.commissionSubmit(c.id, input(), credential, true),
    ).rejects.toThrow(/access required/);
    const id = await lead.commissionSubmit(
      c.id,
      {
        ...input(),
        format: "closed movement discussion",
        participants: "Three fictional participants",
        themes: "Repair",
      },
      credential,
      true,
    );
    expect((await lead.commissionGetSubmission(id, "")).facilitated).toBe(true);
    await lead.commissionSaveConsultation({ ...c, closed: true }, false);
    await expect(
      publicActor.commissionSubmit(c.id, input(), "b".repeat(64), false),
    ).rejects.toThrow(/closed/);
    await f.pic.upgradeCanister({
      canisterId: f.canisterId,
      wasm: readFileSync(".icp/cache/artifacts/backend"),
      upgradeModeOptions: {
        wasm_memory_persistence: [{ keep: null }],
        skip_pre_upgrade: [],
      },
    });
    expect((await lead.commissionGetGroup(group)).name).toBe(
      "Accountability Mechanisms",
    );
    expect((await lead.commissionGetSubmission(id, "")).input.themes).toBe(
      "Repair",
    );
  });
});
