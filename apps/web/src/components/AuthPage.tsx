import { useState, type FormEvent } from 'react';
import { ArrowRight, AtSign, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import type { PublicUser } from '@jovo/shared';
import { api } from '../api';
import { useAppStore } from '../store';

type Method = 'phone' | 'email';
type Mode = 'login' | 'register' | 'verify';
type SessionResponse = { accessToken: string; user: PublicUser };

export function AuthPage() {
  const setSession = useAppStore((state) => state.setSession);
  const [method, setMethod] = useState<Method>('phone');
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const phone = `+998${phoneDigits}`;
  const phoneReady = phoneDigits.length === 9;

  function switchMethod(next: Method) {
    setMethod(next);
    setMode('login');
    setError('');
    setCode('');
    setDevCode('');
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setCode('');
    setDevCode('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (method === 'phone') {
        if (mode === 'login') {
          const result = await api<{ devVerificationCode?: string }>('/api/auth/phone/request-code', {
            method: 'POST', body: JSON.stringify({ phone }),
          });
          setDevCode(result.devVerificationCode ?? '');
          setMode('verify');
        } else if (mode === 'register') {
          const result = await api<{ devVerificationCode?: string }>('/api/auth/phone/register', {
            method: 'POST', body: JSON.stringify({ phone, username, displayName }),
          });
          setDevCode(result.devVerificationCode ?? '');
          setMode('verify');
        } else {
          const result = await api<SessionResponse>('/api/auth/phone/verify', {
            method: 'POST', body: JSON.stringify({ phone, code }),
          });
          setSession(result.accessToken, result.user);
        }
      } else if (mode === 'login') {
        const result = await api<SessionResponse>('/api/auth/login', {
          method: 'POST', body: JSON.stringify({ email, password }),
        });
        setSession(result.accessToken, result.user);
      } else if (mode === 'register') {
        const result = await api<{ devVerificationCode?: string }>('/api/auth/register', {
          method: 'POST', body: JSON.stringify({ email, password, username, displayName }),
        });
        setDevCode(result.devVerificationCode ?? '');
        setMode('verify');
      } else {
        await api('/api/auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
        switchMode('login');
        setPassword('');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Amal bajarilmadi');
    } finally {
      setBusy(false);
    }
  }

  const verifyTarget = method === 'phone' ? phone : email;
  const submitLabel = busy
    ? 'Kutilmoqda…'
    : mode === 'verify'
      ? 'Tasdiqlash'
      : mode === 'register'
        ? 'Hisob yaratish'
        : method === 'phone'
          ? 'Kod olish'
          : 'Kirish';

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="JOVO Messenger">
        <div className="auth-brand"><img src="/logo.svg" alt="" /><span>JOVO</span></div>
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="story-copy">
          <span className="eyebrow">MULOQOT UCHUN YANGI MAKON</span>
          <h1>Yaqinlaringiz doimo yoningizda.</h1>
          <p>Tezkor xabarlar, toza dizayn va siz boshqaradigan shaxsiy makon.</p>
        </div>
        <div className="privacy-note"><span className="privacy-pulse" /> Mustaqil JOVO Messenger loyihasi</div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <div className="mobile-brand"><img src="/logo.svg" alt="" /><span>JOVO</span></div>

          {mode !== 'verify' && (
            <div className="auth-method-tabs" role="tablist" aria-label="Kirish usuli">
              <button type="button" role="tab" aria-selected={method === 'phone'} className={method === 'phone' ? 'active' : ''} onClick={() => switchMethod('phone')}>Telefon</button>
              <button type="button" role="tab" aria-selected={method === 'email'} className={method === 'email' ? 'active' : ''} onClick={() => switchMethod('email')}>Email</button>
            </div>
          )}

          {mode === 'login' && <>
            <span className="eyebrow purple">XUSH KELIBSIZ</span>
            <h2>Hisobingizga kiring</h2>
            <p className="muted">{method === 'phone' ? 'Telefon raqamingizga tasdiqlash kodi yuboramiz.' : 'Suhbatlaringizni davom ettirish uchun ma’lumotlarni kiriting.'}</p>
          </>}
          {mode === 'register' && <>
            <span className="eyebrow purple">YANGI HISOB</span>
            <h2>JOVO‘ga qo‘shiling</h2>
            <p className="muted">Bir daqiqada shaxsiy profilingizni yarating.</p>
          </>}
          {mode === 'verify' && <>
            <span className="eyebrow purple">TASDIQLASH</span>
            <h2>{method === 'phone' ? 'Raqamni tasdiqlang' : 'Emailni tasdiqlang'}</h2>
            <p className="muted"><strong>{verifyTarget}</strong> {method === 'phone' ? 'raqamiga' : 'manziliga'} yuborilgan 6 xonali kodni kiriting.</p>
          </>}

          {mode === 'register' && <>
            <label className="field"><span>Ismingiz</span><div><UserRound size={18}/><input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Masalan, Dilnoza" autoComplete="name" /></div></label>
            <label className="field"><span>Username</span><div><AtSign size={18}/><input required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="dilnoza_01" autoComplete="username" /></div></label>
          </>}

          {mode !== 'verify' && method === 'phone' && (
            <label className="field"><span>Telefon raqami</span>
              <div className="phone-input">
                <span className="phone-prefix" aria-label="Davlat: O‘zbekiston">🇺🇿 +998</span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="90 123 45 67"
                  autoComplete="tel-national"
                />
              </div>
            </label>
          )}

          {mode !== 'verify' && method === 'email' && <>
            <label className="field"><span>Email</span><div><Mail size={18}/><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@example.com" autoComplete="email" /></div></label>
            <label className="field"><span>Parol</span><div><LockKeyhole size={18}/><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 8 ta belgi va raqam" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><button type="button" className="icon-inline" onClick={() => setShowPassword(!showPassword)} aria-label="Parolni ko‘rsatish">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
          </>}

          {mode === 'verify' && <label className="field code-field"><span>Tasdiqlash kodi</span><div><input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" autoFocus /></div></label>}
          {devCode && mode === 'verify' && <div className="dev-code"><span>Faqat development rejimi:</span><button type="button" onClick={() => setCode(devCode)}>{devCode}</button></div>}
          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="primary-button" disabled={busy || (mode !== 'verify' && method === 'phone' && !phoneReady)} type="submit"><span>{submitLabel}</span><ArrowRight size={18}/></button>

          {mode === 'verify'
            ? <div className="auth-switch"><button type="button" onClick={() => switchMode('login')}>← Orqaga</button></div>
            : <div className="auth-switch">
                {mode === 'login'
                  ? <>Hisobingiz yo‘qmi? <button type="button" onClick={() => switchMode('register')}>Ro‘yxatdan o‘ting</button></>
                  : <>Hisobingiz bormi? <button type="button" onClick={() => switchMode('login')}>Kirish</button></>}
              </div>}
          {mode !== 'verify' && method === 'phone' && (
            <p className="phone-icon-note"><Phone size={14}/> Parolsiz — faqat SMS kod orqali kiriladi.</p>
          )}
        </form>
      </section>
    </main>
  );
}
