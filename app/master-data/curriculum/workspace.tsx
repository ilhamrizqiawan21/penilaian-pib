"use client";
import Link from "next/link";
import {useParams,useRouter,useSearchParams} from "next/navigation";
import {Suspense,useEffect,useState} from "react";
import {ArrowUp,ArrowDown,Plus,Pencil,Copy,Trash2} from "lucide-react";
import {api,errorMessage,jsonRequest} from "@/lib/client-api";
import {chapterInput,subchapterInput,materialInput,curriculumEdit,type CurriculumKind,type CurriculumContext,type CurriculumItem,type CurriculumPeriod,type CopyPreview} from "@/lib/curriculum-schema";
import {Alert,Breadcrumb,ConfirmDialog,EmptyState,ErrorState,LoadingState,Modal,PageHeader,SearchField,StatusBadge,useToast} from "@/app/ui";

const labels:Record<CurriculumKind,string>={chapters:"Bab",subchapters:"subbab",assessments:"materi"};
const base="/master-data/curriculum";
export default function CurriculumWorkspace(){return <Suspense fallback={<LoadingState label="Memuat materi"/>}><Workspace/></Suspense>}
function Workspace(){
  const route=useParams<{chapterId?:string;subchapterId?:string}>(),params=useSearchParams(),router=useRouter(),toast=useToast();
  const [years,setYears]=useState<CurriculumPeriod[]>([]),[yearError,setYearError]=useState(""),[yearRetry,setYearRetry]=useState(0),[yearsLoading,setYearsLoading]=useState(true);
  const [context,setContext]=useState<CurriculumContext|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  const [query,setQuery]=useState(""),[editor,setEditor]=useState<{item?:CurriculumItem}|null>(null),[copying,setCopying]=useState(false),[deleting,setDeleting]=useState<CurriculumItem|null>(null),[busy,setBusy]=useState(false);
  const yearParam=params.get("year")??params.get("academicYearId")??"";
  const kind:CurriculumKind=route.subchapterId?"assessments":route.chapterId?"subchapters":"chapters";
  useEffect(()=>{
    const controller=new AbortController();setYearsLoading(true);setYearError("");
    api<CurriculumPeriod[]>("/api/academic-years",{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setYears(rows)}).catch(e=>{if(!controller.signal.aborted)setYearError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setYearsLoading(false)});
    return()=>controller.abort();
  },[yearRetry]);
  useEffect(()=>{
    if(!route.chapterId&&!yearParam&&!yearsLoading){const active=years.find(y=>y.is_active);if(active)router.replace(base+"?year="+active.id);}
  },[years,yearsLoading,route.chapterId,yearParam,router]);
  useEffect(()=>{
    setEditor(null);setCopying(false);setQuery("");setContext(null);setError("");
    if(!yearParam&&!route.chapterId){setLoading(false);return}
    const controller=new AbortController(),q=new URLSearchParams();
    if(yearParam)q.set("yearId",yearParam);
    if(route.chapterId)q.set("chapterId",route.chapterId);
    if(route.subchapterId)q.set("subchapterId",route.subchapterId);
    setLoading(true);
    api<CurriculumContext>("/api/curriculum?"+q,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted){setContext(result);if(!yearParam)router.replace(base+(route.chapterId?"/"+route.chapterId:"")+(route.subchapterId?"/"+route.subchapterId:"")+"?year="+result.period.id)}}).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[yearParam,route.chapterId,route.subchapterId,revision,router]);
  const periodLabel=context?context.period.name+" · "+context.period.semester:"";
  const home=context?base+"?year="+context.period.id:base;
  const chapterHref=context?.chapter?base+"/"+context.chapter.id+"?year="+context.period.id:home;
  const visible=context?.items.filter(x=>x.title.toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id")))??[];
  async function move(item:CurriculumItem,direction:"up"|"down"){
    setBusy(true);setError("");
    try{await api("/api/curriculum",jsonRequest("POST",{action:"move",kind,id:item.id,direction}));setRevision(x=>x+1);toast("Urutan diperbarui.")}
    catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }
  async function remove(){if(!deleting)return;setBusy(true);setError("");try{await api(`/api/master/${kind}/${deleting.id}?permanent=1`,{method:"DELETE"});setDeleting(null);setRevision(x=>x+1);toast(labels[kind]+" berhasil dihapus.")}catch(e){setError(errorMessage(e));setDeleting(null)}finally{setBusy(false)}}
  return <main className="app curriculum-workspace">
    {route.chapterId&&<Breadcrumb items={[{label:"Materi",href:home},...(context?.chapter?[{label:context.chapter.title,href:route.subchapterId?chapterHref:undefined}]:[]),...(context?.subchapter?[{label:context.subchapter.title}]:[])]}/>}
    <PageHeader eyebrow="Kelola materi" title={context?.subchapter?.title??context?.chapter?.title??"Materi PIB"} description={route.chapterId?periodLabel:"Susun Bab, subbab, materi, dan pedoman penilaian per periode."}>
      {route.chapterId&&<Link className="button" href={route.subchapterId?chapterHref:home}>Kembali ke {route.subchapterId?"subbab":"Bab"}</Link>}
    </PageHeader>
    {!route.chapterId&&<section className="card cu-period"><div className="field"><label htmlFor="cu-year">Periode materi</label><select id="cu-year" value={yearParam} disabled={yearsLoading||busy} onChange={e=>router.push(base+(e.target.value?"?year="+e.target.value:""))}><option value="">Pilih periode</option>{years.map(y=><option value={y.id} key={y.id}>{y.name} · {y.semester}{y.is_active?" · aktif":""}</option>)}</select></div>{yearsLoading&&<span className="hint">Memuat periode…</span>}</section>}
    {yearError&&<ErrorState message={yearError} onRetry={()=>setYearRetry(x=>x+1)}/>}
    {error&&<ErrorState message={error} onRetry={()=>setRevision(x=>x+1)}/>}
    {loading?<LoadingState label="Memuat struktur materi"/>:context?<section className="card cu-content">
      {context.warnings.map(w=><Alert key={w}>{w}</Alert>)}
      <div className="cu-toolbar"><div><h2>Daftar {labels[kind]}</h2><p className="hint">{context.items.length} {labels[kind]} · {periodLabel}</p></div><div className="actions"><button className="primary" disabled={busy} onClick={()=>setEditor({})}><Plus size={14}/>Tambah {labels[kind]}</button>{kind==="chapters"&&<button disabled={busy||!!yearError} onClick={()=>setCopying(true)}><Copy size={14}/>Salin dari periode lain</button>}</div></div>
      <SearchField label={"Cari "+labels[kind]} value={query} onChange={setQuery} placeholder={"Cari "+labels[kind]+"…"}/>
      {kind==="assessments"&&<p className="hint cu-help">Bobot 2 berpengaruh dua kali bobot 1 pada rata-rata, bukan menggandakan nilai siswa.</p>}
      {query&&<p className="hint cu-help">Kosongkan pencarian untuk mengubah urutan.</p>}
      {!visible.length?<EmptyState title={query?"Tidak ada hasil pencarian":"Belum ada "+labels[kind]}>Gunakan tombol Tambah untuk menyusun struktur materi.</EmptyState>:<ul className="cu-list">{visible.map(item=>{
        const index=context.items.findIndex(x=>x.id===item.id);
        const href=kind==="chapters"?base+"/"+item.id+"?year="+context.period.id:base+"/"+context.chapter?.id+"/"+item.id+"?year="+context.period.id;
        return <li key={item.id}><span className="cu-number">{index+1}</span><div className="cu-copy">
          {kind==="assessments"?<strong>{item.title}</strong>:<Link href={href}>{item.title}</Link>}
          <p className="hint">{kind==="chapters"?item.subchapter_count+" subbab · "+item.material_count+" materi":kind==="subchapters"?item.material_count+" materi":"Bobot "+item.weight+" · "+item.score_count+" nilai tersimpan"}</p>
          {kind==="assessments"&&(item.description?<details className="cu-guide"><summary>Pedoman tersedia</summary><p>{item.description}</p></details>:<span className="hint">Pedoman belum diisi</span>)}
          {item.legacy_mismatch&&<StatusBadge tone="warning">Tinjau periode lama</StatusBadge>}
        </div><div className="cu-actions"><button disabled={busy} onClick={()=>setEditor({item})} aria-label={"Edit "+item.title}><Pencil size={13}/>Edit</button><button className="icon-button" title="Naik" aria-label={"Naikkan "+item.title} disabled={busy||!!query||index===0} onClick={()=>void move(item,"up")}><ArrowUp size={14}/></button><button className="icon-button" title="Turun" aria-label={"Turunkan "+item.title} disabled={busy||!!query||index===context.items.length-1} onClick={()=>void move(item,"down")}><ArrowDown size={14}/></button><button className="icon-button danger" title={"Hapus "+item.title} aria-label={"Hapus "+item.title} disabled={busy} onClick={()=>setDeleting(item)}><Trash2 size={14}/></button></div></li>;
      })}</ul>}
    </section>:!loading&&!error&&!yearsLoading&&<EmptyState title="Pilih periode materi">Pilih tahun ajaran dan semester sebelum mengelola materi.</EmptyState>}
    {editor&&context&&<Editor kind={kind} context={context} item={editor.item} onClose={()=>setEditor(null)} onSaved={()=>{setEditor(null);setRevision(x=>x+1);toast("Materi berhasil disimpan.")}}/>}
    {deleting&&<ConfirmDialog title={"Hapus "+labels[kind]+"?"} onClose={()=>setDeleting(null)} onConfirm={()=>void remove()} confirmLabel="Hapus" busy={busy}><strong>{deleting.title}</strong> akan dihapus permanen. Jika masih memiliki nilai atau relasi data, penghapusan akan ditolak.</ConfirmDialog>}
    {copying&&context&&<CopyDialog years={years} target={context.period} onClose={()=>setCopying(false)} onSaved={()=>{setCopying(false);setRevision(x=>x+1);toast("Struktur materi disalin tanpa nilai siswa.")}}/>}
  </main>;
}
function Editor({kind,context,item,onClose,onSaved}:{kind:CurriculumKind;context:CurriculumContext;item?:CurriculumItem;onClose:()=>void;onSaved:()=>void}){
  const [title,setTitle]=useState(item?.title??""),[description,setDescription]=useState(item?.description??""),[weight,setWeight]=useState(String(item?.weight??1)),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const material=kind==="assessments",affected=material&&!!item&&Number(weight)!==item.weight&&item.score_count>0;
  async function submit(e:React.FormEvent){
    e.preventDefault();setError("");
    const body={title,description,weight:Number(weight)};
    const validation=item?curriculumEdit.safeParse({...body,kind,id:item.id,confirmedScoreCount:confirmed?item.score_count:undefined}):kind==="chapters"?chapterInput.safeParse({title,academicYearId:context.period.id}):kind==="subchapters"?subchapterInput.safeParse({title,chapterId:context.chapter?.id}):materialInput.safeParse({...body,subchapterId:context.subchapter?.id});
    if(!validation.success){setError("Periksa nama (minimal 2 karakter), deskripsi (maksimal 500), dan bobot (0,1–100).");return}
    if(affected&&!confirmed){setError("Konfirmasi dampak perubahan bobot sebelum menyimpan.");return}
    setBusy(true);
    try{await api(item?"/api/curriculum":"/api/"+kind,jsonRequest("POST",item?{action:"edit",...validation.data}:validation.data));onSaved()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}
  }
  return <Modal title={(item?"Edit ":"Tambah ")+labels[kind]} onClose={onClose} busy={busy}><form onSubmit={submit} className="section-stack">
    <div className="field"><label htmlFor="cu-title">Nama {labels[kind]}</label><input id="cu-title" autoFocus required minLength={2} maxLength={material?150:100} value={title} disabled={busy} onChange={e=>setTitle(e.target.value)}/></div>
    {material&&<><div className="field"><label htmlFor="cu-description">Pedoman penilaian / deskripsi</label><textarea id="cu-description" maxLength={500} value={description} disabled={busy} onChange={e=>setDescription(e.target.value)} placeholder="Jelaskan hal yang dihitung sebagai satu kesalahan."/><span className="hint">{description.length}/500 karakter</span></div><div className="field"><label htmlFor="cu-weight">Bobot</label><input id="cu-weight" type="number" min="0.1" max="100" step="any" required value={weight} disabled={busy} onChange={e=>{setWeight(e.target.value);setConfirmed(false)}}/><span className="hint">Bobot 2 berpengaruh dua kali bobot 1 terhadap rata-rata.</span></div></>}
    {affected&&<div className="cu-confirm"><p>{item!.score_count} nilai tersimpan terdampak. Rekap dan ekspor akan dihitung ulang dengan bobot baru; nilai asli tetap.</p><label><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>Saya memahami perubahan perhitungan ini.</label></div>}
    {error&&<Alert type="error">{error}</Alert>}<div className="modal-footer"><button type="button" disabled={busy} onClick={onClose}>Batal</button><button className="primary" disabled={busy||(affected&&!confirmed)}>{busy?"Menyimpan…":"Simpan"}</button></div>
  </form></Modal>;
}
function CopyDialog({years,target,onClose,onSaved}:{years:CurriculumPeriod[];target:CurriculumPeriod;onClose:()=>void;onSaved:()=>void}){
  const [source,setSource]=useState(""),[preview,setPreview]=useState<CopyPreview|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[retry,setRetry]=useState(0);
  useEffect(()=>{
    setPreview(null);setError("");if(!source){setLoading(false);return}
    const controller=new AbortController();setLoading(true);
    api<CopyPreview>("/api/curriculum?preview=copy&sourceId="+source+"&targetId="+target.id,{signal:controller.signal}).then(p=>{if(!controller.signal.aborted)setPreview(p)}).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[source,target.id,retry]);
  async function copy(){setBusy(true);setError("");try{await api("/api/curriculum",jsonRequest("POST",{action:"copy",sourceId:Number(source),targetId:target.id}));onSaved()}catch(e){setError(errorMessage(e))}finally{setBusy(false)}}
  return <Modal title="Salin dari periode lain" onClose={onClose} busy={busy}><p>Tujuan: {target.name} · {target.semester}</p><div className="field"><label htmlFor="cu-source">Periode sumber</label><select id="cu-source" value={source} disabled={busy} onChange={e=>setSource(e.target.value)}><option value="">Pilih sumber</option>{years.filter(y=>y.id!==target.id).map(y=><option key={y.id} value={y.id}>{y.name} · {y.semester}</option>)}</select></div>
    {loading&&<LoadingState label="Memeriksa struktur sumber"/>}
    {preview&&<><p>{preview.chapters} Bab · {preview.subchapters} subbab · {preview.materials} materi aktif akan disalin bersama deskripsi, bobot, dan urutannya. Nilai siswa tidak disalin.</p>{preview.legacyCount>0&&<Alert>{preview.legacyCount} Bab sumber memiliki penanda periode lama. Periksa sumber sebelum menyalin.</Alert>}{preview.conflicts.length>0&&<Alert type="error">Penyalinan dihentikan karena nama Bab bertabrakan: {preview.conflicts.join(", ")}. Ubah nama pada sumber/tujuan terlebih dahulu.</Alert>}{!preview.chapters&&<p>Belum ada struktur aktif yang dapat disalin.</p>}</>}
    {error&&<ErrorState message={error} onRetry={()=>setRetry(x=>x+1)}/>}<div className="modal-footer"><button disabled={busy} onClick={onClose}>Batal</button><button className="primary" disabled={busy||loading||!preview?.chapters||!!preview.conflicts.length||!!error} onClick={()=>void copy()}>{busy?"Menyalin…":"Salin struktur"}</button></div>
  </Modal>;
}
