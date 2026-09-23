import { Chat, ChatMessage } from './model'

export function appendMessageToChat(
  chats: Chat[],
  chatId: string,
  message: ChatMessage,
) {
  const targetChat = chats.find((chat) => chat.chatId === chatId)

  if (
    !targetChat ||
    targetChat.messages.some(
      (currentMessage) => currentMessage.id === message.id,
    )
  ) {
    return chats
  }

  return chats.map((chat) => {
    if (chat.chatId !== chatId) {
      return chat
    }

    return { ...chat, messages: [...chat.messages, message] }
  })
}
