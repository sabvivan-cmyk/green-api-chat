export interface IncomingTextNotification {
  chatId: string
  idMessage: string
  text: string
  timestamp: number
  title: string
  phoneNumber: string | null
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function getString(record: UnknownRecord, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value : null
}

function extractPhoneNumber(identifier: string | null) {
  if (!identifier?.endsWith('@c.us')) {
    return null
  }

  const phoneNumber = identifier.slice(0, -'@c.us'.length)
  return /^\d+$/.test(phoneNumber) ? phoneNumber : null
}

export function parseIncomingTextNotification(
  body: unknown,
): IncomingTextNotification | null {
  if (!isRecord(body) || body.typeWebhook !== 'incomingMessageReceived') {
    return null
  }

  if (
    isRecord(body.instanceData) &&
    body.instanceData.typeInstance !== undefined &&
    body.instanceData.typeInstance !== 'whatsapp'
  ) {
    return null
  }

  if (!isRecord(body.senderData) || !isRecord(body.messageData)) {
    return null
  }

  if (
    body.messageData.typeMessage !== 'textMessage' ||
    !isRecord(body.messageData.textMessageData)
  ) {
    return null
  }

  const chatId = getString(body.senderData, 'chatId')?.trim()
  const idMessage = getString(body, 'idMessage')?.trim()
  const text = getString(
    body.messageData.textMessageData,
    'textMessage',
  )

  const isPersonalChat =
    chatId?.endsWith('@c.us') || chatId?.endsWith('@lid')

  if (!chatId || !isPersonalChat || !idMessage || !text?.trim()) {
    return null
  }

  const sender = getString(body.senderData, 'sender')
  const phoneNumber =
    extractPhoneNumber(sender) ?? extractPhoneNumber(chatId)
  const title =
    getString(body.senderData, 'senderContactName')?.trim() ||
    getString(body.senderData, 'senderName')?.trim() ||
    getString(body.senderData, 'chatName')?.trim() ||
    (phoneNumber ? `+${phoneNumber}` : chatId)
  const timestamp =
    typeof body.timestamp === 'number' && Number.isFinite(body.timestamp)
      ? body.timestamp * 1000
      : Date.now()

  return {
    chatId,
    idMessage,
    text,
    timestamp,
    title,
    phoneNumber,
  }
}
