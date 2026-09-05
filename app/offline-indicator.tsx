"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {CloudOff} from "lucide-react";
import {DRAFT_EVENT,migrateLegacyDrafts,readDrafts} from "@/lib/assessment-workspace";
import {syncPendingScores} from "@/lib/score-client";
export default function OfflineIndicator(){
  const path=usePathname(),[online,setOnline]=useState(true),[count,setCount]=useState(0);
  const publicPage=["/","/login","/setup"].includes(path);
  useEffect(()=>{
    if(publicPage)return;
    const update=()=>{setOnline(navigator.onLine);try{setCount(readDrafts().filter(x=>x.status==="pending").length)}catch{}};
    const sync=()=>{update();void syncPendingScores().catch(()=>undefined)};
    update();
    void migrateLegacyDrafts().then(sync).catch(update);
    window.addEventListener("online",sync);window.addEventListener("offline",update);window.addEventListener(DRAFT_EVENT,update);window.addEventListener("storage",update);
    const timer=setInterval(()=>{if(document.visibilityState==="visible")sync()},30000);
    if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>undefined);
    return()=>{clearInterval(timer);window.removeEventListener("online",sync);window.removeEventListener("offline",update);window.removeEventListener(DRAFT_EVENT,update);window.removeEventListener("storage",update)};
  },[publicPage]);
  return !publicPage&&(!online||count>0)?<div className="offline-banner" role="status"><CloudOff size={15} aria-hidden="true"/> {online?count+" nilai menunggu sinkronisasi":"Offline · perubahan nilai disimpan di perangkat"}</div>:null;
}
