import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {recapFilter} from "@/lib/filters";
import {getRecap} from "@/lib/recap-query";
import {getRecapRows} from "@/lib/recap-rows";
export async function GET(req:Request){
  const parsed=recapFilter.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:"Filter rekap tidak valid."},{status:400});
  const raw=new URL(req.url).searchParams.get("studentId");
  if(raw!==null){
    const id=Number(raw);
    if(!/^\d+$/.test(raw)||!Number.isSafeInteger(id)||id<1)return NextResponse.json({error:"Siswa tidak valid."},{status:400});
    return NextResponse.json({details:getRecapRows(db,parsed.data,id)});
  }
  return NextResponse.json(getRecap(db,parsed.data));
}
