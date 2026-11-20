import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * SMS delivery for OTP codes.
 *
 * Default (unconfigured) mode: no real SMS is sent — the code is logged and the
 * register/request endpoints also return it as `devVerificationCode` in
 * non-production. This lets the whole phone-OTP flow work locally without any
 * paid account.
 *
 * Eskiz.uz mode (set SMS_PROVIDER=eskiz + ESKIZ_EMAIL + ESKIZ_PASSWORD):
 * authenticates against Eskiz, caches the bearer token, and sends real SMS.
 * Docs: https://documenter.getpostman.com/view/663428/RzfmES4z
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger('SmsService');
  private token: string | null = null;
  private tokenExpiresAt = 0;

  private get baseUrl(): string {
    return (process.env.ESKIZ_BASE_URL ?? 'https://notify.eskiz.uz/api').replace(/\/+$/, '');
  }

  private get from(): string {
    return process.env.ESKIZ_FROM ?? '4546';
  }

  /** True when a real provider is configured. */
  get enabled(): boolean {
    return (
      process.env.SMS_PROVIDER === 'eskiz' &&
      Boolean(process.env.ESKIZ_EMAIL) &&
      Boolean(process.env.ESKIZ_PASSWORD)
    );
  }

  /**
   * Sends an OTP code. Returns whether it was actually delivered via a provider.
   * Throws ServiceUnavailableException only when a provider is configured but fails,
   * so callers can safely fall back to dev codes when nothing is configured.
   */
  async sendOtp(phone: string, code: string): Promise<{ delivered: boolean }> {
    const text = `JOVO tasdiqlash kodingiz: ${code}. Kodni hech kimga bermang.`;
    if (!this.enabled) {
      this.logger.warn(`[DEV] SMS provider sozlanmagan — ${phone} uchun kod: ${code}`);
      return { delivered: false };
    }
    try {
      await this.sendViaEskiz(phone, text);
      return { delivered: true };
    } catch (error) {
      this.logger.error(`Eskiz SMS yuborilmadi: ${(error as Error).message}`);
      throw new ServiceUnavailableException('SMS yuborib bo‘lmadi. Birozdan so‘ng qayta urinib ko‘ring');
    }
  }

  private async ensureToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;
    const body = new URLSearchParams({
      email: process.env.ESKIZ_EMAIL ?? '',
      password: process.env.ESKIZ_PASSWORD ?? '',
    });
    const res = await fetch(`${this.baseUrl}/auth/login`, { method: 'POST', body });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    const json = (await res.json()) as { data?: { token?: string } };
    const token = json.data?.token;
    if (!token) throw new Error('token topilmadi');
    this.token = token;
    // Eskiz tokens last ~30 days; refresh conservatively after 25.
    this.tokenExpiresAt = Date.now() + 25 * 24 * 60 * 60 * 1000;
    return token;
  }

  private async sendViaEskiz(phone: string, text: string, retry = true): Promise<void> {
    const token = await this.ensureToken();
    const body = new URLSearchParams({
      // Eskiz expects the national number without the leading '+'.
      mobile_phone: phone.replace(/^\+/, ''),
      message: text,
      from: this.from,
    });
    const res = await fetch(`${this.baseUrl}/message/sms/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });
    if (res.status === 401 && retry) {
      // Token expired/invalid — refresh once and retry.
      this.token = null;
      this.tokenExpiresAt = 0;
      return this.sendViaEskiz(phone, text, false);
    }
    if (!res.ok) throw new Error(`send ${res.status}`);
  }
}
