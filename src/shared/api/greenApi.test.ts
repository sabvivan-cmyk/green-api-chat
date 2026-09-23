import axios from 'axios'

import {
  checkWhatsapp,
  deleteNotification,
  getStateInstance,
  normalizeApiUrl,
  normalizeCredentials,
  receiveNotification,
  sendTextMessage,
} from './greenApi'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    isAxiosError: vi.fn(() => false),
  },
}))

const mockedAxios = vi.mocked(axios)

describe('GREEN-API client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes credentials without storing extra whitespace', () => {
    expect(
      normalizeCredentials({
        apiUrl: ' https://7103.api.green-api.com/ ',
        idInstance: ' 1101000001 ',
        apiTokenInstance: ' token-value ',
      }),
    ).toEqual({
      apiUrl: 'https://7103.api.green-api.com',
      idInstance: '1101000001',
      apiTokenInstance: 'token-value',
    })
  })

  it('rejects an insecure API URL', () => {
    expect(() => normalizeApiUrl('http://api.green-api.com')).toThrow(
      'HTTPS',
    )
  })

  it('requests the WhatsApp GetStateInstance endpoint', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { stateInstance: 'authorized' },
    })

    await expect(
      getStateInstance({
        apiUrl: 'https://7103.api.green-api.com',
        idInstance: '1101000001',
        apiTokenInstance: 'secret-token',
      }),
    ).resolves.toBe('authorized')

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://7103.api.green-api.com/waInstance1101000001/getStateInstance/secret-token',
      { timeout: 15_000 },
    )
  })

  it('uses chatId to check a WhatsApp number and keeps the returned lid', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        existsWhatsapp: true,
        chatId: '123456789012345@lid',
        username: '',
        phoneNumber: '79991234567@c.us',
        fromCache: true,
      },
    })

    await expect(
      checkWhatsapp(
        {
          apiUrl: 'https://7103.api.green-api.com',
          idInstance: '1101000001',
          apiTokenInstance: 'secret-token',
        },
        '79991234567',
      ),
    ).resolves.toMatchObject({ chatId: '123456789012345@lid' })

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://7103.api.green-api.com/waInstance1101000001/checkWhatsapp/secret-token',
      { chatId: '79991234567@c.us' },
      { timeout: 15_000 },
    )
  })

  it('sends text to the stored chatId and returns idMessage', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { idMessage: '3EB0C767D097B7C7C030' },
    })

    await expect(
      sendTextMessage(
        {
          apiUrl: 'https://7103.api.green-api.com',
          idInstance: '1101000001',
          apiTokenInstance: 'secret-token',
        },
        '123456789012345@lid',
        'Привет!',
      ),
    ).resolves.toBe('3EB0C767D097B7C7C030')

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://7103.api.green-api.com/waInstance1101000001/sendMessage/secret-token',
      { chatId: '123456789012345@lid', message: 'Привет!' },
      { timeout: 15_000 },
    )
  })

  it('receives and deletes a notification with the documented endpoints', async () => {
    const notification = {
      receiptId: 1234567,
      body: { typeWebhook: 'stateInstanceChanged' },
    }
    mockedAxios.get.mockResolvedValueOnce({ data: notification })
    mockedAxios.delete.mockResolvedValueOnce({ data: { result: true } })
    const credentials = {
      apiUrl: 'https://7103.api.greenapi.com',
      idInstance: '1101000001',
      apiTokenInstance: 'secret-token',
    }

    await expect(receiveNotification(credentials)).resolves.toEqual(
      notification,
    )
    await expect(
      deleteNotification(credentials, notification.receiptId),
    ).resolves.toBeUndefined()

    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://7103.api.greenapi.com/waInstance1101000001/receiveNotification/secret-token',
      {
        params: { receiveTimeout: 5 },
        signal: undefined,
        timeout: 10_000,
      },
    )
    expect(mockedAxios.delete).toHaveBeenCalledWith(
      'https://7103.api.greenapi.com/waInstance1101000001/deleteNotification/secret-token/1234567',
      { signal: undefined, timeout: 15_000 },
    )
  })
})
