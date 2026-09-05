export type DraftStatus="dirty"|"pending"|"conflict"|"failed";
export type ScoreDraft={key:string;studentId:number;assessmentId:number;raw:string;id:string;deviceId:string;baseUpdatedAt?:string|null;status:DraftStatus;error?:string};
export function parseMistakes(raw:string):{valid:true;mistakes:number|null;score:number|null}|{valid:false;error:string} {
  if(raw.trim()==="")return {valid:true,mistakes:null,score:null};
  const value=Number(raw);
  if(!/^\d+$/.test(raw.trim())||!Number.isInteger(value)||value<0||value>90)return {valid:false,error:"Isi bilangan bulat 0–90."};
  return {valid:true,mistakes:value,score:90-value};
}
export function draftKey(studentId:number,assessmentId:number){return `${studentId}:${assessmentId}`}
export function isUnassessed(score:number|null|undefined,draft?:ScoreDraft){return score==null||!!draft}
export const DRAFT_PREFIX="pib-score-edit:";
export const LAST_ASSESSMENT="pib-last-assessment";
export const DRAFT_EVENT="pib-draft-change";

export function readDrafts():ScoreDraft[]{
  const drafts:ScoreDraft[]=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key?.startsWith(DRAFT_PREFIX))continue;
    try{const row=JSON.parse(localStorage.getItem(key)??"null") as ScoreDraft;
      if(row&&Number.isInteger(row.studentId)&&Number.isInteger(row.assessmentId)&&typeof row.raw==="string"&&typeof row.id==="string"&&["dirty","pending","conflict","failed"].includes(row.status))drafts.push(row);
    }catch{/* Keep unreadable records untouched. */}
  }
  return drafts;
}
export function persistDraft(draft:ScoreDraft){localStorage.setItem(DRAFT_PREFIX+draft.key,JSON.stringify(draft));window.dispatchEvent(new Event(DRAFT_EVENT))}
export function deleteDraft(key:string,id?:string){
  const record=localStorage.getItem(DRAFT_PREFIX+key);
  if(record&&id&&JSON.parse(record).id!==id)return;
  localStorage.removeItem(DRAFT_PREFIX+key);window.dispatchEvent(new Event(DRAFT_EVENT));
}

// Preserve queues created by earlier PIB versions before using the new workspace.
export async function migrateLegacyDrafts(){
  if(!("indexedDB" in window))return;
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{
    const r=indexedDB.open("pib-drafts",2);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains("scores"))r.result.createObjectStore("scores",{keyPath:"key"})};
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
  try {
    const rows=await new Promise<Array<{key:string;studentId:number;assessmentId:number;mistakes:number|null;id?:string;deviceId?:string}>>((resolve,reject)=>{const r=database.transaction("scores").objectStore("scores").getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    for(const row of rows){
      const key=draftKey(row.studentId,row.assessmentId);
      if(!localStorage.getItem(DRAFT_PREFIX+key))persistDraft({key,studentId:row.studentId,assessmentId:row.assessmentId,raw:row.mistakes===null?"":String(row.mistakes),id:row.id??createDraftId(),deviceId:row.deviceId??"browser",status:"pending"});
      await new Promise<void>((resolve,reject)=>{const tx=database.transaction("scores","readwrite");tx.objectStore("scores").delete(row.key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
    }
  }finally{database.close()}
}

// getRandomValues also works on a local-network HTTP origin.
export function createDraftId(){
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
