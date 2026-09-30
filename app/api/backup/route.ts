import {NextResponse} from "next/server";
import {audit,db,schemaVersion} from "@/lib/db";
import {isResponse,requireRole,requireUser} from "@/lib/api";
import {RESTORE_ORDER} from "@/lib/restore";

// Semua tabel data, termasuk users (untuk atribusi penilai) dan sesi tes individual.
// File backup memuat password_hash akun, jadi perlakukan sebagai berkas rahasia.
const BACKUP_TABLES = RESTORE_ORDER;

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const role = requireRole(user, ["TEACHER", "ADMIN"]);
  if (role) return role;

  const data = Object.fromEntries(
    BACKUP_TABLES.map((table) => [table, db.prepare(`SELECT * FROM ${table}`).all()])
  );
  audit(user.id, "backup", "local", "DOWNLOAD", "Backup lengkap dibuat");
  return new NextResponse(
    JSON.stringify({
      version: 3,
      schemaVersion: schemaVersion(),
      createdAt: new Date().toISOString(),
      app: "pib-penilaian",
      data,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=backup-pib.json",
        "Cache-Control": "no-store",
      },
    }
  );
}
