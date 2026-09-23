import { StrictMode } from 'react'
import { render } from '@testing-library/react'

import { runNotificationPolling } from './notificationPolling'
import { useNotificationPolling } from './useNotificationPolling'

vi.mock('./notificationPolling', () => ({
  runNotificationPolling: vi.fn().mockResolvedValue(undefined),
}))

const mockedRunNotificationPolling = vi.mocked(runNotificationPolling)
const onIncomingText = vi.fn()
const credentials = {
  apiUrl: 'https://7103.api.greenapi.com',
  idInstance: '1101000001',
  apiTokenInstance: 'secret-token',
}

function PollingHarness({
  activeCredentials = credentials,
}: {
  activeCredentials?: typeof credentials | null
}) {
  useNotificationPolling({
    credentials: activeCredentials,
    onIncomingText,
  })

  return null
}

describe('useNotificationPolling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aborts the previous polling sequence during the StrictMode remount', () => {
    const { unmount } = render(
      <StrictMode>
        <PollingHarness />
      </StrictMode>,
    )

    expect(mockedRunNotificationPolling).toHaveBeenCalledTimes(2)
    const firstSignal = mockedRunNotificationPolling.mock.calls[0][0].signal
    const activeSignal = mockedRunNotificationPolling.mock.calls[1][0].signal

    expect(firstSignal.aborted).toBe(true)
    expect(activeSignal.aborted).toBe(false)

    unmount()
    expect(activeSignal.aborted).toBe(true)
  })

  it('stops on logout and starts only one sequence after reconnecting', () => {
    const { rerender, unmount } = render(<PollingHarness />)

    expect(mockedRunNotificationPolling).toHaveBeenCalledTimes(1)
    const firstSignal = mockedRunNotificationPolling.mock.calls[0][0].signal

    rerender(<PollingHarness activeCredentials={null} />)
    expect(firstSignal.aborted).toBe(true)

    rerender(
      <PollingHarness
        activeCredentials={{ ...credentials, idInstance: '1101000002' }}
      />,
    )

    expect(mockedRunNotificationPolling).toHaveBeenCalledTimes(2)
    const reconnectedSignal =
      mockedRunNotificationPolling.mock.calls[1][0].signal
    expect(reconnectedSignal.aborted).toBe(false)
    expect(
      [firstSignal, reconnectedSignal].filter((signal) => !signal.aborted),
    ).toHaveLength(1)

    unmount()
    expect(reconnectedSignal.aborted).toBe(true)
  })
})
