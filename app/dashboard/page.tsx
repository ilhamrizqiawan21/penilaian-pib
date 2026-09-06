import Link from "next/link";
import {BookOpen,GraduationCap,HardDriveDownload,Users,ChartNoAxesCombined,ArrowUpRight} from "lucide-react";
import {currentUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {dashboardProgress,getDashboardClasses} from "@/lib/dashboard";
import {AcademicYear} from "@/lib/frontend-types";
import {EmptyState,PageHeader,ProgressBar,StatusBadge} from "@/app/ui";
import {DashboardPeriod,ResumeAssessment} from "./workspace-actions";
export const dynamic="force-dynamic";
type Activity={id:number;summary:string;created_at:string};
export default async function Dashboard({searchParams}:{searchParams:Promise<{academicYearId?:string}>}){
  const user=await currentUser(),params=await searchParams;
  const teacherSetting=db.prepare("SELECT value FROM settings WHERE key='teacherName'").get() as {value:string}|undefined;
  const teacherName=teacherSetting?.value.trim()||user?.name?.trim()||"Guru";
  const years=db.prepare("SELECT * FROM academic_years ORDER BY id DESC").all() as AcademicYear[];
  const year=params.academicYearId==="all"?undefined:years.find(x=>String(x.id)===params.academicYearId)??years.find(x=>x.is_active);
  const classRows=getDashboardClasses(db,year?.id);
  const students=classRows.reduce((n,c)=>n+c.students,0),scores=classRows.reduce((n,c)=>n+c.assessed,0),total=classRows.reduce((n,c)=>n+c.total,0);
  const {percent,complete}=dashboardProgress(total,scores);
  const activities=db.prepare("SELECT id,summary,created_at FROM audit_logs ORDER BY id DESC LIMIT 5").all() as Activity[];
  const priority=[...classRows].filter(c=>c.total>c.assessed).sort((a,b)=>(a.total?a.assessed/a.total:0)-(b.total?b.assessed/b.total:0)).slice(0,5);
  const context=year?year.name+" · "+year.semester:"Semua periode";
  return <main className="app dashboard-page"><PageHeader eyebrow="Ringkasan kerja" title={"Selamat datang, "+teacherName} description={context+". Berikut pekerjaan yang dapat Anda lanjutkan hari ini."}><DashboardPeriod years={years} value={year?String(year.id):"all"}/></PageHeader>
    {!years.length?<EmptyState title="Mari siapkan ruang kerja Anda" action={<Link className="button primary" href="/master-data">Siapkan tahun ajaran</Link>}>Mulai dari tahun ajaran, lalu tambahkan kelas, siswa, dan materi penilaian.</EmptyState>:<>
      <ResumeAssessment classes={classRows.map(c=>({id:c.id,name:c.name}))}/>
      <section className="dashboard-kpis"><div className="card stat-card"><div className="stat-heading">Siswa aktif<Users size={19}/></div><strong>{students}</strong><Link href="/students">Kelola siswa <ArrowUpRight size={13}/></Link></div><div className="card stat-card"><div className="stat-heading">Kelas aktif<GraduationCap size={19}/></div><strong>{classRows.length}</strong><Link href="/classes">Lihat kelas <ArrowUpRight size={13}/></Link></div><div className="card stat-card"><div className="stat-heading">Progres penilaian<ChartNoAxesCombined size={19}/></div><strong>{total?percent+"%":"—"}</strong><StatusBadge tone={complete?"success":"neutral"}>{total?`${scores} / ${total} nilai tersimpan`:"Belum siap dinilai"}</StatusBadge></div></section>
      {classRows.some(c=>!c.students||!c.materials)&&<div className="alert info dashboard-readiness" role="status">Sebagian kelas belum siap dinilai. {!students&&"Tambahkan siswa untuk memulai. "}Pastikan setiap kelas memiliki siswa aktif dan materi pada periode yang sesuai. <Link href="/students">Kelola siswa</Link> · <Link href="/master-data/curriculum">Susun materi</Link></div>}
      <div className="dashboard-main-grid"><section className="card"><div className="section-heading"><div><p className="eyebrow">Prioritas kelas</p><h2>{priority.length?"Penilaian yang belum selesai":"Progres per kelas"}</h2></div><Link href={"/recap"+(year?"?academicYearId="+year.id:"")}>Lihat rekap <ArrowUpRight size={13}/></Link></div>{classRows.length?<><p className="hint">Menampilkan {Math.min(5,(priority.length?priority:classRows).length)} dari {classRows.length} kelas aktif. {priority.length?"Kelas dengan progres terendah didahulukan.":"Buka kelas untuk melanjutkan pengelolaan."}</p><div className="progress-list">{(priority.length?priority:classRows.slice(0,5)).map(c=><div className="progress-item" key={c.id}><div className="progress-label"><Link href={c.students&&c.materials?"/assessment?classId="+c.id:!c.students?"/students?classId="+c.id:"/master-data/curriculum"}><strong>{c.name}</strong> <ArrowUpRight size={13}/></Link><span>{c.total?dashboardProgress(c.total,c.assessed).percent+"%":"Belum siap"}</span></div>{!year&&<p>{c.period}</p>}<ProgressBar value={dashboardProgress(c.total,c.assessed).percent} label={"Progres "+c.name}/><p>{c.students} siswa · {!c.students?"Tambahkan siswa":!c.materials?"Susun materi penilaian":`${Math.max(0,c.total-c.assessed)} nilai belum terisi`}</p></div>)}</div></>:<EmptyState title="Belum ada kelas pada periode ini" action={<Link className="button" href="/classes">Tambah kelas</Link>}>Kelas yang ditambahkan akan muncul di sini.</EmptyState>}</section>
      <section className="card"><p className="eyebrow">Jejak kerja</p><h2>Aktivitas terbaru</h2><p className="hint section-gap">Aktivitas aplikasi dari seluruh periode.</p>{activities.length?<ul className="activity-list">{activities.map(item=><li key={item.id}><span className="activity-dot"/><div><strong>{item.summary}</strong><time dateTime={item.created_at}>{new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date(item.created_at.replace(" ","T")+"Z"))}</time></div></li>)}</ul>:<EmptyState title="Belum ada aktivitas">Penyimpanan dan perubahan data akan dicatat di sini.</EmptyState>}</section></div>
      <section className="dashboard-actions"><h2>Kelola ruang kerja</h2><div className="quick-links"><Link className="quick-link" href="/students?add=1"><Users size={22}/><span>Tambah siswa<small>Daftarkan atau impor siswa</small></span></Link><Link className="quick-link" href="/master-data/curriculum"><BookOpen size={22}/><span>Susun materi<small>Bab, subbab, dan bobot nilai</small></span></Link><Link className="quick-link" href="/reports"><HardDriveDownload size={22}/><span>Laporan & cadangan<small>Unduh hasil dan salinan data</small></span></Link></div></section>
    </>}
  </main>;
}
