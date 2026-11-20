import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { MAX_UPLOAD_BYTES } from '@jovo/shared';
import { AuthGuard } from '../auth/auth.guard';
import { UploadsService, type UploadedFileLike } from './uploads.service';

@Controller('api/uploads')
export class UploadsController {
  constructor(@Inject(UploadsService) private readonly uploads: UploadsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async upload(@Req() request: Request, @UploadedFile() file: UploadedFileLike) {
    if (!file) throw new BadRequestException('Fayl topilmadi');
    return this.uploads.create(request.auth!.userId, file);
  }

  // Signed, expiring URL — the signature is the authorization (presigned-URL model),
  // so an <img>/download can load without an Authorization header.
  @Get('file')
  async serve(
    @Query('id') id: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() response: Response,
  ) {
    const { stream, mimeType, fileName } = await this.uploads.serve(id, Number(exp), sig);
    const safeName = encodeURIComponent(fileName);
    response.setHeader('Content-Type', mimeType);
    response.setHeader('Content-Disposition', `inline; filename*=UTF-8''${safeName}`);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    stream.on('error', () => {
      if (!response.headersSent) response.status(404).end();
    });
    stream.pipe(response);
  }
}
