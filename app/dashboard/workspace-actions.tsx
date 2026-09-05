"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowRight} from "lucide-react";
import {AcademicYear} from "@/lib/frontend-types";
import {DRAFT_EVENT,LAST_ASSESSMENT,readDrafts} from "@/lib/assessment-workspace";
type Last={classId:string;chapterId:string;subId:string;assessmentId:string;className:string;materialName:string};
export function ResumeAssessment(){
  const [last,setLast]=useState<Last|null>(null),[count,setCount]=useState(0);
  useEffect(()=>{const update=()=>{try{const value=JSON.parse(localStorage.getItem(LAST_ASSESSMENT)??"null");if(value?.classId&&value?.assessmentId)setLast(value);setCount(readDrafts().length)}catch{}};update();window.addEventListener(DRAFT_EVENT,update);return()=>window.removeEventListener(DRAFT_EVENT,update)},[]);
  const query=last?new URLSearchParams({classId:last.classId,chapterId:last.chapterId,subId:last.subId,assessmentId:last.assessmentId}).toString():"";
  return <section className="resume-card"><div><p className="eyebrow">Langkah berikutnya</p><h2>{last?"Lanjutkan penilaian terakhir":"Mulai sesi penilaian"}</h2><p>{last?last.className+" · "+last.materialName:"Pilih kelas dan materi. Input yang belum dikirim akan tersimpan sebagai draft di perangkat ini."}{count>0&&<><br/>{count} draft di perangkat perlu ditinjau atau dikirim.</>}</p></div><Link className="button primary" href={"/assessment"+(query?"?"+query:"")}>{last?"Lanjutkan":"Mulai penilaian"}<ArrowRight size={16}/></Link></section>;
}
export function DashboardPeriod({years,value}:{years:AcademicYear[];value:string}){const router=useRouter();return <div className="field"><label className="sr-only" htmlFor="dashboard-period">Periode dashboard</label><select id="dashboard-period" value={value} onChange={e=>router.push("/dashboard?academicYearId="+e.target.value)}><option value="all">Semua periode</option>{years.map(y=><option value={y.id} key={y.id}>{y.name} · {y.semester}</option>)}</select></div>}
