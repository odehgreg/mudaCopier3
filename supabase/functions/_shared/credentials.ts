export interface StoredBrokerCredentials {
  account_id: string;
  password: string;
}

const IV_LENGTH = 12;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const secretBytes = new TextEncoder().encode(secret);
  const digest = await crypto.subtle.digest("SHA-256", secretBytes);

  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptCredentials(
  credentials: StoredBrokerCredentials,
  secret: string,
): Promise<string> {
  if (!secret) {
    throw new Error("Missing CREDENTIAL_ENCRYPTION_KEY");
  }

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(secret);
  const plaintext = new TextEncoder().encode(JSON.stringify(credentials));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );

  return `${toBase64(iv)}:${toBase64(new Uint8Array(encryptedBuffer))}`;
}

export async function decryptCredentials(
  encryptedData: string,
  secret: string,
): Promise<StoredBrokerCredentials> {
  if (!encryptedData) {
    throw new Error("Missing encrypted credentials");
  }

  // Backward compatibility for legacy plaintext rows.
  if (!encryptedData.includes(":")) {
    return JSON.parse(encryptedData) as StoredBrokerCredentials;
  }

  if (!secret) {
    throw new Error("Missing CREDENTIAL_ENCRYPTION_KEY");
  }

  const [ivPart, payloadPart] = encryptedData.split(":");
  if (!ivPart || !payloadPart) {
    throw new Error("Invalid encrypted credentials payload");
  }

  const key = await deriveKey(secret);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(ivPart) },
    key,
    fromBase64(payloadPart),
  );

  return JSON.parse(
    new TextDecoder().decode(new Uint8Array(decryptedBuffer)),
  ) as StoredBrokerCredentials;
}
