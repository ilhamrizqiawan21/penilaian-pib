"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useState} from "react";
import {api,errorMessage} from "@/lib/client-api";

const groups=[
  ["Kerja harian",[["/dashboard","Beranda"],["/assessment","Penilaian"],["/recap","Rekap"]]],
  ["Kelola data",[["/master-data","Sekolah & tahun"],["/classes","Kelas"],["/students","Siswa"],["/master-data/curriculum","Materi"]]],
  ["Laporan",[["/reports","Ekspor & backup"],["/account","Akun"]]],
] as const;
const mobile=[["/dashboard","Beranda"],["/assessment","Nilai"],["/recap","Rekap"],["/students","Siswa"],["/reports","Laporan"]] as const;
const active=(path:string,href:string)=>path===href||(href!=="/master-data"&&path.startsWith(`${href}/`));

export default function Sidebar(){const path=usePathname(),router=useRouter(),[busy,setBusy]=useState(false),[error,setError]=useState("");async function logout(){setBusy(true);setError("");try{await api("/api/auth/logout",{method:"POST"});router.replace("/login");router.refresh()}catch(e){setError(errorMessage(e));setBusy(false)}}return <><aside className="sidebar"><div className="brand">PIB<span>Penilaian guru · lokal</span></div><nav aria-label="Navigasi utama">{groups.map(([label,items])=><div key={label}><p className="nav-label">{label}</p>{items.map(([href,name])=><Link className={active(path,href)?"active":""} aria-current={active(path,href)?"page":undefined} href={href} key={href}>{name}</Link>)}</div>)}{error&&<p className="alert error">{error}</p>}<button className="logout" onClick={logout} disabled={busy}>{busy?"Keluar…":"Keluar aplikasi"}</button></nav></aside><nav className="mobile-nav" aria-label="Navigasi utama">{mobile.map(([href,label])=><Link className={active(path,href)?"active":""} aria-current={active(path,href)?"page":undefined} href={href} key={href}>{label}</Link>)}</nav></>}
