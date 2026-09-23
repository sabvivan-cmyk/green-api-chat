import { useState } from 'react'

import {
  CreatedChat,
  CreateChatForm,
} from '../features/chat-creation/CreateChatForm'
import { InstanceConnectionForm } from '../features/instance-connection/InstanceConnectionForm'
import { InstanceCredentials } from '../shared/api/greenApi'
import styles from './App.module.css'

export function App() {
  const [credentials, setCredentials] = useState<InstanceCredentials | null>(
    null,
  )
  const [chats, setChats] = useState<CreatedChat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  const activeChat = chats.find((chat) => chat.chatId === activeChatId)

  function handleDisconnect() {
    setCredentials(null)
    setChats([])
    setActiveChatId(null)
    setIsCreatingChat(false)
  }

  function handleChatCreated(chat: CreatedChat) {
    setChats((currentChats) => {
      const chatAlreadyExists = currentChats.some(
        (currentChat) => currentChat.chatId === chat.chatId,
      )

      return chatAlreadyExists ? currentChats : [...currentChats, chat]
    })
    setActiveChatId(chat.chatId)
    setIsCreatingChat(false)
  }

  return (
    <main className={styles.page}>
      <section className={styles.chatShell} aria-label="GREEN-API chat">
        <aside className={styles.sidebar}>
          <header className={styles.sidebarHeader}>
            <div>
              <p className={styles.eyebrow}>WhatsApp · GREEN-API</p>
              <h1 className={styles.title}>Чаты</h1>
            </div>
            {credentials ? (
              <button
                className={styles.newChatButton}
                onClick={() => setIsCreatingChat(true)}
                type="button"
              >
                Новый чат
              </button>
            ) : (
              <span className={styles.connectionStatus}>Не подключено</span>
            )}
          </header>

          {chats.length > 0 ? (
            <nav className={styles.chatList} aria-label="Список чатов">
              {chats.map((chat) => (
                <button
                  aria-current={chat.chatId === activeChatId ? 'true' : undefined}
                  className={styles.chatListItem}
                  key={chat.chatId}
                  onClick={() => {
                    setActiveChatId(chat.chatId)
                    setIsCreatingChat(false)
                  }}
                  type="button"
                >
                  <span className={styles.chatAvatar} aria-hidden="true">
                    {chat.title.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={styles.chatDetails}>
                    <strong>{chat.title}</strong>
                    <span>+{chat.phoneNumber}</span>
                  </span>
                </button>
              ))}
            </nav>
          ) : (
            <div className={styles.sidebarEmpty}>
              <span className={styles.emptyIcon} aria-hidden="true" />
              <p className={styles.emptyTitle}>Пока нет чатов</p>
              <p className={styles.emptyText}>
                {credentials
                  ? 'Создайте первый чат по номеру телефона.'
                  : 'После подключения инстанса здесь можно будет создать новый чат.'}
              </p>
            </div>
          )}

          {credentials && (
            <footer className={styles.instanceFooter}>
              <span>Инстанс {credentials.idInstance}</span>
              <button onClick={handleDisconnect} type="button">
                Сменить
              </button>
            </footer>
          )}
        </aside>

        <section className={styles.conversation} aria-label="Активный чат">
          {!credentials ? (
            <InstanceConnectionForm onConnected={setCredentials} />
          ) : isCreatingChat ? (
            <CreateChatForm
              credentials={credentials}
              onCancel={() => setIsCreatingChat(false)}
              onCreated={handleChatCreated}
            />
          ) : activeChat ? (
            <div className={styles.activeConversation}>
              <header className={styles.conversationHeader}>
                <div>
                  <h2>{activeChat.title}</h2>
                  <p>+{activeChat.phoneNumber}</p>
                </div>
                <button onClick={() => setIsCreatingChat(true)} type="button">
                  Новый чат
                </button>
              </header>
              <div className={styles.conversationEmpty}>
                <div className={styles.logoMark} aria-hidden="true">
                  {activeChat.title.slice(0, 1).toUpperCase()}
                </div>
                <h2>Чат создан</h2>
                <p>Отправка сообщений будет добавлена в следующей фиче.</p>
              </div>
            </div>
          ) : (
            <div className={styles.conversationEmpty}>
              <div className={styles.logoMark} aria-hidden="true">
                G
              </div>
              <h2>Инстанс подключён</h2>
              <p>Создайте чат, чтобы начать переписку.</p>
              <button
                className={styles.primaryButton}
                onClick={() => setIsCreatingChat(true)}
                type="button"
              >
                Создать чат
              </button>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
