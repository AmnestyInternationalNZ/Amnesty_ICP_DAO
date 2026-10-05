import { useEffect, useState } from "react";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import { loadConfig } from "../../config";
export type RehearsalPersona = { key: string; name: string; role: string; identity?: [string, string] };
export type FlexibleRehearsal = { collective: string; collectiveReceipt: string; harvest: string; document: string; reviewConsultation: string; communityFeedback: string; communityFeedbackReceipt: string; process: string; processReceipt: string; withdrawalGroup: string; withdrawal: string; withdrawalReceipt: string };
export type RehearsalSetup = { flexible?: FlexibleRehearsal; groupId: string; personas: RehearsalPersona[]; submissionId: string; receipt: string; consultations: string[]; advisorSubmissionId: string; advisorReceipt: string; framingSubmissionId: string; feedbackSubmissionId: string; feedbackReceipt: string };
export function useLocalRehearsal() {
  const [setup, setSetup] = useState<RehearsalSetup>();
  const [selected, setSelected] = useState(() => sessionStorage.getItem("2048.rehearsal.persona") || "");
  useEffect(() => {
    if (!import.meta.env.DEV || !["localhost", "127.0.0.1"].includes(location.hostname)) return;
    let alive = true;
    void (async () => {
      const config = await loadConfig();
      if (!config.backend_host || !["localhost", "127.0.0.1"].includes(new URL(config.backend_host).hostname)) return;
      const response = await fetch("/__rehearsal-personas");
      if (response.ok && alive) setSetup(await response.json());
    })().catch(() => {});
    return () => { alive = false; };
  }, []);
  const persona = setup?.personas.find(p => p.key === selected);
  const identity = persona?.identity ? Ed25519KeyIdentity.fromJSON(JSON.stringify(persona.identity)) : undefined;
  return { setup, persona, identity, choose: (key: string) => {sessionStorage.setItem("2048.rehearsal.persona", key); setSelected(key);} };
}
