import {hasValidOrigin} from "@/lib/request-origin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readSession } from "@/lib/session";
import { db } from "@/lib/db";
export type ApiUser={id:number;name:string;email:string;role:string};
export async function requireUser():Promise<ApiUser|NextResponse>{const id=readSession((await cookies()).get("pib_session")?.value);if(!id)return NextResponse.json({error:"Login diperlukan"},{status:401});const user=db.prepare("SELECT id,name,email,role FROM users WHERE id=?").get(id) as ApiUser|undefined;return user??NextResponse.json({error:"Session tidak valid"},{status:401})}
export const isResponse=(value:unknown):value is NextResponse=>value instanceof NextResponse;
export function requireRole(user:ApiUser,roles:string[]){return roles.includes(user.role)?null:NextResponse.json({error:"Akses tidak diizinkan"},{status:403})}
export function writeGuard(req:Request){return hasValidOrigin(req)?null:NextResponse.json({error:"Origin request tidak valid"},{status:403})}
export async function readJson(req:Request,maxBytes=1_000_000){const length=Number(req.headers.get("content-length")??0);if(length>maxBytes)throw Error("Payload terlalu besar");const text=await req.text();if(new TextEncoder().encode(text).byteLength>maxBytes)throw Error("Payload terlalu besar");return JSON.parse(text)}
