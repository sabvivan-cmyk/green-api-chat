import styles from './App.module.css'

export function App() {
  return (
    <main className={styles.page}>
      <section className={styles.chatShell} aria-label="GREEN-API chat">
        <aside className={styles.sidebar}>
          <header className={styles.sidebarHeader}>
            <div>
              <p className={styles.eyebrow}>WhatsApp · GREEN-API</p>
              <h1 className={styles.title}>Чаты</h1>
            </div>
            <button className={styles.newChatButton} type="button" disabled>
              Новый чат
            </button>
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
          <div className={styles.conversationEmpty}>
            <div className={styles.logoMark} aria-hidden="true">
              G
            </div>
            <h2>GREEN-API Chat</h2>
            <p>
              Подключите WhatsApp-инстанс и выберите собеседника, чтобы начать
              переписку.
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}
