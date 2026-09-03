import {z} from "zod";
export const scoreInput=z.object({mistakes:z.number().int().min(0).max(90).nullable()});
export function calculateScore(mistakes:number|null){return mistakes===null?null:90-mistakes;}
export function weightedAverage(rows:{score:number|null;weight:number}[]){const valid=rows.filter(x=>x.score!==null);const weight=valid.reduce((n,x)=>n+x.weight,0);return weight?Math.round(valid.reduce((n,x)=>n+(x.score??0)*x.weight,0)/weight*10)/10:null;}
