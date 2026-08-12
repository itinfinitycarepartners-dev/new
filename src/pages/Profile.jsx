// @ts-nocheck
// src/pages/Profile.jsx
import { useAuth } from "@/lib/AuthContext";
import { User, Phone, Mail, Briefcase, Building2, Calendar, Award, Loader2, Upload, Plus, Trash2, Save, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

const API_BASE=import.meta.env.VITE_API_BASE_URL||"https://fictional-carnival-3inv.onrender.com";
const authToken=()=>localStorage.getItem("icp_auth_token")||"";
const clean=value=>{if(value===undefined||value===null||value===""||value==="—")return null;if(typeof value==="object")return value.name??value.value??value.display_value??null;return value;};
const formatDate=value=>{const v=clean(value);if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});};
function Row({label,value,icon:Icon}){return <div className="flex items-start gap-3 border-b border-border py-3 last:border-0">{Icon&&<Icon className="mt-0.5 h-4 w-4 text-muted-foreground"/>}<div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-medium">{clean(value)??"—"}</p></div></div>}
function Section({title,children,className=""}){return <section className={`rounded-xl border border-border bg-card p-5 ${className}`}><h2 className="mb-2 font-semibold">{title}</h2>{children}</section>}
const blankDep=()=>({name:"",dob:"",email:"",relationship:"",travelStatus:"arriving",needsBooster:false,needsCarSeat:false,disability:""});

export default function Profile(){
 const {user}=useAuth();
 const [source,setSource]=useState({});const [sourceHealth,setSourceHealth]=useState(null);const [extra,setExtra]=useState({dependants:[],travelSummary:{totalLuggage:"",cashUsd:"",phoneMakeType:"",phoneOther:""}});const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[uploading,setUploading]=useState(false);const[notice,setNotice]=useState("");
 const load=async(refresh=false)=>{if(!user?.email)return;setLoading(true);try{const h={Authorization:`Bearer ${authToken()}`};const [s,e]=await Promise.all([fetch(`${API_BASE}/api/profile/source-data${refresh?"?refresh=1":""}`,{headers:h}),fetch(`${API_BASE}/api/profile/extended`,{headers:h})]);const sj=await s.json().catch(()=>({}));const ej=await e.json().catch(()=>({}));if(s.ok&&sj.success){
          setSource(sj.mapped||{});
          setSourceHealth({
            presence:sj.sourcePresence||{},
            recordIds:sj.recordIds||{},
            applicationStatus:sj.mapped?.Application_Status||""
          });
        }if(e.ok&&ej.profile)setExtra({dependants:Array.isArray(ej.profile.dependants)?ej.profile.dependants:[],travelSummary:{totalLuggage:"",cashUsd:"",phoneMakeType:"",phoneOther:"",...(ej.profile.travelSummary||{})}});if(!s.ok)setNotice(sj.error||"Unable to load Zoho profile fields.");}finally{setLoading(false)}};
 useEffect(()=>{load(false)},[user?.email]);
 const save=async()=>{setSaving(true);setNotice("");try{const r=await fetch(`${API_BASE}/api/profile/extended`,{method:"PUT",headers:{Authorization:`Bearer ${authToken()}`,"Content-Type":"application/json"},body:JSON.stringify(extra)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Unable to save");setNotice("Profile details saved.");}catch(e){setNotice(e.message)}finally{setSaving(false)}};
 const uploadPassport=async file=>{if(!file)return;setUploading(true);setNotice("");try{const fd=new FormData();fd.append("file",file);fd.append("candidate_email",user.email);fd.append("document_category","candidate-passport-picture");fd.append("document_type","Candidate Passport Picture");fd.append("document_name",file.name);fd.append("document_library_upload","true");fd.append("document_department","Profile");fd.append("destination","crm");const r=await fetch(`${API_BASE}/api/documents/upload`,{method:"POST",headers:{Authorization:`Bearer ${authToken()}`},body:fd});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||"Upload failed");setNotice("Passport picture uploaded.");window.dispatchEvent(new CustomEvent("documents-updated"));}catch(e){setNotice(e.message)}finally{setUploading(false)}};
 if(loading)return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
 return <div className="space-y-6">
  <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{[source.First_Name,source.Last_Name].filter(Boolean).join(" ")||"Candidate"}</h1><p className="text-sm text-muted-foreground">{source.Email||user?.email}</p></div><button type="button" onClick={()=>load(true)} className="rounded-lg border px-3 py-2 text-sm">Refresh Zoho data</button></div>
  {notice&&<div className="rounded-lg border p-3 text-sm">{notice}</div>}
  {sourceHealth && (
    !sourceHealth.presence?.crmDeals ||
    !sourceHealth.presence?.candidates ||
    !sourceHealth.presence?.applications
  ) && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
    Zoho source check: CRM Deal {sourceHealth.presence?.crmDeals?"connected":"not matched"}, Recruit Candidates {sourceHealth.presence?.candidates?"connected":"not matched"}, Recruit Applications {sourceHealth.presence?.applications?"connected":"not matched"}, NCLEX CustomModule1 {sourceHealth.presence?.customModule1?"connected":"not matched"}.
  </div>}
  <div className="grid gap-4 lg:grid-cols-2">
   <Section title="Personal Information"><Row label="First Name" value={source.First_Name} icon={User}/><Row label="Last Name" value={source.Last_Name} icon={User}/><Row label="Email" value={source.Email||user?.email} icon={Mail}/><Row label="Phone Number" value={source.Phone} icon={Phone}/><Row label="DOB" value={formatDate(source.DOB)} icon={Calendar}/></Section>
   <Section title="Interview & Hiring Details"><Row label="Interview Location" value={source.Interview_Location} icon={Building2}/><Row label="Interview Date" value={formatDate(source.Interview_Date)} icon={Calendar}/><Row label="Speciality" value={source.Speciality} icon={Award}/><Row label="Rate" value={source.Rate} icon={Briefcase}/><Row label="Hired Location" value={source.Hired_Location} icon={Building2}/></Section>
   <Section title="Professional Information"><Row label="Current Employer" value={source.Current_Employer} icon={Briefcase}/><Row label="Highest Qualification Held" value={source.Highest_Qualification_Held} icon={Award}/><Row label="Experience in Years" value={source.Experience_in_Years} icon={Calendar}/></Section>
   <Section title="Immigration"><Row label="Submitted Date" value={formatDate(source.Added_to_Weekly_I140_Candidates)} icon={Calendar}/><Row label="I-140 Filed Date" value={formatDate(source.Filed_Date)} icon={Calendar}/><Row label="I-140 Approval Date" value={formatDate(source.Approval_Date)} icon={Calendar}/><Row label="I-140 Priority Date" value={formatDate(source.Priority_Date)} icon={Calendar}/><Row label="English Complete" value={source.IELTS_Complete} icon={CheckCircle2}/><Row label="English Exp Date" value={formatDate(source.IELTS_Scheduled_Exam_Date_if_applicable)} icon={Calendar}/></Section>
  </div>
  <Section title="Mandatory Candidate Passport Picture">
    <p className="mb-3 text-sm text-muted-foreground">
      Upload your passport picture here. It will also appear in your Document Library.
    </p>
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
      {uploading ? "Uploading..." : "Upload Passport Picture"}
      <input className="hidden" type="file" accept="image/*,.pdf" disabled={uploading} onChange={e=>uploadPassport(e.target.files?.[0])}/>
    </label>
  </Section>
  <Section title="Travel Summary"><div className="grid gap-3 md:grid-cols-2"><label className="text-sm">Total luggage<input className="mt-1 w-full rounded-lg border p-2" value={extra.travelSummary.totalLuggage||""} onChange={e=>setExtra(x=>({...x,travelSummary:{...x.travelSummary,totalLuggage:e.target.value}}))}/></label><label className="text-sm">Cash in dollars<input className="mt-1 w-full rounded-lg border p-2" type="number" min="0" value={extra.travelSummary.cashUsd||""} onChange={e=>setExtra(x=>({...x,travelSummary:{...x.travelSummary,cashUsd:e.target.value}}))}/></label><label className="text-sm">Phone make and type<input className="mt-1 w-full rounded-lg border p-2" value={extra.travelSummary.phoneMakeType||""} onChange={e=>setExtra(x=>({...x,travelSummary:{...x.travelSummary,phoneMakeType:e.target.value}}))}/></label><label className="text-sm">Other — explain<input className="mt-1 w-full rounded-lg border p-2" value={extra.travelSummary.phoneOther||""} onChange={e=>setExtra(x=>({...x,travelSummary:{...x.travelSummary,phoneOther:e.target.value}}))}/></label></div></Section>
  <div className="flex justify-end"><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}{saving?"Saving...":"Save Profile Details"}</button></div>
 </div>;
}