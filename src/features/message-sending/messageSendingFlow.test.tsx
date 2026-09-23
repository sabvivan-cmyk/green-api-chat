import { useState } from 'react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Chat, ChatMessage } from '../../entities/chat/model'
import { appendMessageToChat } from '../../entities/chat/messageState'
import { sendTextMessage } from '../../shared/api/greenApi'
import { ChatConversation } from './ChatConversation'

vi.mock('../../shared/api/greenApi', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../shared/api/greenApi')
  >()

  return { ...actual, sendTextMessage: vi.fn() }
})

const mockedSendTextMessage = vi.mocked(sendTextMessage)
const credentials = {
  apiUrl: 'https://7103.api.greenapi.com',
  idInstance: '1101000001',
  apiTokenInstance: 'secret-token',
}
const initialChats: Chat[] = [
  {
    chatId: 'chat-a@lid',
    phoneNumber: '79000000001',
    title: 'Чат А',
    messages: [],
  },
  {
    chatId: 'chat-b@lid',
    phoneNumber: '79000000002',
    title: 'Чат Б',
    messages: [],
  },
]

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

function SendingHarness() {
  const [chats, setChats] = useState(initialChats)
  const [activeChatId, setActiveChatId] = useState(initialChats[0].chatId)
  const activeChat = chats.find((chat) => chat.chatId === activeChatId)!

  function handleAccepted(chatId: string, message: ChatMessage) {
    setChats((currentChats) =>
      appendMessageToChat(currentChats, chatId, message),
    )
  }

  return (
    <>
      <button onClick={() => setActiveChatId(initialChats[0].chatId)}>
        Открыть чат А
      </button>
      <button onClick={() => setActiveChatId(initialChats[1].chatId)}>
        Открыть чат Б
      </button>
      <ChatConversation
        chat={activeChat}
        credentials={credentials}
        key={activeChat.chatId}
        onMessageAccepted={handleAccepted}
        onNewChat={vi.fn()}
      />
    </>
  )
}

describe('message sending flow', () => {
  it('keeps an in-flight message bound to chat A after switching to chat B', async () => {
    const user = userEvent.setup()
    const deferred = createDeferred<string>()
    mockedSendTextMessage.mockReturnValueOnce(deferred.promise)
    render(<SendingHarness />)

    await user.type(
      screen.getByRole('textbox', { name: 'Сообщение' }),
      'Сообщение для А',
    )
    await user.click(screen.getByRole('button', { name: 'Отправить' }))
    await user.click(screen.getByRole('button', { name: 'Открыть чат Б' }))

    expect(screen.getByRole('heading', { name: 'Чат Б' })).toBeInTheDocument()
    expect(screen.queryByText('Сообщение для А')).not.toBeInTheDocument()

    await act(async () => deferred.resolve('outgoing-message-id'))
    expect(screen.queryByText('Сообщение для А')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Открыть чат А' }))
    expect(await screen.findByText('Сообщение для А')).toBeInTheDocument()
  })
})
