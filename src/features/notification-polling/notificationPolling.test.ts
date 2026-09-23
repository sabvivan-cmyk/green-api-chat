import { runNotificationPolling } from './notificationPolling'

const credentials = {
  apiUrl: 'https://7103.api.greenapi.com',
  idInstance: '1101000001',
  apiTokenInstance: 'secret-token',
}

const textNotification = {
  receiptId: 42,
  body: {
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
  },
}

describe('runNotificationPolling', () => {
  it('retries DeleteNotification without processing the message twice', async () => {
    const controller = new AbortController()
    const calls: string[] = []
    const receive = vi
      .fn()
      .mockImplementationOnce(async () => {
        calls.push('receive')
        return textNotification
      })
      .mockImplementationOnce(async () => {
        calls.push('receive-next')
        controller.abort()
        return null
      })
    const remove = vi
      .fn()
      .mockImplementationOnce(async () => {
        calls.push('delete-failed')
        throw new Error('delete failed')
      })
      .mockImplementationOnce(async () => {
        calls.push('delete-success')
      })
    const onIncomingText = vi.fn(() => calls.push('process'))

    await runNotificationPolling({
      credentials,
      signal: controller.signal,
      onIncomingText,
      onError: vi.fn(),
      dependencies: {
        receive,
        remove,
        wait: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(calls).toEqual([
      'receive',
      'process',
      'delete-failed',
      'delete-success',
      'receive-next',
    ])
    expect(onIncomingText).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('deletes a service event without passing it to the chat handler', async () => {
    const controller = new AbortController()
    const receive = vi
      .fn()
      .mockResolvedValueOnce({
        receiptId: 7,
        body: { typeWebhook: 'outgoingMessageStatus' },
      })
      .mockResolvedValueOnce({
        receiptId: 8,
        body: {
          typeWebhook: 'incomingMessageReceived',
          senderData: { chatId: '79001234567@c.us' },
          messageData: { typeMessage: 'imageMessage' },
        },
      })
      .mockImplementationOnce(async () => {
        controller.abort()
        return null
      })
    const remove = vi.fn().mockResolvedValue(undefined)
    const onIncomingText = vi.fn()

    await runNotificationPolling({
      credentials,
      signal: controller.signal,
      onIncomingText,
      onError: vi.fn(),
      dependencies: {
        receive,
        remove,
        wait: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(onIncomingText).not.toHaveBeenCalled()
    expect(remove).toHaveBeenCalledWith(credentials, 7, controller.signal)
    expect(remove).toHaveBeenCalledWith(credentials, 8, controller.signal)
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it('processes multiple notifications strictly receive-process-delete in order', async () => {
    const controller = new AbortController()
    const calls: string[] = []
    const secondNotification = {
      ...textNotification,
      receiptId: 43,
      body: {
        ...textNotification.body,
        idMessage: 'second-message-id',
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: 'Второй ответ' },
        },
      },
    }
    const receive = vi
      .fn()
      .mockImplementationOnce(async () => {
        calls.push('receive-42')
        return textNotification
      })
      .mockImplementationOnce(async () => {
        calls.push('receive-43')
        return secondNotification
      })
      .mockImplementationOnce(async () => {
        controller.abort()
        return null
      })
    const remove = vi.fn(async (_credentials, receiptId: number) => {
      calls.push(`delete-${receiptId}`)
    })
    const onIncomingText = vi.fn((message) => {
      calls.push(`process-${message.idMessage}`)
    })

    await runNotificationPolling({
      credentials,
      signal: controller.signal,
      onIncomingText,
      onError: vi.fn(),
      dependencies: {
        receive,
        remove,
        wait: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(calls).toEqual([
      'receive-42',
      'process-incoming-message-id',
      'delete-42',
      'receive-43',
      'process-second-message-id',
      'delete-43',
    ])
  })

  it('waits before retrying ReceiveNotification after a network error', async () => {
    const controller = new AbortController()
    const calls: string[] = []
    const receive = vi
      .fn()
      .mockImplementationOnce(async () => {
        calls.push('receive-failed')
        throw new Error('network error')
      })
      .mockImplementationOnce(async () => {
        calls.push('receive-retry')
        controller.abort()
        return null
      })
    const wait = vi.fn(async (milliseconds: number) => {
      calls.push(`wait-${milliseconds}`)
    })

    await runNotificationPolling({
      credentials,
      signal: controller.signal,
      onIncomingText: vi.fn(),
      onError: vi.fn(),
      dependencies: {
        receive,
        remove: vi.fn(),
        wait,
      },
    })

    expect(calls).toEqual([
      'receive-failed',
      'wait-2000',
      'receive-retry',
    ])
  })
})
