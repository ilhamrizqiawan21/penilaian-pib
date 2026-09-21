"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {ArrowLeft,ArrowRight,Check,RotateCcw,Save,Sparkles} from "lucide-react";
import {api,errorMessage,jsonRequest} from "@/lib/client-api";
import {Assessment,Chapter,IndividualTestSession,IndividualTestSessionItem,SchoolClass,Student,Subchapter} from "@/lib/frontend-types";
import {Alert,ConfirmDialog,EmptyState,ErrorState,LoadingState,PageHeader,ProgressBar,StatusBadge,useToast} from "@/app/ui";
import {DRAFT_EVENT,ScoreDraft,createDraftId,deleteDraft,draftKey,parseMistakes,persistDraft,readDrafts,stepMistakes} from "@/lib/assessment-workspace";
import {SCORE_SAVED_EVENT,submitScore} from "@/lib/score-client";

export default function IndividualAssessment(){
  const [classes,setClasses]=useState<SchoolClass[]>([]),[students,setStudents]=useState<Student[]>([]);
  const [chapters,setChapters]=useState<Chapter[]>([]),[subs,setSubs]=useState<Subchapter[]>([]);
  const [session,setSession]=useState<IndividualTestSession|null>(null);
  const [classId,setClassId]=useState(""),[studentId,setStudentId]=useState(""),[chapterId,setChapterId]=useState(""),[subId,setSubId]=useState("");
  const [drafts,setDrafts]=useState<ScoreDraft[]>([]);
  const [loading,setLoading]=useState(true),[optionsLoading,setOptionsLoading]=useState(false),[rowsLoading,setRowsLoading]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[storageError,setStorageError]=useState("");
  const [retry,setRetry]=useState(0),[discarding,setDiscarding]=useState<IndividualTestSessionItem|null>(null);
  const volatile=useRef(new Map<string,ScoreDraft>()),lock=useRef(false),currentSession=useRef(session);
  currentSession.current=session;
  const toast=useToast();

  const getDrafts=useCallback(()=>{
    const merged=new Map<string,ScoreDraft>();
    try{for(const draft of readDrafts())merged.set(draft.key,draft)}catch{setStorageError("Penyimpanan perangkat tidak tersedia. Jangan tutup halaman sebelum nilai berhasil disimpan.")}
    for(const draft of volatile.current.values())merged.set(draft.key,draft);
    return [...merged.values()];
  },[]);
  const refreshDrafts=useCallback(()=>setDrafts(getDrafts()),[getDrafts]);
  useEffect(()=>{
    refreshDrafts();
    const saved=(event:Event)=>{
      const {draft,score,mistakes,updatedAt}=(event as CustomEvent<{draft:ScoreDraft;score:number|null;mistakes:number|null;updatedAt?:string}>).detail;
      setSession(row=>row?.student_id===draft.studentId?{...row,items:row.items.map(item=>item.assessment_id===draft.assessmentId?{...item,score,mistakes,updated_at:updatedAt}:item)}:row);
      refreshDrafts();
    };
    const before=(event:BeforeUnloadEvent)=>{if(volatile.current.size||lock.current){event.preventDefault();event.returnValue=""}};
    const navigate=(event:MouseEvent)=>{
      if(!(event.target instanceof Element)||!event.target.closest("a[href]"))return;
      if(lock.current||(volatile.current.size&&!window.confirm("Draft belum tersimpan di perangkat. Tetap tinggalkan halaman?"))){event.preventDefault();event.stopPropagation()}
    };
    window.addEventListener(DRAFT_EVENT,refreshDrafts);window.addEventListener("storage",refreshDrafts);
    window.addEventListener(SCORE_SAVED_EVENT,saved);window.addEventListener("beforeunload",before);document.addEventListener("click",navigate,true);
    return()=>{window.removeEventListener(DRAFT_EVENT,refreshDrafts);window.removeEventListener("storage",refreshDrafts);window.removeEventListener(SCORE_SAVED_EVENT,saved);window.removeEventListener("beforeunload",before);document.removeEventListener("click",navigate,true)};
  },[refreshDrafts]);

  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError("");
    Promise.all([api<SchoolClass[]>("/api/classes",{signal:controller.signal}),api<Chapter[]>("/api/chapters",{signal:controller.signal})])
      .then(([c,ch])=>{if(!controller.signal.aborted){setClasses(c);setChapters(ch)}})
      .catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[retry]);
  useEffect(()=>{
    const controller=new AbortController();setStudents([]);
    if(classId)void api<Student[]>("/api/students?classId="+classId,{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setStudents(rows)}).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))});
    return()=>controller.abort();
  },[classId,retry]);
  const relevantChapters=useMemo(()=>chapters.filter(x=>!x.academic_year_id||String(x.academic_year_id)===String(classes.find(c=>String(c.id)===classId)?.academic_year_id)),[chapters,classes,classId]);
  useEffect(()=>{
    const controller=new AbortController();setSubs([]);setOptionsLoading(!!chapterId);
    if(chapterId)void api<Subchapter[]>("/api/subchapters?chapterId="+chapterId,{signal:controller.signal}).then(rows=>{if(!controller.signal.aborted)setSubs(rows)}).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setOptionsLoading(false)});
    return()=>controller.abort();
  },[chapterId,retry]);
  useEffect(()=>{
    const controller=new AbortController();setSession(null);setRowsLoading(!!subId&&!!studentId);
    if(subId&&studentId)void (async()=>{
      try{
        const materials=await api<Assessment[]>("/api/assessments?subchapterId="+subId,{signal:controller.signal});
        if(controller.signal.aborted||!materials.length)return;
        const row=await api<IndividualTestSession>("/api/individual-sessions",{...jsonRequest("POST",{studentId:Number(studentId),assessmentIds:materials.map(x=>x.id)}),signal:controller.signal});
        if(!controller.signal.aborted){setSession(row);refreshDrafts()}
      }catch(e){if(!controller.signal.aborted)setError(errorMessage(e))}
      finally{if(!controller.signal.aborted)setRowsLoading(false)}
    })();
    return()=>controller.abort();
  },[subId,studentId,retry,refreshDrafts]);

  function changeContext(change:()=>void){
    if(lock.current)return;
    if(volatile.current.size&&!window.confirm("Draft belum tersimpan di perangkat. Tetap ganti pilihan?"))return;
    setSession(null);setMessage("");setError("");change();
  }
  const currentDrafts=drafts.filter(d=>d.studentId===session?.student_id&&session.items.some(item=>item.assessment_id===d.assessmentId));
  const draftMap=Object.fromEntries(currentDrafts.map(d=>[d.assessmentId,d]));
  const rawFor=(item:IndividualTestSessionItem)=>draftMap[item.assessment_id]?.raw??String(item.mistakes??"");
  const assessed=session?.items.filter(x=>x.score!==null).length??0;
  const percent=session?.items.length?Math.round(assessed/session.items.length*100):0;
  const index=students.findIndex(s=>String(s.id)===studentId),prevStudent=index>0?students[index-1]:null,nextStudent=index>=0?students[index+1]:null;
  const activeStudent=students.find(s=>String(s.id)===studentId);

  function edit(item:IndividualTestSessionItem,raw:string){
    if(!session||lock.current)return;
    const previous=getDrafts().find(d=>d.key===draftKey(session.student_id,item.assessment_id));
    if(previous?.status==="conflict")return;
    const draft:ScoreDraft={key:draftKey(session.student_id,item.assessment_id),studentId:session.student_id,assessmentId:item.assessment_id,raw,id:createDraftId(),deviceId:"browser",baseUpdatedAt:previous?previous.baseUpdatedAt:item.updated_at??null,status:"dirty"};
    volatile.current.set(draft.key,draft);
    try{persistDraft(draft);volatile.current.delete(draft.key);if(!volatile.current.size)setStorageError("")}
    catch{setStorageError("Draft belum tersimpan di perangkat. Jangan tutup halaman; aktifkan penyimpanan browser lalu coba simpan lagi.")}
    refreshDrafts();
  }
  function adjust(item:IndividualTestSessionItem,delta:number){const next=stepMistakes(rawFor(item),delta);if(next!==null)edit(item,next)}
  function fillUnassessed(){
    let count=0;
    for(const item of session?.items??[])if(item.score===null&&!draftMap[item.assessment_id]){edit(item,"0");count++}
    toast(count+" materi belum dinilai diisi 0 kesalahan. Simpan untuk mengirim nilai.");
  }
  async function saveItems(items:IndividualTestSessionItem[],advance=false){
    if(!session||lock.current)return;
    const target=session;lock.current=true;setBusy(true);setMessage("");
    let saved=0;
    const problems:string[]=[];
    try{
      for(const item of items){
        const draft=getDrafts().find(d=>d.key===draftKey(target.student_id,item.assessment_id));
        if(!draft)continue;
        const parsed=parseMistakes(draft.raw);
        if(!parsed.valid||draft.status==="conflict"){problems.push(item.title);continue}
        try{
          const queued={...draft,status:"pending" as const,error:undefined};
          persistDraft(queued);volatile.current.delete(draft.key);refreshDrafts();
          if(await submitScore(queued))saved++;else problems.push(item.title);
        }catch{problems.push(item.title);setStorageError("Sebagian draft belum bisa disimpan atau dikirim. Input tetap dipertahankan; coba lagi.")}
      }
      const row=await api<IndividualTestSession>(`/api/individual-sessions?id=${target.id}&studentId=${target.student_id}`);
      // Server refresh updates saved values only. Drafts remain keyed by student + material.
      if(currentSession.current?.id===target.id)setSession(row);
      refreshDrafts();
      const remaining=getDrafts().filter(d=>d.studentId===target.student_id&&row.items.some(item=>item.assessment_id===d.assessmentId));
      if(!problems.length&&!remaining.length&&row.items.length&&row.items.every(item=>item.score!==null)&&row.status==="ACTIVE"){
        const completed=await api<IndividualTestSession>("/api/individual-sessions",jsonRequest("PATCH",{id:target.id,status:"COMPLETED"}));
        if(currentSession.current?.id===target.id)setSession(completed);
      }
      if(!volatile.current.size)setStorageError("");
      setMessage(`${saved} perubahan tersimpan.`+(problems.length?` Belum tersimpan: ${problems.join(", ")}. Periksa status di tiap materi.`:""));
      if(saved)toast(saved+" nilai materi berhasil disimpan.");
      if(advance&&nextStudent&&!remaining.length&&!problems.length){setStudentId(String(nextStudent.id));setSession(null);setMessage("")}
    }catch(e){setMessage("Input tetap dipertahankan. "+errorMessage(e))}
    finally{lock.current=false;setBusy(false);refreshDrafts()}
  }
  async function discard(){
    if(!discarding||!session||lock.current)return;
    lock.current=true;setBusy(true);
    try{
      const row=await api<IndividualTestSession>(`/api/individual-sessions?id=${session.id}&studentId=${session.student_id}`);
      const key=draftKey(session.student_id,discarding.assessment_id);
      deleteDraft(key);volatile.current.delete(key);setSession(row);refreshDrafts();setDiscarding(null);
    }catch(e){setMessage(errorMessage(e))}finally{lock.current=false;setBusy(false)}
  }

  if(loading)return <main className="app"><LoadingState/></main>;
  return <main className="app individual-page">
    <PageHeader eyebrow="Ruang kerja guru" title="Tes per Individu" description="Pilih siswa dan subbab, isi jumlah kesalahan, lalu simpan nilai.">
      {studentId&&<div className="actions">
        {prevStudent&&<button disabled={busy||rowsLoading} onClick={()=>changeContext(()=>setStudentId(String(prevStudent.id)))}><ArrowLeft size={15}/>Siswa sebelumnya</button>}
        {nextStudent&&<button disabled={busy||rowsLoading} onClick={()=>changeContext(()=>setStudentId(String(nextStudent.id)))}>Siswa berikutnya<ArrowRight size={15}/></button>}
      </div>}
    </PageHeader>
    <section className="card"><div className="form-grid">
      <div className="field"><label htmlFor="individual-class">Kelas</label><select id="individual-class" value={classId} disabled={busy} onChange={e=>changeContext(()=>{setClassId(e.target.value);setStudentId("");setChapterId("");setSubId("")})}><option value="">Pilih kelas</option>{classes.map(c=><option value={c.id} key={c.id}>{c.name} · {c.academic_year_name} / {c.semester}</option>)}</select></div>
      <div className="field"><label htmlFor="individual-student">Siswa</label><select id="individual-student" value={studentId} disabled={!classId||busy} onChange={e=>changeContext(()=>setStudentId(e.target.value))}><option value="">Pilih siswa</option>{students.map(s=><option value={s.id} key={s.id}>{s.name}{s.nis?` · ${s.nis}`:""}</option>)}</select></div>
      <div className="field"><label htmlFor="individual-chapter">Bab</label><select id="individual-chapter" value={chapterId} disabled={!studentId||busy} onChange={e=>changeContext(()=>{setChapterId(e.target.value);setSubId("")})}><option value="">Pilih bab</option>{relevantChapters.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></div>
      <div className="field"><label htmlFor="individual-subchapter">Subbab</label><select id="individual-subchapter" value={subId} disabled={!chapterId||busy||optionsLoading} onChange={e=>changeContext(()=>setSubId(e.target.value))}><option value="">{optionsLoading?"Memuat subbab…":"Pilih subbab"}</option>{subs.map(s=><option value={s.id} key={s.id}>{s.title}</option>)}</select></div>
    </div></section>
    {error&&<ErrorState message={error} onRetry={()=>setRetry(x=>x+1)}/>}
    {storageError&&<Alert type="error">{storageError}</Alert>}
    {message&&<Alert>{message}</Alert>}
    {rowsLoading?<LoadingState label="Memuat materi dan draft siswa"/>:studentId&&subId&&!error&&<section className="card section-gap">
      <div className="section-heading"><div><p className="eyebrow">{activeStudent?.name} {activeStudent?.nis?`(${activeStudent.nis})`:""} · {subs.find(s=>String(s.id)===subId)?.title}</p><h2>Materi yang diuji</h2></div>
        <div className="actions"><button disabled={busy||!session?.items.some(item=>item.score===null&&!draftMap[item.assessment_id])} onClick={fillUnassessed}><Sparkles size={15}/>Isi yang belum dinilai dengan 90</button><button className="primary" disabled={busy||!currentDrafts.length} onClick={()=>void saveItems(session?.items??[])}><Save size={15}/>{busy?"Menyimpan…":"Simpan Semua Nilai"}</button></div>
      </div>
      <div className="section-gap"><p className="hint">{assessed} dari {session?.items.length??0} materi tersimpan · {percent}% · {currentDrafts.length} perubahan belum dikirim</p><ProgressBar value={percent} label="Progres nilai tersimpan"/></div>
      <p className="hint" id="individual-help">Nilai = 90 − jumlah kesalahan. Draft disimpan di perangkat dan dipulihkan saat kembali. Rekap memakai nilai yang sudah dikirim. Input kosong akan mengosongkan nilai saat disimpan.</p>
      {!session?.items.length?<EmptyState title="Belum ada materi pada subbab ini"/>:<div className="individual-progress-list">{session.items.map(item=>{
        const draft=draftMap[item.assessment_id],raw=rawFor(item),parsed=parseMistakes(raw),conflict=draft?.status==="conflict";
        const label=busy&&draft?"Menyimpan…":draft?({dirty:"Draft",pending:"Menunggu sinkronisasi",conflict:"Konflik",failed:"Gagal"} as const)[draft.status]:item.score!==null?"Tersimpan":"Belum dinilai";
        const rowError=!parsed.valid?parsed.error:draft?.error;
        return <article className="card progress-material" key={item.assessment_id} data-dirty={!!draft}>
          <div><h3>{item.title}</h3><p className="hint">{item.score!==null?`Nilai tersimpan: ${item.score}`:"Belum ada nilai tersimpan"}</p></div>
          <StatusBadge tone={conflict||draft?.status==="failed"?"danger":draft?"warning":item.score!==null?"success":"neutral"}>{label}</StatusBadge>
          <div className="individual-editor"><div className="score-editor">
            <button className="ghost icon-button" aria-label={`Set nilai 90 untuk ${item.title}`} disabled={busy||conflict} onClick={()=>edit(item,"0")}>90</button>
            <div className="mistake-stepper"><button disabled={busy||conflict} onClick={()=>adjust(item,-1)} aria-label={`Kurangi kesalahan ${item.title}`}>−</button>
              <input aria-label={`Jumlah kesalahan ${item.title}`} aria-invalid={!parsed.valid} aria-describedby={rowError?`individual-error-${item.assessment_id}`:"individual-help"} disabled={busy||conflict} value={raw} inputMode="numeric" autoComplete="off" onChange={e=>edit(item,e.target.value)} onKeyDown={e=>{if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();adjust(item,e.key==="ArrowUp"?1:-1)}if(e.key==="Enter"){e.preventDefault();void saveItems([item])}}}/>
              <button disabled={busy||conflict} onClick={()=>adjust(item,1)} aria-label={`Tambah kesalahan ${item.title}`}>+</button></div>
            <button className="primary icon-button" aria-label={`Simpan nilai ${item.title}`} disabled={busy||!draft||!parsed.valid||conflict} onClick={()=>void saveItems([item])}><Check size={16}/></button>
            {draft&&<button className="icon-button" aria-label={`Kembalikan nilai ${item.title}`} disabled={busy} onClick={()=>setDiscarding(item)}><RotateCcw size={15}/></button>}
          </div>{rowError&&<p className="row-error" id={`individual-error-${item.assessment_id}`}>{rowError}</p>}{draft&&raw.trim()===""&&<p className="row-error">Nilai akan dikosongkan saat disimpan.</p>}</div>
          <strong className="score-number" aria-label="Pratinjau nilai">{parsed.valid?parsed.score??"—":"—"}</strong>
        </article>;
      })}</div>}
      {nextStudent&&session&&<div className="form-actions"><button className="primary" disabled={busy} onClick={()=>void saveItems(session.items,true)}>Simpan & siswa berikutnya: {nextStudent.name}<ArrowRight size={15}/></button></div>}
    </section>}
    {!studentId||!subId?<EmptyState title="Siap mulai menilai">Pilih kelas, siswa, bab, dan subbab untuk membuka materi penilaian.</EmptyState>:null}
    {discarding&&<ConfirmDialog title="Kembalikan ke nilai server?" onClose={()=>{if(!busy)setDiscarding(null)}} onConfirm={()=>void discard()} confirmLabel="Kembalikan nilai">Draft {discarding.title} akan dibuang setelah nilai terbaru berhasil dimuat. Draft materi lain tetap disimpan.</ConfirmDialog>}
  </main>;
}
