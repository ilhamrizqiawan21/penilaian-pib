"use client";
import { usePathname } from "next/navigation";
import {useEffect,useState} from "react";
import BrandLogo from "./brand-logo";
import {api} from "@/lib/client-api";
import {Settings} from "@/lib/frontend-types";
import Sidebar from "./sidebar";

function WorkspaceHeader(){
  const [school,setSchool]=useState("PIB Penilaian"),[name,setName]=useState("Guru");
  useEffect(()=>{
    const update=()=>{void api<Settings>("/api/settings").then(x=>{setSchool(x.schoolName||"PIB Penilaian");setName(x.teacherName||"Guru")}).catch(()=>undefined)};
    update();
    window.addEventListener("pib-settings-change",update);return()=>window.removeEventListener("pib-settings-change",update);
  },[]);
  return <header className="app-topbar"><div className="topbar-school"><BrandLogo/><div className="topbar-identity"><span className="topbar-caption">Penilaian Praktik Ibadah</span><span className="topbar-school-name" title={school}>{school}</span></div></div><div className="topbar-right"><div className="topbar-teacher"><strong>{name}</strong><span>Ruang kerja guru</span></div><span className="avatar" aria-label={name}>{name.split(" ").filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()}</span></div></header>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path === "/" || path === "/setup") return <div className="public-content">{children}</div>;
  return <><a className="skip-link" href="#main-content">Langsung ke konten</a><Sidebar /><div className="content"><WorkspaceHeader/><div id="main-content" tabIndex={-1}>{children}</div></div></>;
}
