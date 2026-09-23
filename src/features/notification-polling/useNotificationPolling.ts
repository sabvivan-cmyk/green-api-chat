import { useEffect, useState } from 'react'

import { InstanceCredentials } from '../../shared/api/greenApi'
import { IncomingTextNotification } from './notificationParser'
import { runNotificationPolling } from './notificationPolling'

interface UseNotificationPollingOptions {
  credentials: InstanceCredentials | null
  onIncomingText: (message: IncomingTextNotification) => void
}

export function useNotificationPolling({
  credentials,
  onIncomingText,
}: UseNotificationPollingOptions) {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!credentials) {
      setError(null)
      return
    }

    const controller = new AbortController()

    void runNotificationPolling({
      credentials,
      signal: controller.signal,
      onIncomingText,
      onError: setError,
      onHealthy: () => setError(null),
    })

    return () => controller.abort()
  }, [credentials, onIncomingText])

  return { error }
}
