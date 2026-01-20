import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock the env module before importing crypto
vi.mock("~/lib/env.server", () => ({
  env: {
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
}));

import { encrypt, decrypt } from "~/lib/crypto.server";

describe("crypto", () => {
  it("encrypt/decrypt round-trip preserves original string", () => {
    const original = "Hello, World!";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("decrypt with wrong key should fail", () => {
    const original = "secret data";
    const encrypted = encrypt(original);

    // Temporarily swap the key by re-mocking
    vi.doMock("~/lib/env.server", () => ({
      env: {
        ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      },
    }));

    // Manually create a decryptor with the wrong key to test
    const { createDecipheriv } = require("node:crypto");
    const wrongKey = Buffer.from(
      "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      "hex",
    );
    const iv = encrypted.subarray(0, 12);
    const tag = encrypted.subarray(12, 28);
    const ciphertext = encrypted.subarray(28);

    const decipher = createDecipheriv("aes-256-gcm", wrongKey, iv);
    decipher.setAuthTag(tag);

    expect(() => {
      decipher.update(ciphertext);
      decipher.final("utf8");
    }).toThrow();

    // Restore original mock
    vi.doMock("~/lib/env.server", () => ({
      env: {
        ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
    }));
  });

  it("decrypt tampered ciphertext should throw", () => {
    const encrypted = encrypt("some data");
    // Tamper with the ciphertext portion (after IV + tag = 28 bytes)
    const tampered = Buffer.from(encrypted);
    if (tampered.length > 28) {
      tampered[28] ^= 0xff;
    }
    expect(() => decrypt(tampered)).toThrow();
  });

  it("encrypt produces different output each time (random IV)", () => {
    const plaintext = "same input";
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a.equals(b)).toBe(false);
    // Both should still decrypt to the same value
    expect(decrypt(a)).toBe(plaintext);
    expect(decrypt(b)).toBe(plaintext);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles long string", () => {
    const long = "a".repeat(100_000);
    const encrypted = encrypt(long);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(long);
  });
});
