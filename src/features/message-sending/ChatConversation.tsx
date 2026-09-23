import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react'

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
  onBack: () => void
}

const messageTimeFormatter = new Intl.DateTimeFormat('ru', {
  hour: '2-digit',
  minute: '2-digit',
})

export function ChatConversation({
  chat,
  credentials,
  onMessageAccepted,
  onBack,
}: ChatConversationProps) {
  const [draft, setDraft] = useState('')
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const messagesElement = messagesRef.current

    if (messagesElement) {
      messagesElement.scrollTop = messagesElement.scrollHeight
    }
  }, [chat.messages.length])

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

  const sendButtonLabel =
    sendState === 'sending'
      ? 'Отправляется…'
      : sendState === 'error'
        ? 'Повторить'
        : 'Отправить'

  return (
    <div className={styles.conversation}>
      <header className={styles.header}>
        <button
          aria-label="Назад к списку чатов"
          className={styles.backButton}
          onClick={onBack}
          type="button"
        >
          <span aria-hidden="true">←</span>
        </button>
        <span className={styles.headerAvatar} aria-hidden="true">
          {chat.title.slice(0, 1).toUpperCase()}
        </span>
        <div className={styles.contactInfo}>
          <h2 title={chat.title}>{chat.title}</h2>
          <p title={chat.phoneNumber ? `+${chat.phoneNumber}` : chat.chatId}>
            {chat.phoneNumber ? `+${chat.phoneNumber}` : chat.chatId}
          </p>
        </div>
      </header>

      <div className={styles.messages} aria-live="polite" ref={messagesRef}>
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
              <footer className={styles.messageMeta}>
                <time dateTime={new Date(message.timestamp).toISOString()}>
                  {messageTimeFormatter.format(message.timestamp)}
                </time>
                <span aria-hidden="true">·</span>
                <span>
                  {message.status === 'accepted' ? 'Принято API' : 'Получено'}
                </span>
              </footer>
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
            aria-label={sendButtonLabel}
            disabled={!draft.trim() || sendState === 'sending'}
            type="submit"
          >
            <span aria-hidden="true">
              {sendState === 'sending'
                ? '…'
                : sendState === 'error'
                  ? '↻'
                  : '↑'}
            </span>
          </button>
        </div>
        <span className={styles.keyboardHint}>
          Enter - отправить, Shift+Enter - новая строка
        </span>
      </form>
    </div>
  )
}
