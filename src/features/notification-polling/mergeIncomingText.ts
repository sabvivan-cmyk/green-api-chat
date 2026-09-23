import { Chat, ChatMessage } from '../../entities/chat/model'
import { mergeContactChat } from '../../entities/chat/contactState'
import { IncomingTextNotification } from './notificationParser'

export function mergeIncomingText(
  chats: Chat[],
  notification: IncomingTextNotification,
) {
  const incomingMessage: ChatMessage = {
    id: notification.idMessage,
    direction: 'incoming',
    text: notification.text,
    timestamp: notification.timestamp,
    status: 'received',
  }

  return mergeContactChat(chats, {
    chatId: notification.chatId,
    knownChatIds: [notification.chatId],
    phoneNumber: notification.phoneNumber,
    title: notification.title,
    messages: [incomingMessage],
  }).chats
}
