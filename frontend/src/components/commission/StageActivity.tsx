import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { _SERVICE } from "../../declarations/backend.did";
const purposes = [
  "Identify the accountability problem, affected communities and the questions that need exploration.",
  "Gather experiences and proposed mechanisms. Ask contributors for clarification before interpreting their input.",
  "Develop options with contributors, communities and Advisors. Invite challenge and suggested revisions.",
  "Link findings to sources, preserve disagreement and prepare a human-edited recommendation.",
  "Approve a selected public snapshot and invite feedback. Private discussions remain private.",
];
export default function StageActivity({ actor, principal, groupId, stage, capabilities, text, run, openConsultation, rehearsalStartId }: {
  actor: _SERVICE; principal: string; groupId: bigint; stage: number; capabilities: string[];
  text: (s: string) => string; run: (f: () => Promise<unknown>) => Promise<void>;
  openConsultation: (id: bigint) => void; rehearsalStartId?: bigint;
}) {
  const isCore = capabilities.includes("internalAccess");
  const isAdvisor = capabilities.includes("sharedParticipation") && !isCore;
  const manage=capabilities.includes("manageGroup");
  const [body, setBody] = useState("");
  const [share, setShare] = useState(false);
  const prefix = ["commission", principal, String(groupId), "stage", stage];
  const access = useQuery({ queryKey: [...prefix, "access"], queryFn: () => actor.commissionAdvisorStageShared(groupId, BigInt(stage)), enabled: isCore || isAdvisor });
  const notes = useQuery({ queryKey: [...prefix, "notes"], queryFn: () => actor.commissionListStageNotes(groupId, BigInt(stage)), enabled: isCore || (isAdvisor && access.data === true), refetchInterval: 5000 });
  const consultations = useQuery({ queryKey: [...prefix, "consultations"], queryFn: () => actor.commissionStageConsultations(groupId, BigInt(stage)) });
  return <section className="c-panel c-stage-activity">
    <h2>{text(["Sense-Making", "Inquiry", "Co-Design", "Synthesis", "Deliver"][stage])} — {text("Stage activity")}</h2><p>{text(purposes[stage])}</p>
    {manage && <label className="c-check"><input type="checkbox" checked={access.data === true} onChange={e => void run(() => actor.commissionShareAdvisorStage(groupId, BigInt(stage), e.target.checked))} /> {text("Invite Advisors to this stage discussion")}</label>}
    <h3>{text("Consultations at this stage")}</h3>
    {consultations.data?.filter(c => rehearsalStartId === undefined || c.id >= rehearsalStartId).map(c => <button className="c-consult-card" key={String(c.id)} onClick={() => openConsultation(c.id)}><strong>{c.title}</strong><p>{c.purpose}</p><small>{text(c.audience)}</small></button>)}
    {!consultations.data?.length && <p>{text("No consultations linked to this stage yet.")}</p>}
    {(isCore || isAdvisor) && <><h3>{text("Discussion and Advisor feedback")}</h3>
      {isAdvisor && !access.data && <p>{text("The lead has not invited Advisors to this stage discussion.")}</p>}
      {notes.data?.filter(n => rehearsalStartId === undefined || n.id >= rehearsalStartId).map(n => <article className="c-stage-comment" key={String(n.id)}><strong>{n.author}</strong> <span className="c-role-label">{text(n.role)}</span><p className="c-pre">{n.body}</p><small>{text(n.sharedWithAdvisors ? "Shared with invited Advisors" : "Internal Working Group discussion")}</small></article>)}
      {(isCore || access.data) && <details><summary>{text("Add a comment or advice")}</summary><form onSubmit={e => {e.preventDefault(); void run(async () => {await actor.commissionAddStageNote(groupId, BigInt(stage), body, share); setBody("");});}}>
        <label className="c-field"><span>{text("Add a comment or advice")}</span><textarea value={body} onChange={e => setBody(e.target.value)} rows={4} required /></label>
        {manage && <label className="c-check"><input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} /> {text("Share this comment with invited Advisors")}</label>}
        <button disabled={!body.trim()}>{text("Post comment")}</button>
      </form></details>}
    </>}
  </section>;
}
