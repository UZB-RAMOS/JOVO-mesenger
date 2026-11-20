import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(4, "Username kamida 4 ta belgidan iborat bo'lishi kerak")
  .max(32)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]+$/, "Username harf bilan boshlanishi kerak");

export const passwordSchema = z
  .string()
  .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
  .max(128)
  .regex(/[A-Za-z]/, "Parolda kamida bitta harf bo'lishi kerak")
  .regex(/[0-9]/, "Parolda kamida bitta raqam bo'lishi kerak");

export const registerSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  username: usernameSchema.transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(64),
  password: passwordSchema,
});

export const verifySchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

// Uzbekistan phone numbers: +998 followed by 9 digits (e.g. +998901234567).
export const uzPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine((value) => /^\+998\d{9}$/.test(value), "Telefon raqami +998 bilan boshlanib, 9 ta raqamdan iborat bo'lishi kerak");

export const phoneRegisterSchema = z.object({
  phone: uzPhoneSchema,
  username: usernameSchema.transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(64),
});

export const phoneRequestSchema = z.object({ phone: uzPhoneSchema });

export const phoneVerifySchema = z.object({
  phone: uzPhoneSchema,
  code: z.string().regex(/^\d{6}$/),
});

export type PhoneRegisterInput = z.infer<typeof phoneRegisterSchema>;
export type PhoneRequestInput = z.infer<typeof phoneRequestSchema>;
export type PhoneVerifyInput = z.infer<typeof phoneVerifySchema>;

export const createDirectChatSchema = z.object({ userId: z.uuid() });

export const messageContentSchema = z
  .string()
  .trim()
  .min(1, "Xabar bo'sh bo'lishi mumkin emas")
  .max(4096, "Xabar 4096 belgidan oshmasligi kerak");

// Upload constraints (shared between client validation and server enforcement).
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const ALLOWED_FILE_MIME = [
  'application/pdf',
  'text/plain',
  'application/zip',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg',
  'audio/ogg',
  'audio/webm',
  'video/mp4',
  'video/webm',
] as const;

export const sendMessageSchema = z
  .object({
    clientMessageId: z.uuid(),
    content: z.string().trim().max(4096).optional().default(''),
    replyToId: z.uuid().optional(),
    attachmentIds: z.array(z.uuid()).max(10).optional(),
  })
  .refine((value) => value.content.length > 0 || (value.attachmentIds?.length ?? 0) > 0, {
    message: "Xabar matni yoki biriktirma bo'lishi kerak",
  });

export const editMessageSchema = z.object({ content: messageContentSchema });

export const messageReactionSchema = z.object({
  emoji: z.string().trim().min(1, 'Reaksiya bo‘sh bo‘lishi mumkin emas').max(32),
});

export const markReadSchema = z.object({ messageId: z.uuid() });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio?: string | null;
};

export type AttachmentKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';

export type AttachmentDto = {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
};

export type MessageDto = {
  id: string;
  clientMessageId: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  sender: PublicUser;
  replyTo: {
    id: string;
    content: string;
    sender: PublicUser;
  } | null;
  reactions: Array<{
    emoji: string;
    count: number;
    userIds: string[];
  }>;
  attachments: AttachmentDto[];
};

export type ChatSummary = {
  id: string;
  title: string;
  avatarUrl: string | null;
  peer: PublicUser;
  lastMessage: MessageDto | null;
  unreadCount: number;
  updatedAt: string;
};
