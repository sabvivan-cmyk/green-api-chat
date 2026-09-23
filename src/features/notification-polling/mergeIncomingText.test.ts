import { Chat } from '../../entities/chat/model'
import { IncomingTextNotification } from './notificationParser'
import { mergeIncomingText } from './mergeIncomingText'

const existingChat: Chat = {
  chatId: '123456789012345@lid',
  phoneNumber: '79001234567',
  title: '+79001234567',
  messages: [],
}
const incomingNotification: IncomingTextNotification = {
  chatId: '79001234567@c.us',
  phoneNumber: '79001234567',
  idMessage: 'incoming-message-id',
  text: 'Ответ',
  timestamp: 1_588_091_580_000,
  title: 'Иван',
}

describe('mergeIncomingText', () => {
  it('routes a c.us notification to an existing lid chat by phone number', () => {
    const result = mergeIncomingText([existingChat], incomingNotification)

    expect(result).toHaveLength(1)
    expect(result[0].chatId).toBe('123456789012345@lid')
    expect(result[0].knownChatIds).toEqual([
      '123456789012345@lid',
      '79001234567@c.us',
    ])
    expect(result[0].title).toBe('Иван')
    expect(result[0].messages).toEqual([
      expect.objectContaining({ id: 'incoming-message-id', text: 'Ответ' }),
    ])
  })

  it('does not add the same incoming message twice', () => {
    const once = mergeIncomingText([existingChat], incomingNotification)
    const twice = mergeIncomingText(once, incomingNotification)

    expect(twice).toBe(once)
    expect(twice[0].messages).toHaveLength(1)
  })

  it('consolidates existing exact and phone-alias chats', () => {
    const exactChat: Chat = {
      ...existingChat,
      chatId: '79001234567@c.us',
      title: 'Точный чат',
    }
    const result = mergeIncomingText(
      [existingChat, exactChat],
      incomingNotification,
    )

    expect(result).toHaveLength(1)
    expect(result[0].chatId).toBe('123456789012345@lid')
    expect(result[0].knownChatIds).toEqual([
      '123456789012345@lid',
      '79001234567@c.us',
    ])
    expect(result[0].messages).toHaveLength(1)
  })

  it('does not match different phone numbers', () => {
    const differentContact: Chat = {
      ...existingChat,
      phoneNumber: '179001234567',
    }
    const result = mergeIncomingText(
      [differentContact],
      incomingNotification,
    )

    expect(result).toHaveLength(2)
    expect(result[0].messages).toEqual([])
    expect(result[1].chatId).toBe('79001234567@c.us')
  })
})
