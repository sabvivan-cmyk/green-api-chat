import { parseIncomingTextNotification } from './notificationParser'

function createTextBody() {
  return {
    typeWebhook: 'incomingMessageReceived',
    instanceData: { typeInstance: 'whatsapp' },
    timestamp: 1_588_091_580,
    idMessage: 'incoming-message-id',
    senderData: {
      chatId: '79001234567@c.us',
      sender: '79001234567@c.us',
      senderName: 'Иван',
    },
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: { textMessage: 'Ответ' },
    },
  }
}

describe('parseIncomingTextNotification', () => {
  it('normalizes a WhatsApp incoming text notification', () => {
    expect(parseIncomingTextNotification(createTextBody())).toEqual({
      chatId: '79001234567@c.us',
      idMessage: 'incoming-message-id',
      phoneNumber: '79001234567',
      text: 'Ответ',
      timestamp: 1_588_091_580_000,
      title: 'Иван',
    })
  })

  it.each([
    ['status', { ...createTextBody(), typeWebhook: 'outgoingMessageStatus' }],
    [
      'file',
      {
        ...createTextBody(),
        messageData: { typeMessage: 'imageMessage', fileMessageData: {} },
      },
    ],
    [
      'empty text',
      {
        ...createTextBody(),
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: '   ' },
        },
      },
    ],
    [
      'group text',
      {
        ...createTextBody(),
        senderData: {
          chatId: '120363043968066561@g.us',
          sender: '79001234567@c.us',
          senderName: 'Иван',
        },
      },
    ],
  ])('ignores a %s notification', (_name, body) => {
    expect(parseIncomingTextNotification(body)).toBeNull()
  })
})
