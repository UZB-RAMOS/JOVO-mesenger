import {
  ArrowLeft, Bell, BellOff, Check, CheckCheck, ChevronDown, CircleCheck, Info,
  LockKeyhole, LogOut, Mail, Menu, MessageCirclePlus, MoreVertical, Moon, Pencil,
  Mic, MicOff, Phone, PhoneOff, Reply, Search, Send, Settings, Smile, Sun, Trash2,
  UserPlus, UserRound, Video, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { ChatSummary, MessageDto, PublicUser } from '@jovo/shared';
import { io, type Socket } from 'socket.io-client';
import { api, API_URL } from '../api';
import { useT } from '../i18n';
import { useAppStore } from '../store';
import { Avatar } from './Avatar';

type ChatDetails = Pick<ChatSummary, 'id' | 'title' | 'avatarUrl' | 'peer'> & {
  type: string;
  draft?: { content: string; updatedAt: string } | null;
};
type MessagePage = { items: MessageDto[]; nextCursor: string | null };
type LocalMessage = MessageDto & { pending?: boolean; failed?: boolean };
type CallState = { callId: string; mode: 'audio' | 'video'; status: 'calling' | 'incoming' | 'connecting' | 'active'; caller: boolean };

const timeFormatter = new Intl.DateTimeFormat('uz-UZ', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tashkent',
});
const dayFormatter = new Intl.DateTimeFormat('uz-UZ', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tashkent',
});

function messageDay(value: string) { return dayFormatter.format(new Date(value)); }

export function Messenger() {
  const t = useT();
  const { accessToken, user, accounts, switchAccount, clearSession } = useAppStore();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<ChatDetails | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [composer, setComposer] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageDto | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [error, setError] = useState('');
  const [callState, setCallState] = useState<CallState | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const callStateRef = useRef<CallState | null>(null);
  const editDraftRef = useRef('');
  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadingOlderRef = useRef(false);
  const nearBottomRef = useRef(true);
  const prependAnchorRef = useRef<{ id: string; top: number } | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const callHandlersRef = useRef<{ prepare: (callId: string) => Promise<RTCPeerConnection>; end: () => void; cancelEdit: () => void }>({
    prepare: async () => { throw new Error('Qo‘ng‘iroq hali tayyor emas'); }, end: () => undefined, cancelEdit: () => undefined,
  });

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  async function preparePeerConnection(callId: string) {
    const state = callStateRef.current;
    if (!state) throw new Error('Qo‘ng‘iroq holati topilmadi');
    if (peerConnectionRef.current) return peerConnectionRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: state.mode === 'video' });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    const configuredIceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
    const pc = new RTCPeerConnection({ iceServers: configuredIceServers });
    peerConnectionRef.current = pc;
    for (const track of stream.getTracks()) pc.addTrack(track, stream);
    pc.onicecandidate = (event) => { if (event.candidate) socketRef.current?.emit('call:signal', { callId, kind: 'ice', data: event.candidate }); };
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState((current) => current ? { ...current, status: 'active' } : current);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') cleanupCall();
    };
    return pc;
  }

  function cleanupCall() {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setCallState(null);
    setMicMuted(false);
    setCameraOff(false);
  }

  async function startCall(mode: 'audio' | 'video') {
    if (!activeChat || !activeId || !socketRef.current || !connected || !navigator.mediaDevices?.getUserMedia) {
      setError('Bu brauzerda media qo‘ng‘iroq mavjud emas');
      return;
    }
    try {
      const response = await new Promise<{ ok?: boolean; callId?: string; error?: string }>((resolve) => {
        socketRef.current!.timeout(8000).emit('call:initiate', { chatId: activeId, mode }, (timeout: Error | null, result: { ok?: boolean; callId?: string; error?: string }) => resolve(timeout ? { error: 'Server javob bermadi' } : result));
      });
      if (!response.ok || !response.callId) throw new Error(response.error === 'Band' ? 'Siz yoki suhbatdoshingiz hozir band' : response.error ?? 'Qo‘ng‘iroq boshlanmadi');
      const nextCall = { callId: response.callId, mode, status: 'calling' as const, caller: true };
      callStateRef.current = nextCall;
      setCallState(nextCall);
      await preparePeerConnection(response.callId);
    } catch (caught) {
      cleanupCall();
      setError(caught instanceof Error && caught.name === 'NotAllowedError' ? 'Mikrofon yoki kamera ruxsati berilmadi' : caught instanceof Error ? caught.message : 'Qo‘ng‘iroq boshlanmadi');
    }
  }

  async function acceptCall() {
    const state = callStateRef.current;
    if (!state || !socketRef.current) return;
    try {
      await preparePeerConnection(state.callId);
      socketRef.current.emit('call:accept', { callId: state.callId });
      const nextCall = { ...state, status: 'connecting' as const };
      callStateRef.current = nextCall;
      setCallState(nextCall);
    } catch (caught) {
      socketRef.current.emit('call:reject', { callId: state.callId });
      cleanupCall();
      setError(caught instanceof Error && caught.name === 'NotAllowedError' ? 'Mikrofon yoki kamera ruxsati berilmadi' : 'Qo‘ng‘iroqqa ulanib bo‘lmadi');
    }
  }

  function endCall() {
    const state = callStateRef.current;
    if (state) socketRef.current?.emit(state.caller && state.status === 'calling' ? 'call:reject' : 'call:end', { callId: state.callId });
    cleanupCall();
  }

  const loadChats = useCallback(async () => {
    try {
      const result = await api<ChatSummary[]>('/api/chats');
      setChats(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Suhbatlar yuklanmadi');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadChats(), 0);
    return () => window.clearTimeout(timer);
  }, [loadChats]);

  useEffect(() => {
    const socket = io(API_URL, { auth: { token: accessToken }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:created', (incoming: MessageDto) => {
      if (incoming.chatId === activeIdRef.current) {
        const shouldFollow = nearBottomRef.current;
        setMessages((current) => {
          const existing = current.findIndex((item) => item.id === incoming.id || item.clientMessageId === incoming.clientMessageId);
          if (existing >= 0) return current.map((item, index) => index === existing ? incoming : item);
          return [...current, incoming];
        });
        if (shouldFollow) window.requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
        else if (incoming.senderId !== user!.id) setNewMessageCount((count) => count + 1);
      }
      void loadChats();
    });
    const replaceMessage = (incoming: MessageDto) => {
      if (incoming.chatId === activeIdRef.current) {
        setMessages((current) => current.map((item) => item.id === incoming.id ? incoming : item));
      }
    };
    socket.on('message:edited', (incoming: MessageDto) => { replaceMessage(incoming); void loadChats(); });
    socket.on('message:deleted', (incoming: MessageDto) => { replaceMessage(incoming); void loadChats(); });
    socket.on('message:reactionAdded', replaceMessage);
    socket.on('message:reactionRemoved', replaceMessage);
    socket.on('chat:typing', (payload: { chatId: string; userId: string; active: boolean }) => {
      if (payload.chatId === activeIdRef.current && payload.userId !== user!.id) setTyping(payload.active);
    });
    socket.on('chat:read', (payload: { chatId: string }) => {
      if (payload.chatId === activeIdRef.current) setMessages((current) => [...current]);
    });
    socket.on('call:incoming', (payload: { callId: string; chatId: string; mode: 'audio' | 'video' }) => {
      const nextCall = { callId: payload.callId, mode: payload.mode, status: 'incoming' as const, caller: false };
      callStateRef.current = nextCall;
      setCallState(nextCall);
    });
    socket.on('call:accepted', async (payload: { callId: string }) => {
      if (callStateRef.current?.callId !== payload.callId) return;
      try {
        const pc = await callHandlersRef.current.prepare(payload.callId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('call:signal', { callId: payload.callId, kind: 'offer', data: offer });
        setCallState((state) => state ? { ...state, status: 'connecting' } : state);
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Qo‘ng‘iroq ulanmagan'); callHandlersRef.current.end(); }
    });
    socket.on('call:signal', async (payload: { callId: string; kind: 'offer' | 'answer' | 'ice'; data: any }) => {
      if (callStateRef.current?.callId !== payload.callId) return;
      try {
        const pc = peerConnectionRef.current ?? await callHandlersRef.current.prepare(payload.callId);
        if (payload.kind === 'offer') {
          await pc.setRemoteDescription(payload.data);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:signal', { callId: payload.callId, kind: 'answer', data: answer });
          setCallState((state) => state ? { ...state, status: 'connecting' } : state);
        } else if (payload.kind === 'answer') await pc.setRemoteDescription(payload.data);
        else await pc.addIceCandidate(payload.data);
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Qo‘ng‘iroq signali xato'); callHandlersRef.current.end(); }
    });
    socket.on('call:ended', () => cleanupCall());
    socket.on('call:timeout', () => { setError('Qo‘ng‘iroqqa javob berilmadi'); cleanupCall(); });
    socket.on('connect_error', () => setError('Real-time aloqa uzildi. Qayta ulanmoqda…'));
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [accessToken, loadChats, user]);

  useEffect(() => {
    if (!activeId) return;
    const timer = window.setTimeout(() => {
      void api(`/api/chats/${activeId}/draft`, {
        method: 'PUT',
        body: JSON.stringify({ content: composer }),
      }).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeId, composer]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        if (editingId || replyingTo) callHandlersRef.current.cancelEdit();
        setSideMenuOpen(false);
        setEmojiOpen(false);
        setChatSearchOpen(false);
        setInfoOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingId, replyingTo]);

  async function selectChat(chatId: string) {
    activeIdRef.current = chatId;
    setActiveId(chatId);
    setTyping(false);
    setInfoOpen(false);
    setChatSearchOpen(false);
    setMessageSearch('');
    setReplyingTo(null);
    setEditingId(null);
    setActionMessageId(null);
    setMessages([]);
    setNewMessageCount(0);
    nearBottomRef.current = true;
    setLoadingMessages(true);
    setError('');
    const localDraft = localStorage.getItem(`jovo-draft:${chatId}`) ?? '';
    setComposer(localDraft);
    try {
      const [chat, page] = await Promise.all([
        api<ChatDetails>(`/api/chats/${chatId}`),
        api<MessagePage>(`/api/chats/${chatId}/messages?limit=40`),
      ]);
      setActiveChat(chat);
      setComposer(chat.draft?.content ?? localDraft);
      setMessages(page.items);
      setNextCursor(page.nextCursor);
      const last = page.items.at(-1);
      if (last && last.senderId !== user!.id) {
        socketRef.current?.emit('chat:read', { chatId, messageId: last.id });
      }
      window.requestAnimationFrame(() => {
        if (activeIdRef.current === chatId) {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'instant' });
          nearBottomRef.current = true;
        }
      });
      void loadChats();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Xabarlar yuklanmadi');
    } finally {
      setLoadingMessages(false);
    }
  }

  async function loadOlder() {
    if (!activeId || !nextCursor || loadingOlderRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    loadingOlderRef.current = true;
    const firstMessage = container.querySelector<HTMLElement>('[data-message-id]');
    prependAnchorRef.current = firstMessage ? { id: firstMessage.dataset.messageId!, top: firstMessage.getBoundingClientRect().top } : null;
    setLoadingMessages(true);
    try {
      const page = await api<MessagePage>(`/api/chats/${activeId}/messages?limit=40&cursor=${encodeURIComponent(nextCursor)}`);
      setMessages((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...page.items.filter((item) => !existing.has(item.id)), ...current];
      });
      setNextCursor(page.nextCursor);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Xabarlar yuklanmadi');
    } finally { setLoadingMessages(false); loadingOlderRef.current = false; }
  }

  useEffect(() => {
    const container = scrollRef.current;
    const anchor = prependAnchorRef.current;
    if (!container || !anchor) return;
    const element = container.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(anchor.id)}"]`);
    if (element) container.scrollTop += element.getBoundingClientRect().top - anchor.top;
    prependAnchorRef.current = null;
  }, [messages]);

  function handleMessageScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.clientHeight - container.scrollTop;
    nearBottomRef.current = distance < 90;
    if (nearBottomRef.current) setNewMessageCount(0);
    if (container.scrollTop < 100 && nextCursor && !loadingOlderRef.current) void loadOlder();
  }

  function updateComposer(value: string) {
    setComposer(value);
    if (!activeId) return;
    localStorage.setItem(`jovo-draft:${activeId}`, value);
    socketRef.current?.emit('chat:typing', { chatId: activeId, active: Boolean(value) });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit('chat:typing', { chatId: activeId, active: false }), 1400);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = composer.trim();
    if (!content || !activeId || !activeChat || !socketRef.current) return;
    if (editingId) {
      if (savingEdit) return;
      setSavingEdit(true);
      try {
        await api<MessageDto>(`/api/messages/${editingId}`, { method: 'PATCH', body: JSON.stringify({ content }) });
        setComposer('');
        setEditingId(null);
        localStorage.removeItem(`jovo-draft:${activeId}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Xabar tahrirlanmadi');
      } finally {
        setSavingEdit(false);
      }
      return;
    }
    const clientMessageId = crypto.randomUUID();
    const pending: LocalMessage = {
      id: `pending-${clientMessageId}`, clientMessageId, chatId: activeId, senderId: user!.id, content,
      createdAt: new Date().toISOString(), editedAt: null, deletedAt: null, sender: user!, pending: true,
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, sender: replyingTo.sender } : null,
      reactions: [],
    };
    setMessages((current) => [...current, pending]);
    setComposer('');
    setReplyingTo(null);
    localStorage.removeItem(`jovo-draft:${activeId}`);
    socketRef.current.emit('chat:typing', { chatId: activeId, active: false });
    socketRef.current.timeout(8000).emit(
      'message:send',
      { chatId: activeId, clientMessageId, content, ...(replyingTo ? { replyToId: replyingTo.id } : {}) },
      (timeoutError: Error | null, response: { ok?: boolean; message?: MessageDto; error?: string }) => {
        if (timeoutError || !response?.ok || !response.message) {
          setMessages((current) => current.map((item) => item.clientMessageId === clientMessageId ? { ...item, pending: false, failed: true } : item));
          setError(response?.error ?? 'Xabar yuborilmadi. Aloqani tekshiring.');
          return;
        }
        setMessages((current) => current.map((item) => item.clientMessageId === clientMessageId ? response.message! : item));
      },
    );
    window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 20);
  }

  function startReply(message: MessageDto) {
    setReplyingTo(message);
    setEditingId(null);
    setActionMessageId(null);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  function startEdit(message: MessageDto) {
    editDraftRef.current = composer;
    setEditingId(message.id);
    setReplyingTo(null);
    setActionMessageId(null);
    setComposer(message.content);
    window.setTimeout(() => composerRef.current?.focus(), 0);
  }

  function cancelComposerAction() {
    setReplyingTo(null);
    if (editingId) setComposer(editDraftRef.current);
    setEditingId(null);
  }

  callHandlersRef.current = { prepare: preparePeerConnection, end: endCall, cancelEdit: cancelComposerAction };

  async function deleteMessage(message: MessageDto) {
    setActionMessageId(null);
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await api<MessageDto>(`/api/messages/${message.id}`, { method: 'DELETE' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Xabar o‘chirilmadi');
    }
  }

  async function toggleReaction(message: MessageDto, emoji: string) {
    setActionMessageId(null);
    const active = message.reactions.some((reaction) => reaction.emoji === emoji && reaction.userIds.includes(user!.id));
    try {
      await api<MessageDto>(`/api/messages/${message.id}/reactions${active ? `/${encodeURIComponent(emoji)}` : ''}`, {
        method: active ? 'DELETE' : 'POST',
        ...(active ? {} : { body: JSON.stringify({ emoji }) }),
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Reaksiya saqlanmadi');
    }
  }

  async function startChat(person: PublicUser) {
    try {
      const chat = await api<ChatDetails>('/api/chats/direct', { method: 'POST', body: JSON.stringify({ userId: person.id }) });
      setNewChatOpen(false);
      await loadChats();
      await selectChat(chat.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Suhbat ochilmadi'); }
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* local session still clears */ }
    socketRef.current?.disconnect();
    clearSession();
  }

  const visibleChats = useMemo(() => chats.filter((chat) => {
    const matchesSearch = chat.title.toLowerCase().includes(search.toLowerCase()) || chat.peer?.username.includes(search.toLowerCase());
    return matchesSearch && (filter === 'all' || chat.unreadCount > 0);
  }), [chats, search, filter]);

  const visibleMessages = useMemo(() => {
    const query = messageSearch.trim().toLocaleLowerCase();
    return query ? messages.filter((message) => message.content.toLocaleLowerCase().includes(query)) : messages;
  }, [messageSearch, messages]);

  return (
    <main className={`messenger-shell ${activeId ? 'mobile-chat-open' : ''} ${infoOpen ? 'info-open' : ''}`}>
      <aside className="chat-sidebar">
        <header className="sidebar-header">
          <button className="header-icon" onClick={() => setSideMenuOpen(true)} aria-label={t.menu}><Menu size={23}/></button>
          <div className="sidebar-brand"><img src="/logo.svg" alt=""/><strong>JOVO</strong></div>
          <button className="header-icon" onClick={() => setNewChatOpen(true)} aria-label={t.newChat}><MessageCirclePlus size={22}/></button>
        </header>
        <label className="search-box"><Search size={18}/><input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${t.search}…`} /><span className="search-hint">Ctrl K</span></label>
        <div className="filter-row">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t.all}<span>{chats.length}</span></button>
          <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>{t.unread}<span>{chats.filter((chat) => chat.unreadCount).length}</span></button>
        </div>
        <div className="chat-list">
          {loadingChats && [1,2,3,4].map((item) => <div className="chat-skeleton" key={item}><i/><div><b/><span/></div></div>)}
          {!loadingChats && visibleChats.map((chat) => (
            <button key={chat.id} className={`chat-item ${activeId === chat.id ? 'active' : ''}`} onClick={() => void selectChat(chat.id)}>
              <Avatar name={chat.title} src={chat.avatarUrl} />
              <span className="chat-copy"><span className="chat-line"><strong>{chat.title}</strong><time>{chat.lastMessage ? timeFormatter.format(new Date(chat.lastMessage.createdAt)) : ''}</time></span><span className="chat-line preview"><span>{chat.lastMessage?.senderId === user!.id ? 'Siz: ' : ''}{chat.lastMessage?.content ?? `@${chat.peer?.username}`}</span>{chat.unreadCount > 0 && <b>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</b>}</span></span>
            </button>
          ))}
          {!loadingChats && visibleChats.length === 0 && <div className="empty-list"><MessageCirclePlus size={32}/><strong>{t.noChats}</strong><p>{t.noChatsHint}</p><button onClick={() => setNewChatOpen(true)}>{t.newChat}</button></div>}
        </div>
        <div className="connection-state"><span className={connected ? 'connected' : ''}/>{connected ? 'Real-time aloqa faol' : 'Qayta ulanmoqda…'}</div>

        {sideMenuOpen && <>
          <button className="drawer-scrim" aria-label={t.close} onClick={() => setSideMenuOpen(false)}/>
          <section className="side-drawer" aria-label={t.menu}>
            <header>
              <Avatar name={user!.displayName} src={user!.avatarUrl} size="lg"/>
              <button className="header-icon" onClick={() => setSideMenuOpen(false)} aria-label={t.close}><X size={20}/></button>
              <strong>{user!.displayName}</strong>
              <span>@{user!.username}</span>
            </header>
            <div className="account-switcher">
              <span className="drawer-label">{t.accounts}</span>
              {accounts.map((account) => <button key={account.user.id} className={account.user.id === user!.id ? 'active' : ''} onClick={() => { setSideMenuOpen(false); switchAccount(account.user.id); }}>
                <Avatar name={account.user.displayName} src={account.user.avatarUrl}/>
                <span><strong>{account.user.displayName}</strong><small>@{account.user.username}</small></span>
                {account.user.id === user!.id && <CircleCheck size={18}/>} 
              </button>)}
              <button className="add-account-button" onClick={() => { setSideMenuOpen(false); setAddAccountOpen(true); }}><UserPlus size={20}/><span>{t.addAccount}</span></button>
            </div>
            <div className="drawer-separator"/>
            <button onClick={() => { setSideMenuOpen(false); setNewChatOpen(true); }}><MessageCirclePlus size={21}/>{t.newChat}</button>
            <button onClick={() => { setSideMenuOpen(false); setSettingsOpen(true); }}><Settings size={21}/>{t.settings}</button>
            {activeChat && <button onClick={() => { setSideMenuOpen(false); setInfoOpen(true); }}><UserRound size={21}/>{t.profile}</button>}
            <div className="drawer-separator"/>
            <button className="drawer-logout" onClick={() => void logout()}><LogOut size={21}/>{t.logout}</button>
          </section>
        </>}
      </aside>

      <section className="conversation">
        {!activeChat ? <div className="conversation-empty"><div className="empty-orbit"><img src="/logo.svg" alt="" /></div><h2>{t.chooseChat}</h2><p>{t.chooseChatHint}</p><button onClick={() => setNewChatOpen(true)}><MessageCirclePlus size={18}/>{t.newChat}</button></div> : <>
          <header className="conversation-header">
            <button className="mobile-back" onClick={() => { setActiveId(null); setActiveChat(null); activeIdRef.current = null; }} aria-label="Orqaga"><ArrowLeft size={22}/></button>
            <button className="profile-trigger" onClick={() => setInfoOpen((value) => !value)} aria-label={t.info}>
              <Avatar name={activeChat.title} src={activeChat.avatarUrl}/>
              <span className="conversation-person"><strong>{activeChat.title}</strong><span>{typing ? t.typing : `@${activeChat.peer?.username} · ${t.online}`}</span></span>
            </button>
            <div className="conversation-actions">
              <button onClick={() => void startCall('audio')} aria-label="Ovozli qo‘ng‘iroq"><Phone size={19}/></button>
              <button onClick={() => void startCall('video')} aria-label="Video qo‘ng‘iroq"><Video size={19}/></button>
              <button className={chatSearchOpen ? 'active' : ''} onClick={() => { setChatSearchOpen((value) => !value); setMessageSearch(''); }} aria-label={t.searchMessages}><Search size={21}/></button>
              <button className={infoOpen ? 'active' : ''} onClick={() => setInfoOpen((value) => !value)} aria-label={t.info}><Info size={21}/></button>
            </div>
          </header>
          {chatSearchOpen && <div className="chat-search-bar"><Search size={18}/><input autoFocus value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder={t.searchMessages}/><span>{messageSearch ? `${visibleMessages.length} ${t.results}` : ''}</span><button onClick={() => { setChatSearchOpen(false); setMessageSearch(''); }} aria-label={t.close}><X size={18}/></button></div>}
          {error && <div className="inline-error"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
          <div className="message-scroll" ref={scrollRef} onScroll={handleMessageScroll}>
            {nextCursor && <button className="older-button" disabled={loadingMessages} onClick={() => void loadOlder()}><ChevronDown size={15}/>{t.loadOlder}</button>}
            {loadingMessages && messages.length === 0 && <div className="message-loading"><span/><span/><span/></div>}
            {messageSearch && visibleMessages.length === 0 && <div className="search-no-results"><Search size={28}/><span>{t.noResults}</span></div>}
            {visibleMessages.map((message, index) => {
              const mine = message.senderId === user!.id;
              const day = messageDay(message.createdAt);
              const previousDay = index ? messageDay(visibleMessages[index - 1]!.createdAt) : '';
              return <div key={message.id}>
                {day !== previousDay && <div className="date-divider"><span>{day}</span></div>}
                <div className={`message-row ${mine ? 'mine' : ''}`} data-message-id={message.id}>
                  {!mine && <Avatar name={message.sender.displayName} src={message.sender.avatarUrl} size="sm" />}
                  <div className="message-shell">
                    <div className={`message-bubble ${message.failed ? 'failed' : ''} ${message.deletedAt ? 'deleted' : ''}`}>
                      {!mine && <strong className="message-author">{message.sender.displayName}</strong>}
                      {message.replyTo && <button className="reply-preview" onClick={() => document.getElementById(`message-${message.replyTo!.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}><strong>{message.replyTo.sender.displayName}</strong><span>{message.replyTo.content}</span></button>}
                      <p id={`message-${message.id}`}>{message.content}</p>
                      <span className="message-meta">{message.editedAt && !message.deletedAt && <em>{t.edited}</em>}<time>{timeFormatter.format(new Date(message.createdAt))}</time>{mine && (message.pending ? <Check size={14}/> : <CheckCheck size={14}/>)}</span>
                      {message.reactions.length > 0 && <div className="message-reactions">{message.reactions.map((reaction) => <button key={reaction.emoji} className={reaction.userIds.includes(user!.id) ? 'active' : ''} onClick={() => void toggleReaction(message, reaction.emoji)}><span>{reaction.emoji}</span><b>{reaction.count}</b></button>)}</div>}
                    </div>
                    {!message.pending && !message.deletedAt && <button className="message-action-button" aria-label={t.messageActions} aria-expanded={actionMessageId === message.id} onClick={() => setActionMessageId((current) => current === message.id ? null : message.id)}><MoreVertical size={17}/></button>}
                    {actionMessageId === message.id && <div className="message-action-menu" role="menu">
                      <div className="quick-reactions">{['👍','❤️','😂','🔥','👏'].map((emoji) => <button key={emoji} onClick={() => void toggleReaction(message, emoji)} aria-label={`${t.react}: ${emoji}`}>{emoji}</button>)}</div>
                      <button role="menuitem" onClick={() => startReply(message)}><Reply size={16}/>{t.reply}</button>
                      {mine && <button role="menuitem" onClick={() => startEdit(message)}><Pencil size={16}/>{t.edit}</button>}
                      {mine && <button role="menuitem" className="danger" onClick={() => void deleteMessage(message)}><Trash2 size={16}/>{t.delete}</button>}
                    </div>}
                  </div>
                </div>
              </div>;
            })}
            {typing && <div className="typing-bubble"><span/><span/><span/></div>}
            <div ref={bottomRef}/>
            {newMessageCount > 0 && <button className="new-messages-button" onClick={() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); setNewMessageCount(0); nearBottomRef.current = true; }}>{newMessageCount} ta yangi xabar ↓</button>}
          </div>
          <form className="composer" onSubmit={(event) => void sendMessage(event)}>
            <div className="composer-column">
              {(replyingTo || editingId) && <div className="composer-context"><span>{editingId ? <Pencil size={17}/> : <Reply size={17}/>}</span><div><strong>{editingId ? t.editing : `${t.replyTo} ${replyingTo!.sender.displayName}`}</strong><small>{editingId ? composer : replyingTo!.content}</small></div><button type="button" onClick={cancelComposerAction} aria-label={t.cancel}><X size={18}/></button></div>}
              <div className="composer-box">
              <button type="button" className="composer-icon" onClick={() => setEmojiOpen((value) => !value)} aria-label={t.emoji}><Smile size={22}/></button>
              {emojiOpen && <div className="emoji-picker" role="dialog" aria-label={t.emoji}>{['😀','😂','😍','👍','❤️','🔥','👏','🎉','🤝','😎','🙏','✨'].map((emoji) => <button type="button" key={emoji} onClick={() => { updateComposer(`${composer}${emoji}`); setEmojiOpen(false); }}>{emoji}</button>)}</div>}
              <textarea ref={composerRef} rows={1} value={composer} onChange={(e) => updateComposer(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} placeholder={editingId ? t.editing : t.writeMessage} aria-label={t.writeMessage}/>
              </div>
            </div>
            <button className="send-button" type="submit" disabled={!composer.trim() || !connected || savingEdit} aria-label={t.send}><Send size={20}/></button>
          </form>
        </>}
      </section>

      {activeChat && <aside className="info-pane" aria-label={t.info}>
        <header><strong>{t.info}</strong><button className="header-icon" onClick={() => setInfoOpen(false)} aria-label={t.close}><X size={21}/></button></header>
        <div className="info-profile"><Avatar name={activeChat.title} src={activeChat.avatarUrl} size="lg"/><h2>{activeChat.title}</h2><span>@{activeChat.peer?.username}</span><p>{activeChat.peer?.bio || t.noBio}</p></div>
        <div className="info-actions">
          <button onClick={() => setMuted((value) => !value)}>{muted ? <BellOff size={21}/> : <Bell size={21}/>}<span>{muted ? t.muted : t.notifications}</span></button>
          <button onClick={() => { setChatSearchOpen(true); setInfoOpen(false); }}><Search size={21}/><span>{t.search}</span></button>
        </div>
        <section className="info-section"><strong>{t.sharedMedia}</strong><div className="media-empty">{t.noMedia}</div></section>
      </aside>}

      {newChatOpen && <NewChatDialog onClose={() => setNewChatOpen(false)} onStart={startChat}/>} 
      {addAccountOpen && <AddAccountDialog onClose={() => setAddAccountOpen(false)}/>} 
      {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} onLogout={logout}/>} 
      {callState && <div className="call-overlay" role="dialog" aria-modal="true" aria-label="Qo‘ng‘iroq">
        <div className="call-card">
          <div className="call-videos"><video ref={remoteVideoRef} autoPlay playsInline/><video ref={localVideoRef} autoPlay muted playsInline/></div>
          <Avatar name={activeChat?.title ?? user!.displayName} src={activeChat?.avatarUrl ?? user!.avatarUrl} size="lg"/>
          <h2>{activeChat?.title ?? user!.displayName}</h2>
          <p>{callState.status === 'incoming' ? 'Kiruvchi qo‘ng‘iroq' : callState.status === 'calling' ? 'Chaqirilmoqda…' : callState.status === 'connecting' ? 'Ulanmoqda…' : 'Qo‘ng‘iroq faol'}</p>
          <div className="call-controls">
            {callState.status === 'incoming' && <button className="accept-call" onClick={() => void acceptCall()} aria-label="Qabul qilish"><Phone size={21}/></button>}
            {callState.status !== 'incoming' && <button className={micMuted ? 'control-active' : ''} onClick={() => { const next = !micMuted; setMicMuted(next); localStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); }} aria-label={micMuted ? 'Mikrofonni yoqish' : 'Mikrofonni o‘chirish'}>{micMuted ? <MicOff/> : <Mic/>}</button>}
            {callState.mode === 'video' && callState.status !== 'incoming' && <button className={cameraOff ? 'control-active' : ''} onClick={() => { const next = !cameraOff; setCameraOff(next); localStreamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; }); }} aria-label={cameraOff ? 'Kamerani yoqish' : 'Kamerani o‘chirish'}><Video/></button>}
            <button className="end-call" onClick={endCall} aria-label={callState.status === 'incoming' ? 'Rad etish' : 'Qo‘ng‘iroqni tugatish'}><PhoneOff size={21}/></button>
          </div>
        </div>
      </div>}
    </main>
  );
}

function AddAccountDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const setSession = useAppStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ accessToken: string; user: PublicUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(result.accessToken, result.user);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.accountLoginFailed);
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="dialog account-dialog" role="dialog" aria-modal="true" aria-labelledby="add-account-title" onSubmit={submit}>
      <header><div><span className="section-kicker">JOVO</span><h2 id="add-account-title">{t.addAccount}</h2></div><button type="button" className="round-button" onClick={onClose} aria-label={t.close}><X size={20}/></button></header>
      <p className="dialog-copy">{t.addAccountHint}</p>
      <label className="field"><span>Email</span><div><Mail size={18}/><input required autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="bobur@example.com" autoComplete="email"/></div></label>
      <label className="field"><span>{t.password}</span><div><LockKeyhole size={18}/><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password"/></div></label>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button className="primary-button" disabled={busy} type="submit"><span>{busy ? t.waiting : t.addAccount}</span><UserPlus size={18}/></button>
    </form>
  </div>;
}

function NewChatDialog({ onClose, onStart }: { onClose: () => void; onStart: (user: PublicUser) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true); setError('');
      try { setResults(await api<PublicUser[]>(`/api/users?search=${encodeURIComponent(query)}`)); }
      catch (caught) { setError(caught instanceof Error ? caught.message : 'Qidiruv ishlamadi'); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="new-chat-title">
      <header><div><span className="section-kicker">YANGI MULOQOT</span><h2 id="new-chat-title">Foydalanuvchini toping</h2></div><button className="round-button" onClick={onClose}><X size={20}/></button></header>
      <label className="search-box large"><Search size={18}/><input autoFocus value={query} onChange={(e) => { const value = e.target.value; setQuery(value); setError(''); if (value.trim().length < 2) setResults([]); }} placeholder="Ism yoki @username…" /></label>
      <div className="user-results">
        {query.length < 2 && <div className="search-empty"><Search size={28}/><p>Qidirish uchun kamida 2 ta belgi kiriting.</p></div>}
        {loading && <div className="search-empty"><div className="mini-loader"/><p>Qidirilmoqda…</p></div>}
        {error && <div className="form-error">{error}</div>}
        {!loading && query.length >= 2 && results.length === 0 && !error && <div className="search-empty"><p>Hech kim topilmadi.</p></div>}
        {results.map((person) => <button className="user-result" key={person.id} onClick={() => void onStart(person)}><Avatar name={person.displayName} src={person.avatarUrl}/><span><strong>{person.displayName}</strong><small>@{person.username}</small></span><ArrowLeft className="result-arrow" size={18}/></button>)}
      </div>
    </section>
  </div>;
}

function SettingsDialog({ onClose, onLogout }: { onClose: () => void; onLogout: () => void }) {
  const t = useT();
  const { user, locale, theme, setLocale, setTheme } = useAppStore();
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="dialog settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><div><span className="section-kicker">JOVO</span><h2 id="settings-title">{t.settings}</h2></div><button className="round-button" onClick={onClose}><X size={20}/></button></header>
      <div className="settings-profile"><Avatar name={user!.displayName} src={user!.avatarUrl} size="lg"/><div><strong>{user!.displayName}</strong><span>@{user!.username}</span></div></div>
      <div className="setting-group"><label>{t.language}</label><div className="segmented">{(['uz','ru','en'] as const).map((item) => <button key={item} className={locale === item ? 'active' : ''} onClick={() => setLocale(item)}>{item.toUpperCase()}</button>)}</div></div>
      <div className="setting-group"><label>{t.appearance}</label><div className="segmented"><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun size={16}/>{t.light}</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon size={16}/>{t.dark}</button></div></div>
      <button className="logout-button" onClick={() => void onLogout()}><LogOut size={18}/>{t.logout}</button>
    </section>
  </div>;
}
