import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { sendTextMessage } from '../../shared/api/greenApi'
import { ChatConversation } from './ChatConversation'

vi.mock('../../shared/api/greenApi', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../shared/api/greenApi')
  >()

  return {
    ...actual,
    sendTextMessage: vi.fn(),
  }
})

const mockedSendTextMessage = vi.mocked(sendTextMessage)
const credentials = {
  apiUrl: 'https://7103.api.green-api.com',
  idInstance: '1101000001',
  apiTokenInstance: 'secret-token',
}
const chat = {
  chatId: '123456789012345@lid',
  phoneNumber: '79991234567',
  title: 'Анна',
  messages: [],
}

describe('ChatConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses Shift+Enter for a new line and Enter for sending', async () => {
    const user = userEvent.setup()
    const onMessageAccepted = vi.fn()
    mockedSendTextMessage.mockResolvedValueOnce('message-id')
    render(
      <ChatConversation
        chat={chat}
        credentials={credentials}
        onMessageAccepted={onMessageAccepted}
        onNewChat={vi.fn()}
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Сообщение' })

    await user.type(input, 'Первая строка{shift>}{enter}{/shift}Вторая строка')
    expect(mockedSendTextMessage).not.toHaveBeenCalled()

    await user.type(input, '{enter}')

    expect(mockedSendTextMessage).toHaveBeenCalledWith(
      credentials,
      chat.chatId,
      'Первая строка\nВторая строка',
    )
    expect(onMessageAccepted).toHaveBeenCalledWith(
      chat.chatId,
      expect.objectContaining({
        id: 'message-id',
        text: 'Первая строка\nВторая строка',
        status: 'accepted',
      }),
    )
  })

  it('keeps the draft when sending fails', async () => {
    const user = userEvent.setup()
    mockedSendTextMessage.mockRejectedValueOnce(new Error('Ошибка отправки'))
    render(
      <ChatConversation
        chat={chat}
        credentials={credentials}
        onMessageAccepted={vi.fn()}
        onNewChat={vi.fn()}
      />,
    )
    const input = screen.getByRole('textbox', { name: 'Сообщение' })

    await user.type(input, 'Не потеряй меня')
    await user.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ошибка отправки')
    expect(input).toHaveValue('Не потеряй меня')
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled()
  })
})
