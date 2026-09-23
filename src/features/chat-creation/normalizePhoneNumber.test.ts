import { normalizePhoneNumber } from './normalizePhoneNumber'

describe('normalizePhoneNumber', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['00 44 20 7946 0958', '442079460958'],
    ['380.12.345.67.89', '380123456789'],
  ])('normalizes an international number', (input, expected) => {
    expect(normalizePhoneNumber(input)).toBe(expected)
  })

  it('rejects a number without a country code', () => {
    expect(() => normalizePhoneNumber('099 123 45 67')).toThrow('код страны')
  })

  it('rejects letters', () => {
    expect(() => normalizePhoneNumber('+7 999 call-me')).toThrow(
      'только цифры',
    )
  })
})
