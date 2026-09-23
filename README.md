# green-api-chat
React-клиент для отправки и получения текстовых сообщений WhatsApp через GREEN-API.

## Стек
- React 19
- TypeScript
- Vite
- Axios
- CSS Modules
- Vitest и Testing Library

## Локальный запуск

```bash
npm install
npm run dev
```

Адрес будет выведен в терминале от Vite, далее потребуется ввести данные инстанса.
После обновления страницы их потребуется ввести повторно.

## Mock-режим

Mock-режим позволяет проверить весь интерфейс без WhatsApp и GREEN-API.
При этом сетевые запросы к GREEN-API не выполняются.

```bash
npm run dev:mock
```

1. Нажмите "Подключиться" - тестовые данные уже заполнены
2. Создайте чат с любым корректным номером
3. Отправьте сообщение
4. В этот же чат придет ответ `Эхо: <сообщение>`

## Проверки

```bash
npm run lint
npm run test
npm run test:watch
npm run build
```

## Production-сборка

```bash
npm run build
```