import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export const dynamic="force-dynamic";
const allowed=["school_name","school_address","teacher_name","minimum_score","maximum_score"] as const;
type Key=typeof allowed[number];
export async function GET(){const rows=db.prepare("SELECT key,value FROM settings").all() as {key:Key;value:string}[];return NextResponse.json(Object.fromEntries(rows.map(row=>[row.key,row.value])));}
export async function PUT(req:Request){try{const data=await req.json() as Record<Key,string>;const minimum=Number(data.minimum_score),maximum=Number(data.maximum_score);if(!Number.isFinite(minimum)||!Number.isFinite(maximum)||minimum<0||maximum>100||minimum>maximum)return NextResponse.json({error:"Rentang nilai harus 0–100 dan nilai minimum tidak boleh melebihi maksimum"},{status:400});const save=db.prepare("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");const run=db.transaction(()=>allowed.forEach(key=>save.run(key,String(data[key]??""))));run();return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Pengaturan tidak valid"},{status:400});}}
