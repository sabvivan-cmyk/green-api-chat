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
