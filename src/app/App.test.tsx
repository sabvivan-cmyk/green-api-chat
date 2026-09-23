import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'

import { App } from './App'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
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

  it('creates a chat using the chatId returned by CheckWhatsapp', async () => {
    const user = userEvent.setup()
    mockedAxios.get.mockResolvedValueOnce({
      data: { stateInstance: 'authorized' },
    })
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        existsWhatsapp: true,
        chatId: '123456789012345@lid',
        username: 'Анна',
        phoneNumber: '79991234567@c.us',
        fromCache: true,
      },
    })
    mockedAxios.post.mockResolvedValueOnce({
      data: { idMessage: '3EB0C767D097B7C7C030' },
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
    await user.click(
      await screen.findByRole('button', { name: 'Создать чат' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Номер телефона' }),
      '+7 (999) 123-45-67',
    )
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect(
      await screen.findByRole('heading', { name: 'Анна' }),
    ).toBeInTheDocument()
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/checkWhatsapp/'),
      { chatId: '79991234567' },
      { timeout: 15_000 },
    )

    await user.type(
      screen.getByRole('textbox', { name: 'Сообщение' }),
      'Привет!',
    )
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(await screen.findByText('Привет!')).toBeInTheDocument()
    expect(screen.getByText(/Принято API/)).toBeInTheDocument()
    expect(mockedAxios.post).toHaveBeenLastCalledWith(
      expect.stringContaining('/sendMessage/'),
      { chatId: '123456789012345@lid', message: 'Привет!' },
      { timeout: 15_000 },
    )
  })
})
