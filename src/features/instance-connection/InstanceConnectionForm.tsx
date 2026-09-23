import { FormEvent, useState } from 'react'

import {
  getConnectionErrorMessage,
  getStateInstance,
  InstanceCredentials,
  InstanceState,
  normalizeCredentials,
} from '../../shared/api/greenApi'
import styles from './InstanceConnectionForm.module.css'

interface InstanceConnectionFormProps {
  onConnected: (credentials: InstanceCredentials) => void
}

const stateMessages: Record<string, string> = {
  notAuthorized:
    'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API.',
  blocked: 'WhatsApp-аккаунт заблокирован. Проверьте состояние инстанса.',
  starting:
    'Инстанс запускается. Подождите несколько минут и повторите проверку.',
  yellowCard:
    'Отправка сообщений временно ограничена. Проверьте предупреждения в личном кабинете.',
  suspended:
    'На инстансе действуют временные ограничения. Проверьте личный кабинет.',
  pendingPassword:
    'Для завершения авторизации требуется пароль двухфакторной аутентификации.',
}

function getStateMessage(state: InstanceState) {
  return (
    stateMessages[state] ??
    `Инстанс пока не готов к работе. Текущее состояние: ${state}.`
  )
}

export function InstanceConnectionForm({
  onConnected,
}: InstanceConnectionFormProps) {
  const [apiUrl, setApiUrl] = useState('')
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const credentials = normalizeCredentials({
        apiUrl,
        idInstance,
        apiTokenInstance,
      })
      const state = await getStateInstance(credentials)

      if (state !== 'authorized') {
        setErrorMessage(getStateMessage(state))
        return
      }

      onConnected(credentials)
    } catch (error) {
      setErrorMessage(getConnectionErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Подключение</p>
        <h2>Подключите WhatsApp</h2>
        <p>
          Введите данные инстанса из личного кабинета GREEN-API. Они останутся
          только в памяти этой вкладки.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span>API URL</span>
          <input
            autoComplete="url"
            disabled={isSubmitting}
            onChange={(event) => setApiUrl(event.target.value)}
            placeholder="https://7103.api.green-api.com"
            required
            type="url"
            value={apiUrl}
          />
        </label>

        <label className={styles.field}>
          <span>ID инстанса</span>
          <input
            autoComplete="off"
            disabled={isSubmitting}
            inputMode="numeric"
            onChange={(event) => setIdInstance(event.target.value)}
            placeholder="1101000001"
            required
            type="text"
            value={idInstance}
          />
        </label>

        <label className={styles.field}>
          <span>API-токен инстанса</span>
          <input
            autoComplete="off"
            disabled={isSubmitting}
            onChange={(event) => setApiTokenInstance(event.target.value)}
            placeholder="Введите токен"
            required
            type="password"
            value={apiTokenInstance}
          />
        </label>

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}

        <button className={styles.submitButton} disabled={isSubmitting}>
          {isSubmitting ? 'Проверяем…' : 'Подключиться'}
        </button>
      </form>

      <p className={styles.hint}>
        Перед подключением авторизуйте WhatsApp по QR-коду в личном кабинете.
      </p>
    </div>
  )
}
