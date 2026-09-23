import axios from 'axios'

import {
  getStateInstance,
  normalizeApiUrl,
  normalizeCredentials,
} from './greenApi'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
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
})
