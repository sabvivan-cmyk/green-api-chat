import { Chat, ChatMessage } from './model'
import { appendMessageToChat } from './messageState'

const chat: Chat = {
  chatId: '123456789012345@lid',
  phoneNumber: '79001234567',
  title: 'Анна',
  messages: [],
}
const outgoingMessage: ChatMessage = {
  id: 'outgoing-id',
  direction: 'outgoing',
  text: 'Привет',
  timestamp: 1,
  status: 'accepted',
}

describe('appendMessageToChat', () => {
  it('adds a message only to the addressed chat', () => {
    const otherChat: Chat = {
      ...chat,
      chatId: '987654321012345@lid',
      phoneNumber: '79007654321',
      title: 'Борис',
    }
    const result = appendMessageToChat(
      [chat, otherChat],
      chat.chatId,
      outgoingMessage,
    )

    expect(result[0].messages).toEqual([outgoingMessage])
    expect(result[1].messages).toEqual([])
  })

  it('deduplicates outgoing messages by idMessage inside a chat', () => {
    const once = appendMessageToChat([chat], chat.chatId, outgoingMessage)
    const twice = appendMessageToChat(once, chat.chatId, outgoingMessage)

    expect(twice[0].messages).toHaveLength(1)
  })
})
