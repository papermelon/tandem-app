import type { CareRecipient, HandoverQRPayload } from "@/lib/types";

const SHARED_SECRET = "tandem-handover-v1-shared-secret";

function toBytes(s: string): Uint8Array<ArrayBuffer> {
  const src = new TextEncoder().encode(s);
  const out = new Uint8Array(src.byteLength);
  out.set(src);
  return out;
}

function fromBytes(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.digest("SHA-256", toBytes(SHARED_SECRET));
  return crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export type HandoverPlaintext = {
  recipient: Pick<
    CareRecipient,
    | "id"
    | "name"
    | "age"
    | "relationship"
    | "country"
    | "avatar"
    | "phone"
    | "context"
    | "address"
    | "careCircleId"
    | "careProfile"
  >;
  fromCircleLabel?: string;
  issuedAt: number;
};

export async function buildHandoverQR(input: HandoverPlaintext): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    toBytes(JSON.stringify(input)),
  );
  const payload: HandoverQRPayload = {
    v: 1,
    careRecipientId: input.recipient.id,
    careRecipientName: input.recipient.name,
    circleId: input.recipient.careCircleId,
    fromCircleLabel: input.fromCircleLabel,
    issuedAt: input.issuedAt,
    ciphertext: b64encode(new Uint8Array(cipher)),
    iv: b64encode(iv),
  };
  return `tandem://handover/v1?d=${b64encode(toBytes(JSON.stringify(payload)))}`;
}

export async function parseHandoverQR(raw: string): Promise<HandoverPlaintext> {
  const idx = raw.indexOf("d=");
  if (!raw.startsWith("tandem://handover/v1") || idx === -1) {
    throw new Error("This QR code isn't a Tandem handover code.");
  }
  const envelope = JSON.parse(fromBytes(b64decode(raw.slice(idx + 2)))) as HandoverQRPayload;
  if (envelope.v !== 1 || !envelope.ciphertext || !envelope.iv) {
    throw new Error("Unsupported handover code version.");
  }
  const key = await deriveKey();
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(envelope.iv) },
      key,
      b64decode(envelope.ciphertext),
    );
    return JSON.parse(fromBytes(new Uint8Array(plain))) as HandoverPlaintext;
  } catch {
    throw new Error("Could not decrypt this handover code. It may be corrupt or from a different app.");
  }
}
