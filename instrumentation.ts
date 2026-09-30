export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoBackup } = await import("./lib/auto-backup");
    await startAutoBackup();
  }
}
