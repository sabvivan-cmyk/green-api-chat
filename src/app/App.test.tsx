import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'

import { App } from './App'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

const mockedAxios = vi.mocked(axios)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the instance connection form', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Подключите WhatsApp' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Пока нет чатов')).toBeInTheDocument()
  })

  it('opens the chat shell only for an authorized instance', async () => {
    const user = userEvent.setup()
    mockedAxios.get.mockResolvedValueOnce({
      data: { stateInstance: 'authorized' },
    })
    render(<App />)

    await user.type(
      screen.getByRole('textbox', { name: 'API URL' }),
      'https://7103.api.green-api.com',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'ID инстанса' }),
      '1101000001',
    )
    await user.type(screen.getByLabelText('API-токен инстанса'), 'token')
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))

    expect(
      await screen.findByRole('heading', { name: 'Инстанс подключён' }),
    ).toBeInTheDocument()
  })
})
