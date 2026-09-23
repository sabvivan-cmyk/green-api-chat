import axios from 'axios'

export interface InstanceCredentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type InstanceState =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'starting'
  | 'yellowCard'
  | 'suspended'
  | 'pendingPassword'
  | string

interface GetStateInstanceResponse {
  stateInstance: InstanceState
}

export interface CheckWhatsappResponse {
  existsWhatsapp: boolean
  chatId?: string
  username?: string
  phoneNumber?: string
  fromCache?: boolean
}

interface SendMessageResponse {
  idMessage: string
}

export interface NotificationEnvelope {
  receiptId: number
  body: unknown
}

interface DeleteNotificationResponse {
  result: boolean
}

interface NotificationErrorResponse {
  status: 'error'
  message?: string
}

function isNotificationErrorResponse(
  value: NotificationEnvelope | NotificationErrorResponse,
): value is NotificationErrorResponse {
  return 'status' in value && value.status === 'error'
}

const REQUEST_TIMEOUT_MS = 15_000

export function normalizeApiUrl(value: string) {
  const trimmedValue = value.trim()
  let url: URL

  try {
    url = new URL(trimmedValue)
  } catch {
    throw new Error('Укажите корректный API URL из личного кабинета.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('API URL должен использовать защищённый протокол HTTPS.')
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error('API URL не должен содержать параметры или данные доступа.')
  }

  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('Укажите только адрес API-сервера, без пути к методу.')
  }

  return url.origin
}

export function normalizeCredentials(
  credentials: InstanceCredentials,
): InstanceCredentials {
  const idInstance = credentials.idInstance.trim()
  const apiTokenInstance = credentials.apiTokenInstance.trim()

  if (!/^\d+$/.test(idInstance)) {
    throw new Error('ID инстанса должен состоять только из цифр.')
  }

  if (!apiTokenInstance) {
    throw new Error('Укажите API-токен инстанса.')
  }

  return {
    apiUrl: normalizeApiUrl(credentials.apiUrl),
    idInstance,
    apiTokenInstance,
  }
}

export async function getStateInstance(
  credentials: InstanceCredentials,
): Promise<InstanceState> {
  const normalizedCredentials = normalizeCredentials(credentials)
  const { apiUrl, idInstance, apiTokenInstance } = normalizedCredentials
  const requestUrl = `${apiUrl}/waInstance${encodeURIComponent(idInstance)}/getStateInstance/${encodeURIComponent(apiTokenInstance)}`

  const response = await axios.get<GetStateInstanceResponse | null>(requestUrl, {
    timeout: REQUEST_TIMEOUT_MS,
  })

  if (
    !response.data ||
    typeof response.data.stateInstance !== 'string' ||
    !response.data.stateInstance
  ) {
    throw new Error('GREEN-API вернул некорректное состояние инстанса.')
  }

  return response.data.stateInstance
}

export async function checkWhatsapp(
  credentials: InstanceCredentials,
  phoneNumber: string,
): Promise<CheckWhatsappResponse> {
  const normalizedCredentials = normalizeCredentials(credentials)
  const { apiUrl, idInstance, apiTokenInstance } = normalizedCredentials
  const requestUrl = `${apiUrl}/waInstance${encodeURIComponent(idInstance)}/checkWhatsapp/${encodeURIComponent(apiTokenInstance)}`

  const response = await axios.post<CheckWhatsappResponse>(
    requestUrl,
    { chatId: `${phoneNumber}@c.us` },
    { timeout: REQUEST_TIMEOUT_MS },
  )

  if (
    typeof response.data?.existsWhatsapp !== 'boolean' ||
    (response.data.existsWhatsapp && !response.data.chatId)
  ) {
    throw new Error('GREEN-API вернул некорректные данные контакта.')
  }

  return response.data
}

export async function sendTextMessage(
  credentials: InstanceCredentials,
  chatId: string,
  message: string,
) {
  const normalizedCredentials = normalizeCredentials(credentials)
  const normalizedChatId = chatId.trim()

  if (!normalizedChatId) {
    throw new Error('Не указан идентификатор чата.')
  }

  if (!message.trim()) {
    throw new Error('Введите текст сообщения.')
  }

  if (message.length > 20_000) {
    throw new Error('Сообщение не должно превышать 20 000 символов.')
  }

  const { apiUrl, idInstance, apiTokenInstance } = normalizedCredentials
  const requestUrl = `${apiUrl}/waInstance${encodeURIComponent(idInstance)}/sendMessage/${encodeURIComponent(apiTokenInstance)}`
  const response = await axios.post<SendMessageResponse>(
    requestUrl,
    { chatId: normalizedChatId, message },
    { timeout: REQUEST_TIMEOUT_MS },
  )

  if (typeof response.data?.idMessage !== 'string' || !response.data.idMessage) {
    throw new Error('GREEN-API не вернул идентификатор сообщения.')
  }

  return response.data.idMessage
}

export async function receiveNotification(
  credentials: InstanceCredentials,
  signal?: AbortSignal,
): Promise<NotificationEnvelope | null> {
  const normalizedCredentials = normalizeCredentials(credentials)
  const { apiUrl, idInstance, apiTokenInstance } = normalizedCredentials
  const requestUrl = `${apiUrl}/waInstance${encodeURIComponent(idInstance)}/receiveNotification/${encodeURIComponent(apiTokenInstance)}`
  const response = await axios.get<
    NotificationEnvelope | NotificationErrorResponse | null
  >(requestUrl, {
    params: { receiveTimeout: 5 },
    signal,
    timeout: 10_000,
  })

  if (response.data === null) {
    return null
  }

  if (isNotificationErrorResponse(response.data)) {
    throw new Error(
      response.data.message ||
        'GREEN-API вернул ошибку при получении уведомлений.',
    )
  }

  if (
    !Number.isInteger(response.data?.receiptId) ||
    !response.data ||
    typeof response.data.body !== 'object' ||
    response.data.body === null
  ) {
    throw new Error('GREEN-API вернул некорректное уведомление.')
  }

  return response.data
}

export async function deleteNotification(
  credentials: InstanceCredentials,
  receiptId: number,
  signal?: AbortSignal,
) {
  const normalizedCredentials = normalizeCredentials(credentials)
  const { apiUrl, idInstance, apiTokenInstance } = normalizedCredentials
  const requestUrl = `${apiUrl}/waInstance${encodeURIComponent(idInstance)}/deleteNotification/${encodeURIComponent(apiTokenInstance)}/${receiptId}`
  const response = await axios.delete<DeleteNotificationResponse>(requestUrl, {
    signal,
    timeout: REQUEST_TIMEOUT_MS,
  })

  if (response.data?.result !== true) {
    throw new Error('GREEN-API не подтвердил удаление уведомления.')
  }
}

export function getConnectionErrorMessage(error: unknown) {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error.message
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Не удалось связаться с GREEN-API. Проверьте API URL, подключение к сети и доступность запросов из браузера.'
    }

    if (error.response.status === 401 || error.response.status === 403) {
      return 'GREEN-API отклонил данные доступа. Проверьте ID и API-токен инстанса.'
    }
  }

  return 'Не удалось проверить состояние инстанса. Попробуйте ещё раз.'
}

export function getCheckWhatsappErrorMessage(error: unknown) {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error.message
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Не удалось связаться с GREEN-API. Проверьте подключение и повторите попытку.'
    }

    if (error.response.status === 401 || error.response.status === 403) {
      return 'GREEN-API отклонил данные доступа. Переподключите инстанс.'
    }

    if (error.response.status === 429) {
      return 'Превышен лимит запросов. Подождите и попробуйте снова.'
    }
  }

  return 'Не удалось проверить номер в WhatsApp. Попробуйте ещё раз.'
}

export function getSendMessageErrorMessage(error: unknown) {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error.message
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Не удалось связаться с GREEN-API. Текст сохранён — попробуйте отправить снова.'
    }

    if (error.response.status === 401 || error.response.status === 403) {
      return 'GREEN-API отклонил данные доступа. Текст сообщения сохранён.'
    }

    if (error.response.status === 429) {
      return 'Превышен лимит запросов. Текст сохранён — повторите отправку позже.'
    }
  }

  return 'Не удалось отправить сообщение. Текст сохранён для повторной отправки.'
}
