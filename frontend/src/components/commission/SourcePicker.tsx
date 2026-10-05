import React from "react";
export type SourceOption = { id: bigint; label: string; unavailable?: boolean };
export default function SourcePicker({label, options, value, onChange, disabled=false}: {label: string; options: SourceOption[]; value: string; onChange: (value: string)=>void; disabled?: boolean}) {
 const selected=value.split(",").map(x=>x.trim()).filter(Boolean);
 return <fieldset className="c-source-picker" disabled={disabled}><legend>{label}</legend>{!options.length && <p>No sources available yet.</p>}{options.map(o=>{const id=String(o.id), checked=selected.includes(id);return <label className="c-check" key={id}><input type="checkbox" checked={checked} disabled={o.unavailable&&!checked} onChange={e=>onChange((e.target.checked?[...selected,id]:selected.filter(x=>x!==id)).join(", "))}/><span>{o.label}{o.unavailable&&" · unavailable — remove or review"}</span></label>})}</fieldset>;
}
