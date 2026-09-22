import { render, screen } from '@testing-library/react'

import { App } from './App'

describe('App', () => {
  it('renders the empty chat shell', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'GREEN-API Chat' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Пока нет чатов')).toBeInTheDocument()
  })
})
