import { Chat, ChatMessage } from '../../entities/chat/model'
import { appendMessageToChat } from '../../entities/chat/messageState'
import { IncomingTextNotification } from './notificationParser'

export function mergeIncomingText(
  chats: Chat[],
  notification: IncomingTextNotification,
) {
  const exactChat = chats.find((chat) => chat.chatId === notification.chatId)
  const aliasChat = exactChat
    ? undefined
    : chats.find((chat) => {
        const isAliasPair =
          (chat.chatId.endsWith('@lid') &&
            notification.chatId.endsWith('@c.us')) ||
          (chat.chatId.endsWith('@c.us') &&
            notification.chatId.endsWith('@lid'))

        return (
          isAliasPair &&
          notification.phoneNumber !== null &&
          chat.phoneNumber === notification.phoneNumber
        )
      })
  const existingChat = exactChat ?? aliasChat
  const incomingMessage: ChatMessage = {
    id: notification.idMessage,
    direction: 'incoming',
    text: notification.text,
    timestamp: notification.timestamp,
    status: 'received',
  }

  if (!existingChat) {
    return [
      ...chats,
      {
        chatId: notification.chatId,
        phoneNumber: notification.phoneNumber,
        title: notification.title,
        messages: [incomingMessage],
      },
    ]
  }

  return appendMessageToChat(chats, existingChat.chatId, incomingMessage)
}
