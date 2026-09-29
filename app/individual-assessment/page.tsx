"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {ArrowRight,ChevronDown,Minus,Plus,RotateCcw} from "lucide-react";
import {api,errorMessage} from "@/lib/client-api";
import {SchoolClass} from "@/lib/frontend-types";
import {Alert,EmptyState,ErrorState,LoadingState,PageHeader,ProgressBar,SearchField,StatusBadge} from "@/app/ui";
import {DRAFT_EVENT,ScoreDraft,createDraftId,deleteDraft,draftKey,parseMistakes,persistDraft,readDrafts,stepMistakes} from "@/lib/assessment-workspace";
import {SCORE_SAVED_EVENT,submitScore} from "@/lib/score-client";
import {ClassProgress,ProgressMaterial,ProgressScore,StudentPosition,isSameLocalDay,studentPosition} from "@/lib/class-progress";

const LAST_SETORAN="pib-last-setoran";
type Group={key:string;chapter:string;subchapter:string;items:{material:ProgressMaterial;index:number}[]};
const draftLabels={dirty:"Belum terkirim",pending:"Menunggu koneksi",conflict:"Konflik",failed:"Gagal"} as const;

export default function Setoran(){
  const [classes,setClasses]=useState<SchoolClass[]>([]),[classId,setClassId]=useState("");
  const [data,setData]=useState<ClassProgress|null>(null),[scores,setScores]=useState<Record<string,ProgressScore>>({});
  const [studentId,setStudentId]=useState<number|null>(null),[query,setQuery]=useState("");
  const [drafts,setDrafts]=useState<ScoreDraft[]>([]),[saving,setSaving]=useState<string[]>([]);
  const [open,setOpen]=useState<Set<string>>(new Set()),[focusRequest,setFocusRequest]=useState<number|null>(null);
  const [loading,setLoading]=useState(true),[dataLoading,setDataLoading]=useState(false);
  const [error,setError]=useState(""),[message,setMessage]=useState(""),[storageError,setStorageError]=useState("");
  const [retry,setRetry]=useState(0),[reload,setReload]=useState(0);
  const volatile=useRef(new Map<string,ScoreDraft>()),locks=useRef(new Set<string>()),restoreStudent=useRef<number|null>(null),pendingOpen=useRef(false);
  const rosterRef=useRef<HTMLDivElement>(null),editorRef=useRef<HTMLElement>(null);

  const refreshDrafts=useCallback(()=>{
    try{const stored=readDrafts();setDrafts([...stored.filter(x=>!volatile.current.has(x.key)),...volatile.current.values()])}
    catch{setDrafts([...volatile.current.values()]);setStorageError("Penyimpanan perangkat tidak tersedia. Jangan tutup halaman sebelum nilai terkirim.")}
  },[]);
  const readDraft=(key:string)=>{
    const memory=volatile.current.get(key);if(memory)return memory;
    try{return readDrafts().find(x=>x.key===key)}catch{return undefined}
  };

  useEffect(()=>{
    refreshDrafts();
    const saved=(event:Event)=>{
      const {draft,score,mistakes,updatedAt}=(event as CustomEvent<{draft:ScoreDraft;score:number|null;mistakes:number|null;updatedAt?:string}>).detail;
      setScores(current=>({...current,[draft.key]:{student_id:draft.studentId,assessment_id:draft.assessmentId,score,mistakes,updated_at:updatedAt??current[draft.key]?.updated_at??"",assessed_at:score===null?null:new Date().toISOString()}}));
    };
    const before=(event:BeforeUnloadEvent)=>{if(volatile.current.size||locks.current.size){event.preventDefault();event.returnValue=""}};
    const slash=(event:KeyboardEvent)=>{
      if(event.key!=="/"||event.ctrlKey||event.metaKey||event.altKey)return;
      const target=event.target as HTMLElement|null;
      if(target?.closest("input,textarea,select,[contenteditable=true]"))return;
      const search=rosterRef.current?.querySelector<HTMLInputElement>("input[type=search]");
      if(search){event.preventDefault();search.focus();search.select()}
    };
    window.addEventListener(DRAFT_EVENT,refreshDrafts);window.addEventListener("storage",refreshDrafts);window.addEventListener(SCORE_SAVED_EVENT,saved);
    window.addEventListener("beforeunload",before);document.addEventListener("keydown",slash);
    return()=>{window.removeEventListener(DRAFT_EVENT,refreshDrafts);window.removeEventListener("storage",refreshDrafts);window.removeEventListener(SCORE_SAVED_EVENT,saved);window.removeEventListener("beforeunload",before);document.removeEventListener("keydown",slash)};
  },[refreshDrafts]);

  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError("");
    api<SchoolClass[]>("/api/classes",{signal:controller.signal}).then(rows=>{
      if(controller.signal.aborted)return;
      setClasses(rows);
      let last:{classId?:string;studentId?:number}={};
      try{last=JSON.parse(localStorage.getItem(LAST_SETORAN)??"{}")}catch{}
      const params=new URLSearchParams(window.location.search);
      const wanted=params.get("classId")??last.classId??"";
      const selected=rows.find(x=>String(x.id)===wanted)??(rows.length===1?rows[0]:undefined);
      if(selected){
        restoreStudent.current=Number(params.get("studentId"))||(String(selected.id)===last.classId?last.studentId??null:null);
        setClassId(current=>current||String(selected.id));
      }
    }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[retry]);

  useEffect(()=>{
    const controller=new AbortController();setData(null);setScores({});
    if(!classId){setDataLoading(false);return}
    setDataLoading(true);setError("");
    api<ClassProgress>("/api/class-progress?classId="+classId,{signal:controller.signal}).then(result=>{
      if(controller.signal.aborted)return;
      pendingOpen.current=true;setData(result);setScores(Object.fromEntries(result.scores.map(x=>[draftKey(x.student_id,x.assessment_id),x])));
      setStudentId(current=>{
        const wanted=current??restoreStudent.current;restoreStudent.current=null;
        return result.students.some(s=>s.id===wanted)?wanted:null;
      });
    }).catch(e=>{if(!controller.signal.aborted)setError(errorMessage(e))}).finally(()=>{if(!controller.signal.aborted)setDataLoading(false)});
    return()=>controller.abort();
  },[classId,reload]);

  useEffect(()=>{if(classId)try{localStorage.setItem(LAST_SETORAN,JSON.stringify({classId,studentId}))}catch{}},[classId,studentId]);

  const materialIds=useMemo(()=>data?.materials.map(m=>m.id)??[],[data]);
  const groups=useMemo(()=>{
    const rows:Group[]=[];
    data?.materials.forEach((material,index)=>{
      const last=rows[rows.length-1];
      if(last?.key===String(material.subchapter_id))last.items.push({material,index});
      else rows.push({key:String(material.subchapter_id),chapter:material.chapter,subchapter:material.subchapter,items:[{material,index}]});
    });
    return rows;
  },[data]);
  const positions=useMemo(()=>new Map<number,StudentPosition>((data?.students??[]).map(s=>[s.id,studentPosition(materialIds,id=>scores[draftKey(s.id,id)]?.score!=null)])),[data,materialIds,scores]);
  const classDrafts=useMemo(()=>{
    const ids=new Set(data?.students.map(s=>s.id)),materials=new Set(materialIds);
    return drafts.filter(d=>ids.has(d.studentId)&&materials.has(d.assessmentId));
  },[drafts,data,materialIds]);
  const draftMap=useMemo(()=>Object.fromEntries(classDrafts.map(d=>[d.key,d])),[classDrafts]);
  const roster=useMemo(()=>{
    const latest=new Map<number,string>();
    for(const row of Object.values(scores))if(row.score!=null&&isSameLocalDay(row.assessed_at)&&(latest.get(row.student_id)??"")<(row.assessed_at??""))latest.set(row.student_id,row.assessed_at??"");
    const needle=query.trim().toLocaleLowerCase("id");
    const visible=(data?.students??[]).filter(s=>(s.name+" "+(s.nis??"")).toLocaleLowerCase("id").includes(needle));
    const today=visible.filter(s=>latest.has(s.id)).sort((a,b)=>(latest.get(b.id)??"").localeCompare(latest.get(a.id)??""));
    return {today,others:visible.filter(s=>!latest.has(s.id))};
  },[data,scores,query]);

  const student=data?.students.find(s=>s.id===studentId)??null;
  const position=student?positions.get(student.id):undefined;

  useEffect(()=>{
    if(focusRequest===null)return;
    const input=editorRef.current?.querySelector<HTMLInputElement>(`input[data-material="${focusRequest}"]`);
    if(input){input.focus();input.select();input.scrollIntoView({block:"nearest"})}
    setFocusRequest(null);
  },[focusRequest,open]);

  // After a (re)load, expand the selected student's working area once positions are known.
  useEffect(()=>{
    if(!pendingOpen.current||!data)return;
    pendingOpen.current=false;
    if(studentId!==null)setOpen(openFor(studentId));
  },[positions]);

  function openFor(id:number){
    const pos=positions.get(id),keys=new Set<string>();
    const add=(index:number)=>{const m=data?.materials[index];if(m)keys.add(String(m.subchapter_id))};
    if(pos){add(pos.nextIndex<0?0:pos.nextIndex);pos.gaps.forEach(add)}
    for(const d of classDrafts)if(d.studentId===id){const m=data?.materials.find(x=>x.id===d.assessmentId);if(m)keys.add(String(m.subchapter_id))}
    return keys;
  }
  function focusMaterial(index:number){
    const m=data?.materials[index];
    if(!m){const search=rosterRef.current?.querySelector<HTMLInputElement>("input[type=search]");search?.focus();return}
    setOpen(current=>current.has(String(m.subchapter_id))?current:new Set(current).add(String(m.subchapter_id)));
    setFocusRequest(m.id);
  }
  function selectStudent(id:number){
    setStudentId(id);setQuery("");setMessage("");setOpen(openFor(id));
    const pos=positions.get(id),m=data?.materials[pos&&pos.nextIndex>=0?pos.nextIndex:0];
    if(m)setFocusRequest(m.id);
  }
  function changeClass(value:string){
    if(volatile.current.size&&!window.confirm("Sebagian perubahan belum tersimpan di perangkat. Tetap ganti kelas?"))return;
    setClassId(value);setStudentId(null);setQuery("");setMessage("");
  }

  function edit(material:ProgressMaterial,raw:string){
    if(!student)return;
    const key=draftKey(student.id,material.id);
    if(locks.current.has(key))return;
    const previous=readDraft(key);
    if(previous?.status==="conflict")return previous;
    const draft:ScoreDraft={key,studentId:student.id,assessmentId:material.id,raw,id:createDraftId(),deviceId:"browser",baseUpdatedAt:previous?previous.baseUpdatedAt:scores[key]?.updated_at??null,status:"dirty"};
    volatile.current.set(key,draft);
    try{persistDraft(draft);volatile.current.delete(key);if(!volatile.current.size)setStorageError("")}
    catch{setStorageError("Perubahan belum tersimpan di perangkat. Jangan tutup halaman; aktifkan penyimpanan browser.")}
    refreshDrafts();
    return draft;
  }
  async function commit(material:ProgressMaterial,index:number,given?:ScoreDraft){
    if(!student)return;
    const key=draftKey(student.id,material.id),draft=given??readDraft(key);
    if(!draft){focusMaterial(index+1);return}
    const parsed=parseMistakes(draft.raw);
    if(!parsed.valid){setMessage(`${material.title}: ${parsed.error}`);return}
    if(draft.status==="conflict"){setMessage(`${material.title}: nilai di server sudah berubah. Klik tombol kembalikan untuk memuat nilai terbaru.`);return}
    if(locks.current.has(key))return;
    locks.current.add(key);setSaving([...locks.current]);setMessage("");
    focusMaterial(index+1);
    try{
      const queued={...draft,status:"pending" as const,error:undefined};
      persistDraft(queued);volatile.current.delete(key);refreshDrafts();
      await submitScore(queued);
    }catch{setStorageError("Nilai belum bisa disimpan di perangkat atau dikirim. Input tetap dipertahankan; coba lagi.")}
    finally{locks.current.delete(key);setSaving([...locks.current]);refreshDrafts()}
  }
  function discard(material:ProgressMaterial){
    if(!student)return;
    const key=draftKey(student.id,material.id),conflict=draftMap[key]?.status==="conflict";
    try{deleteDraft(key)}catch{}
    volatile.current.delete(key);refreshDrafts();
    if(conflict)setReload(x=>x+1);
    setFocusRequest(material.id);
  }

  function row(material:ProgressMaterial,index:number){
    if(!student||!position)return null;
    const key=draftKey(student.id,material.id),draft=draftMap[key],server=scores[key];
    const raw=draft?.raw??(server?.mistakes==null?"":String(server.mistakes));
    const parsed=parseMistakes(raw),busy=saving.includes(key),conflict=draft?.status==="conflict";
    const isNext=index===position.nextIndex,isGap=position.gaps.includes(index);
    const status=busy?<StatusBadge>Menyimpan…</StatusBadge>
      :draft?<StatusBadge tone={draft.status==="dirty"||draft.status==="pending"?"warning":"danger"}>{draftLabels[draft.status]}</StatusBadge>
      :server?.score!=null?<StatusBadge tone="success">{isSameLocalDay(server.assessed_at)?"Tersimpan hari ini":"Tersimpan"}</StatusBadge>
      :isNext?<StatusBadge tone="warning">Berikutnya</StatusBadge>
      :isGap?<StatusBadge tone="danger">Terlewat</StatusBadge>:null;
    const errorText=!parsed.valid?parsed.error:draft?.error;
    return <div className="setoran-row" key={material.id} data-next={isNext} data-dirty={!!draft}>
      <span className="setoran-no">{index+1}</span>
      <div className="setoran-title"><strong>{material.title}</strong><div className="setoran-status">{status}{draft&&raw.trim()===""&&<span className="row-error">Nilai akan dikosongkan.</span>}{errorText&&<span className="row-error" id={`setoran-error-${material.id}`}>{errorText}</span>}</div></div>
      <div className="score-editor">
        <button type="button" className="ghost icon-button setoran-perfect" title="Lancar: 0 kesalahan (nilai 90), langsung simpan" aria-label={`Nilai 90 untuk ${material.title}`} disabled={busy||conflict} onClick={()=>{const d=edit(material,"0");if(d)void commit(material,index,d)}}>90</button>
        <div className="mistake-stepper">
          <button type="button" className="icon-button" aria-label={`Kurangi kesalahan ${material.title}`} disabled={busy||conflict} onClick={()=>{const next=stepMistakes(raw,-1);if(next!==null)edit(material,next)}}><Minus size={14}/></button>
          <input data-material={material.id} aria-label={`Jumlah kesalahan ${material.title}`} aria-invalid={!parsed.valid} aria-describedby={errorText?`setoran-error-${material.id}`:"setoran-help"} value={raw} type="text" inputMode="numeric" enterKeyHint="next" autoComplete="off" disabled={busy||conflict}
            onFocus={e=>e.currentTarget.select()} onChange={e=>edit(material,e.target.value)}
            onKeyDown={e=>{
              if(e.key==="ArrowUp"||e.key==="ArrowDown"){e.preventDefault();const next=stepMistakes(raw,e.key==="ArrowUp"?1:-1);if(next!==null)edit(material,next)}
              else if(e.key==="Enter"){e.preventDefault();void commit(material,index)}
            }}/>
          <button type="button" className="icon-button" aria-label={`Tambah kesalahan ${material.title}`} disabled={busy||conflict} onClick={()=>{const next=stepMistakes(raw,1);if(next!==null)edit(material,next)}}><Plus size={14}/></button>
        </div>
        {draft&&<button type="button" className="icon-button" title={conflict?"Muat nilai terbaru dari server":"Batalkan perubahan"} aria-label={`Kembalikan nilai ${material.title}`} disabled={busy} onClick={()=>discard(material)}><RotateCcw size={15}/></button>}
      </div>
      <strong className="score-number" aria-label={`Nilai ${material.title}`}>{parsed.valid?parsed.score??"—":"—"}</strong>
    </div>;
  }

  function rosterButton(id:number,name:string,nis:string|null){
    const pos=positions.get(id),pending=classDrafts.some(d=>d.studentId===id);
    const label=!pos?.total?"—":pos.nextIndex<0?"Selesai":`${pos.nextIndex+1}/${pos.total}`;
    return <li key={id}><button type="button" className="roster-item" aria-pressed={id===studentId} onClick={()=>selectStudent(id)}>
      <span className="roster-name"><strong>{name}</strong>{nis&&<small>{nis}</small>}</span>
      <span className="roster-meta">{pending&&<span className="roster-dot" title="Ada nilai belum terkirim" aria-label="Ada nilai belum terkirim"/>}<span className="roster-position" title="Posisi materi berikutnya">{label}</span></span>
    </button></li>;
  }

  if(loading)return <main className="app"><LoadingState/></main>;
  const firstMatch=roster.today[0]??roster.others[0];
  return <main className="app setoran-page">
    <PageHeader eyebrow="Ruang kerja guru" title="Setoran" description="Pilih siswa yang maju, ketik jumlah kesalahan, lalu tekan Enter. Nilai langsung tersimpan dan kursor pindah ke materi berikutnya."/>
    {error&&<ErrorState message={error} onRetry={()=>{setError("");setRetry(x=>x+1);setReload(x=>x+1)}}/>}
    {storageError&&<Alert type="error">{storageError}</Alert>}
    {message&&<Alert>{message}</Alert>}
    <div className="setoran-layout">
      <aside className="card setoran-roster" ref={rosterRef} aria-label="Daftar siswa">
        <div className="field"><label htmlFor="setoran-class">Kelas</label><select id="setoran-class" value={classId} onChange={e=>changeClass(e.target.value)}><option value="">Pilih kelas</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} · {c.academic_year_name} / {c.semester}</option>)}</select></div>
        {data&&<>
          <div onKeyDown={e=>{if(e.key==="Enter"&&(e.target as HTMLElement).matches("input")&&firstMatch){e.preventDefault();selectStudent(firstMatch.id)}}}>
            <SearchField label="Cari siswa" value={query} onChange={setQuery} placeholder="Cari siswa… (tekan /)"/>
          </div>
          <div className="setoran-roster-list">
            {roster.today.length>0&&<><p className="roster-heading">Dinilai hari ini</p><ul>{roster.today.map(s=>rosterButton(s.id,s.name,s.nis))}</ul></>}
            {roster.others.length>0&&<><p className="roster-heading">{roster.today.length?"Siswa lain":"Semua siswa"}</p><ul>{roster.others.map(s=>rosterButton(s.id,s.name,s.nis))}</ul></>}
            {!roster.today.length&&!roster.others.length&&<p className="hint">{data.students.length?"Tidak ada siswa yang cocok.":"Belum ada siswa aktif di kelas ini."}</p>}
          </div>
        </>}
      </aside>

      <section className="setoran-editor" ref={editorRef}>
        {!classId?<EmptyState title="Pilih kelas">Pilih kelas di panel kiri. Pilihan terakhir akan diingat.</EmptyState>
        :dataLoading||!data?<LoadingState label="Memuat siswa dan nilai kelas"/>
        :!data.materials.length?<EmptyState title="Materi periode ini belum tersedia" action={<Link className="button" href="/master-data/curriculum">Susun materi <ArrowRight size={15}/></Link>}>Tambahkan bab dan materi untuk tahun ajaran kelas ini.</EmptyState>
        :!data.students.length?<EmptyState title="Belum ada siswa di kelas ini" action={<Link className="button primary" href={"/students?classId="+classId}>Tambah siswa</Link>}/>
        :!student||!position?<EmptyState title="Pilih siswa yang maju">Klik nama di daftar, atau tekan <kbd>/</kbd>, ketik beberapa huruf nama, lalu Enter.</EmptyState>
        :<div className="card">
          <div className="setoran-head">
            <div><p className="eyebrow">{data.className}{student.nis?` · ${student.nis}`:""}</p><h2>{student.name}</h2>
              <p className="hint">{position.nextIndex<0?"Semua materi sudah dinilai.":`Materi berikutnya: ${position.nextIndex+1}. ${data.materials[position.nextIndex].title}`} · {position.assessed} dari {position.total} materi dinilai</p></div>
            {position.nextIndex>=0&&<button type="button" onClick={()=>focusMaterial(position.nextIndex)}>Ke materi berikutnya<ArrowRight size={15}/></button>}
          </div>
          <ProgressBar value={position.total?Math.round(position.assessed/position.total*100):0} label={`Progres ${student.name}`}/>
          {position.gaps.length>0&&<p className="setoran-gaps">Terlewat: {position.gaps.map((i,n)=><span key={i}>{n>0&&", "}<button type="button" className="link-button" onClick={()=>focusMaterial(i)}>{i+1}. {data.materials[i].title}</button></span>)}</p>}
          <p className="hint" id="setoran-help"><kbd>Enter</kbd> simpan & lanjut · <kbd>↑</kbd>/<kbd>↓</kbd> ubah kesalahan · tombol <strong>90</strong> = lancar, langsung simpan · <kbd>/</kbd> cari siswa lain. Kosongkan lalu Enter untuk menghapus nilai.</p>
          <div className="setoran-groups">{groups.map((group,gi)=>{
            const done=group.items.filter(({material})=>scores[draftKey(student.id,material.id)]?.score!=null).length;
            const hasNext=group.items.some(({index})=>index===position.nextIndex),expanded=open.has(group.key);
            return <div className="setoran-group" key={group.key} data-open={expanded}>
              {(gi===0||groups[gi-1].chapter!==group.chapter)&&<p className="setoran-chapter">{group.chapter}</p>}
              <button type="button" className="setoran-group-toggle" aria-expanded={expanded} onClick={()=>setOpen(current=>{const next=new Set(current);if(next.has(group.key))next.delete(group.key);else next.add(group.key);return next})}>
                <ChevronDown size={16} aria-hidden="true"/><span>{group.subchapter}</span>
                {hasNext&&<StatusBadge tone="warning">Berikutnya</StatusBadge>}
                <span className={"setoran-count"+(done===group.items.length?" complete":"")}>{done}/{group.items.length}</span>
              </button>
              {expanded&&<div className="setoran-rows">{group.items.map(({material,index})=>row(material,index))}</div>}
            </div>;
          })}</div>
        </div>}
      </section>
    </div>
  </main>;
}
