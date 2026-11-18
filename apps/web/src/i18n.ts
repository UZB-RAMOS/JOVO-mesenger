import { useAppStore } from './store';

const dictionaries = {
  uz: {
    chats: 'Suhbatlar', search: 'Qidirish', all: 'Barchasi', unread: "O‘qilmagan", newChat: 'Yangi suhbat',
    settings: 'Sozlamalar', logout: 'Chiqish', writeMessage: 'Xabar yozing…', send: 'Yuborish',
    noChats: 'Hali suhbatlar yo‘q', noChatsHint: 'Yangi suhbat boshlab, muloqotni boshlang.',
    chooseChat: 'Suhbatni tanlang', chooseChatHint: 'Xabar almashish uchun chap tomondagi suhbatni oching.',
    online: 'JOVO orqali', typing: 'yozmoqda…', loadOlder: 'Oldingi xabarlarni yuklash',
    profile: 'Profil', language: 'Til', appearance: 'Ko‘rinish', light: 'Yorug‘', dark: 'Qorong‘i',
    menu: 'Menyu', close: 'Yopish', info: 'Ma’lumot', searchMessages: 'Xabarlarni qidirish',
    results: 'ta natija', noResults: 'Mos xabar topilmadi', emoji: 'Emoji', notifications: 'Bildirishnomalar',
    muted: 'Ovozsiz', sharedMedia: 'Umumiy media', noMedia: 'Hali media yo‘q', noBio: 'Bio yozilmagan',
    accounts: 'Akkauntlar', addAccount: 'Akkaunt qo‘shish', addAccountHint: 'Boshqa JOVO akkauntiga kiring. Parol saqlanmaydi.',
    password: 'Parol', waiting: 'Kutilmoqda…', accountLoginFailed: 'Akkauntga kirib bo‘lmadi',
    reply: 'Javob berish', edit: 'Tahrirlash', delete: 'O‘chirish', edited: 'tahrirlandi', react: 'Reaksiya',
    replyTo: 'Javob:', editing: 'Xabar tahrirlanmoqda', cancel: 'Bekor qilish', messageActions: 'Xabar amallari',
    deleteConfirm: 'Bu xabar hamma uchun o‘chirilsinmi?',
  },
  ru: {
    chats: 'Чаты', search: 'Поиск', all: 'Все', unread: 'Непрочитанные', newChat: 'Новый чат',
    settings: 'Настройки', logout: 'Выйти', writeMessage: 'Напишите сообщение…', send: 'Отправить',
    noChats: 'Чатов пока нет', noChatsHint: 'Начните новый чат, чтобы общаться.',
    chooseChat: 'Выберите чат', chooseChatHint: 'Откройте чат слева, чтобы начать переписку.',
    online: 'в JOVO', typing: 'печатает…', loadOlder: 'Загрузить старые сообщения',
    profile: 'Профиль', language: 'Язык', appearance: 'Тема', light: 'Светлая', dark: 'Тёмная',
    menu: 'Меню', close: 'Закрыть', info: 'Информация', searchMessages: 'Поиск сообщений',
    results: 'результатов', noResults: 'Сообщения не найдены', emoji: 'Эмодзи', notifications: 'Уведомления',
    muted: 'Без звука', sharedMedia: 'Общие медиа', noMedia: 'Медиа пока нет', noBio: 'Описание отсутствует',
    accounts: 'Аккаунты', addAccount: 'Добавить аккаунт', addAccountHint: 'Войдите в другой аккаунт JOVO. Пароль не сохраняется.',
    password: 'Пароль', waiting: 'Подождите…', accountLoginFailed: 'Не удалось войти в аккаунт',
    reply: 'Ответить', edit: 'Изменить', delete: 'Удалить', edited: 'изменено', react: 'Реакция',
    replyTo: 'Ответ:', editing: 'Редактирование сообщения', cancel: 'Отмена', messageActions: 'Действия с сообщением',
    deleteConfirm: 'Удалить это сообщение для всех?',
  },
  en: {
    chats: 'Chats', search: 'Search', all: 'All', unread: 'Unread', newChat: 'New chat',
    settings: 'Settings', logout: 'Log out', writeMessage: 'Write a message…', send: 'Send',
    noChats: 'No chats yet', noChatsHint: 'Start a new chat to begin a conversation.',
    chooseChat: 'Choose a chat', chooseChatHint: 'Open a conversation from the left to start messaging.',
    online: 'on JOVO', typing: 'is typing…', loadOlder: 'Load older messages',
    profile: 'Profile', language: 'Language', appearance: 'Appearance', light: 'Light', dark: 'Dark',
    menu: 'Menu', close: 'Close', info: 'Info', searchMessages: 'Search messages',
    results: 'results', noResults: 'No matching messages', emoji: 'Emoji', notifications: 'Notifications',
    muted: 'Muted', sharedMedia: 'Shared media', noMedia: 'No media yet', noBio: 'No bio yet',
    accounts: 'Accounts', addAccount: 'Add account', addAccountHint: 'Sign in to another JOVO account. The password is not stored.',
    password: 'Password', waiting: 'Please wait…', accountLoginFailed: 'Could not sign in to the account',
    reply: 'Reply', edit: 'Edit', delete: 'Delete', edited: 'edited', react: 'React',
    replyTo: 'Reply to:', editing: 'Editing message', cancel: 'Cancel', messageActions: 'Message actions',
    deleteConfirm: 'Delete this message for everyone?',
  },
} as const;

export function useT() {
  const locale = useAppStore((state) => state.locale);
  return dictionaries[locale];
}
