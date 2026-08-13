export function normalizeSupabaseUrl(value: string) {
  const trimmedValue = value.trim().replace(/\/+$/, "");

  return trimmedValue.replace(/\/rest\/v1$/i, "");
}
