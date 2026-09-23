import type {
  CheckWhatsappResponse,
  NotificationEnvelope,
} from './greenApi'

const MOCK_RECEIVE_DELAY_MS = 250
const MOCK_REPLY_DELAY_MS = 600

let notificationQueue: NotificationEnvelope[] = []
let messageCounter = 0
let receiptCounter = 0

function nextId(prefix: string) {
  messageCounter += 1
  return `${prefix}-${messageCounter}`
}

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve()
      return
    }

    const handleAbort = () => {
      clearTimeout(timeoutId)
      resolve()
    }
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, milliseconds)

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

function enqueueEcho(chatId: string, message: string) {
  window.setTimeout(() => {
    receiptCounter += 1
    const phoneNumber = chatId.endsWith('@c.us')
      ? chatId.slice(0, -'@c.us'.length)
      : chatId

    notificationQueue.push({
      receiptId: receiptCounter,
      body: {
        typeWebhook: 'incomingMessageReceived',
        instanceData: {
          idInstance: 1,
          wid: '70000000000@c.us',
          typeInstance: 'whatsapp',
        },
        timestamp: Math.floor(Date.now() / 1000),
        idMessage: nextId('mock-incoming'),
        senderData: {
          chatId,
          sender: chatId,
          senderName: `Mock +${phoneNumber}`,
        },
        messageData: {
          typeMessage: 'textMessage',
          textMessageData: { textMessage: `Эхо: ${message}` },
        },
      },
    })
  }, MOCK_REPLY_DELAY_MS)
}

export function resetMockGreenApi() {
  notificationQueue = []
  messageCounter = 0
  receiptCounter = 0
}

export function mockGetStateInstance() {
  resetMockGreenApi()
  return 'authorized' as const
}

export function mockCheckWhatsapp(
  phoneNumber: string,
): CheckWhatsappResponse {
  return {
    existsWhatsapp: true,
    chatId: `${phoneNumber}@c.us`,
    username: `Mock +${phoneNumber}`,
    phoneNumber: `${phoneNumber}@c.us`,
    fromCache: false,
  }
}

export function mockSendTextMessage(chatId: string, message: string) {
  const idMessage = nextId('mock-outgoing')
  enqueueEcho(chatId, message)
  return idMessage
}

export async function mockReceiveNotification(signal?: AbortSignal) {
  if (!notificationQueue[0]) {
    await wait(MOCK_RECEIVE_DELAY_MS, signal)
  }

  return signal?.aborted ? null : (notificationQueue[0] ?? null)
}

export function mockDeleteNotification(receiptId: number) {
  if (notificationQueue[0]?.receiptId !== receiptId) {
    throw new Error('Mock notification receiptId не найден.')
  }

  notificationQueue.shift()
}
