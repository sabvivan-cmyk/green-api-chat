import { useState } from 'react'

import { InstanceConnectionForm } from '../features/instance-connection/InstanceConnectionForm'
import { InstanceCredentials } from '../shared/api/greenApi'
import styles from './App.module.css'

export function App() {
  const [credentials, setCredentials] = useState<InstanceCredentials | null>(
    null,
  )

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
                className={styles.changeInstanceButton}
                onClick={() => setCredentials(null)}
                type="button"
              >
                Сменить
              </button>
            ) : (
              <span className={styles.connectionStatus}>Не подключено</span>
            )}
          </header>

          <div className={styles.sidebarEmpty}>
            <span className={styles.emptyIcon} aria-hidden="true" />
            <p className={styles.emptyTitle}>Пока нет чатов</p>
            <p className={styles.emptyText}>
              После подключения инстанса здесь можно будет создать новый чат.
            </p>
          </div>
        </aside>

        <section className={styles.conversation} aria-label="Активный чат">
          {credentials ? (
            <div className={styles.conversationEmpty}>
              <div className={styles.logoMark} aria-hidden="true">
                G
              </div>
              <h2>Инстанс подключён</h2>
              <p>
                GREEN-API подтвердил авторизацию. Теперь можно перейти к
                созданию чатов.
              </p>
            </div>
          ) : (
            <InstanceConnectionForm onConnected={setCredentials} />
          )}
        </section>
      </section>
    </main>
  )
}
