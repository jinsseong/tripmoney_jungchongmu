const PASSWORD_HASH_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_HASH_ITERATIONS = 210_000;
const PASSWORD_HASH_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;
const SHARE_KEY_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export interface PasswordVerificationResult {
  isValid: boolean;
  needsUpgrade: boolean;
}

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

export async function createPasswordHash(password: string): Promise<string> {
  const cryptoApi = getCrypto();
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  cryptoApi.getRandomValues(salt);
  const hash = await derivePasswordHash(
    password,
    salt,
    PASSWORD_HASH_ITERATIONS
  );

  return [
    PASSWORD_HASH_ALGORITHM,
    String(PASSWORD_HASH_ITERATIONS),
    toBase64(salt),
    toBase64(hash),
  ].join("$");
}

export async function verifyPasswordHash(
  password: string,
  storedHash: string
): Promise<PasswordVerificationResult> {
  if (!storedHash) {
    return { isValid: false, needsUpgrade: false };
  }

  if (!storedHash.startsWith(`${PASSWORD_HASH_ALGORITHM}$`)) {
    return {
      isValid: verifyLegacyPasswordHash(password, storedHash),
      needsUpgrade: true,
    };
  }

  const [, iterationsValue, saltValue, hashValue] = storedHash.split("$");
  const iterations = Number(iterationsValue);

  if (!iterations || !saltValue || !hashValue) {
    return { isValid: false, needsUpgrade: false };
  }

  const salt = fromBase64(saltValue);
  const expectedHash = fromBase64(hashValue);
  const candidateHash = await derivePasswordHash(password, salt, iterations);

  return {
    isValid: timingSafeEqual(candidateHash, expectedHash),
    needsUpgrade: false,
  };
}

async function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const cryptoApi = getCrypto();
  const passwordKey = await cryptoApi.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await cryptoApi.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    passwordKey,
    PASSWORD_HASH_BYTES * 8
  );

  return new Uint8Array(bits);
}

function verifyLegacyPasswordHash(password: string, storedHash: string): boolean {
  try {
    return btoa(password) === storedHash;
  } catch {
    return false;
  }
}

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("이 브라우저는 보안 비밀번호 해시를 지원하지 않습니다.");
  }

  return globalThis.crypto;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}
