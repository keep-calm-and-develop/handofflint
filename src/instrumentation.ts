export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { ensureFigmaMockServer } = await import("@/mocks/ensure-server");
  await ensureFigmaMockServer();
}
