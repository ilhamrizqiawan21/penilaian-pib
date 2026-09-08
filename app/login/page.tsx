"use client";
import {useState} from "react";
import BrandLogo from "../brand-logo";
import {ArrowRight,Eye,EyeOff} from "lucide-react";
import {api,errorMessage,jsonRequest} from "@/lib/client-api";
import {Alert} from "@/app/ui";
export default function Login(){
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[show,setShow]=useState(false),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{await api("/api/auth/login",jsonRequest("POST",{email,password}));location.href="/dashboard"}catch(e){setError(errorMessage(e));setBusy(false)}}
  return <main className="app auth-page"><section className="auth-card"><div className="auth-brand"><BrandLogo/><div><p className="eyebrow">PIB Penilaian</p><span>Ruang kerja guru</span></div></div><div className="auth-heading"><h1>Selamat datang kembali</h1><p>Masuk untuk melanjutkan penilaian Praktik Ibadah.</p></div><form className="section-stack" aria-busy={busy} onSubmit={submit}><div className="field"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="username" placeholder="nama@sekolah.sch.id" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div className="field"><label htmlFor="password">Password</label><div className="password-control"><input id="password" type={show?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" aria-label={show?"Sembunyikan password":"Tampilkan password"} aria-pressed={show} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>{error&&<Alert type="error">{error}</Alert>}<button className="primary auth-submit" disabled={busy}>{busy?"Memeriksa akun…":"Masuk"}<ArrowRight size={16}/></button><p className="hint">Akun dikelola oleh pengelola aplikasi di sekolah Anda.</p></form></section></main>;
}
