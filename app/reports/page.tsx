"use client";
import Link from "next/link";
import {useCallback,useEffect,useRef,useState} from "react";
import {DatabaseBackup,Download,FileSpreadsheet,FileText,ShieldCheck} from "lucide-react";
import {api,errorMessage,jsonRequest} from "@/lib/client-api";
import {AcademicYear,SchoolClass} from "@/lib/frontend-types";
import {DRAFT_EVENT,readDrafts} from "@/lib/assessment-workspace";
import {Alert,ErrorState,LoadingState,Modal,PageHeader,useToast} from "@/app/ui";
type Backup={app:string;version:number;schemaVersion:number;createdAt:string;data:Record<string,unknown[]>};
export default function Reports(){
  const [years,setYears]=useState<AcademicYear[]>([]),[classes,setClasses]=useState<SchoolClass[]>([]),[year,setYear]=useState(""),[classId,setClassId]=useState("");
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[restoreError,setRestoreError]=useState(""),[busy,setBusy]=useState(false),[backupBusy,setBackupBusy]=useState(false);
  const [backup,setBackup]=useState<Backup|null>(null),[fileName,setFileName]=useState(""),[confirm,setConfirm]=useState(false),[lastBackup,setLastBackup]=useState(""),[draftCount,setDraftCount]=useState(0);
  const fileInput=useRef<HTMLInputElement>(null),toast=useToast();
  const load=useCallback(async()=>{setLoading(true);setError("");try{const [y,c]=await Promise.all([api<AcademicYear[]>("/api/academic-years"),api<SchoolClass[]>("/api/classes")]);setYears(y);setClasses(c)}catch(e){setError(errorMessage(e))}finally{setLoading(false)}},[]);
  useEffect(()=>{void load();const p=new URLSearchParams(window.location.search);setYear(p.get("academicYearId")??"");setClassId(p.get("classId")??"");try{setLastBackup(localStorage.getItem("pib-last-backup")??"")}catch{}
    const update=()=>{try{setDraftCount(readDrafts().length)}catch{}};update();window.addEventListener(DRAFT_EVENT,update);return()=>window.removeEventListener(DRAFT_EVENT,update);
  },[load]);
  const query=new URLSearchParams({...year?{academicYearId:year}:{},...classId?{classId}:{}}).toString();
  const period=years.find(x=>String(x.id)===year),schoolClass=classes.find(x=>String(x.id)===classId);
  async function downloadBackup(){
    setBackupBusy(true);setError("");
    try{const payload=await api<Backup>("/api/backup");const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="backup-pib-"+new Date().toISOString().slice(0,10)+".json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);const time=new Date().toISOString();setLastBackup(time);try{localStorage.setItem("pib-last-backup",time)}catch{}toast("Unduhan backup disiapkan. Simpan file di tempat yang aman.")}catch(e){setError(errorMessage(e))}finally{setBackupBusy(false)}
  }
  async function readBackup(file?:File){
    if(!file)return;setBackup(null);setRestoreError("");setFileName(file.name);
    try{if(file.size>10_000_000)throw Error("Ukuran backup maksimal 10 MB.");const parsed=JSON.parse(await file.text()) as Backup;if(parsed.app!=="pib-penilaian"||parsed.version!==2||!parsed.data||!Array.isArray(parsed.data.students)||!Array.isArray(parsed.data.scores)||!Number.isFinite(Date.parse(parsed.createdAt)))throw Error("File bukan backup PIB yang didukung.");setBackup(parsed)}catch(e){setRestoreError(errorMessage(e))}
  }
  async function restore(){
    if(!backup)return;setBusy(true);setRestoreError("");
    try{if(readDrafts().length)throw Error("Selesaikan atau kembalikan draft penilaian di perangkat sebelum memulihkan backup.");const result=await api<{restored:number}>("/api/restore",jsonRequest("POST",backup));setConfirm(false);setBackup(null);setFileName("");if(fileInput.current)fileInput.current.value="";try{localStorage.removeItem("pib-last-assessment")}catch{}toast(result.restored+" data berhasil dipulihkan.");window.dispatchEvent(new Event("pib-settings-change"));await load()}
    catch(e){setRestoreError(errorMessage(e))}finally{setBusy(false)}
  }
  return <main className="app"><PageHeader eyebrow="Laporan & arsip" title="Laporan dan backup" description="Unduh hasil penilaian, simpan salinan data, dan kelola pemulihan."/>
    {error&&<ErrorState message={error} onRetry={load}/>}
    <div className="section-stack"><section className="card"><div className="section-heading"><h2>Cakupan laporan</h2><Link className="button ghost" href={"/recap?"+query}>Tinjau rekap</Link></div>{loading?<LoadingState/>:<div className="form-grid section-gap"><div className="field"><label htmlFor="report-year">Tahun ajaran</label><select id="report-year" value={year} onChange={e=>{setYear(e.target.value);setClassId("")}}><option value="">Semua periode</option>{years.map(y=><option value={y.id} key={y.id}>{y.name} · {y.semester}</option>)}</select></div><div className="field"><label htmlFor="report-class">Kelas</label><select id="report-class" value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Semua kelas</option>{classes.filter(c=>!year||String(c.academic_year_id)===year).map(c=><option key={c.id} value={c.id}>{c.name} · {c.academic_year_name} / {c.semester}</option>)}</select></div></div>}<div className="filter-chips"><span className="filter-chip">{period?period.name+" · "+period.semester:"Semua periode"}</span><span className="filter-chip">{schoolClass?.name??"Semua kelas"}</span></div></section>
      <section className="grid"><article className="card report-card"><span className="report-icon"><FileText size={24}/></span><h2>Laporan PDF</h2><p className="notice">Rekap siap cetak untuk dibagikan atau diarsipkan sesuai cakupan di atas.</p><a className="button primary" aria-disabled={loading} href={!loading?"/api/pdf?"+query:undefined}><Download size={15}/>Unduh PDF</a></article><article className="card report-card"><span className="report-icon"><FileSpreadsheet size={24}/></span><h2>Laporan Excel</h2><p className="notice">Detail dan ringkasan nilai untuk pengolahan lanjutan sesuai cakupan di atas.</p><a className="button" aria-disabled={loading} href={!loading?"/api/export?"+query:undefined}><Download size={15}/>Unduh Excel</a></article></section>
      <section className="card"><div className="section-heading"><div><p className="eyebrow"><ShieldCheck size={14}/> Cadangan data</p><h2>Simpan salinan seluruh data</h2><p className="subtitle">Backup mencakup seluruh periode, kelas, siswa, materi, dan nilai. Filter laporan tidak membatasi backup.</p></div><button disabled={backupBusy} onClick={()=>void downloadBackup()}><DatabaseBackup size={17}/>{backupBusy?"Menyiapkan…":"Unduh backup"}</button></div><p className="hint section-gap">{lastBackup?"Unduhan terakhir disiapkan di perangkat ini: "+new Date(lastBackup).toLocaleString("id-ID"):"Belum ada catatan unduhan backup pada perangkat ini."}</p></section>
      <details className="card detail-panel danger-zone"><summary>Pulihkan data dari backup</summary><p className="subtitle">Pemulihan mengganti data aplikasi dengan isi backup. Akun login tetap dipertahankan, dan server membuat snapshot sebelum pemulihan.</p><div className="field section-gap"><label htmlFor="backup-file">File backup JSON</label><input ref={fileInput} id="backup-file" type="file" accept=".json,application/json" disabled={busy} onChange={e=>void readBackup(e.target.files?.[0])}/></div>{restoreError&&!confirm&&<Alert type="error">{restoreError}</Alert>}{draftCount>0&&<Alert>Selesaikan atau kembalikan {draftCount} draft penilaian pada perangkat ini sebelum memulihkan backup.</Alert>}{backup&&<div className="section-gap"><p className="notice">{fileName} · dibuat {new Date(backup.createdAt).toLocaleString("id-ID")}</p><p className="notice">{backup.data.students.length} siswa · {backup.data.scores.length} catatan nilai</p><button className="danger section-gap" disabled={draftCount>0} onClick={()=>{setRestoreError("");setConfirm(true)}}>Tinjau & pulihkan</button></div>}</details>
    </div>
    {confirm&&backup&&<Modal title="Pulihkan backup ini?" busy={busy} onClose={()=>setConfirm(false)}><p><strong>{fileName}</strong></p><p>{backup.data.students.length} siswa dan {backup.data.scores.length} catatan nilai dari {new Date(backup.createdAt).toLocaleString("id-ID")} akan menggantikan data aplikasi saat ini.</p>{restoreError&&<Alert type="error">{restoreError}</Alert>}<div className="modal-footer"><button disabled={busy} onClick={()=>setConfirm(false)}>Batal</button><button className="danger" disabled={busy||draftCount>0} onClick={()=>void restore()}>{busy?"Memulihkan…":"Ya, pulihkan data"}</button></div></Modal>}
  </main>;
}
