import crypto from "crypto";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function unbase64url(input) {
  const base64 = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64").toString("utf8");
}

export function createSkey(payload) {
  const secret = process.env.ORDERFIX_TOKEN_SECRET;
  if (!secret) throw new Error("Missing ORDERFIX_TOKEN_SECRET");

  const body = base64url(JSON.stringify(payload));

  const sig = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

  return `${body}.${sig}`;
}

export function verifySkey(skey) {
  const secret = process.env.ORDERFIX_TOKEN_SECRET;
  if (!secret) throw new Error("Missing ORDERFIX_TOKEN_SECRET");

  const [body, sig] = String(skey || "").split(".");
  if (!body || !sig) throw new Error("Invalid skey");

  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

  if (sig !== expected) throw new Error("Invalid skey signature");

  const payload = JSON.parse(unbase64url(body));

  if (!payload.exp || Date.now() > payload.exp) {
    throw new Error("Expired skey");
  }

  return payload;
}