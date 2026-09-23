export interface ChatMessage {
  id: string
  direction: 'incoming' | 'outgoing'
  text: string
  timestamp: number
  status: 'accepted' | 'received'
}

export interface Chat {
  chatId: string
  phoneNumber: string | null
  title: string
  messages: ChatMessage[]
}
