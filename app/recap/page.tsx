"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {ColumnDef} from "@tanstack/react-table";
import {Download,Filter,RotateCcw} from "lucide-react";
import {api,errorMessage} from "@/lib/client-api";
import {AcademicYear,Assessment,Chapter,SchoolClass,Subchapter} from "@/lib/frontend-types";
import {Alert,ErrorState,LoadingState,PageHeader,ProgressBar,StatusBadge} from "@/app/ui";
import {DataTable} from "@/app/data-table";

type FilterState={academicYearId:string;classId:string;student:string;chapter:string;subchapter:string;assessmentId:string};
type StudentRecap={id:number;name:string;nis:string|null;class_name:string;assessed:number;expected:number;total:number;average:number|null};
type ClassRecap={id:number;class_name:string;students:number;assessed:number;expected:number;average:number|null};
type MaterialRecap={id:number;chapter:string;subchapter:string;expected:number;assessed:number};
type RecapData={students:StudentRecap[];classes:ClassRecap[];subchapters:MaterialRecap[]};
const initial:FilterState={academicYearId:"",classId:"",student:"",chapter:"",subchapter:"",assessmentId:""};
const empty:RecapData={students:[],classes:[],subchapters:[]};
const queryFor=(f:FilterState)=>new URLSearchParams(Object.entries(f).filter(([,value])=>value)).toString();
const fromUrl=()=>{const p=new URLSearchParams(window.location.search);return Object.fromEntries(Object.keys(initial).map(key=>[key,p.get(key)??""])) as FilterState};
export default function Recap(){
  const [draft,setDraft]=useState<FilterState>(initial),[shown,setShown]=useState<FilterState>(initial);
  const [data,setData]=useState<RecapData>(empty),[years,setYears]=useState<AcademicYear[]>([]),[classes,setClasses]=useState<SchoolClass[]>([]),[chapters,setChapters]=useState<Chapter[]>([]);
  const [subs,setSubs]=useState<Subchapter[]>([]),[materials,setMaterials]=useState<Assessment[]>([]);
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[optionsError,setOptionsError]=useState(""),[hasResult,setHasResult]=useState(false);
  const [view,setView]=useState<"students"|"classes"|"materials">("students");
  const request=useRef<AbortController|null>(null);
  const load=useCallback(async(filter:FilterState)=>{
    request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);setError("");
    try{
      const result=await api<RecapData>("/api/recap?"+queryFor(filter),{signal:controller.signal});
      if(controller.signal.aborted)return;setData(result);setShown(filter);setHasResult(true);
      const query=queryFor(filter);window.history.replaceState(window.history.state,"",query?"/recap?"+query:"/recap");
    }catch(e){if(!controller.signal.aborted)setError(errorMessage(e))}
    finally{if(!controller.signal.aborted)setLoading(false)}
  },[]);
  const loadOptions=useCallback(async()=>{
    setOptionsError("");
    try{const [y,c,ch]=await Promise.all([api<AcademicYear[]>("/api/academic-years"),api<SchoolClass[]>("/api/classes"),api<Chapter[]>("/api/chapters")]);setYears(y);setClasses(c);setChapters(ch)}
    catch(e){setOptionsError(errorMessage(e))}
  },[]);
  useEffect(()=>{
    const filter=fromUrl();setDraft(filter);void load(filter);void loadOptions();
    const pop=()=>{const f=fromUrl();setDraft(f);void load(f)};window.addEventListener("popstate",pop);
    return()=>{request.current?.abort();window.removeEventListener("popstate",pop)};
  },[load,loadOptions]);
  const relevantChapters=useMemo(()=>chapters.filter(x=>!draft.academicYearId||String(x.academic_year_id)===draft.academicYearId),[chapters,draft.academicYearId]);
  useEffect(()=>{
    const controller=new AbortController();setSubs([]);
    if(draft.chapter)void Promise.all(relevantChapters.filter(x=>x.title===draft.chapter).map(x=>api<Subchapter[]>("/api/subchapters?chapterId="+x.id,{signal:controller.signal}))).then(rows=>{if(!controller.signal.aborted)setSubs(rows.flat())}).catch(e=>{if(!controller.signal.aborted)setOptionsError(errorMessage(e))});
    return()=>controller.abort();
  },[draft.chapter,relevantChapters]);
  useEffect(()=>{
    const controller=new AbortController();setMaterials([]);
    if(draft.subchapter)void Promise.all(subs.filter(x=>x.title===draft.subchapter).map(x=>api<Assessment[]>("/api/assessments?subchapterId="+x.id,{signal:controller.signal}))).then(rows=>{if(!controller.signal.aborted)setMaterials(rows.flat())}).catch(e=>{if(!controller.signal.aborted)setOptionsError(errorMessage(e))});
    return()=>controller.abort();
  },[draft.subchapter,subs]);
  function change(key:keyof FilterState,value:string){
    setDraft(f=>({...f,[key]:value,...(key==="academicYearId"?{classId:"",student:"",chapter:"",subchapter:"",assessmentId:""}:key==="classId"?{student:""}:key==="chapter"?{subchapter:"",assessmentId:""}:key==="subchapter"?{assessmentId:""}:{})}));
  }
  function reset(){setDraft(initial);void load(initial)}
  const isChanged=queryFor(draft)!==queryFor(shown),exportQuery=queryFor(shown);
  const studentColumns:ColumnDef<StudentRecap>[]=[
    {accessorKey:"name",header:"Nama siswa",cell:({row})=><><strong>{row.original.name}</strong><p className="hint">{row.original.nis||"NIS belum diisi"}</p></>},
    {accessorKey:"class_name",header:"Kelas"},
    {accessorKey:"assessed",header:"Dinilai",cell:({row})=><span>{row.original.assessed} / {row.original.expected}</span>},
    {accessorKey:"total",header:"Total nilai"},
    {accessorKey:"average",header:"Rata-rata",cell:({row})=>row.original.average==null?<StatusBadge>Belum dinilai</StatusBadge>:<strong className="score-number">{row.original.average.toLocaleString("id-ID")}</strong>}
  ];
  const classColumns:ColumnDef<ClassRecap>[]=[{accessorKey:"class_name",header:"Kelas"},{accessorKey:"students",header:"Siswa"},{accessorKey:"assessed",header:"Dinilai",cell:({row})=>row.original.assessed+" / "+row.original.expected},{accessorKey:"average",header:"Rata-rata",cell:({row})=>row.original.average??"Belum dinilai"}];
  const materialColumns:ColumnDef<MaterialRecap>[]=[{accessorKey:"chapter",header:"Bab"},{accessorKey:"subchapter",header:"Subbab"},{accessorKey:"assessed",header:"Dinilai",cell:({row})=>row.original.assessed+" / "+row.original.expected},{id:"progress",header:"Progress",enableSorting:false,cell:({row})=><ProgressBar value={row.original.expected?row.original.assessed/row.original.expected*100:0} label={"Progress "+row.original.subchapter}/>}];
  const assessed=data.students.reduce((n,x)=>n+x.assessed,0),expected=data.students.reduce((n,x)=>n+x.expected,0);
  const shownYear=years.find(x=>String(x.id)===shown.academicYearId),shownClass=classes.find(x=>String(x.id)===shown.classId);
  const chips=[shownYear?shownYear.name+" · "+shownYear.semester:shown.academicYearId?"Periode #"+shown.academicYearId:"Semua periode",shownClass?.name??(shown.classId?"Kelas #"+shown.classId:"Semua kelas"),shown.student&&'Nama: '+shown.student,shown.chapter,shown.subchapter,shown.assessmentId&&"Materi #"+shown.assessmentId].filter(Boolean);
  return <main className="app"><PageHeader eyebrow="Pantau hasil" title="Rekap penilaian" description="Tinjau kemajuan dan hasil penilaian sesuai cakupan yang dipilih."><a className="button" aria-disabled={loading||!hasResult} href={!loading&&hasResult?"/api/export?"+exportQuery:undefined}><Download size={15}/>Excel</a><a className="button primary" aria-disabled={loading||!hasResult} href={!loading&&hasResult?"/api/pdf?"+exportQuery:undefined}><Download size={15}/>Unduh PDF</a></PageHeader>
    <section className="card"><form aria-busy={loading} onSubmit={e=>{e.preventDefault();void load(draft)}}><div className="toolbar"><div className="field"><label htmlFor="recap-year">Tahun ajaran</label><select id="recap-year" value={draft.academicYearId} onChange={e=>change("academicYearId",e.target.value)}><option value="">Semua periode</option>{years.map(y=><option key={y.id} value={y.id}>{y.name} · {y.semester}</option>)}</select></div><div className="field"><label htmlFor="recap-class">Kelas</label><select id="recap-class" value={draft.classId} onChange={e=>change("classId",e.target.value)}><option value="">Semua kelas</option>{classes.filter(c=>!draft.academicYearId||String(c.academic_year_id)===draft.academicYearId).map(c=><option key={c.id} value={c.id}>{c.name} · {c.academic_year_name} / {c.semester}</option>)}</select></div><div className="field" style={{flex:1}}><label htmlFor="recap-student">Nama siswa</label><input id="recap-student" value={draft.student} placeholder="Semua siswa" maxLength={120} onChange={e=>change("student",e.target.value)}/></div></div>
      <details className="detail-panel"><summary>Filter bab, subbab & materi{draft.chapter?" · aktif":""}</summary><div className="form-grid"><div className="field"><label htmlFor="recap-chapter">Bab</label><select id="recap-chapter" value={draft.chapter} onChange={e=>change("chapter",e.target.value)}><option value="">Semua bab</option>{[...new Set(relevantChapters.map(c=>c.title))].map(title=><option key={title}>{title}</option>)}</select></div><div className="field"><label htmlFor="recap-sub">Subbab</label><select id="recap-sub" disabled={!draft.chapter} value={draft.subchapter} onChange={e=>change("subchapter",e.target.value)}><option value="">Semua subbab</option>{[...new Set(subs.map(s=>s.title))].map(title=><option key={title}>{title}</option>)}</select></div><div className="field"><label htmlFor="recap-material">Materi</label><select id="recap-material" disabled={!draft.subchapter} value={draft.assessmentId} onChange={e=>change("assessmentId",e.target.value)}><option value="">Semua materi</option>{materials.map(a=><option key={a.id} value={a.id}>{a.title} · #{a.id}</option>)}</select></div></div></details>
      <div className="form-actions"><button className="primary" disabled={loading}><Filter size={15}/>{loading?"Memuat…":"Terapkan filter"}</button><button type="button" disabled={loading} onClick={reset}><RotateCcw size={14}/>Reset</button></div>
    </form>{optionsError&&<ErrorState message={optionsError} onRetry={loadOptions}/>}
    {isChanged&&hasResult&&<Alert>Filter di atas belum diterapkan. Tabel dan ekspor masih memakai cakupan terakhir yang ditampilkan di bawah.</Alert>}
    </section>
    {error&&<ErrorState message={error} onRetry={()=>void load(draft)}/>}
    {loading?<LoadingState label="Memuat rekap penilaian"/>:hasResult&&<>
      <div className="filter-chips" aria-label="Cakupan tabel dan ekspor">{chips.map((label,index)=><span className="filter-chip" key={index}>{label}</span>)}</div>
      <section className="dashboard-kpis"><div className="card stat-card"><span>Siswa dalam cakupan</span><strong>{data.students.length}</strong><p className="hint">{data.classes.length} kelas</p></div><div className="card stat-card"><span>Nilai tersimpan</span><strong>{assessed}</strong><p className="hint">Dari {expected} penilaian yang diharapkan</p></div><div className="card stat-card"><span>Progress keseluruhan</span><strong>{expected?Math.round(assessed/expected*100):0}%</strong><p className="hint">{Math.max(0,expected-assessed)} penilaian belum terisi</p></div></section>
      <section className="card section-gap"><div className="section-heading"><h2>Hasil penilaian</h2><span className="hint">Nilai kosong tidak dihitung sebagai nol.</span></div><div className="segmented section-gap" role="group" aria-label="Ringkasan rekap">{([["students","Per siswa"],["classes","Per kelas"],["materials","Per subbab"]] as const).map(([key,label])=><button type="button" key={key} aria-pressed={view===key} onClick={()=>setView(key)}>{label}</button>)}</div>
      {view==="students"?<DataTable key="students" data={data.students} columns={studentColumns} label="Siswa" emptyAction={<button onClick={reset}>Reset filter</button>} mobileRow={s=><><div className="section-heading"><h3>{s.name}</h3><span className="score-number">{s.average??"—"}</span></div><p>{s.class_name} · {s.assessed} / {s.expected} dinilai</p><details><summary className="hint">Detail nilai</summary><p>NIS: {s.nis||"—"}</p><p>Total nilai: {s.total}</p><p>Rata-rata: {s.average??"Belum dinilai"}</p></details></>}/>:view==="classes"?<DataTable key="classes" data={data.classes} columns={classColumns} label="Kelas" initialSort="class_name" mobileRow={c=><><h3>{c.class_name}</h3><p>{c.students} siswa · {c.assessed} / {c.expected} dinilai</p><p>Rata-rata {c.average??"—"}</p></>}/>:<DataTable key="materials" data={data.subchapters} columns={materialColumns} label="Subbab" initialSort="chapter" mobileRow={s=><><h3>{s.subchapter}</h3><p>{s.chapter} · {s.assessed} / {s.expected} dinilai</p><ProgressBar value={s.expected?s.assessed/s.expected*100:0} label={"Progress "+s.subchapter}/></>}/>}
      </section>
    </>}
  </main>;
}
