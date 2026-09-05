import Link from "next/link";
import {BookOpen,GraduationCap,HardDriveDownload,Users,ChartNoAxesCombined,ArrowUpRight} from "lucide-react";
import {currentUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {AcademicYear} from "@/lib/frontend-types";
import {EmptyState,PageHeader,ProgressBar,StatusBadge} from "@/app/ui";
import {DashboardPeriod,ResumeAssessment} from "./workspace-actions";
export const dynamic="force-dynamic";
type Activity={id:number;summary:string;created_at:string};
type ClassProgress={id:number;name:string;assessed:number;total:number;students:number};
export default async function Dashboard({searchParams}:{searchParams:Promise<{academicYearId?:string}>}){
  const user=await currentUser(),params=await searchParams;
  const years=db.prepare("SELECT * FROM academic_years ORDER BY id DESC").all() as AcademicYear[];
  const year=params.academicYearId==="all"?undefined:years.find(x=>String(x.id)===params.academicYearId)??years.find(x=>x.is_active);
  const where=year?" AND c.academic_year_id=?":"",args=year?[year.id]:[];
  const classRows=db.prepare("SELECT c.id,c.name,COUNT(DISTINCT st.id) students,COUNT(sc.score) assessed,COUNT(DISTINCT st.id)*(SELECT COUNT(*) FROM assessments a JOIN subchapters sub ON sub.id=a.subchapter_id JOIN chapters ch ON ch.id=sub.chapter_id JOIN curriculum_templates ct ON ct.id=ch.template_id WHERE a.is_active=1 AND ct.academic_year_id=c.academic_year_id) total FROM classes c LEFT JOIN students st ON st.class_id=c.id AND st.is_active=1 LEFT JOIN scores sc ON sc.student_id=st.id AND sc.assessment_id IN (SELECT a.id FROM assessments a JOIN subchapters sub ON sub.id=a.subchapter_id JOIN chapters ch ON ch.id=sub.chapter_id JOIN curriculum_templates ct ON ct.id=ch.template_id WHERE a.is_active=1 AND ct.academic_year_id=c.academic_year_id) WHERE c.is_active=1"+where+" GROUP BY c.id ORDER BY c.name").all(...args) as ClassProgress[];
  const students=classRows.reduce((n,c)=>n+c.students,0),scores=classRows.reduce((n,c)=>n+c.assessed,0),total=classRows.reduce((n,c)=>n+c.total,0);
  const percent=total?Math.round(scores/total*100):0;
  const activities=db.prepare("SELECT id,summary,created_at FROM audit_logs ORDER BY id DESC LIMIT 5").all() as Activity[];
  const priority=[...classRows].filter(c=>c.total>c.assessed).sort((a,b)=>(a.total?a.assessed/a.total:0)-(b.total?b.assessed/b.total:0)).slice(0,5);
  const context=year?year.name+" · "+year.semester:"Semua periode";
  return <main className="app dashboard-page"><PageHeader eyebrow="Ringkasan kerja" title={"Selamat datang, "+(user?.name??"Guru")} description={context+". Berikut pekerjaan yang dapat Anda lanjutkan hari ini."}><DashboardPeriod years={years} value={year?String(year.id):"all"}/></PageHeader>
    {!years.length?<EmptyState title="Mari siapkan ruang kerja Anda" action={<Link className="button primary" href="/master-data">Siapkan tahun ajaran</Link>}>Mulai dari tahun ajaran, lalu tambahkan kelas, siswa, dan materi penilaian.</EmptyState>:<>
      <ResumeAssessment/>
      <section className="dashboard-kpis"><div className="card stat-card"><div className="stat-heading">Siswa aktif<Users size={19}/></div><strong>{students}</strong><Link href="/students">Kelola siswa <ArrowUpRight size={13}/></Link></div><div className="card stat-card"><div className="stat-heading">Kelas aktif<GraduationCap size={19}/></div><strong>{classRows.length}</strong><Link href="/classes">Lihat kelas <ArrowUpRight size={13}/></Link></div><div className="card stat-card"><div className="stat-heading">Progress penilaian<ChartNoAxesCombined size={19}/></div><strong>{percent}%</strong><StatusBadge tone={total>0&&percent===100?"success":"neutral"}>{scores} / {total} nilai tersimpan</StatusBadge></div></section>
      <div className="dashboard-main-grid"><section className="card"><div className="section-heading"><div><p className="eyebrow">Prioritas kelas</p><h2>{priority.length?"Penilaian yang belum selesai":"Progress per kelas"}</h2></div><Link href={"/recap"+(year?"?academicYearId="+year.id:"")}>Lihat rekap <ArrowUpRight size={13}/></Link></div>{classRows.length?<div className="progress-list">{(priority.length?priority:classRows.slice(0,5)).map(c=><div className="progress-item" key={c.id}><div className="progress-label"><Link href={"/assessment?classId="+c.id}><strong>{c.name}</strong> <ArrowUpRight size={13}/></Link><span>{c.total?Math.round(c.assessed/c.total*100):0}%</span></div><ProgressBar value={c.total?c.assessed/c.total*100:0} label={"Progress "+c.name}/><p>{c.students} siswa · {Math.max(0,c.total-c.assessed)} nilai belum terisi</p></div>)}</div>:<EmptyState title="Belum ada kelas pada periode ini" action={<Link className="button" href="/classes">Tambah kelas</Link>}>Kelas yang ditambahkan akan muncul di sini.</EmptyState>}</section>
      <section className="card"><p className="eyebrow">Jejak kerja</p><h2>Aktivitas terbaru</h2><p className="hint section-gap">Aktivitas aplikasi dari seluruh periode.</p>{activities.length?<ul className="activity-list">{activities.map(item=><li key={item.id}><span className="activity-dot"/><div><strong>{item.summary}</strong><time dateTime={item.created_at}>{new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Jakarta"}).format(new Date(item.created_at.replace(" ","T")+"Z"))}</time></div></li>)}</ul>:<EmptyState title="Belum ada aktivitas">Penyimpanan dan perubahan data akan dicatat di sini.</EmptyState>}</section></div>
      <section className="dashboard-actions"><h2>Kelola ruang kerja</h2><div className="quick-links"><Link className="quick-link" href="/students?add=1"><Users size={22}/><span>Tambah siswa<small>Daftarkan atau impor siswa</small></span></Link><Link className="quick-link" href="/master-data/curriculum"><BookOpen size={22}/><span>Susun materi<small>Bab, subbab, dan bobot nilai</small></span></Link><Link className="quick-link" href="/reports"><HardDriveDownload size={22}/><span>Laporan & cadangan<small>Unduh hasil dan salinan data</small></span></Link></div></section>
    </>}
  </main>;
}
