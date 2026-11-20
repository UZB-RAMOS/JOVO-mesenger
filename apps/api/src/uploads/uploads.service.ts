import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { ReadStream } from 'node:fs';
import { ALLOWED_FILE_MIME, ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES, type AttachmentDto } from '@jovo/shared';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';

export interface UploadedFileLike {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const ALLOWED_MIME = new Set<string>([...ALLOWED_IMAGE_MIME, ...ALLOWED_FILE_MIME]);

@Injectable()
export class UploadsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
  ) {}

  private kindFor(mime: string): 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' {
    if (mime.startsWith('image/')) return 'IMAGE';
    if (mime.startsWith('video/')) return 'VIDEO';
    if (mime.startsWith('audio/')) return 'AUDIO';
    return 'FILE';
  }

  /** Lightweight magic-byte check so a declared image MIME can't be spoofed. */
  private imageBytesMatch(mime: string, buf: Buffer): boolean {
    if (buf.length < 12) return false;
    if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (mime === 'image/png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    if (mime === 'image/gif') return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38;
    if (mime === 'image/webp') return buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
    return false;
  }

  map(row: {
    id: string;
    kind: string;
    fileName: string;
    mimeType: string;
    size: number;
    width: number | null;
    height: number | null;
  }): AttachmentDto {
    return {
      id: row.id,
      kind: row.kind as AttachmentDto['kind'],
      fileName: row.fileName,
      mimeType: row.mimeType,
      size: row.size,
      width: row.width,
      height: row.height,
      url: this.storage.signedUrl(row.id),
    };
  }

  async create(userId: string, file: UploadedFileLike): Promise<AttachmentDto> {
    if (!file?.buffer?.length) throw new BadRequestException('Bo‘sh fayl');
    if (file.size > MAX_UPLOAD_BYTES) throw new PayloadTooLargeException('Fayl hajmi 25 MB dan oshmasligi kerak');
    const mime = file.mimetype;
    if (!ALLOWED_MIME.has(mime)) throw new UnsupportedMediaTypeException('Bu fayl turi qo‘llab-quvvatlanmaydi');
    if (mime.startsWith('image/') && !this.imageBytesMatch(mime, file.buffer)) {
      throw new BadRequestException('Fayl mazmuni e’lon qilingan turga mos emas');
    }
    const id = randomUUID();
    await this.storage.save(id, file.buffer);
    const row = await this.prisma.messageAttachment.create({
      data: {
        id,
        uploaderId: userId,
        kind: this.kindFor(mime),
        storageKey: id,
        fileName: (file.originalname || 'fayl').slice(0, 255),
        mimeType: mime,
        size: file.size,
      },
    });
    return this.map(row);
  }

  async serve(
    id: string,
    exp: number,
    sig: string,
  ): Promise<{ stream: ReadStream; mimeType: string; fileName: string }> {
    if (!id || !sig || !this.storage.verifySignature(id, exp, sig)) {
      throw new ForbiddenException('Imzo yaroqsiz yoki muddati o‘tgan');
    }
    const row = await this.prisma.messageAttachment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Biriktirma topilmadi');
    return { stream: this.storage.readStream(row.storageKey), mimeType: row.mimeType, fileName: row.fileName };
  }
}
