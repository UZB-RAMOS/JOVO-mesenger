import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, type ReadStream } from 'node:fs';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

/**
 * Object storage for message attachments.
 *
 * Driver: local disk (default). Files are written under UPLOAD_DIR
 * (default .data/uploads) and served through short-lived HMAC-signed URLs —
 * the signature is the authorization, so the browser can load an <img> without
 * an Authorization header. A signed URL is only ever handed to a user who is
 * authorized to read the message (the message API embeds it).
 *
 * For multi-instance production this interface maps cleanly onto S3/MinIO
 * presigned URLs; see docs for the ENV-gated migration path.
 */
@Injectable()
export class StorageService {
  private readonly baseDir = resolve(process.env.UPLOAD_DIR ?? '.data/uploads');
  private readonly publicApiUrl = (process.env.PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

  private get secret(): string {
    const secret = process.env.UPLOAD_SIGNING_SECRET ?? process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('UPLOAD_SIGNING_SECRET yoki JWT_ACCESS_SECRET majburiy');
    return secret;
  }

  private safeKey(key: string): string {
    if (!/^[a-zA-Z0-9/_.-]+$/.test(key) || key.includes('..')) throw new Error('Yaroqsiz storage kaliti');
    return key;
  }

  private pathFor(key: string): string {
    return join(this.baseDir, this.safeKey(key));
  }

  async save(key: string, data: Buffer): Promise<void> {
    const filePath = this.pathFor(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  readStream(key: string): ReadStream {
    return createReadStream(this.pathFor(key));
  }

  async size(key: string): Promise<number> {
    const info = await stat(this.pathFor(key));
    return info.size;
  }

  private sign(id: string, exp: number): string {
    return createHmac('sha256', this.secret).update(`${id}.${exp}`).digest('hex');
  }

  /** Builds a signed, expiring URL the browser can fetch directly. */
  signedUrl(attachmentId: string, expiresSeconds = 60 * 60): string {
    const exp = Math.floor(Date.now() / 1000) + expiresSeconds;
    const sig = this.sign(attachmentId, exp);
    return `${this.publicApiUrl}/api/uploads/file?id=${attachmentId}&exp=${exp}&sig=${sig}`;
  }

  /** Verifies a signed URL's id/exp/sig triple (constant-time). */
  verifySignature(id: string, exp: number, sig: string): boolean {
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
    const expected = this.sign(id, exp);
    if (expected.length !== sig.length) return false;
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
    } catch {
      return false;
    }
  }
}
