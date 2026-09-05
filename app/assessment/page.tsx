"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {ArrowRight,Check,Download,RotateCcw,Save} from "lucide-react";
import {api,errorMessage} from "@/lib/client-api";
import {Assessment as Material,Chapter,ScoreRow,SchoolClass,Student,Subchapter} from "@/lib/frontend-types";
import {Alert,ConfirmDialog,EmptyState,ErrorState,LoadingState,PageHeader,ProgressBar,SearchField,StatusBadge,useToast} from "@/app/ui";
import {DRAFT_EVENT,LAST_ASSESSMENT,ScoreDraft,createDraftId,deleteDraft,draftKey,isUnassessed,parseMistakes,persistDraft,readDrafts} from "@/lib/assessment-workspace";
import {SCORE_SAVED_EVENT,submitScore} from "@/lib/score-client";

type Context={classId:string;chapterId:string;subId:string;assessmentId:string};
type ServerScore=ScoreRow&{updated_at?:string};
const emptyContext:Context={classId:"",chapterId:"",subId:"",assessmentId:""};
export default function Assessment(){
  const [classes,setClasses]=useState<SchoolClass[]>([]),[chapters,setChapters]=useState<Chapter[]>([]);
  const [subs,setSubs]=useState<Subchapter[]>([]),[materials,setMaterials]=useState<Material[]>([]);
  const [students,setStudents]=useState<Student[]>([]),[scores,setScores]=useState<Record<number,ServerScore>>({});
  const [context,setContext]=useState<Context>(emptyContext),[drafts,setDrafts]=useState<ScoreDraft[]>([]);
  const [loading,setLoading]=useState(true),[optionsLoading,setOptionsLoading]=useState(false),[materialsLoading,setMaterialsLoading]=useState(false),[rowsLoading,setRowsLoading]=useState(false);
  const [error,setError]=useState(""),[message,setMessage]=useState(""),[storageError,setStorageError]=useState("");
  const [query,setQuery]=useState(""),[filter,setFilter]=useState<"all"|"unassessed"|"drafts">("all");
  const [saving,setSaving]=useState<number[]>([]),[saveAllBusy,setSaveAllBusy]=useState(false);
  const [clearing,setClearing]=useState<Student|null>(null),[discarding,setDiscarding]=useState<Student|null>(null);
  const [reload,setReload]=useState(0),[initialReload,setInitialReload]=useState(0);
  const volatile=useRef(new Map<string,ScoreDraft>()),locks=useRef(new Set<number>());
  const contextRef=useRef(context);contextRef.current=context;
  const inputRoot=useRef<HTMLElement>(null);
  const toast=useToast();
  const refreshDrafts=useCallback(()=>{
    try{
      const stored=readDrafts();
      setDrafts([...stored.filter(x=>!volatile.current.has(x.key)),...volatile.current.values()]);
    }catch{setDrafts([...volatile.current.values()]);setStorageError("Draft belum dapat disimpan di perangkat. Jangan tutup halaman sebelum menyimpan nilai.");}
  },[]);
  useEffect(()=>{
    refreshDrafts();window.addEventListener(DRAFT_EVENT,refreshDrafts);window.addEventListener("storage",refreshDrafts);
    return()=>{window.removeEventListener(DRAFT_EVENT,refreshDrafts);window.removeEventListener("storage",refreshDrafts)};
  },[refreshDrafts]);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError("");
    Promise.all([api<SchoolClass[]>("/api/classes",{signal:controller.signal}),api<Chapter[]>("/api/chapters",{signal:controller.signal})]).then(([c,ch])=>{
      if(controller.signal.aborted)return;
      setClasses(c);setChapters(ch);
      let restored:Partial<Context>={};
      try{restored=JSON.parse(localStorage.getItem(LAST_ASSESSMENT)??"{}")}catch{}
      const params=new URLSearchParams(window.location.search);
      if(params.has("classId"))restored={classId:params.get("classId")??"",chapterId:params.get("chapterId")??"",subId:params.get("subId")??"",assessmentId:params.get("assessmentId")??""};
      const selectedClass=c.find(x=>String(x.id)===restored.classId);
      const selectedChapter=ch.find(x=>String(x.id)===restored.chapterId&&(!x.academic_year_id||x.academic_year_id===selectedClass?.academic_year_id));
      setContext({classId:selectedClass?String(selectedClass.id):"",chapterId:selectedChapter?String(selectedChapter.id):"",subId:selectedChapter?String(restored.subId??""):"",assessmentId:selectedChapter?String(restored.assessmentId??""):""});
    }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[initialReload]);
  useEffect(()=>{
    const controller=new AbortController();setSubs([]);setMaterials([]);
    if(!context.chapterId){setOptionsLoading(false);return}
    setOptionsLoading(true);
    api<Subchapter[]>("/api/subchapters?chapterId="+context.chapterId,{signal:controller.signal}).then(rows=>{
      if(controller.signal.aborted)return;setSubs(rows);
      setContext(c=>c.subId&&!rows.some(x=>String(x.id)===c.subId)?{...c,subId:"",assessmentId:""}:c);
    }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setOptionsLoading(false)});
    return()=>controller.abort();
  },[context.chapterId,reload]);
  useEffect(()=>{
    const controller=new AbortController();setMaterials([]);
    if(!context.subId){setMaterialsLoading(false);return}
    setMaterialsLoading(true);
    api<Material[]>("/api/assessments?subchapterId="+context.subId,{signal:controller.signal}).then(rows=>{
      if(controller.signal.aborted)return;setMaterials(rows);
      setContext(c=>c.assessmentId&&!rows.some(x=>String(x.id)===c.assessmentId)?{...c,assessmentId:""}:c);
    }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setMaterialsLoading(false)});
    return()=>controller.abort();
  },[context.subId,reload]);
  useEffect(()=>{
    const controller=new AbortController();setStudents([]);setScores({});setQuery("");setError("");
    if(!context.classId||!context.assessmentId){setRowsLoading(false);return}
    setRowsLoading(true);
    Promise.all([api<Student[]>("/api/students?classId="+context.classId,{signal:controller.signal}),api<{rows:ServerScore[]}>("/api/scores?assessmentId="+context.assessmentId,{signal:controller.signal})]).then(([rows,result])=>{
      if(controller.signal.aborted)return;setStudents(rows);setScores(Object.fromEntries(result.rows.map(x=>[x.student_id,x])));
    }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setRowsLoading(false)});
    return()=>controller.abort();
  },[context.classId,context.assessmentId,reload]);
  useEffect(()=>{
    if(!context.classId||!context.assessmentId)return;
    const material=materials.find(x=>String(x.id)===context.assessmentId);
    const selectedClass=classes.find(x=>String(x.id)===context.classId);
    if(!material||!selectedClass)return;
    try{localStorage.setItem(LAST_ASSESSMENT,JSON.stringify({...context,className:selectedClass.name,materialName:material.title}))}catch{}
  },[context,materials,classes]);
  useEffect(()=>{
    const saved=(event:Event)=>{
      const {draft,score,mistakes,updatedAt}=(event as CustomEvent<{draft:ScoreDraft;score:number|null;mistakes:number|null;updatedAt?:string}>).detail;
      if(String(draft.assessmentId)!==contextRef.current.assessmentId)return;
      setScores(current=>({...current,[draft.studentId]:{student_id:draft.studentId,score,mistakes,updated_at:updatedAt}}));
    };
    window.addEventListener(SCORE_SAVED_EVENT,saved);return()=>window.removeEventListener(SCORE_SAVED_EVENT,saved);
  },[]);
  useEffect(()=>{
    const before=(e:BeforeUnloadEvent)=>{if(volatile.current.size){e.preventDefault();e.returnValue=""}};
    const navigate=(e:MouseEvent)=>{if(volatile.current.size&&(e.target as Element).closest("a[href]")&&!window.confirm("Sebagian draft belum tersimpan di perangkat. Tetap tinggalkan halaman?")){e.preventDefault();e.stopPropagation()}};
    window.addEventListener("beforeunload",before);document.addEventListener("click",navigate,true);
    return()=>{window.removeEventListener("beforeunload",before);document.removeEventListener("click",navigate,true)};
  },[]);
  const currentDrafts=drafts.filter(x=>String(x.assessmentId)===context.assessmentId&&students.some(s=>s.id===x.studentId));
  const draftMap=Object.fromEntries(currentDrafts.map(x=>[x.studentId,x]));
  const assessed=students.filter(s=>scores[s.id]?.score!=null).length;
  const percent=students.length?Math.round(assessed/students.length*100):0;
  const visible=students.filter(s=>(s.name+" "+(s.nis??"")).toLocaleLowerCase("id").includes(query.trim().toLocaleLowerCase("id"))&&(filter==="all"||filter==="drafts"?filter!=="drafts"||!!draftMap[s.id]:isUnassessed(scores[s.id]?.score,draftMap[s.id])));
  function changeContext(next:Context){
    if(locks.current.size||saveAllBusy)return;
    if(volatile.current.size&&!window.confirm("Draft belum tersimpan di perangkat. Tetap ganti kelas atau materi?"))return;
    setContext(next);setMessage("");setError("");
  }
  function edit(studentId:number,raw:string){
    if(locks.current.has(studentId))return;
    const draft:ScoreDraft={key:draftKey(studentId,Number(context.assessmentId)),studentId,assessmentId:Number(context.assessmentId),raw,id:createDraftId(),deviceId:"browser",baseUpdatedAt:scores[studentId]?.updated_at??null,status:"dirty"};
    volatile.current.set(draft.key,draft);
    try{persistDraft(draft);volatile.current.delete(draft.key);setStorageError("")}catch{setStorageError("Draft belum tersimpan di perangkat. Jangan tutup halaman; aktifkan penyimpanan browser lalu coba lagi.")}
    refreshDrafts();
  }
  function focusStudent(id:number){
    requestAnimationFrame(()=>{const inputs=inputRoot.current?.querySelectorAll<HTMLInputElement>('input[data-student="'+id+'"]');const input=Array.from(inputs??[]).find(x=>x.getClientRects().length>0);input?.focus();input?.select()});
  }
  async function save(studentId:number,advance=false,quiet=false){
    if(locks.current.has(studentId))return false;
    const draft=volatile.current.get(draftKey(studentId,Number(context.assessmentId)))??draftMap[studentId];
    if(!draft)return false;
    const parsed=parseMistakes(draft.raw);
    if(!parsed.valid){setMessage("Perbaiki jumlah kesalahan yang ditandai sebelum menyimpan.");focusStudent(studentId);return false}
    if(draft.status==="conflict"){setMessage("Nilai server telah berubah. Gunakan tombol kembalikan untuk meninjau nilai server sebelum mengedit lagi.");return false}
    const nextIds=visible.slice(visible.findIndex(x=>x.id===studentId)+1).map(x=>x.id);
    locks.current.add(studentId);setSaving([...locks.current]);setMessage("");
    try{
      const queued={...draft,status:"pending" as const,error:undefined};
      persistDraft(queued);volatile.current.delete(draft.key);setStorageError("");refreshDrafts();
      const ok=await submitScore(queued);
      if(ok&&!quiet)toast("Nilai berhasil disimpan.");
      if(ok&&advance){if(nextIds.length)focusStudent(nextIds[0]);else setMessage("Siswa terakhir pada daftar ini selesai.")}
      return ok;
    }catch(e){setStorageError("Nilai belum dikirim: "+errorMessage(e));return false}
    finally{locks.current.delete(studentId);setSaving([...locks.current])}
  }
  async function saveAll(){
    setSaveAllBusy(true);let count=0;
    try{for(const draft of currentDrafts.filter(x=>x.status!=="conflict"))if(await save(draft.studentId,false,true))count++;setMessage(count+" nilai tersimpan di server."+(count<currentDrafts.length?" Draft yang tersisa belum tersimpan; periksa status dan jumlah kesalahannya.":""))}finally{setSaveAllBusy(false)}
  }
  async function clearScore(){
    if(!clearing)return;
    edit(clearing.id,"");setClearing(null);
    setMessage("Nilai dikosongkan sebagai draft. Klik Simpan untuk menerapkan.");
  }
  function discard(){
    if(!discarding)return;
    const key=draftKey(discarding.id,Number(context.assessmentId));
    try{deleteDraft(key);volatile.current.delete(key);refreshDrafts();setReload(x=>x+1);setDiscarding(null)}catch(e){setStorageError(errorMessage(e))}
  }
  function badge(student:Student){
    if(saving.includes(student.id))return <StatusBadge>Menyimpan…</StatusBadge>;
    const draft=draftMap[student.id];
    if(draft){const labels={dirty:"Draft perangkat",pending:"Menunggu sinkronisasi",conflict:"Konflik · perlu ditinjau",failed:"Gagal disimpan"};return <StatusBadge tone={draft.status==="dirty"||draft.status==="pending"?"warning":"danger"}>{labels[draft.status]}</StatusBadge>}
    return <StatusBadge tone={scores[student.id]?.score!=null?"success":"neutral"}>{scores[student.id]?.score!=null?"Tersimpan":"Belum dinilai"}</StatusBadge>;
  }
  function controls(student:Student,mode:string){
    const draft=draftMap[student.id],raw=draft?.raw??(scores[student.id]?.mistakes==null?"":String(scores[student.id].mistakes));
    const parsed=parseMistakes(raw),busy=saving.includes(student.id)||saveAllBusy;
    const errorId=mode+"-error-"+student.id;
    return <div><div className="table-actions"><input data-student={student.id} aria-label={"Jumlah kesalahan "+student.name} aria-invalid={!parsed.valid} aria-describedby={!parsed.valid?errorId:"score-help"} value={raw} type="text" inputMode="numeric" autoComplete="off" disabled={busy} onChange={e=>edit(student.id,e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(draft)void save(student.id,true);else{const next=visible[visible.findIndex(x=>x.id===student.id)+1];if(next)focusStudent(next.id)}}}}/><button className="primary icon-button" title="Simpan nilai" aria-label={"Simpan nilai "+student.name} disabled={busy||!draft||!parsed.valid||draft.status==="conflict"} onClick={()=>void save(student.id)}><Check size={16}/></button>{draft?<button className="icon-button" title="Kembalikan ke nilai server" aria-label={"Kembalikan nilai "+student.name} disabled={busy} onClick={()=>setDiscarding(student)}><RotateCcw size={15}/></button>:scores[student.id]?.score!=null?<button className="ghost" disabled={busy} onClick={()=>setClearing(student)}>Kosongkan</button>:null}</div>{!parsed.valid&&<p className="row-error" id={errorId}>{parsed.error}</p>}{draft?.error&&<p className="row-error">{draft.error}</p>}</div>;
  }
  function displayScore(student:Student){const parsed=parseMistakes(draftMap[student.id]?.raw??(scores[student.id]?.mistakes==null?"":String(scores[student.id].mistakes)));return parsed.valid?parsed.score??"—":"—"}
  const selectedClass=classes.find(x=>String(x.id)===context.classId);
  const availableChapters=chapters.filter(x=>!x.academic_year_id||x.academic_year_id===selectedClass?.academic_year_id);
  const selectedMaterial=materials.find(x=>String(x.id)===context.assessmentId);
  const exportQuery=new URLSearchParams({...(context.classId?{classId:context.classId}:{}),...(context.assessmentId?{assessmentId:context.assessmentId}:{})}).toString();
  return <main className="app assessment-page" ref={inputRoot}>
    <PageHeader eyebrow="Ruang kerja guru" title="Penilaian" description="Pilih materi, isi kesalahan, lalu lanjutkan ke siswa berikutnya."><details><summary className="button"><Download size={15}/>Ekspor nilai</summary><div className="actions section-gap"><a className="button" href={"/api/export?"+exportQuery}>Excel</a><a className="button" href={"/api/pdf?"+exportQuery}>PDF</a></div></details></PageHeader>
    <section className="card assessment-context"><div className="section-heading"><h2>Kelas & materi</h2><span className="hint">Nilai = 90 − jumlah kesalahan</span></div>
      {loading?<LoadingState/>:<div className="form-grid section-gap">
        <div className="field"><label htmlFor="assessment-class">Kelas</label><select id="assessment-class" value={context.classId} disabled={saving.length>0||saveAllBusy} onChange={e=>changeContext({...emptyContext,classId:e.target.value})}><option value="">Pilih kelas</option>{classes.map(x=><option key={x.id} value={x.id}>{x.name} · {x.academic_year_name} / {x.semester}</option>)}</select></div>
        <div className="field"><label htmlFor="assessment-chapter">Bab</label><select id="assessment-chapter" disabled={!context.classId||saving.length>0||saveAllBusy} value={context.chapterId} onChange={e=>changeContext({...context,chapterId:e.target.value,subId:"",assessmentId:""})}><option value="">Pilih bab</option>{availableChapters.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></div>
        <div className="field"><label htmlFor="assessment-sub">Subbab</label><select id="assessment-sub" disabled={!context.chapterId||optionsLoading||saving.length>0||saveAllBusy} value={context.subId} onChange={e=>changeContext({...context,subId:e.target.value,assessmentId:""})}><option value="">Pilih subbab</option>{subs.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></div>
        <div className="field"><label htmlFor="assessment-material">Materi</label><select id="assessment-material" disabled={!context.subId||materialsLoading||saving.length>0||saveAllBusy} value={context.assessmentId} onChange={e=>changeContext({...context,assessmentId:e.target.value})}><option value="">Pilih materi</option>{materials.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></div>
      </div>}
      {!loading&&context.classId&&!availableChapters.length&&<EmptyState title="Materi periode ini belum tersedia" action={<Link className="button" href="/master-data/curriculum">Susun materi <ArrowRight size={15}/></Link>}>Tambahkan bab dan materi untuk tahun ajaran kelas ini.</EmptyState>}
      {!loading&&!optionsLoading&&context.chapterId&&!subs.length&&!error&&<EmptyState title="Bab ini belum memiliki subbab" action={<Link className="button" href={"/master-data/curriculum/"+context.chapterId}>Tambah subbab</Link>}/>}
      {context.subId&&!materialsLoading&&subs.length>0&&!materials.length&&!error&&<p className="notice">Jika belum ada materi, tambahkan melalui menu Materi.</p>}
    </section>
    {error&&<ErrorState message={error} onRetry={()=>{setError("");setInitialReload(x=>x+1);setReload(x=>x+1)}}/>}
    {storageError&&<Alert type="error">{storageError}</Alert>}
    {message&&<Alert>{message}</Alert>}
    {rowsLoading?<LoadingState label="Memuat daftar siswa dan nilai"/>:context.assessmentId&&context.classId&&!error?<section className="section-gap">
      <div className="assessment-summary"><div><p className="eyebrow">{selectedClass?.name} · {selectedClass?.academic_year_name}</p><h2>{selectedMaterial?.title??"Daftar penilaian"}</h2><p>{assessed} dari {students.length} siswa tersimpan di server · {percent}% selesai</p><ProgressBar value={percent} label="Progress penilaian kelas"/></div><button className="primary" disabled={!currentDrafts.some(x=>x.status!=="conflict")||saving.length>0||saveAllBusy} onClick={()=>void saveAll()}><Save size={15}/>{saveAllBusy?"Menyimpan…":"Simpan semua draft ("+currentDrafts.length+")"}</button></div>
      <div className="toolbar"><SearchField label="Cari siswa" value={query} onChange={setQuery} placeholder="Cari nama atau NIS…"/><div className="segmented" role="group" aria-label="Status penilaian">{([["all","Semua"],["unassessed","Belum selesai"],["drafts","Draft"]] as const).map(([value,label])=><button key={value} type="button" aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div></div>
      <p className="hint" id="score-help"><kbd>Enter</kbd> simpan & lanjut. Angka 0 berarti tanpa kesalahan. Draft disimpan di browser ini; rekap hanya memakai nilai yang sudah terkirim.</p>
      {!students.length?<EmptyState title="Belum ada siswa di kelas ini" action={<Link className="button primary" href={"/students?classId="+context.classId}>Tambah siswa</Link>}>Daftarkan siswa aktif untuk mulai menilai.</EmptyState>:!visible.length?<EmptyState title={filter==="unassessed"&&!query?"Penilaian kelas ini sudah selesai":"Tidak ada siswa yang cocok"} action={<button onClick={()=>{setQuery("");setFilter("all")}}>Tampilkan semua siswa</button>}>Ubah pencarian atau filter untuk melihat daftar lainnya.</EmptyState>:<>
        <div className="table-wrap score-table"><table><caption className="sr-only">Penilaian {selectedMaterial?.title}</caption><thead><tr><th scope="col">Siswa</th><th scope="col">Jumlah kesalahan</th><th scope="col">Nilai</th><th scope="col">Status</th></tr></thead><tbody>{visible.map(student=><tr key={student.id} data-dirty={!!draftMap[student.id]}><td><strong>{student.name}</strong><div className="hint">{student.nis||"NIS belum diisi"}</div></td><td>{controls(student,"desktop")}</td><td><span className="score-number">{displayScore(student)}</span></td><td>{badge(student)}</td></tr>)}</tbody></table></div>
        <div className="score-mobile">{visible.map(student=><article className="score-row" key={student.id}><div className="score-row-header"><div><strong>{student.name}</strong><p className="hint">{student.nis||"NIS belum diisi"}</p></div><span className="score-number">{displayScore(student)}</span></div><div className="field"><span className="field-label">Jumlah kesalahan</span>{controls(student,"mobile")}</div><div className="section-gap">{badge(student)}</div></article>)}</div>
      </>}
      <div className="save-summary"><span>{visible.length} siswa ditampilkan · {currentDrafts.length} draft pada materi ini</span>{currentDrafts.length>0&&<span>Draft akan dipulihkan saat Anda kembali.</span>}</div>
    </section>:!loading&&!error&&<EmptyState title="Siap mulai menilai" >Pilih kelas dan materi di atas. Pilihan terakhir akan diingat untuk pekerjaan berikutnya.</EmptyState>}
    {clearing&&<ConfirmDialog title="Kosongkan nilai?" onClose={()=>setClearing(null)} onConfirm={()=>void clearScore()} confirmLabel="Kosongkan">{clearing.name} akan kembali menjadi belum dinilai setelah draft disimpan.</ConfirmDialog>}
    {discarding&&<ConfirmDialog title="Kembalikan ke nilai server?" onClose={()=>setDiscarding(null)} onConfirm={discard} confirmLabel="Kembalikan nilai">Draft {discarding.name} di perangkat ini akan dibuang. Nilai terbaru dari server akan dimuat untuk ditinjau.</ConfirmDialog>}
  </main>;
}
