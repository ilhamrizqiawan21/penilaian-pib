import {api,ApiError,jsonRequest} from "./client-api";
import {ScoreDraft,deleteDraft,parseMistakes,persistDraft,readDrafts} from "./assessment-workspace";
export const SCORE_SAVED_EVENT="pib-score-saved";
const inFlight=new Map<string,Promise<boolean>>();
export function submitScore(draft:ScoreDraft):Promise<boolean>{
  const current=inFlight.get(draft.key);if(current)return current;
  const request=(async()=>{
    const parsed=parseMistakes(draft.raw);if(!parsed.valid)return false;
    try{
      const result=await api<{updatedAt?:string;score:number|null;mistakes:number|null}>("/api/sync",jsonRequest("POST",{id:draft.id,deviceId:draft.deviceId,baseUpdatedAt:draft.baseUpdatedAt,payload:{studentId:draft.studentId,assessmentId:draft.assessmentId,mistakes:parsed.mistakes}}));
      deleteDraft(draft.key,draft.id);
      window.dispatchEvent(new CustomEvent(SCORE_SAVED_EVENT,{detail:{draft,score:result.score,mistakes:result.mistakes,updatedAt:result.updatedAt}}));
      return true;
    }catch(e){
      const latest=readDrafts().find(x=>x.key===draft.key);
      if(latest?.id===draft.id){
        const status=e instanceof ApiError?(e.status===409?"conflict":e.status===0||e.status>=500?"pending":"failed"):"failed";
        persistDraft({...draft,status,error:status==="pending"?"Menunggu koneksi untuk dikirim.":e instanceof Error?e.message:"Penyimpanan gagal."});
      }
      return false;
    }finally{inFlight.delete(draft.key)}
  })();
  inFlight.set(draft.key,request);return request;
}
export async function syncPendingScores(){
  if(!navigator.onLine)return;
  for(const draft of readDrafts().filter(x=>x.status==="pending"))await submitScore(draft);
}
