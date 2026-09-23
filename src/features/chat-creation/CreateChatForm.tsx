import { FormEvent, useState } from 'react'

import {
  checkWhatsapp,
  getCheckWhatsappErrorMessage,
  InstanceCredentials,
} from '../../shared/api/greenApi'
import { normalizePhoneNumber } from './normalizePhoneNumber'
import styles from './CreateChatForm.module.css'

export interface CreatedChat {
  chatId: string
  phoneNumber: string
  title: string
}

interface CreateChatFormProps {
  credentials: InstanceCredentials
  onCancel: () => void
  onCreated: (chat: CreatedChat) => void
}

export function CreateChatForm({
  credentials,
  onCancel,
  onCreated,
}: CreateChatFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber)
      const result = await checkWhatsapp(credentials, normalizedPhoneNumber)

      if (!result.existsWhatsapp || !result.chatId) {
        setErrorMessage('На этом номере не найден аккаунт WhatsApp.')
        return
      }

      onCreated({
        chatId: result.chatId,
        phoneNumber: normalizedPhoneNumber,
        title: result.username?.trim() || `+${normalizedPhoneNumber}`,
      })
    } catch (error) {
      setErrorMessage(getCheckWhatsappErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>Новый чат</p>
        <h2>Введите номер получателя</h2>
        <p>
          Используйте международный формат с кодом страны, например
          +7&nbsp;999&nbsp;123-45-67.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <label className={styles.field}>
          <span>Номер телефона</span>
          <input
            autoFocus
            disabled={isSubmitting}
            inputMode="tel"
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="+7 999 123-45-67"
            type="tel"
            value={phoneNumber}
          />
        </label>

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
          <button className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Проверяем…' : 'Создать чат'}
          </button>
        </div>
      </form>
    </div>
  )
}
