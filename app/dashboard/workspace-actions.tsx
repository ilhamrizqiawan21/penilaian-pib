"use client";
import Link from "next/link";
import {useEffect,useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {ArrowRight} from "lucide-react";
import {AcademicYear} from "@/lib/frontend-types";
import {DRAFT_EVENT,LAST_ASSESSMENT,readDrafts} from "@/lib/assessment-workspace";
type Last={classId:string;chapterId:string;subId:string;assessmentId:string;className:string;materialName:string};
export function ResumeAssessment({classes}:{classes:{id:number;name:string}[]}){
  const [last,setLast]=useState<Last|null>(null),[count,setCount]=useState(0);
  useEffect(()=>{
    const update=()=>{
      setLast(null);
      try{
        const value=JSON.parse(localStorage.getItem(LAST_ASSESSMENT)??"null");
        const selected=classes.find(c=>String(c.id)===value?.classId);
        if(selected&&[value.chapterId,value.subId,value.assessmentId].every(x=>typeof x==="string"&&/^[1-9]\d*$/.test(x))&&typeof value.materialName==="string")setLast({...value,className:selected.name});
      }catch{/* An invalid saved session must not prevent reading drafts. */}
      try{setCount(readDrafts().length)}catch{setCount(0)}
    };
    update();window.addEventListener(DRAFT_EVENT,update);window.addEventListener("storage",update);
    return()=>{window.removeEventListener(DRAFT_EVENT,update);window.removeEventListener("storage",update)};
  },[classes]);
  const query=last?new URLSearchParams({classId:last.classId,chapterId:last.chapterId,subId:last.subId,assessmentId:last.assessmentId}).toString():new URLSearchParams({classId:classes.length===1?String(classes[0].id):""}).toString();
  return <section className="resume-card"><div><p className="eyebrow">Langkah berikutnya</p><h2>{last?"Lanjutkan penilaian terakhir":"Mulai sesi penilaian"}</h2><p>{last?last.className+" · "+last.materialName:"Pilih kelas dan materi. Input yang belum dikirim akan tersimpan sebagai draft di perangkat ini."}{count>0&&<><br/>{count} draft dari seluruh periode di perangkat perlu ditinjau atau dikirim.</>}</p></div><Link className="button primary" href={"/assessment"+(query?"?"+query:"")}>{last?"Lanjutkan":"Mulai penilaian"}<ArrowRight size={16}/></Link></section>;
}
export function DashboardPeriod({years,value}:{years:AcademicYear[];value:string}){const router=useRouter();const [pending,startTransition]=useTransition();return <div className="field"><label htmlFor="dashboard-period">Periode beranda</label><select id="dashboard-period" value={value} disabled={pending} aria-busy={pending} onChange={e=>{const next=e.target.value;startTransition(()=>router.push("/dashboard?academicYearId="+next))}}><option value="all">Semua periode</option>{years.map(y=><option value={y.id} key={y.id}>{y.name} · {y.semester}</option>)}</select>{pending&&<span className="hint" role="status">Memuat periode…</span>}</div>}
