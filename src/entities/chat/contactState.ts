import { Chat, ChatMessage } from './model'

export interface ContactChatCandidate {
  chatId: string
  knownChatIds?: string[]
  phoneNumber: string | null
  title: string
  messages: ChatMessage[]
}

export interface MergeContactOptions {
  preferredChatId?: string
}

function getReliablePhoneNumber(phoneNumber: string | null) {
  return phoneNumber && /^\d+$/.test(phoneNumber) ? phoneNumber : null
}

export function getKnownChatIds(
  chat: Pick<Chat, 'chatId' | 'knownChatIds'>,
) {
  return [...new Set([chat.chatId, ...(chat.knownChatIds ?? [])])]
}

export function isSameContact(
  chat: Chat,
  candidate: Pick<
    ContactChatCandidate,
    'chatId' | 'knownChatIds' | 'phoneNumber'
  >,
) {
  const candidateIds = new Set(getKnownChatIds(candidate))
  const hasKnownId = getKnownChatIds(chat).some((chatId) =>
    candidateIds.has(chatId),
  )

  if (hasKnownId) {
    return true
  }

  const chatPhoneNumber = getReliablePhoneNumber(chat.phoneNumber)
  const candidatePhoneNumber = getReliablePhoneNumber(candidate.phoneNumber)

  return (
    chatPhoneNumber !== null &&
    candidatePhoneNumber !== null &&
    chatPhoneNumber === candidatePhoneNumber
  )
}

function isFallbackTitle(
  title: string,
  phoneNumber: string | null,
  knownChatIds: string[],
) {
  const normalizedTitle = title.trim()

  return (
    !normalizedTitle ||
    knownChatIds.includes(normalizedTitle) ||
    (phoneNumber !== null &&
      (normalizedTitle === phoneNumber || normalizedTitle === `+${phoneNumber}`))
  )
}

function mergeMessages(messageGroups: ChatMessage[][]) {
  const messagesById = new Map<string, { message: ChatMessage; order: number }>()
  let order = 0

  for (const messages of messageGroups) {
    for (const message of messages) {
      if (!messagesById.has(message.id)) {
        messagesById.set(message.id, { message, order })
        order += 1
      }
    }
  }

  return [...messagesById.values()]
    .sort(
      (left, right) =>
        left.message.timestamp - right.message.timestamp ||
        left.order - right.order,
    )
    .map(({ message }) => message)
}

function arraysEqual<T>(left: T[], right: T[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

export function mergeContactChat(
  chats: Chat[],
  candidate: ContactChatCandidate,
  options: MergeContactOptions = {},
) {
  const matchingChats = chats.filter((chat) => isSameContact(chat, candidate))
  const matchingChatSet = new Set(matchingChats)
  const knownChatIds = [
    ...new Set([
      ...matchingChats.flatMap(getKnownChatIds),
      ...getKnownChatIds(candidate),
    ]),
  ]
  const phoneNumber =
    getReliablePhoneNumber(candidate.phoneNumber) ??
    matchingChats
      .map((chat) => getReliablePhoneNumber(chat.phoneNumber))
      .find((value) => value !== null) ??
    null
  const meaningfulExistingTitle = matchingChats
    .map((chat) => chat.title)
    .find((title) => !isFallbackTitle(title, phoneNumber, knownChatIds))
  const meaningfulCandidateTitle = isFallbackTitle(
    candidate.title,
    phoneNumber,
    knownChatIds,
  )
    ? null
    : candidate.title
  const title =
    meaningfulExistingTitle ??
    meaningfulCandidateTitle ??
    matchingChats[0]?.title ??
    candidate.title
  const chatId =
    options.preferredChatId ??
    matchingChats.find((chat) => chat.chatId.endsWith('@lid'))?.chatId ??
    matchingChats[0]?.chatId ??
    candidate.chatId
  const messages = mergeMessages([
    ...matchingChats.map((chat) => chat.messages),
    candidate.messages,
  ])
  const mergedChat: Chat = {
    chatId,
    knownChatIds,
    phoneNumber,
    title,
    messages,
  }

  if (matchingChats.length === 1) {
    const existingChat = matchingChats[0]
    const isUnchanged =
      existingChat.chatId === mergedChat.chatId &&
      existingChat.phoneNumber === mergedChat.phoneNumber &&
      existingChat.title === mergedChat.title &&
      arraysEqual(getKnownChatIds(existingChat), mergedChat.knownChatIds ?? []) &&
      arraysEqual(existingChat.messages, mergedChat.messages)

    if (isUnchanged) {
      return { chats, chat: existingChat }
    }
  }

  if (matchingChats.length === 0) {
    return { chats: [...chats, mergedChat], chat: mergedChat }
  }

  const firstMatchIndex = chats.findIndex((chat) => matchingChatSet.has(chat))
  const mergedChats = chats.filter((chat) => !matchingChatSet.has(chat))
  mergedChats.splice(firstMatchIndex, 0, mergedChat)

  return { chats: mergedChats, chat: mergedChat }
}
