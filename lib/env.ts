export function readConfiguredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (
    normalized.startsWith("tua_chiave") ||
    normalized.startsWith("la_tua_chiave") ||
    normalized.startsWith("your_")
  ) {
    return undefined;
  }

  return value;
}
