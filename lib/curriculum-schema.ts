import {z} from "zod";
export const curriculumKind=z.enum(["chapters","subchapters","assessments"]);
export type CurriculumKind=z.infer<typeof curriculumKind>;
export const periodId=z.number().int().positive();
export const chapterInput=z.object({academicYearId:periodId,semester:z.enum(["Ganjil","Genap"]).optional(),title:z.string().trim().min(2).max(100)});
export const subchapterInput=z.object({chapterId:periodId,title:z.string().trim().min(2).max(100)});
export const materialInput=z.object({subchapterId:periodId,title:z.string().trim().min(2).max(150),description:z.string().max(500).default(""),weight:z.number().min(.1).max(100).default(1)});
export const curriculumEdit=z.object({kind:curriculumKind,id:periodId,title:z.string().trim().min(2).max(150),description:z.string().max(500).optional(),weight:z.number().min(.1).max(100).optional(),confirmedScoreCount:z.number().int().nonnegative().optional()}).superRefine((x,ctx)=>{
  if(x.kind!=="assessments"&&x.title.length>100)ctx.addIssue({code:"custom",path:["title"],message:"Maksimal 100 karakter."});
});
export const curriculumMove=z.object({kind:curriculumKind,id:periodId,direction:z.enum(["up","down"])});
export const curriculumCopy=z.object({sourceId:periodId,targetId:periodId});
export type CurriculumItem={id:number;title:string;display_order:number;description?:string;weight?:number;score_count:number;subchapter_count:number;material_count:number;legacy_mismatch:boolean};
export type CurriculumPeriod={id:number;name:string;semester:string;is_active?:number};
export type CurriculumContext={period:CurriculumPeriod;chapter:{id:number;title:string}|null;subchapter:{id:number;title:string}|null;items:CurriculumItem[];warnings:string[]};
export type CopyPreview={chapters:number;subchapters:number;materials:number;conflicts:string[];legacyCount:number};
