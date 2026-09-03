import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { audit } from "@/lib/db";
import { isResponse, readJson, requireUser, writeGuard } from "@/lib/api";
const row = z.object({ classId: z.number().int().positive(), nis: z.string().trim().max(30).optional(), name: z.string().trim().min(2).max(120), gender: z.enum(["", "L", "P"]).optional() });
export async function POST(req: Request) { const guard=writeGuard(req);if(guard)return guard;const user=await requireUser();if(isResponse(user))return user;try { const rows = z.array(row).max(1000).parse(await readJson(req,2_000_000)); const result = { imported: 0, failed: [] as { row: number; error: string }[] }; const insert = db.prepare("INSERT INTO students(class_id,nis,name,gender) VALUES(?,?,?,?)"); const tx = db.transaction(() => rows.forEach((x, i) => { try { if(!db.prepare("SELECT id FROM classes WHERE id=?").get(x.classId))throw Error();insert.run(x.classId, x.nis || null, x.name, x.gender ?? ""); result.imported++; } catch { result.failed.push({ row: i + 1, error: "NIS duplikat atau kelas tidak valid" }); } })); tx();audit(user.id,"students","import","IMPORT",`${result.imported} siswa diimpor`); return NextResponse.json(result); } catch { return NextResponse.json({ error: "Format impor tidak valid" }, { status: 400 }); } }
