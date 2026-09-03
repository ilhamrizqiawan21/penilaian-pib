import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { audit, db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { readJson, writeGuard } from "@/lib/api";

const input = z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) });

export async function POST(req: Request) {
  const guard=writeGuard(req); if(guard)return guard;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
  try {
    const data = input.parse(await readJson(req, 16_000));
    const row = db.prepare("SELECT password_hash FROM users WHERE id=?").get(user.id) as { password_hash: string };
    if (!(await compare(data.currentPassword, row.password_hash))) return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
    db.prepare("UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(await hash(data.newPassword, 12), user.id);
    audit(user.id,"account",String(user.id),"CHANGE_PASSWORD","Password akun diubah");
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Password baru tidak valid" }, { status: 400 }); }
}
