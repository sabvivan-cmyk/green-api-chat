import { Chat } from './model'

export function getChatAvatarInitial(
  chat: Pick<Chat, 'chatId' | 'phoneNumber' | 'title'>,
) {
  const title = chat.title.trim()
  const isPhoneFallback =
    /^\+?\d+$/.test(title) ||
    (chat.phoneNumber !== null &&
      (title === chat.phoneNumber || title === `+${chat.phoneNumber}`))

  if (!title || title === chat.chatId || isPhoneFallback) {
    return null
  }

  return Array.from(title)[0]?.toLocaleUpperCase('ru') ?? null
}
