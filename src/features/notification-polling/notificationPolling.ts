import {
  deleteNotification,
  InstanceCredentials,
  NotificationEnvelope,
  receiveNotification,
} from '../../shared/api/greenApi'
import {
  IncomingTextNotification,
  parseIncomingTextNotification,
} from './notificationParser'

const EMPTY_QUEUE_DELAY_MS = 300
const ERROR_RETRY_DELAY_MS = 2_000
const DELETE_RETRY_DELAY_MS = 1_000

type Wait = (milliseconds: number, signal: AbortSignal) => Promise<void>

interface PollingDependencies {
  receive: (
    credentials: InstanceCredentials,
    signal?: AbortSignal,
  ) => Promise<NotificationEnvelope | null>
  remove: (
    credentials: InstanceCredentials,
    receiptId: number,
    signal?: AbortSignal,
  ) => Promise<void>
  wait: Wait
}

interface NotificationPollingOptions {
  credentials: InstanceCredentials
  signal: AbortSignal
  onIncomingText: (message: IncomingTextNotification) => void
  onError: (message: string) => void
  onHealthy?: () => void
  dependencies?: Partial<PollingDependencies>
}

export function waitForDelay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const handleAbort = () => {
      clearTimeout(timeoutId)
      resolve()
    }
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort)
      resolve()
    }, milliseconds)

    signal.addEventListener('abort', handleAbort, { once: true })
  })
}

function getPollingErrorMessage(error: unknown, operation: 'receive' | 'delete') {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return operation === 'delete'
    ? 'Не удалось подтвердить уведомление. Повторяем удаление.'
    : 'Не удалось получить уведомления. Повторяем подключение.'
}

export async function runNotificationPolling({
  credentials,
  signal,
  onIncomingText,
  onError,
  onHealthy,
  dependencies,
}: NotificationPollingOptions) {
  const receive = dependencies?.receive ?? receiveNotification
  const remove = dependencies?.remove ?? deleteNotification
  const wait = dependencies?.wait ?? waitForDelay

  while (!signal.aborted) {
    let notification: NotificationEnvelope | null

    try {
      notification = await receive(credentials, signal)
      if (signal.aborted) return
      onHealthy?.()
    } catch (error) {
      if (signal.aborted) return
      onError(getPollingErrorMessage(error, 'receive'))
      await wait(ERROR_RETRY_DELAY_MS, signal)
      continue
    }

    if (!notification) {
      await wait(EMPTY_QUEUE_DELAY_MS, signal)
      continue
    }

    const incomingText = parseIncomingTextNotification(notification.body)
    if (incomingText) {
      onIncomingText(incomingText)
    }

    let notificationDeleted = false
    while (!signal.aborted && !notificationDeleted) {
      try {
        await remove(credentials, notification.receiptId, signal)
        if (signal.aborted) return
        notificationDeleted = true
        onHealthy?.()
      } catch (error) {
        if (signal.aborted) return
        onError(getPollingErrorMessage(error, 'delete'))
        await wait(DELETE_RETRY_DELAY_MS, signal)
      }
    }
  }
}
