"use client";
import { useState } from "react";

export default function Account() {
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMessage(response.ok ? "Password berhasil diubah." : (await response.json()).error);
    if (response.ok) event.currentTarget.reset();
  }
  return <main className="app"><h1>Akun guru</h1><section className="card" style={{ maxWidth: 520 }}><h2>Ubah password</h2><form onSubmit={submit}><p><input name="currentPassword" type="password" placeholder="Password saat ini" required /></p><p><input name="newPassword" type="password" minLength={8} placeholder="Password baru (minimal 8 karakter)" required /></p><button className="primary">Simpan password</button></form>{message && <p className="notice">{message}</p>}</section></main>;
}
