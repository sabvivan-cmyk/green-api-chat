import { FormEvent, KeyboardEvent, useState } from 'react'

import { Chat, ChatMessage } from '../../entities/chat/model'
import {
  getSendMessageErrorMessage,
  InstanceCredentials,
  sendTextMessage,
} from '../../shared/api/greenApi'
import styles from './ChatConversation.module.css'

interface ChatConversationProps {
  chat: Chat
  credentials: InstanceCredentials
  onMessageAccepted: (chatId: string, message: ChatMessage) => void
  onNewChat: () => void
}

export function ChatConversation({
  chat,
  credentials,
  onMessageAccepted,
  onNewChat,
}: ChatConversationProps) {
  const [draft, setDraft] = useState('')
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.trim() || sendState === 'sending') {
      return
    }

    const messageText = draft
    setSendState('sending')
    setErrorMessage(null)

    try {
      const idMessage = await sendTextMessage(
        credentials,
        chat.chatId,
        messageText,
      )

      onMessageAccepted(chat.chatId, {
        id: idMessage,
        direction: 'outgoing',
        text: messageText,
        timestamp: Date.now(),
        status: 'accepted',
      })
      setDraft('')
      setSendState('idle')
    } catch (error) {
      setErrorMessage(getSendMessageErrorMessage(error))
      setSendState('error')
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className={styles.conversation}>
      <header className={styles.header}>
        <div>
          <h2>{chat.title}</h2>
          <p>{chat.phoneNumber ? `+${chat.phoneNumber}` : chat.chatId}</p>
        </div>
        <button onClick={onNewChat} type="button">
          Новый чат
        </button>
      </header>

      <div className={styles.messages} aria-live="polite">
        {chat.messages.length > 0 ? (
          chat.messages.map((message) => (
            <article
              className={
                message.direction === 'outgoing'
                  ? styles.outgoingMessage
                  : styles.incomingMessage
              }
              data-message-id={message.id}
              key={message.id}
            >
              <p>{message.text}</p>
              <span>
                {new Intl.DateTimeFormat('ru', {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(message.timestamp)}
                {' · '}
                {message.status === 'accepted' ? 'Принято API' : 'Получено'}
              </span>
            </article>
          ))
        ) : (
          <div className={styles.emptyMessages}>
            <strong>Сообщений пока нет</strong>
            <span>Напишите первое текстовое сообщение.</span>
          </div>
        )}
      </div>

      <form className={styles.composer} onSubmit={handleSubmit}>
        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}
        <div className={styles.composerRow}>
          <textarea
            aria-label="Сообщение"
            disabled={sendState === 'sending'}
            maxLength={20_000}
            onChange={(event) => {
              setDraft(event.target.value)
              if (sendState === 'error') {
                setSendState('idle')
                setErrorMessage(null)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Введите сообщение"
            rows={1}
            value={draft}
          />
          <button
            disabled={!draft.trim() || sendState === 'sending'}
            type="submit"
          >
            {sendState === 'sending'
              ? 'Отправляется…'
              : sendState === 'error'
                ? 'Повторить'
                : 'Отправить'}
          </button>
        </div>
        <span className={styles.keyboardHint}>
          Enter — отправить, Shift+Enter — новая строка
        </span>
      </form>
    </div>
  )
}
