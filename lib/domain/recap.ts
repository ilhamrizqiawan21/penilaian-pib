import {weightedAverage} from "@/lib/scoring";
export function recapScores(rows:{score:number|null;weight:number}[]){const assessed=rows.filter(x=>x.score!==null);return {assessed:assessed.length,total:assessed.reduce((n,x)=>n+(x.score??0),0),average:weightedAverage(rows)};}
export function subchapterComplete(studentCount:number,assessmentCount:number,scoredCount:number){return studentCount>0&&assessmentCount>0&&scoredCount===studentCount*assessmentCount;}
