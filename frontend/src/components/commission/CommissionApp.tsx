import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Principal } from "@dfinity/principal";
import { useTranslation } from "react-i18next";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { commissionActor, newReturnCredential } from "../../commission-api";
import type {
  CommissionConsultation,
  CommissionInput,
  CommissionGroup,
  CommissionFinding,
  CommissionSubmission,
  _SERVICE,
} from "../../declarations/backend.did";
import LanguageSwitcher from "../LanguageSwitcher";
import CommissionWorkspace from "./CommissionWorkspace";
import "./commission.css";
import StageActivity from "./StageActivity";
import ConfigurationPanel from "./ConfigurationPanel";
import ConsultationReview from "./ConsultationReview";
import SourcePicker from "./SourcePicker";
import { useLocalRehearsal } from "./useLocalRehearsal";
import {
  consultationStatus,
  formatLocalDateTime,
  parseLocalDateTime,
} from "../../commission-model";

const stages = ["Sense-Making", "Inquiry", "Co-Design", "Synthesis", "Deliver"];
const emptyInput = (): CommissionInput => ({
  alias: "",
  language: "en",
  answers: "",
  internalConsent: false,
  quoteConsent: false,
  attributionConsent: false,
  format: "written/digital",
  date: "",
  location: "",
  participants: "",
  themes: "",
  tensions: "",
  proposals: "",
});
function Field({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="c-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
function Check({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="c-check">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />{" "}
      {label}
    </label>
  );
}
export default function CommissionApp() {
  useEffect(() => {
    document.title = "2048 Commission — Local Rehearsal";
  }, []);
  const ii = useInternetIdentity();
  const rehearsal = useLocalRehearsal();
  const auth = rehearsal.persona ? { ...ii, identity: rehearsal.identity as unknown as typeof ii.identity, clear: () => rehearsal.choose("") } : ii;
  const qc = useQueryClient();
  const { t, i18n } = useTranslation();
  const text = (s: string) =>
    t(s, { ns: "commission", defaultValue: s, keySeparator: false });
  const principal = auth.identity?.getPrincipal().toText() || "anonymous";
  const actorQuery = useQuery({
    queryKey: ["commissionActor", principal],
    queryFn: () => commissionActor(auth.identity),
    staleTime: Infinity,
  });
  const actor = actorQuery.data;
  const [path, setPath] = useState(window.location.pathname);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [processOnly,setProcessOnly] = useState(false);
  const match = path.match(/^\/2048\/groups\/(\d+)(?:\/(\w+))?/);
  const groupId = match ? BigInt(match[1]) : null;
  const tab = match?.[2] || "overview";
  const submissionMatch = path.match(/^\/2048\/submissions\/(\d+)/);
  const submissionId = submissionMatch ? BigInt(submissionMatch[1]) : null;
  const [credential, setCredential] = useState("");
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    if (submissionId === null) {
      setCredential("");
      return;
    }
    const supplied = window.location.hash.slice(1);
    const saved =
      localStorage.getItem(rehearsal.persona ? `commission.receipt.rehearsal.${rehearsal.persona.key}.${submissionId}` : `commission.receipt.${submissionId}`) || "";
    const key = /^[a-f0-9]{64}$/.test(supplied) ? supplied : saved;
    if (key) localStorage.setItem(rehearsal.persona ? `commission.receipt.rehearsal.${rehearsal.persona.key}.${submissionId}` : `commission.receipt.${submissionId}`, key);
    setCredential(key);
    if (supplied) history.replaceState({}, "", window.location.pathname);
  }, [submissionId, rehearsal.persona?.key, principal]);
  // Remove private caches as identities change; query keys also include the principal.
  useEffect(() => {
    qc.removeQueries({
      predicate: (q) =>
        q.queryKey[0] === "commission" && q.queryKey[1] !== principal,
    });
  }, [principal, qc]);
  const navigate = (url: string) => {
    history.pushState({}, "", url);
    setPath(window.location.pathname);
    setMenu(false);
    setError("");
  };
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["commission", principal] });
      await qc.invalidateQueries({ queryKey: ["commissionTypes"] });
      setNotice(text("Saved successfully"));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message.match(/with message:\s*'([^']+)'/)?.[1] || message);
    } finally {
      setBusy(false);
    }
  };
  const groups = useQuery({
    queryKey: ["commission", principal, "groups"],
    queryFn: () => actor!.commissionListGroups(),
    enabled: !!actor,
  });
  const publications = useQuery({
    queryKey: ["commission", principal, "publications"],
    queryFn: () => actor!.commissionPublicationsList(),
    refetchInterval: 10000,
    enabled: !!actor,
  });
  const access = useQuery({queryKey:["commission",principal,String(groupId),"access"],queryFn:()=>actor!.commissionAccess(groupId!),enabled:!!actor&&groupId!==null,refetchInterval:3000});
  const roleName=access.data?.roleId||"contributor";
  const capabilities=access.data?.capabilities||[];
  const core=capabilities.includes("internalAccess");
  const lead=capabilities.includes("manageGroup");
  const canEdit=capabilities.includes("editSynthesis");
  const canPublish=capabilities.includes("publish");
  const canRecord=capabilities.includes("recordFacilitated");
  const canWorkspace=capabilities.includes("workspace");
  useEffect(()=>{qc.removeQueries({predicate:q=>q.queryKey[0]==="commission"&&q.queryKey[1]===principal&&q.queryKey[2]===String(groupId)&&q.queryKey[3]!=="access"});},[access.data?.revision,groupId,principal,qc]);
  const group = useQuery({
    queryKey: ["commission", principal, groupId?.toString(), "private"],
    queryFn: () => actor!.commissionGetGroup(groupId!),
    enabled: !!actor && groupId !== null && (core || lead),
  });
  const consultations = useQuery({
    queryKey: ["commission", principal, groupId?.toString(), "consultations"],
    queryFn: () => actor!.commissionListConsultations(groupId!),
    enabled: !!actor && groupId !== null,
  });
  const findings = useQuery({
    queryKey: ["commission", principal, groupId?.toString(), "findings"],
    queryFn: () => actor!.commissionListFindings(groupId!),
    enabled: !!actor && groupId !== null && core,
  });
  const submission = useQuery({
    queryKey: [
      "commission",
      principal,
      "submission",
      submissionId?.toString(),
      credential,
    ],
    queryFn: () => actor!.commissionGetSubmission(submissionId!, credential),
    refetchInterval: 5000,
    enabled: !!actor && submissionId !== null,
    retry: false,
  });
  const submissionDetail=useQuery({queryKey:["commission",principal,"detail",String(submissionId),credential],queryFn:()=>actor!.commissionContributionDetail(submissionId!,credential),enabled:!!actor&&!!submission.data&&submissionId!==null,retry:false});
  const current = groups.data?.find((g) => g.id === groupId);
  const inRehearsal=(id:bigint)=>!rehearsal.persona||rehearsal.setup?.groupId!==String(groupId)||id>=BigInt(rehearsal.setup.consultations[0]);
  const [viewStage, setViewStage] = useState(0);
  useEffect(() => { if (current) setViewStage(Number(current.stage)); }, [groupId, current?.stage]);
  const myName = useQuery({ queryKey: ["commission", principal, String(groupId), "displayName"], queryFn: () => actor!.commissionDisplayName(groupId!), enabled: !!actor && groupId !== null && roleName !== "contributor" });
  const [selectedConsultation, setSelectedConsultation] = useState<
    bigint | null
  >(null);
  useEffect(() => {
    setSelectedConsultation(null);
  }, [groupId]);
  const chosen = consultations.data?.find((c) => c.id === selectedConsultation);
  const contributionTypes=useQuery({queryKey:["commissionTypes",String(groupId)],queryFn:()=>actor!.commissionContributionTypes(groupId!),enabled:!!actor&&groupId!==null});
  const submissions = useQuery({
    queryKey: [
      "commission",
      principal,
      groupId?.toString(),
      "submissions",
      selectedConsultation?.toString(),
    ],
    queryFn: () => actor!.commissionListSubmissions(selectedConsultation!),
    enabled: !!actor && selectedConsultation !== null && core,
  });
  const details=useQuery({queryKey:["commission",principal,String(groupId),"submissionDetails",String(selectedConsultation)],queryFn:async()=>Promise.all((submissions.data||[]).map(s=>actor!.commissionContributionDetail(s.id,""))),enabled:!!actor&&core&&!!submissions.data});
  const [editing, setEditing] = useState<CommissionConsultation | null>(null);
  const [newConsultation, setNewConsultation] = useState(false);
  return (
    <div className="commission">
      <header className="c-header">
        <button className="c-brand" onClick={() => navigate("/2048")}>
          2048 <span>{text("Commission rehearsal")}</span>
        </button>
        <div className="c-header-actions">
          <LanguageSwitcher compact />
          {auth.identity ? (
            <button onClick={() => auth.clear()}>{text("Sign out")}</button>
          ) : (
            <button
              disabled={auth.isInitializing || auth.isLoggingIn}
              onClick={() =>
                void auth.login().catch((e) => setError(String(e)))
              }
            >
              {text("Working group sign in")}
            </button>
          )}
          {canWorkspace && (
            <button
              aria-label={text("Workspace tools")}
              onClick={() => setMenu(!menu)}
            >
              ☰
            </button>
          )}
        </div>
      </header>
      {menu && groupId !== null && (
        <nav className="c-menu">
          {["documents", "boards", "calendar"].map((tool) => (
            <button
              key={tool}
              onClick={() => navigate(`/2048/groups/${groupId}/${tool}`)}
            >
              {text(
                tool === "boards"
                  ? "Boards and rehearsal feedback"
                  : tool === "documents"
                    ? "Documents"
                    : "Calendar",
              )}
            </button>
          ))}
        </nav>
      )}
      <div className="c-rehearsal">
        {text(
          "Local prototype • fictional information only • pilot groups are illustrative",
        )}
      </div>
      <main className="c-main">
        {rehearsal.setup && <aside className="c-persona-bar">
          <label>{text("Rehearsal participant")} <select aria-label="Rehearsal participant" value={rehearsal.persona?.key || ""} onChange={e => { setCredential(""); qc.removeQueries({ predicate: q => q.queryKey[0] === "commission" }); rehearsal.choose(e.target.value); }}>
            <option value="">{text("My Internet Identity account")}</option>
            {rehearsal.setup.personas.map(p => <option value={p.key} key={p.key}>{p.name} · {p.role}</option>)}
          </select></label>
          {rehearsal.persona && <strong>{rehearsal.persona.name} · {rehearsal.persona.role}</strong>}
          {rehearsal.persona?.key === "leo" && <button onClick={() => navigate(`/2048/submissions/${rehearsal.setup!.advisorSubmissionId}`)}>{text("Return to my Advisor feedback")}</button>}
          {rehearsal.persona?.key === "samira" && <button onClick={() => {localStorage.setItem(`commission.receipt.rehearsal.samira.${rehearsal.setup!.submissionId}`, rehearsal.setup!.receipt); setCredential(rehearsal.setup!.receipt); navigate(`/2048/submissions/${rehearsal.setup!.submissionId}`);}}>{text("Return to my contribution")}</button>}
          {rehearsal.persona?.key === "samira" && <button onClick={() => {localStorage.setItem(`commission.receipt.rehearsal.samira.${rehearsal.setup!.feedbackSubmissionId}`, rehearsal.setup!.feedbackReceipt); setCredential(rehearsal.setup!.feedbackReceipt); navigate(`/2048/submissions/${rehearsal.setup!.feedbackSubmissionId}`);}}>{text("Return to my draft feedback")}</button>}
          <button onClick={() => navigate(`/2048/groups/${rehearsal.setup!.groupId}`)}>{text("Open Working Group 2 example")}</button>
          {rehearsal.setup.flexible&&rehearsal.persona?.key==="amina"&&<div className="c-persona-links">{[["My collective input",rehearsal.setup.flexible.collective,rehearsal.setup.flexible.collectiveReceipt],["My co-design feedback",rehearsal.setup.flexible.communityFeedback,rehearsal.setup.flexible.communityFeedbackReceipt],["My process suggestion",rehearsal.setup.flexible.process,rehearsal.setup.flexible.processReceipt]].map(([label,id,receipt])=><button key={id} onClick={()=>{localStorage.setItem(`commission.receipt.rehearsal.amina.${id}`,receipt);setCredential(receipt);navigate(`/2048/submissions/${id}`)}}>{text(label)}</button>)}</div>}
          {rehearsal.setup.flexible&&core&&<button onClick={()=>navigate(`/2048/groups/${rehearsal.setup!.flexible!.withdrawalGroup}/synthesis`)}>{text("Inspect withdrawal review example")}</button>}
        </aside>}
        {!rehearsal.persona && myName.data && <p className="c-eyebrow">{myName.data} · {text(roleName === "partner" ? "Advisor" : roleName)}</p>}
        {(error || actorQuery.error) && (
          <div role="alert" className="c-error">
            {error || String(actorQuery.error)}
          </div>
        )}
        {busy && <p role="status">{text("Saving…")}</p>}
        {notice && <p className="c-success" role="status">{notice}</p>}
        {!actor && !actorQuery.error && (
          <p>{text("Connecting to local rehearsal…")}</p>
        )}
        {submissionId !== null ? (
          <>
            <button onClick={() => navigate("/2048")}>
              ← {text("Working groups")}
            </button>
            {submission.error && (
              <p role="alert">
                {text(
                  "This discussion is private. Use your return link or the correct working group account.",
                )}
              </p>
            )}
            {submission.data && (
              <SubmissionThread
                key={`${principal}:${submissionId}`}
                submission={submission.data}
              detail={submissionDetail.data}
                credential={credential}
                actor={actor!}
                run={run}
                text={text}
              />
            )}
          </>
        ) : groupId === null ? (
          <>
            <div className="c-intro">
              <p className="c-eyebrow">CONSTELLATION 2048</p>
              <h1>{text("From community perspectives to recommendations")}</h1>
              <p>
                {text(
                  "A place for working groups to listen, deliberate and develop proposals for the future of human rights.",
                )}
              </p>
            </div>
            <div className="c-grid">
              {groups.data?.map((g) => (
                <button
                  className="c-group-card"
                  key={String(g.id)}
                  onClick={() => navigate(`/2048/groups/${g.id}`)}
                >
                  <span className="c-eyebrow">
                    {text("Illustrative working group")}
                  </span>
                  <h2>{g.name}</h2>
                  <p>{g.purpose}</p>
                  <span>{text(stages[Number(g.stage)])} →</span>
                </button>
              ))}
            </div>
            {groups.data?.length === 0 && (
              <section className="c-panel">
                <h2>{text("Set up the local rehearsal")}</h2>
                <p>
                  {text(
                    "Sign in as a platform administrator to create the two illustrative working groups. Existing communities will be preserved.",
                  )}
                </p>
                {auth.identity && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        if (!(await actor!.isCallerPlatformAdmin()))
                          await actor!.bootstrapPlatformAdmin();
                        await actor!.commissionSetupDemo();
                      })
                    }
                  >
                    {text("Create illustrative groups")}
                  </button>
                )}
              </section>
            )}
            <Published publications={publications.data || []} text={text} />
          </>
        ) : !current ? (
          <p>{text("Working group not found")}</p>
        ) : (
          <>
            <button className="c-back" onClick={() => navigate("/2048")}>
              ← {text("Working groups")}
            </button>
            <div className="c-title">
              <div>
                <p className="c-eyebrow">
                  {text("Illustrative working group")} · {access.data?.name||text("Contributor")}
                </p>
                <h1>{current.name}</h1>
                <p>{current.purpose}</p>
              </div>
            </div>
            <nav className="c-stages" aria-label={text("Working group stages")}>
              {stages.map((s, i) => (
                <button
                  className={viewStage === i ? "active" : ""}
                  key={s}
                  disabled={busy}
                  onClick={() => {
                    setViewStage(i);
                    navigate(`/2048/groups/${groupId}/overview`);

                  }}
                >
                  <span>{i + 1}</span>
                  {text(s)}
                </button>
              ))}
            </nav>
            <nav className="c-tabs">
              {[
                "overview",
                "consultations",
                ...(core ? ["synthesis"] : []),
                ...(lead ? ["participants"] : []),
                "published",
              ].map((view) => (
                <button
                  className={tab === view ? "active" : ""}
                  key={view}
                  onClick={() => navigate(`/2048/groups/${groupId}/${view}`)}
                >
                  {text(view[0].toUpperCase() + view.slice(1))}
                </button>
              ))}
            </nav>
            {["documents", "boards", "calendar"].includes(tab) && canWorkspace && (
              <CommissionWorkspace
                auth={auth}
                groupId={groupId}
                kind={tab as "documents" | "boards" | "calendar"}
              />
            )}
            {tab === "overview" && (
              <>
                {actor && <StageActivity key={`${groupId}:${viewStage}:${principal}`} actor={actor} principal={principal} groupId={groupId} stage={viewStage} capabilities={capabilities} text={text} run={run} rehearsalStartId={rehearsal.persona && rehearsal.setup?.groupId === String(groupId) ? BigInt(rehearsal.setup.consultations[0]) : undefined} openConsultation={id => {setSelectedConsultation(id); navigate(`/2048/groups/${groupId}/consultations`);}} />}
                <section className="c-panel">
                  <h2>
                    {text("Current stage")}:{" "}
                    {text(stages[Number(current.stage)])}
                  </h2>
                  <p>
                    {text(
                      "Stages can be revisited. Consultations remain available while the group develops its recommendations.",
                    )}
                  </p>
                  {lead&&viewStage!==Number(current.stage)&&<button onClick={()=>void run(()=>actor!.commissionSaveGroupDetails(groupId!,current.name,current.purpose,BigInt(viewStage)))}>{text("Set this as the current stage")}</button>}
                  <div className="c-stats">
                    <span>
                      {consultations.data?.filter(c=>inRehearsal(c.id)).length || 0} {text("consultations")}
                    </span>
                    {core && (
                      <span>
                        {findings.data?.filter(f=>inRehearsal(f.id)).length || 0} {text("findings")} ·{" "}
                        {findings.data?.filter((f) => inRehearsal(f.id)&&f.needsReview).length ||
                          0}{" "}
                        {text("need review")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/2048/groups/${groupId}/consultations`)
                    }
                  >
                    {text("Explore consultations")}
                  </button>
                </section>
                {lead && group.data && (
                  <GroupSettings
                    group={group.data}
                    actor={actor!}
                    run={run}
                    text={text}
                  />
                )}

              </>
            )}
            {tab === "consultations" && (
              <>
                <div className="c-section-head">
                  <h2>{text("Consultations")}</h2>
                  {lead && (
                    <button
                      onClick={() => {
                        setEditing({
                          id: 0n,
                          groupId,
                          title: "",
                          purpose: "",
                          questions: consultations.data?.[0]?.questions || [
                            "What harms need to be named?",
                            "What would meaningful accountability look like?",
                            "What proposals for change do you have?",
                          ],
                          audience: "public",
                          opens: BigInt(Date.now() - 60000) * 1000000n,
                          closes: BigInt(Date.now() + 30 * 86400000) * 1000000n,
                          guidance:
                            "Fictional information only. Contributions are private to you and the working group.",
                          closed: false,
                        });
                        setNewConsultation(true);
                      }}
                    >
                      {text("New consultation")}
                    </button>
                  )}
                </div>
                {editing && (
                  <ConsultationEditor
                    key={String(editing.id)}
                    consultation={editing}
                    isNew={newConsultation}
                    actor={actor!}
                    run={run}
                    done={() => setEditing(null)}
                    text={text}
                  />
                )}
                <div className="c-grid">
                  {consultations.data?.filter(c => !rehearsal.persona || rehearsal.setup?.groupId !== String(groupId) || c.id >= BigInt(rehearsal.setup.consultations[0])).map((c) => (
                    <button
                      key={String(c.id)}
                      className={`c-panel c-consult-card ${c.id === selectedConsultation ? "selected" : ""}`}
                      onClick={() => setSelectedConsultation(c.id)}
                    >
                      <h3>{c.title}</h3>
                      <p>{c.purpose}</p>
                      <span>
                        {text(c.audience)} · {text(consultationStatus(c))}
                      </span>
                    </button>
                  ))}
                </div>
                {chosen && (
                  <section className="c-panel">
                    <div className="c-section-head">
                      <h2>{chosen.title}</h2>
                      {lead && (
                        <button
                          onClick={() => {
                            setEditing(chosen);
                            setNewConsultation(false);
                          }}
                        >
                          {text("Edit consultation")}
                        </button>
                      )}
                    </div>
                    <p>{chosen.guidance}</p>
                    <p>
                      {text("Opens")}:{" "}
                      {new Date(
                        Number(chosen.opens / 1000000n),
                      ).toLocaleString()}{" "}
                      · {text("Closes")}:{" "}
                      {new Date(
                        Number(chosen.closes / 1000000n),
                      ).toLocaleString()}
                    </p>
                    <ConsultationReview key={`review-${chosen.id}`} actor={actor!} principal={principal} groupId={groupId!} consultationId={chosen.id} manage={lead} internal={core} run={run} text={text}/>
                    {consultationStatus(chosen) === "Open" && (
                      <ContributionForm
                        key={`contribution-${chosen.id}`}
                        consultation={chosen}
                        core={canRecord}
                        receiptNamespace={rehearsal.persona?`commission.receipt.rehearsal.${rehearsal.persona.key}`:"commission.receipt"}
                        actor={actor!}
                        run={run}
                        text={text}
                        language={i18n.language}
                        navigate={navigate}
                      />
                    )}
                    {core && (
                      <>
                        <h3>{text("Private contributions")}</h3>
                        <Check label={text("Show process suggestions only")} value={processOnly} onChange={setProcessOnly}/>
                        {submissions.data?.length === 0 && (
                          <p>{text("No contributions yet")}</p>
                        )}
                        {submissions.data?.filter(s=>!processOnly||details.data?.find(d=>d.id===s.id)?.processSuggestion).map((s) => (
                          <button
                            className="c-submission-row"
                            key={String(s.id)}
                            onClick={() =>
                              navigate(`/2048/submissions/${s.id}`)
                            }
                          >
                            <strong>
                              #{String(s.id)} ·{" "}
                              {s.input.alias || text("Anonymous contributor")}
                            </strong>
                            <span>{s.input.answers.slice(0, 150)}</span>
                            <small>
                              {details.data?.find(d=>d.id===s.id)?.processSuggestion?text("Process suggestion"):(contributionTypes.data?.find(t=>t.id===details.data?.find(d=>d.id===s.id)?.typeId)?.name||s.input.format||text("Written submission"))} · {s.comments.length} {text("comments")} ·{" "}
                              {s.facilitated
                                ? text("Facilitator entered")
                                : text("Direct submission")}
                            </small>
                          </button>
                        ))}
                      </>
                    )}
                  </section>
                )}
              </>
            )}
            {tab === "synthesis" && core && group.data && (
              <Synthesis
                group={group.data}
                findings={(findings.data || []).filter(f => !rehearsal.persona || rehearsal.setup?.groupId !== String(groupId) || f.id >= BigInt(rehearsal.setup.consultations[0]))}
                sourceStartId={rehearsal.persona&&rehearsal.setup?.groupId===String(groupId)?BigInt(rehearsal.setup.consultations[0]):undefined}
                actor={actor!}
                run={run}
                text={text}
                lead={canPublish}
                editable={canEdit}
                principal={principal}
              />
            )}
            {((tab==="synthesis"&&!core)||(tab==="participants"&&!lead))&&<section className="c-panel"><p role="status">{text("Your role does not have access to this working group’s internal material.")}</p><button onClick={()=>navigate(`/2048/groups/${groupId}`)}>{text("Overview")}</button></section>}
            {tab === "participants" && lead && group.data && (
              <ConfigurationPanel actor={actor!} groupId={groupId!} principal={principal} run={run} text={text}/>
            )}
            {tab === "published" && (
              <Published
                publications={(publications.data || []).filter(
                  (p) => p.groupId === groupId,
                )}
                text={text}
              />
            )}
          </>
        )}
      </main>
      <footer className="c-footer">
        {text("2048 Commission • local rehearsal")}{" "}
        {auth.identity && (
          <details>
            <summary>{text("Your sign-in identifier")}</summary>
            <code>{principal}</code>
          </details>
        )}
      </footer>
    </div>
  );
}
type Props = {
  actor: _SERVICE;
  run: (fn: () => Promise<unknown>) => Promise<void>;
  text: (s: string) => string;
};
function GroupSettings({
  group,
  actor,
  run,
  text,
}: Props & { group: CommissionGroup }) {
  const [name, setName] = useState(group.name);
  const [purpose, setPurpose] = useState(group.purpose);
  return (
    <form
      className="c-panel"
      onSubmit={(e) => {
        e.preventDefault();
        void run(() =>
          actor.commissionSaveGroupDetails(group.id,name,purpose,group.stage),
        );
      }}
    >
      <h2>{text("Working group settings")}</h2>
      <Field label={text("Name")} value={name} onChange={setName} />
      <Field
        label={text("Purpose")}
        value={purpose}
        onChange={setPurpose}
        multiline
      />
      <button>{text("Save settings")}</button>
    </form>
  );
}
function ConsultationEditor({
  consultation,
  isNew,
  actor,
  run,
  done,
  text,
}: Props & {
  consultation: CommissionConsultation;
  isNew: boolean;
  done: () => void;
}) {
  const [c, setC] = useState(consultation);
  const [questions, setQuestions] = useState(c.questions.join("\n"));
  const update = (key: string, value: unknown) =>
    setC((x) => ({ ...x, [key]: value }));
  return (
    <form
      className="c-panel"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await actor.commissionSaveConsultation(
            { ...c, questions: questions.split("\n").filter((q) => q.trim()) },
            isNew,
          );
          done();
        });
      }}
    >
      <h3>{text("Consultation settings")}</h3>
      <Field
        label={text("Title")}
        value={c.title}
        onChange={(v) => update("title", v)}
      />
      <Field
        label={text("Purpose")}
        value={c.purpose}
        onChange={(v) => update("purpose", v)}
        multiline
      />
      <Field
        label={text("Questions — one per line")}
        value={questions}
        onChange={setQuestions}
        multiline
      />
      <label className="c-field">
        {text("Audience")}
        <select
          value={c.audience}
          onChange={(e) => update("audience", e.target.value)}
        >
          <option value="public">{text("Public")}</option>
          <option value="partners">
            {text("Trusted partners and working group")}
          </option>
          <option value="core">{text("Working group only")}</option>
        </select>
      </label>
      <Field
        label={text("Opens")}
        type="datetime-local"
        value={formatLocalDateTime(c.opens)}
        onChange={(v) => {
          if (v) update("opens", parseLocalDateTime(v));
        }}
      />
      <Field
        label={text("Closes")}
        type="datetime-local"
        value={formatLocalDateTime(c.closes)}
        onChange={(v) => {
          if (v) update("closes", parseLocalDateTime(v));
        }}
      />
      <Field
        label={text("Contribution and publication guidance")}
        value={c.guidance}
        onChange={(v) => update("guidance", v)}
        multiline
      />
      <Check
        label={text("Close contributions")}
        value={c.closed}
        onChange={(v) => update("closed", v)}
      />
      <button>{text("Save consultation")}</button>{" "}
      <button type="button" onClick={done}>
        {text("Cancel")}
      </button>
    </form>
  );
}
function ContributionForm({
  consultation,
  core,
  actor,
  run,
  text,
  language,
  navigate,
  receiptNamespace,
}: Props & {
  consultation: CommissionConsultation;
  core: boolean;
  language: string;
  navigate: (s: string) => void;
  receiptNamespace: string;
}) {
  const [questions] = useState(consultation.questions);
  const [input, setInput] = useState({ ...emptyInput(), language });
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const types=useQuery({queryKey:["commissionTypes",String(consultation.groupId)],queryFn:()=>actor.commissionContributionTypes(consultation.groupId)});
  const [typeId,setTypeId]=useState("written");
  const type=types.data?.find(t=>t.id===typeId);
  const [reference,setReference]=useState("");
  const [processSuggestion,setProcessSuggestion]=useState(false);
  const [authorised,setAuthorised]=useState(false);
  const facilitated=type?.layout==="event"&&!processSuggestion;
  const update = (key: string, value: unknown) =>
    setInput((x) => ({ ...x, [key]: value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          const credential = newReturnCredential();
          const id = await actor.commissionSubmitFlexible(
            consultation.id,
            {
              ...input,
              answers: consultation.questions
                .map((q, i) => `${q}\n${answers[i] || ""}`)
                .join("\n\n"),
            },
            credential,
            typeId,
            reference,
            processSuggestion,
            authorised,
          );
          localStorage.setItem(`${receiptNamespace}.${id}`, credential);
          navigate(`/2048/submissions/${id}`);
        });
      }}
    >
      <h3>{text(processSuggestion?"Suggest a change to this consultation":"Your contribution")}</h3>
      <Check label={text("Suggest a change to this consultation")} value={processSuggestion} onChange={setProcessSuggestion}/>
      {processSuggestion?<p>{text("Question the framing, suggest another input route or category, or propose a different deliberative approach. The group will reply in your private thread.")}</p>:<label className="c-field">{text("Contribution format")}<select value={typeId} onChange={e=>{setTypeId(e.target.value);setAuthorised(false)}}>{types.data?.map(t=><option key={t.id} value={t.id} disabled={t.layout==="event"&&!core}>{t.name}{t.layout==="event"&&!core?" · authorised recorder":""}</option>)}</select></label>}
      {!processSuggestion&&<p>{type?.guidance}</p>}
      {!processSuggestion&&type?.layout==="document"&&<Field label={text("Document reference (HTTPS link or workspace:document-id)")} value={reference} onChange={setReference}/>}
      {!processSuggestion&&type?.layout==="collective"&&<><Field label={text("Non-sensitive collective description")} value={input.participants} onChange={v=>update("participants",v)}/><Check label={text("I am authorised to represent this collective input")} value={authorised} onChange={setAuthorised}/></>}
      <p>
        {text(
          "Your answers and discussion are visible only to you and this working group.",
        )}
      </p>
      <Field
        label={text("Pseudonym (optional)")}
        value={input.alias}
        onChange={(v) => update("alias", v)}
      />
      <Field
        label={text("Original language")}
        value={input.language}
        onChange={(v) => update("language", v)}
      />
      {questions.map((q, i) => (
        <Field
          key={i}
          label={q}
          value={answers[i]}
          onChange={(v) =>
            setAnswers((x) => x.map((a, j) => (i === j ? v : a)))
          }
          multiline
        />
      ))}
      {facilitated && (
        <>
          {[
            "format",
            "date",
            "location",
            "participants",
            "themes",
            "tensions",
            "proposals",
          ].map((k) => (
            <Field
              key={k}
              label={text(
                k === "participants"
                  ? "Non-sensitive participant description"
                  : k[0].toUpperCase() + k.slice(1),
              )}
              value={input[k]}
              onChange={(v) => update(k, v)}
              multiline={["themes", "tensions", "proposals"].includes(k)}
            />
          ))}
          <p>
            {text(
              "Confirm that the participants consented to these uses. Do not enter personal or sensitive details.",
            )}
          </p>
        </>
      )}
      <Check
        label={text("I consent to internal use by this working group")}
        value={input.internalConsent}
        onChange={(v) => update("internalConsent", v)}
      />
      <Check
        label={text("I permit selected quotations to be published")}
        value={input.quoteConsent}
        onChange={(v) => update("quoteConsent", v)}
      />
      <Check
        label={text("Published quotations may use my pseudonym")}
        value={input.attributionConsent}
        onChange={(v) => update("attributionConsent", v)}
      />
      <button
        disabled={!input.internalConsent || !answers.some((a) => a.trim()) || (!processSuggestion&&type?.layout==="collective"&&!authorised) || (!processSuggestion&&type?.layout==="document"&&!reference.trim())}
      >
        {text("Submit contribution")}
      </button>
    </form>
  );
}
function SubmissionThread({
  submission,
  detail,
  credential,
  actor,
  run,
  text,
}: Props & { submission: CommissionSubmission; detail?: import("../../declarations/backend.did").CommissionContributionDetail; credential: string }) {
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const formats = useQuery({queryKey:["commissionSubmissionTypes",String(submission.id),credential],queryFn:()=>actor.commissionSubmissionTypes(submission.id,credential)});
  const format = formats.data?.find(t=>t.id===detail?.typeId);
  return (
    <section className="c-panel">
      <p className="c-eyebrow">
        {text("Private contribution")} #{String(submission.id)}
      </p>
      <h1>
        {submission.withdrawn
          ? text("Contribution withdrawn")
          : submission.input.alias || text("Anonymous contributor")}
      </h1>
      {detail?.processSuggestion&&<p className="c-eyebrow">{text("Process suggestion")}</p>}
      {detail?.documentReference&&<p>{text("Document reference")}: {detail.documentReference.startsWith("https://")?<a href={detail.documentReference} target="_blank" rel="noreferrer">{detail.documentReference}</a>:detail.documentReference}</p>}
      {submission.withdrawn&&<p>{text("The original content has been removed. Its source reference remains so the group can review work it informed.")}{detail?.withdrawnAt[0]&&` · ${new Date(Number(detail.withdrawnAt[0]/1000000n)).toLocaleString()}`}</p>}
      {!submission.withdrawn && (
        <>
          {format&&<p className="c-eyebrow">{text("Contribution format")}: {format.name}</p>}
          <p className="c-pre">{submission.input.answers}</p>
          {format?.layout==="collective"&&submission.input.participants&&<p><strong>{text("Non-sensitive collective description")}</strong>: {submission.input.participants}</p>}
          <p>
            {text("Original language")}: {submission.input.language} ·{" "}
            {text(
              submission.facilitated
                ? "Facilitator entered"
                : "Direct submission",
            )}
          </p>
          <p>
            {text("Quotation consent")}:{" "}
            {text(submission.input.quoteConsent ? "Yes" : "No")} ·{" "}
            {text("Attribution consent")}:{" "}
            {text(submission.input.attributionConsent ? "Yes" : "No")}
          </p>
          {submission.facilitated && (
            <dl>
              {[
                "format",
                "date",
                "location",
                "participants",
                "themes",
                "tensions",
                "proposals",
              ].map((k) => (
                <React.Fragment key={k}>
                  <dt>{text(k)}</dt>
                  <dd>{submission.input[k]}</dd>
                </React.Fragment>
              ))}
            </dl>
          )}
          {credential && (
            <details className="c-receipt"><summary>{text("Save your private return link")}</summary>
              <p>
                {text(
                  "Keep your private return link. Anyone with it can access this contribution. If you lose it, unsigned access cannot be recovered.",
                )}
              </p>
              <input
                aria-label={text("Private return link")}
                readOnly
                value={`${location.origin}/2048/submissions/${submission.id}#${credential}`}
              />
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(
                      `${location.origin}/2048/submissions/${submission.id}#${credential}`,
                    )
                    .then(() => setCopied(true))
                }
              >
                {text(copied ? "Copied" : "Copy return link")}
              </button>
            </details>
          )}
          <section className="c-discussion-evidence"><h2>{text("Discussion with the working group")}</h2>
          {submission.comments.map((c, i) => (
            <article className="c-comment" key={i}>
              <strong>{c.author}</strong>
              <time>{new Date(Number(c.at / 1000000n)).toLocaleString()}</time>
              <p className="c-pre">{c.body}</p>
            </article>
          ))}
          </section>
          <details><summary>{text("Reply or clarification")}</summary><form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await actor.commissionComment(submission.id, credential, body);
                setBody("");
              });
            }}
          >
            <Field
              label={text("Reply or clarification")}
              value={body}
              onChange={setBody}
              multiline
            />
            <button disabled={!body.trim()}>{text("Send reply")}</button>
          </form></details>
          {submission.canWithdraw && (
            <div className="c-withdraw">
              {confirmWithdrawal ? (
                <>
                  <p>
                    {text(
                      "Withdrawal removes your original answers and comments, keeps a minimal source reference, flags derived work for review and withholds affected publication. It cannot remove copies already downloaded.",
                    )}
                  </p>
                  <button
                    onClick={() =>
                      void run(() =>
                        actor.commissionWithdraw(submission.id, credential),
                      )
                    }
                  >
                    {text("Confirm withdrawal")}
                  </button>{" "}
                  <button onClick={() => setConfirmWithdrawal(false)}>
                    {text("Cancel")}
                  </button>
                </>
              ) : (
                <button onClick={() => setConfirmWithdrawal(true)}>
                  {text("Withdraw contribution")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
function Synthesis({
  group,
  findings,
  actor,
  run,
  text,
  lead,
  editable,
  principal,
  sourceStartId,
}: Props & {
  group: CommissionGroup;
  findings: CommissionFinding[];
  lead: boolean;
  editable: boolean;
  principal: string;
  sourceStartId?: bigint;
}) {
  const [draft, setDraft] = useState(group.draft);
  const [disagreements, setDisagreements] = useState(group.disagreements);
  const [kind, setKind] = useState("insight");
  const [body, setBody] = useState("");
  const [sources, setSources] = useState("");
  const [editing, setEditing] = useState<bigint | null>(null);
  const [title, setTitle] = useState("Draft recommendations");
  const [publicBody, setPublicBody] = useState("");
  const [publicDisagreements, setPublicDisagreements] = useState("");
  const [publicSources, setPublicSources] = useState("");
  const allSources=useQuery({queryKey:["commission",principal,String(group.id),"sources"],queryFn:()=>actor.commissionGroupSources(group.id)});
  const evidence=useQuery({queryKey:["commission",principal,String(group.id),"draftEvidence"],queryFn:()=>actor.commissionDraftEvidenceState(group.id)});
  const markers=useQuery({queryKey:["commission",principal,String(group.id),"publicationStatus"],queryFn:()=>actor.commissionPublicationStatus(group.id)});
  const [findingIds,setFindingIds]=useState("");
  const [reviewed,setReviewed]=useState(false);
  useEffect(()=>{if(evidence.data)setFindingIds(evidence.data.findings.map(String).join(", "))},[evidence.data]);
  const sourceOptions=(allSources.data||[]).filter(s=>sourceStartId===undefined||s.id>=sourceStartId).map(s=>({id:s.id,label:s.withdrawn?`Withdrawn source #${s.id}`:`#${s.id} · ${s.input.alias||"Contributor"}: ${s.input.answers.slice(0,95)}`,unavailable:s.withdrawn}));
  const parse = (s: string) =>
    s.trim() ? s.split(",").map((n) => BigInt(n.trim())) : [];
  return (
    <>
      <section className="c-panel">
        {!editable&&<p>{text("You can review this material. Your role does not allow editing synthesis.")}</p>}
        <div className="c-findings-evidence"><h2>{text("Findings and source links")}</h2>
        {findings.map((f) => (
          <article
            className={`c-finding ${f.needsReview ? "review" : ""}`}
            key={String(f.id)}
          >
            <strong>
              {text(f.kind)}
              {f.needsReview &&
                ` · ${text("Source withdrawn — review required")}`}
            </strong>
            <p className="c-pre">{f.body}</p>
            <small>
              {text("Sources")}:{" "}
              {f.sources.length
                ? f.sources.map((id) => (
                    <a
                      key={String(id)}
                      href={`/2048/submissions/${id}`}
                      style={{
                        marginInlineEnd: "0.5rem",
                        textDecoration: "underline",
                      }}
                    >
                      {allSources.data?.find(s=>s.id===id)?.input.alias||`#${id}`}
                    </a>
                  ))
                : "—"}
            </small>
            <button disabled={!editable}
              onClick={() => {
                setEditing(f.id);
                setKind(f.kind);
                setBody(f.body);
                setSources(f.sources.map(String).join(", "));
              }}
            >
              {text("Edit finding")}
            </button>
          </article>
        ))}</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await actor.commissionSaveFinding(
                {
                  id: editing ?? 0n,
                  groupId: group.id,
                  kind,
                  body,
                  sources: parse(sources),
                  needsReview: false,
                },
                editing === null,
              );
              setBody("");
              setSources("");
              setEditing(null);
            });
          }}
        >
          <fieldset disabled={!editable}><label className="c-field">
            {text("Finding category")}
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="insight">{text("Key insight")}</option>
              <option value="tension">{text("Tension")}</option>
              <option value="proposal">{text("Proposal")}</option>
            </select>
          </label>
          <Field
            label={text("Finding")}
            value={body}
            onChange={setBody}
            multiline
          />
          <SourcePicker label={text("Source contributions")} options={sourceOptions} value={sources} onChange={setSources}/>
          <button>
            {text(editing === null ? "Add finding" : "Save finding")}
          </button></fieldset>
        </form>
      </section>
      <form
        className="c-panel"
        onSubmit={(e) => {
          e.preventDefault();
          void run(()=>actor.commissionSaveRecommendation(group.id,draft,disagreements,parse(findingIds),reviewed));
        }}
      >
        <h2>{text("Recommendation draft")}</h2>
        {evidence.data?.needsReview&&<p className="c-warning">{text("A source was withdrawn. Review linked findings and the recommendation before publishing again.")}</p>}
        <fieldset disabled={!editable}>
        <Field
          label={text("Recommendations")}
          value={draft}
          onChange={setDraft}
          multiline
        />
        <Field
          label={text("Disagreement and unresolved questions")}
          value={disagreements}
          onChange={setDisagreements}
          multiline
        />
        <SourcePicker label={text("Findings informing this recommendation")} options={findings.map(f=>({id:f.id,label:`${f.kind}: ${f.body.slice(0,120)}`,unavailable:f.needsReview}))} value={findingIds} onChange={setFindingIds}/>
        {evidence.data?.needsReview&&<Check label={text("I have reviewed this recommendation after withdrawal")} value={reviewed} onChange={setReviewed}/>}
        <button>{text("Save draft")}</button></fieldset>
      </form>
      {lead && (
        <form
          className="c-panel"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() =>
              actor.commissionPublish({
                groupId: group.id,
                title,
                body: publicBody,
                disagreements: publicDisagreements,
                sources: parse(publicSources),
                at: 0n,
              }),
            );
          }}
        >
          <h2>{text("Approve a public snapshot")}</h2>
          <p>
            {text(
              "Write a deliberately selected public version. Do not copy private comments. List every contribution quoted or used in this snapshot; quotation consent is checked for each source. Use a pseudonym only with attribution consent.",
            )}
          </p>
          <Field
            label={text("Publication title")}
            value={title}
            onChange={setTitle}
          />
          <Field
            label={text("Approved public text")}
            value={publicBody}
            onChange={setPublicBody}
            multiline
          />
          <Field
            label={text("Public disagreement and unresolved questions")}
            value={publicDisagreements}
            onChange={setPublicDisagreements}
            multiline
          />
          <SourcePicker label={text("Sources supporting publication")} options={sourceOptions.map(o=>({...o,unavailable:o.unavailable||!allSources.data?.find(s=>s.id===o.id)?.input.quoteConsent}))} value={publicSources} onChange={setPublicSources}/>
          <button disabled={!publicBody.trim()||evidence.data?.needsReview}>
            {text("Publish approved snapshot")}
          </button>
          <p>
            {text(
              "For feedback, create another consultation from the Consultations tab.",
            )}
          </p>
        </form>
      )}
      {markers.data?.some(m=>m.status==="withheld")&&<section className="c-panel"><h3>{text("Publication review markers")}</h3>{markers.data.filter(m=>m.status==="withheld").map(m=><p key={String(m.id)}>{text("Withheld after source withdrawal")} · {new Date(Number(m.at/1000000n)).toLocaleString()} · {text("Source references")}: {m.sources.map(String).join(", ")}</p>)}</section>}
    </>
  );
}
function Published({
  publications,
  text,
}: {
  publications: Awaited<ReturnType<_SERVICE["commissionPublicationsList"]>>;
  text: (s: string) => string;
}) {
  return (
    <section className="c-publications">
      <h2>{text("Published outputs")}</h2>
      {publications.length === 0 && (
        <p>{text("No approved output has been published yet.")}</p>
      )}
      {publications.map((p) => (
        <article className="c-panel" key={String(p.groupId)}>
          <p className="c-eyebrow">
            {text("Approved public snapshot")} ·{" "}
            {new Date(Number(p.at / 1000000n)).toLocaleDateString()}
          </p>
          <h2>{p.title}</h2>
          <p className="c-pre">{p.body}</p>
          {p.disagreements && (
            <>
              <h3>{text("Disagreement and unresolved questions")}</h3>
              <p className="c-pre">{p.disagreements}</p>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
