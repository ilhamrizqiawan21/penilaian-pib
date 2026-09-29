import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {isResponse,requireUser} from "@/lib/api";
import {getClassProgress} from "@/lib/class-progress";

export async function GET(req:Request){
  const user=await requireUser();if(isResponse(user))return user;
  const classId=Number(new URL(req.url).searchParams.get("classId"));
  if(!Number.isInteger(classId)||classId<1)return NextResponse.json({error:"classId wajib diisi"},{status:400});
  const result=getClassProgress(db,classId);
  return result?NextResponse.json(result):NextResponse.json({error:"Kelas tidak ditemukan"},{status:404});
}
