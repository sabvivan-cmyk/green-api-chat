import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'

import { App } from './App'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

const mockedAxios = vi.mocked(axios)

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

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
      await screen.findByRole('heading', { name: 'Начните общение' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Новый чат' }),
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
      await screen.findByRole('button', { name: 'Новый чат' }),
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
      { chatId: '79991234567@c.us' },
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

  it('creates a chat only from an incoming text notification', async () => {
    const user = userEvent.setup()
    mockedAxios.get
      .mockResolvedValueOnce({ data: { stateInstance: 'authorized' } })
      .mockResolvedValueOnce({
        data: {
          receiptId: 77,
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
              textMessageData: { textMessage: 'Входящий ответ' },
            },
          },
        },
      })
    mockedAxios.delete.mockResolvedValueOnce({ data: { result: true } })
    render(<App />)

    await user.type(
      screen.getByRole('textbox', { name: 'API URL' }),
      'https://7103.api.greenapi.com',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'ID инстанса' }),
      '1101000001',
    )
    await user.type(screen.getByLabelText('API-токен инстанса'), 'token')
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))

    expect(
      await screen.findByRole('heading', { name: 'Иван' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Активный чат')).getByText(
        'Входящий ответ',
      ),
    ).toBeInTheDocument()
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/deleteNotification/'),
      expect.objectContaining({ timeout: 15_000 }),
    )
  })

  it('routes an incoming c.us message to an inactive lid chat without changing the active chat', async () => {
    const user = userEvent.setup()
    const incomingResponse = createDeferred<{
      data: {
        receiptId: number
        body: Record<string, unknown>
      }
    }>()
    mockedAxios.get
      .mockResolvedValueOnce({ data: { stateInstance: 'authorized' } })
      .mockImplementationOnce(() => incomingResponse.promise)
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          existsWhatsapp: true,
          chatId: '111111111111111@lid',
          username: 'Анна',
          phoneNumber: '79991234567@c.us',
          fromCache: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          existsWhatsapp: true,
          chatId: '222222222222222@lid',
          username: 'Борис',
          phoneNumber: '78881234567@c.us',
          fromCache: true,
        },
      })
    mockedAxios.delete.mockResolvedValueOnce({ data: { result: true } })
    render(<App />)

    await user.type(
      screen.getByRole('textbox', { name: 'API URL' }),
      'https://7103.api.greenapi.com',
    )
    await user.type(
      screen.getByRole('textbox', { name: 'ID инстанса' }),
      '1101000001',
    )
    await user.type(screen.getByLabelText('API-токен инстанса'), 'token')
    await user.click(screen.getByRole('button', { name: 'Подключиться' }))

    await user.click(
      await screen.findByRole('button', { name: 'Новый чат' }),
    )
    await user.type(
      screen.getByRole('textbox', { name: 'Номер телефона' }),
      '+7 999 123-45-67',
    )
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    await user.click(screen.getByRole('button', { name: 'Новый чат' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Номер телефона' }),
      '+7 888 123-45-67',
    )
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))
    expect(
      await screen.findByRole('heading', { name: 'Борис' }),
    ).toBeInTheDocument()

    const chatSearch = screen.getByRole('searchbox', {
      name: 'Поиск по чатам',
    })
    const chatList = screen.getByRole('navigation', { name: 'Список чатов' })
    await user.type(chatSearch, 'Анна')
    expect(within(chatList).getByRole('button', { name: /Анна/ })).toBeVisible()
    expect(
      within(chatList).queryByRole('button', { name: /Борис/ }),
    ).not.toBeInTheDocument()
    await user.clear(chatSearch)

    await act(async () =>
      incomingResponse.resolve({
        data: {
          receiptId: 88,
          body: {
            typeWebhook: 'incomingMessageReceived',
            instanceData: { typeInstance: 'whatsapp' },
            timestamp: 1_588_091_580,
            idMessage: 'message-for-anna',
            senderData: {
              chatId: '79991234567@c.us',
              sender: '79991234567@c.us',
              senderName: 'Анна',
            },
            messageData: {
              typeMessage: 'textMessage',
              textMessageData: { textMessage: 'Ответ для неактивного чата' },
            },
          },
        },
      }),
    )

    expect(screen.getByRole('heading', { name: 'Борис' })).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Активный чат')).queryByText(
        'Ответ для неактивного чата',
      ),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Анна/ }))
    expect(
      await within(screen.getByLabelText('Активный чат')).findByText(
        'Ответ для неактивного чата',
      ),
    ).toBeInTheDocument()
  })
})
