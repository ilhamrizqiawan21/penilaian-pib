import {hasValidOrigin} from "@/lib/request-origin";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export type ApiUser={id:number;name:string;email:string;role:string};
export async function requireUser():Promise<ApiUser|NextResponse>{
  let user=db.prepare("SELECT id,name,email,role FROM users ORDER BY id LIMIT 1").get() as ApiUser|undefined;
  if(!user){
    const teacherName=(db.prepare("SELECT value FROM settings WHERE key='teacherName'").get() as {value?:string}|undefined)?.value?.trim()||"Guru PIB";
    db.prepare("INSERT OR IGNORE INTO users(name,email,password_hash,role) VALUES(?,?,?,?)").run(teacherName,"local@pib.local","LOCAL_ONLY","TEACHER");
    user=db.prepare("SELECT id,name,email,role FROM users ORDER BY id LIMIT 1").get() as ApiUser|undefined;
  }
  return user??NextResponse.json({error:"Database belum disiapkan"},{status:503});
}
export const isResponse=(value:unknown):value is NextResponse=>value instanceof NextResponse;
export function requireRole(user:ApiUser,roles:string[]){return roles.includes(user.role)?null:NextResponse.json({error:"Akses tidak diizinkan"},{status:403})}
export function writeGuard(req:Request){return hasValidOrigin(req)?null:NextResponse.json({error:"Origin request tidak valid"},{status:403})}
export async function readJson(req:Request,maxBytes=1_000_000){const length=Number(req.headers.get("content-length")??0);if(length>maxBytes)throw Error("Payload terlalu besar");const text=await req.text();if(new TextEncoder().encode(text).byteLength>maxBytes)throw Error("Payload terlalu besar");return JSON.parse(text)}
