const PHONE_SEPARATORS = /[\s().-]/g
const MIN_PHONE_LENGTH = 8
const MAX_PHONE_LENGTH = 15

export function normalizePhoneNumber(value: string) {
  let normalizedValue = value.trim().replace(PHONE_SEPARATORS, '')

  if (normalizedValue.startsWith('+')) {
    normalizedValue = normalizedValue.slice(1)
  } else if (normalizedValue.startsWith('00')) {
    normalizedValue = normalizedValue.slice(2)
  }

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error('Номер может содержать только цифры и символы форматирования.')
  }

  if (
    normalizedValue.length < MIN_PHONE_LENGTH ||
    normalizedValue.length > MAX_PHONE_LENGTH
  ) {
    throw new Error(
      `Введите номер в международном формате: от ${MIN_PHONE_LENGTH} до ${MAX_PHONE_LENGTH} цифр.`,
    )
  }

  if (normalizedValue.startsWith('0')) {
    throw new Error('Укажите код страны в начале номера.')
  }

  return normalizedValue
}
