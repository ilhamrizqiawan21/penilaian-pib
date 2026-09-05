import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {recapFilter} from "@/lib/filters";
import {getRecap} from "@/lib/recap-query";
export async function GET(req:Request){
  const parsed=recapFilter.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if(!parsed.success)return NextResponse.json({error:"Filter rekap tidak valid."},{status:400});
  return NextResponse.json(getRecap(db,parsed.data));
}
