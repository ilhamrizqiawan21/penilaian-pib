"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {ColumnDef} from "@tanstack/react-table";
import {Download,Plus,Upload,Users} from "lucide-react";
import {api,errorMessage,jsonRequest} from "@/lib/client-api";
import {SchoolClass,Student} from "@/lib/frontend-types";
import {ImportRow,importRowError,parseStudentCsv} from "@/lib/student-import";
import {Alert,ConfirmDialog,EmptyState,ErrorState,LoadingState,Modal,PageHeader,SearchField,StatusBadge,useToast} from "@/app/ui";
import {DataTable} from "@/app/data-table";

export default function Students(){
  const [students,setStudents]=useState<Student[]>([]),[classes,setClasses]=useState<SchoolClass[]>([]);
  const [query,setQuery]=useState(""),[classId,setClassId]=useState("");
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[formError,setFormError]=useState("");
  const [editor,setEditor]=useState<Student|"new"|null>(null),[removing,setRemoving]=useState<Student|null>(null),[importing,setImporting]=useState(false);
  const [preview,setPreview]=useState<ImportRow[]>([]),[importMessage,setImportMessage]=useState(""),[fileName,setFileName]=useState("");
  const fileInput=useRef<HTMLInputElement>(null),toast=useToast();
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{const [s,c]=await Promise.all([api<Student[]>("/api/students"),api<SchoolClass[]>("/api/classes")]);setStudents(s);setClasses(c)}
    catch(e){setError(errorMessage(e))}finally{setLoading(false)}
  },[]);
  useEffect(()=>{void load();const p=new URLSearchParams(window.location.search);setClassId(p.get("classId")??"");if(p.get("add")==="1")setEditor("new")},[load]);
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();if(!editor)return;
    const f=new FormData(e.currentTarget),existing=editor==="new"?null:editor;
    setBusy(true);setFormError("");
    try{await api(existing?"/api/students?id="+existing.id:"/api/students",jsonRequest(existing?"PATCH":"POST",{classId:Number(f.get("classId")),name:f.get("name"),nis:f.get("nis"),nisn:existing?.nisn??"",gender:f.get("gender")}));setEditor(null);toast(existing?"Data siswa diperbarui.":"Siswa berhasil ditambahkan.");await load()}
    catch(e){setFormError(errorMessage(e))}finally{setBusy(false)}
  }
  async function remove(){
    if(!removing)return;setBusy(true);setFormError("");
    try{await api("/api/students?id="+removing.id,{method:"DELETE"});setRemoving(null);toast("Siswa dinonaktifkan. Riwayat nilai tetap tersimpan.");await load()}catch(e){setError(errorMessage(e));setRemoving(null)}finally{setBusy(false)}
  }
  async function readFile(file?:File){
    if(!file)return;setBusy(true);setFormError("");setPreview([]);setImportMessage("");setFileName(file.name);
    try{
      if(file.size>5_000_000)throw Error("Ukuran file maksimal 5 MB.");
      let rows:ImportRow[];
      if(file.name.toLowerCase().endsWith(".xlsx")){
        const ExcelJS=await import("exceljs");const book=new ExcelJS.Workbook();await book.xlsx.load(await file.arrayBuffer());rows=[];
        const sheet=book.worksheets[0];if(!sheet)throw Error("Lembar kerja tidak ditemukan.");
        if(sheet.getRow(1).getCell(1).text.trim().toLowerCase()!=="classid")throw Error("Gunakan template PIB dengan kolom pertama classId.");
        sheet.eachRow((row,n)=>{if(n>1)rows.push({classId:Number(row.getCell(1).text),nis:row.getCell(2).text.trim(),name:row.getCell(3).text.trim(),gender:row.getCell(4).text.trim()})});
      }else rows=parseStudentCsv(await file.text());
      if(!rows.length)throw Error("File belum berisi siswa.");
      if(rows.length>1000)throw Error("Impor maksimal 1.000 siswa per file.");
      setPreview(rows);
    }catch(e){setFormError(errorMessage(e))}finally{setBusy(false);if(fileInput.current)fileInput.current.value=""}
  }
  async function commitImport(){
    setBusy(true);setFormError("");
    try{
      const result=await api<{imported:number;failed:{row:number;error:string}[]}>("/api/students/import",jsonRequest("POST",preview));
      setImportMessage(result.imported+" siswa berhasil diimpor."+ (result.failed.length?" "+result.failed.length+" baris belum berhasil; hanya baris tersebut yang ditampilkan untuk diperbaiki.":""));
      if(result.failed.length){setPreview(preview.filter((_,i)=>result.failed.some(f=>f.row===i+1)));setFormError(result.failed.map(f=>"Baris "+f.row+": "+f.error).slice(0,5).join(" · "))}
      else{setPreview([]);toast(result.imported+" siswa berhasil diimpor.")}
      await load();
    }catch(e){setFormError(errorMessage(e))}finally{setBusy(false)}
  }
  const rows=useMemo(()=>students.filter(s=>(!classId||String(s.class_id)===classId)&&(s.name+" "+(s.nis??"")+" "+s.class_name).toLowerCase().includes(query.trim().toLowerCase())),[students,classId,query]);
  const startEdit=(s:Student|"new")=>{setFormError("");setEditor(s)};
  const rowActions=(s:Student)=><div className="table-actions"><button type="button" onClick={()=>startEdit(s)} aria-label={"Edit "+s.name}>Edit</button><button type="button" className="ghost" onClick={()=>setRemoving(s)} aria-label={"Nonaktifkan "+s.name}>Nonaktifkan</button></div>;
  const columns:ColumnDef<Student>[]=[
    {accessorKey:"name",header:"Nama siswa",cell:({row})=><strong>{row.original.name}</strong>},
    {accessorKey:"nis",header:"NIS",cell:({row})=>row.original.nis||"—"},
    {accessorKey:"class_name",header:"Kelas",cell:({row})=><StatusBadge>{row.original.class_name}</StatusBadge>},
    {accessorKey:"gender",header:"Gender",cell:({row})=>row.original.gender==="L"?"Laki-laki":row.original.gender==="P"?"Perempuan":"—"},
    {id:"actions",header:"",enableSorting:false,cell:({row})=>rowActions(row.original)}
  ];
  const previewRows=useMemo(()=>preview.map((x,id)=>({...x,id,error:importRowError(x,classes.map(c=>c.id))})),[preview,classes]);
  const invalid=previewRows.filter(x=>x.error).length;
  const previewColumns:ColumnDef<typeof previewRows[number]>[]=[{accessorKey:"name",header:"Nama"},{accessorKey:"nis",header:"NIS"},{accessorKey:"classId",header:"ID kelas"},{accessorKey:"error",header:"Validasi",cell:({row})=><StatusBadge tone={row.original.error?"danger":"success"}>{row.original.error||"Siap diimpor"}</StatusBadge>}];
  const existing=editor&&editor!=="new"?editor:null;
  return <main className="app"><PageHeader eyebrow="Kelola data" title="Siswa" description="Daftar siswa aktif, tersusun untuk setiap kelas dan periode."><button onClick={()=>{setFormError("");setImporting(true)}} disabled={!classes.length}><Upload size={15}/>Impor siswa</button><button className="primary" onClick={()=>startEdit("new")} disabled={!classes.length}><Plus size={16}/>Tambah siswa</button></PageHeader>
    <section className="card"><div className="toolbar"><SearchField label="Cari siswa" value={query} onChange={setQuery} placeholder="Cari nama, NIS, atau kelas…"/><div className="field"><label htmlFor="student-filter-class">Kelas</label><select id="student-filter-class" value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Semua kelas</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} · {c.academic_year_name} / {c.semester}</option>)}</select></div>{(query||classId)&&<button className="ghost" onClick={()=>{setQuery("");setClassId("")}}>Reset filter</button>}</div>
      {loading?<LoadingState/>:error?<ErrorState message={error} onRetry={load}/>:!classes.length?<EmptyState title="Mulai dengan membuat kelas" action={<Link className="button primary" href="/classes">Buat kelas</Link>}>Siswa akan dikelompokkan berdasarkan kelas dan tahun ajaran.</EmptyState>:!students.length?<EmptyState title="Kelas siap menerima siswa" action={<button className="primary" onClick={()=>startEdit("new")}><Users size={16}/>Tambah siswa pertama</button>}>Tambahkan satu per satu atau impor daftar menggunakan template.</EmptyState>:<DataTable data={rows} columns={columns} label="Siswa" emptyAction={<button onClick={()=>{setQuery("");setClassId("")}}>Reset filter</button>} mobileRow={s=><><h3>{s.name}</h3><p>{s.class_name} · NIS {s.nis||"—"}</p><details><summary className="hint">Detail siswa</summary><p>Gender: {s.gender==="L"?"Laki-laki":s.gender==="P"?"Perempuan":"Belum diisi"}</p></details><div className="section-gap">{rowActions(s)}</div></>}/>}
    </section>
    {editor&&<Modal title={existing?"Edit siswa":"Tambah siswa"} busy={busy} onClose={()=>setEditor(null)}><form className="section-stack" aria-busy={busy} onSubmit={submit}><div className="field"><label htmlFor="student-name">Nama lengkap</label><input id="student-name" name="name" defaultValue={existing?.name??""} required minLength={2} maxLength={120} autoComplete="off"/></div><div className="field"><label htmlFor="student-class">Kelas</label><select id="student-class" name="classId" defaultValue={existing?.class_id??classId} required><option value="">Pilih kelas</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} · {c.academic_year_name} / {c.semester}</option>)}</select></div><div className="field"><label htmlFor="student-nis">NIS <span className="hint">(opsional)</span></label><input id="student-nis" name="nis" defaultValue={existing?.nis??""} maxLength={30}/></div><div className="field"><label htmlFor="student-gender">Gender</label><select id="student-gender" name="gender" defaultValue={existing?.gender??""}><option value="">Belum diisi</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>{formError&&<Alert type="error">{formError}</Alert>}<div className="modal-footer"><button type="button" disabled={busy} onClick={()=>setEditor(null)}>Batal</button><button className="primary" disabled={busy||!classes.length}>{busy?"Menyimpan…":existing?"Simpan perubahan":"Tambah siswa"}</button></div></form></Modal>}
    {importing&&<Modal title="Impor siswa" busy={busy} onClose={()=>setImporting(false)}><p>Gunakan template PIB. Isi ID kelas, NIS, nama, dan gender. Periksa hasil sebelum mengimpor.</p><div className="actions"><a className="button" href="/api/students/template"><Download size={15}/>Unduh template XLSX</a><button type="button" disabled={busy} onClick={()=>fileInput.current?.click()}><Upload size={15}/>{busy?"Membaca…":"Pilih CSV / XLSX"}</button><input ref={fileInput} type="file" accept=".csv,.xlsx" hidden onChange={e=>void readFile(e.target.files?.[0])}/></div><details className="detail-panel"><summary>Lihat ID kelas</summary><ul>{classes.map(c=><li key={c.id}>{c.id} — {c.name} · {c.academic_year_name} / {c.semester}</li>)}</ul></details>{fileName&&<p className="hint">File: {fileName}</p>}{formError&&<Alert type="error">{formError}</Alert>}{importMessage&&<Alert type="success">{importMessage}</Alert>}{preview.length>0&&<><p>{preview.length-invalid} baris valid · {invalid} perlu diperbaiki</p><DataTable data={previewRows} columns={previewColumns} label="Baris impor" mobileRow={r=><><h3>{r.name||"Nama kosong"}</h3><p>Kelas {r.classId} · NIS {r.nis||"—"}</p><StatusBadge tone={r.error?"danger":"success"}>{r.error||"Siap diimpor"}</StatusBadge></>}/><div className="modal-footer"><button disabled={busy} onClick={()=>setPreview([])}>Batalkan pratinjau</button><button className="primary" disabled={busy||invalid>0} onClick={()=>void commitImport()}>{busy?"Mengimpor…":"Impor "+preview.length+" siswa"}</button></div></>}</Modal>}
    {removing&&<ConfirmDialog title="Nonaktifkan siswa?" onClose={()=>setRemoving(null)} onConfirm={()=>void remove()} confirmLabel="Nonaktifkan" busy={busy}>{removing.name} tidak akan muncul pada input baru. Riwayat nilai tetap tersimpan.</ConfirmDialog>}
  </main>;
}
