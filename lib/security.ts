const SHARE_KEY_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateShareKey(length = 24): string {
  const cryptoApi = getCrypto();
  const bytes = new Uint8Array(length);
  const result: string[] = [];
  const maxValidByte =
    Math.floor(256 / SHARE_KEY_CHARS.length) * SHARE_KEY_CHARS.length;

  while (result.length < length) {
    cryptoApi.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= maxValidByte) continue;
      result.push(SHARE_KEY_CHARS[byte % SHARE_KEY_CHARS.length]);
      if (result.length === length) break;
    }
  }

  return result.join("");
}

function getCrypto(): Crypto {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("이 브라우저는 안전한 공유 링크 생성을 지원하지 않습니다.");
  }

  return globalThis.crypto;
}
