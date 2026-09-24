import { useCallback, useState } from 'react'

import { Chat, ChatMessage } from '../entities/chat/model'
import { getChatAvatarInitial } from '../entities/chat/avatar'
import { mergeContactChat } from '../entities/chat/contactState'
import { appendMessageToChat } from '../entities/chat/messageState'
import {
  CreatedChat,
  CreateChatForm,
} from '../features/chat-creation/CreateChatForm'
import { InstanceConnectionForm } from '../features/instance-connection/InstanceConnectionForm'
import { ChatConversation } from '../features/message-sending/ChatConversation'
import { mergeIncomingText } from '../features/notification-polling/mergeIncomingText'
import { IncomingTextNotification } from '../features/notification-polling/notificationParser'
import { useNotificationPolling } from '../features/notification-polling/useNotificationPolling'
import { InstanceCredentials } from '../shared/api/greenApi'
import userIcon from '../shared/assets/user.svg'
import styles from './App.module.css'

const messageTimeFormatter = new Intl.DateTimeFormat('ru', {
  hour: '2-digit',
  minute: '2-digit',
})

export function App() {
  const [credentials, setCredentials] = useState<InstanceCredentials | null>(
    null,
  )
  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [isMobileConversationOpen, setIsMobileConversationOpen] =
    useState(true)
  const [chatSearch, setChatSearch] = useState('')

  const activeChat = chats.find((chat) => chat.chatId === activeChatId)
  const normalizedChatSearch = chatSearch.trim().toLocaleLowerCase('ru')
  const visibleChats = normalizedChatSearch
    ? chats.filter((chat) =>
        [chat.title, chat.phoneNumber, chat.chatId].some((value) =>
          value?.toLocaleLowerCase('ru').includes(normalizedChatSearch),
        ),
      )
    : chats

  const handleIncomingText = useCallback(
    (notification: IncomingTextNotification) => {
      setChats((currentChats) =>
        mergeIncomingText(currentChats, notification),
      )
      setActiveChatId((currentChatId) => currentChatId ?? notification.chatId)
    },
    [],
  )

  const { error: pollingError } = useNotificationPolling({
    credentials,
    onIncomingText: handleIncomingText,
  })

  function handleConnected(instanceCredentials: InstanceCredentials) {
    setCredentials(instanceCredentials)
    setIsMobileConversationOpen(false)
  }

  function openNewChat() {
    setIsCreatingChat(true)
    setIsMobileConversationOpen(true)
  }

  function openChat(chatId: string) {
    setActiveChatId(chatId)
    setIsCreatingChat(false)
    setIsMobileConversationOpen(true)
  }

  function handleDisconnect() {
    setCredentials(null)
    setChats([])
    setActiveChatId(null)
    setIsCreatingChat(false)
    setIsMobileConversationOpen(true)
    setChatSearch('')
  }

  function handleChatCreated(chat: CreatedChat) {
    setChats(
      (currentChats) =>
        mergeContactChat(
          currentChats,
          { ...chat, knownChatIds: [chat.chatId], messages: [] },
          { preferredChatId: chat.chatId },
        ).chats,
    )
    setActiveChatId(chat.chatId)
    setIsCreatingChat(false)
    setIsMobileConversationOpen(true)
  }

  function handleExistingChatRequested(phoneNumber: string) {
    const existingChat = chats.find(
      (chat) => chat.phoneNumber === phoneNumber,
    )

    if (!existingChat) {
      return false
    }

    const result = mergeContactChat(chats, {
      ...existingChat,
      knownChatIds: existingChat.knownChatIds ?? [existingChat.chatId],
    })
    setChats(result.chats)
    setActiveChatId(result.chat.chatId)
    setIsCreatingChat(false)
    setIsMobileConversationOpen(true)
    return true
  }

  function handleMessageAccepted(chatId: string, message: ChatMessage) {
    setChats((currentChats) =>
      appendMessageToChat(currentChats, chatId, message),
    )
  }

  return (
    <main className={styles.page}>
      <section
        className={`${styles.chatShell} ${
          isMobileConversationOpen || !credentials
            ? styles.mobileConversationOpen
            : ''
        }`}
        aria-label="GREEN-API chat"
      >
        <aside className={styles.sidebar}>
          <header className={styles.sidebarHeader}>
            <div className={styles.brandText}>
              <h1 className={styles.title}>Чаты</h1>
              <p className={styles.eyebrow}>WhatsApp · GREEN-API</p>
            </div>
            {credentials ? (
              <button
                aria-label="Новый чат"
                className={styles.newChatButton}
                onClick={openNewChat}
                type="button"
              />
            ) : (
              <span className={styles.connectionStatus}>Не подключено</span>
            )}
          </header>

          {credentials && (
            <div className={styles.search}>
              <span className={styles.searchIcon} aria-hidden="true" />
              <label className={styles.visuallyHidden} htmlFor="chat-search">
                Поиск по чатам
              </label>
              <input
                id="chat-search"
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder="Поиск"
                type="search"
                value={chatSearch}
              />
              {chatSearch && (
                <button
                  aria-label="Очистить поиск"
                  className={styles.clearSearchButton}
                  onClick={() => setChatSearch('')}
                  type="button"
                />
              )}
            </div>
          )}

          {chats.length > 0 ? (
            <nav className={styles.chatList} aria-label="Список чатов">
              {visibleChats.map((chat) => {
                const lastMessage = chat.messages.at(-1)
                const avatarInitial = getChatAvatarInitial(chat)
                const preview = lastMessage
                  ? `${lastMessage.direction === 'outgoing' ? 'Вы: ' : ''}${lastMessage.text}`
                  : chat.phoneNumber
                    ? `+${chat.phoneNumber}`
                    : chat.chatId

                return (
                  <button
                    aria-current={
                      chat.chatId === activeChatId ? 'true' : undefined
                    }
                    className={styles.chatListItem}
                    key={chat.chatId}
                    onClick={() => openChat(chat.chatId)}
                    type="button"
                  >
                    <span
                      className={`${styles.chatAvatar} ${
                        avatarInitial ? '' : styles.defaultAvatar
                      }`}
                      aria-hidden="true"
                    >
                      {avatarInitial ?? (
                        <img alt="" src={userIcon} />
                      )}
                    </span>
                    <span className={styles.chatDetails}>
                      <span className={styles.chatTitleRow}>
                        <strong title={chat.title}>{chat.title}</strong>
                        {lastMessage && (
                          <time
                            dateTime={new Date(
                              lastMessage.timestamp,
                            ).toISOString()}
                          >
                            {messageTimeFormatter.format(lastMessage.timestamp)}
                          </time>
                        )}
                      </span>
                      <span className={styles.chatPreview}>{preview}</span>
                    </span>
                  </button>
                )
              })}
              {visibleChats.length === 0 && (
                <p className={styles.noSearchResults}>Ничего не найдено</p>
              )}
            </nav>
          ) : (
            <div className={styles.sidebarEmpty}>
              <p className={styles.emptyTitle}>Пока нет чатов</p>
              <p className={styles.emptyText}>
                {credentials
                  ? 'Создайте первый чат по номеру телефона'
                  : 'После подключения инстанса здесь можно будет создать новый чат'}
              </p>
            </div>
          )}

          {credentials && (
            <footer className={styles.instanceFooter}>
              <span>
                Инстанс {credentials.idInstance}
                {pollingError && (
                  <small
                    className={styles.pollingError}
                    role="status"
                    title={pollingError}
                  >
                    Ошибка получения — повторяем
                  </small>
                )}
              </span>
              <button onClick={handleDisconnect} type="button">
                Сменить
              </button>
            </footer>
          )}
        </aside>

        <section className={styles.conversation} aria-label="Активный чат">
          {!credentials ? (
            <InstanceConnectionForm onConnected={handleConnected} />
          ) : isCreatingChat ? (
            <CreateChatForm
              credentials={credentials}
              onCancel={() => {
                setIsCreatingChat(false)
                setIsMobileConversationOpen(false)
              }}
              onCreated={handleChatCreated}
              onExistingChatRequested={handleExistingChatRequested}
            />
          ) : activeChat ? (
            <ChatConversation
              chat={activeChat}
              credentials={credentials}
              key={activeChat.chatId}
              onMessageAccepted={handleMessageAccepted}
              onBack={() => setIsMobileConversationOpen(false)}
            />
          ) : (
            <div className={styles.conversationEmpty}>
              <span className={styles.emptyConversationIcon} aria-hidden="true">
                G
              </span>
              <h2>{chats.length > 0 ? 'Выберите чат' : 'Начните общение'}</h2>
              <p>
                {chats.length > 0
                  ? 'Выберите диалог в списке слева'
                  : 'Создайте первый чат кнопкой в левой панели'}
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
