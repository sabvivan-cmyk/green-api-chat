import { Chat } from './model'
import { isSameContact, mergeContactChat } from './contactState'

describe('contactState', () => {
  it('merges confirmed aliases without losing, duplicating, or reordering messages', () => {
    const chats: Chat[] = [
      {
        chatId: '79991234567@c.us',
        phoneNumber: '79991234567',
        title: 'Иван',
        messages: [
          {
            id: 'later',
            direction: 'incoming',
            text: 'Позже',
            timestamp: 200,
            status: 'received',
          },
        ],
      },
      {
        chatId: '123456789012345@lid',
        phoneNumber: '79991234567',
        title: '+79991234567',
        messages: [
          {
            id: 'earlier',
            direction: 'outgoing',
            text: 'Раньше',
            timestamp: 100,
            status: 'accepted',
          },
          {
            id: 'later',
            direction: 'incoming',
            text: 'Дубликат',
            timestamp: 200,
            status: 'received',
          },
        ],
      },
    ]

    const result = mergeContactChat(
      chats,
      {
        chatId: '123456789012345@lid',
        phoneNumber: '79991234567',
        title: '+79991234567',
        messages: [],
      },
      { preferredChatId: '123456789012345@lid' },
    )

    expect(result.chats).toHaveLength(1)
    expect(result.chat).toMatchObject({
      chatId: '123456789012345@lid',
      knownChatIds: ['79991234567@c.us', '123456789012345@lid'],
      phoneNumber: '79991234567',
      title: 'Иван',
    })
    expect(result.chat.messages.map((message) => message.id)).toEqual([
      'earlier',
      'later',
    ])
    expect(result.chat.messages[1].text).toBe('Позже')
  })

  it('does not match contacts by a partial numeric overlap', () => {
    const chat: Chat = {
      chatId: '123456789012345@lid',
      phoneNumber: '79991234567',
      title: 'Первый контакт',
      messages: [],
    }

    expect(
      isSameContact(chat, {
        chatId: '179991234567@c.us',
        phoneNumber: '179991234567',
      }),
    ).toBe(false)
  })
})
