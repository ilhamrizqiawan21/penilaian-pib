"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {useEffect,useState} from "react";
import {School} from "lucide-react";
import {api} from "@/lib/client-api";
import {Settings} from "@/lib/frontend-types";
import Sidebar from "./sidebar";

function WorkspaceHeader(){
  const [school,setSchool]=useState("PIB Penilaian"),[name,setName]=useState("Guru");
  useEffect(()=>{
    const update=()=>{void api<Settings>("/api/settings").then(x=>setSchool(x.schoolName||"PIB Penilaian")).catch(()=>undefined)};
    update();void api<{user:{name:string}}>("/api/auth/me").then(x=>setName(x.user.name)).catch(()=>undefined);
    window.addEventListener("pib-settings-change",update);return()=>window.removeEventListener("pib-settings-change",update);
  },[]);
  return <header className="app-topbar"><div className="topbar-school"><School size={19} color="var(--brand)" aria-hidden="true"/><span>{school}</span></div><div className="topbar-right"><span>Ruang kerja guru</span><Link className="avatar" href="/account" aria-label={"Akun "+name} title={name}>{name.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}</Link></div></header>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/" || path === "/login" || path === "/setup") return <div className="public-content">{children}</div>;
  return <><a className="skip-link" href="#main-content">Langsung ke konten</a><Sidebar /><div className="content"><WorkspaceHeader/><div id="main-content" tabIndex={-1}>{children}</div></div></>;
}
