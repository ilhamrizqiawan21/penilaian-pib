import {NextResponse} from "next/server";
import {z} from "zod";
import {audit,createSnapshot,db,schemaVersion} from "@/lib/db";
import {isResponse,readJson,requireRole,requireUser,writeGuard} from "@/lib/api";
import {RestoreError,restoreFromJson,auditUserId} from "@/lib/restore";

// Versi 2 = tanpa tabel users; versi 3 = lengkap dengan users dan sesi tes individual.
const payload=z.object({version:z.union([z.literal(2),z.literal(3)]),schemaVersion:z.number().int().positive(),createdAt:z.string(),app:z.literal("pib-penilaian"),data:z.record(z.string(),z.array(z.record(z.string(),z.unknown())))});

export async function POST(req:Request){
  const guard=writeGuard(req);if(guard)return guard;
  const user=await requireUser();if(isResponse(user))return user;
  const role=requireRole(user,["TEACHER","ADMIN"]);if(role)return role;
  try{
    const parsed=payload.parse(await readJson(req,10_000_000));
    if(parsed.schemaVersion>schemaVersion())throw new RestoreError("Backup dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi terlebih dahulu.");
    const snapshot=createSnapshot("restore");
    const restored=restoreFromJson(db,parsed.data);
    audit(auditUserId(user.id),"restore","local","RESTORE",`Restore ${restored} data dari JSON${snapshot?" dengan snapshot":""}`);
    return NextResponse.json({ok:true,restored,snapshot:Boolean(snapshot)});
  }catch(error){
    audit(auditUserId(user.id),"restore","local","FAILED","Restore ditolak atau gagal");
    return NextResponse.json({error:error instanceof RestoreError?error.message:"Backup tidak valid atau gagal dipulihkan"},{status:400});
  }
}

