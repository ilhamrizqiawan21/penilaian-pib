import {NextResponse} from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {audit,createSnapshot,db} from "@/lib/db";
import {isResponse,requireRole,requireUser,writeGuard} from "@/lib/api";
import {RestoreError,restoreFromSqliteFile,auditUserId} from "@/lib/restore";

const MAX_BYTES=50_000_000;

// Pulihkan dari file .sqlite utuh (backup otomatis atau salinan database).
export async function POST(req:Request){
  const guard=writeGuard(req);if(guard)return guard;
  const user=await requireUser();if(isResponse(user))return user;
  const role=requireRole(user,["TEACHER","ADMIN"]);if(role)return role;
  if(Number(req.headers.get("content-length")??0)>MAX_BYTES)return NextResponse.json({error:"Ukuran file maksimal 50 MB"},{status:413});
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"pib-restore-"));
  try{
    const bytes=Buffer.from(await req.arrayBuffer());
    if(!bytes.length||bytes.length>MAX_BYTES)throw new RestoreError("File kosong atau terlalu besar");
    const file=path.join(dir,"upload.sqlite");
    fs.writeFileSync(file,bytes);
    const snapshot=createSnapshot("restore");
    const restored=restoreFromSqliteFile(db,file);
    audit(auditUserId(user.id),"restore","local","RESTORE",`Restore ${restored} data dari file SQLite${snapshot?" dengan snapshot":""}`);
    return NextResponse.json({ok:true,restored,snapshot:Boolean(snapshot)});
  }catch(error){
    audit(auditUserId(user.id),"restore","local","FAILED","Restore SQLite ditolak atau gagal");
    return NextResponse.json({error:error instanceof RestoreError?error.message:"File backup gagal dipulihkan"},{status:400});
  }finally{
    fs.rmSync(dir,{recursive:true,force:true});
  }
}
