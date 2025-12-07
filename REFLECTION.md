# Reflection on Building the Realtime Chat

This project pushed me to juggle practical engineering trade-offs while keeping the experience smooth across web, iOS simulator, and physical devices. Below I reflect on the key challenges and decisions.

## Managing multiple chat channels

I treated channels as a lightweight attribute on messages and paired that with Socket.io rooms for delivery. Persisted messages carry a `channel` field in the database, and at runtime the server scopes broadcasts to the room representing that channel. On the client I kept channel state localized inside `useChat` so components only subscribe to the active channel’s stream. That separation—persistent data tagged by channel + room-scoped real-time delivery—made reasoning about data flow straightforward and kept the complexity from growing nonlinearly as channels were added.

## Challenges implementing user presence

Presence felt simple in concept but proved tricky in practice. The core difficulty was the difference between global connection and per-channel presence: a device can be connected to the server but not currently viewing every channel. I solved this by emitting explicit `channel_joined` / `channel_left` events when the UI changed channels and having the server maintain per-channel membership counts and broadcast `clients_count`. The hardest part was race conditions—fast UI switches or flaky reconnects could create brief inconsistencies in counts. Buffering listeners, acknowledging joins on the server before assuming presence, and ensuring disconnect handlers were robust reduced those edge cases, but presence remains a place that benefits from more testing and polish.

## Offline message handling (how it compares to Slack/Discord)

My approach is optimistic local writes plus a simple durable queue. When a user sends a message the client writes it locally with a temporary ID, displays it immediately, and enqueues the network send; the server responds with a canonical ID (`clientTempId`) so the client can reconcile optimistic entries. Compared to Slack and Discord this is lighter-weight: those apps have background sync daemons, richer state transitions (edits, reactions, read receipts), and end-to-end deduplication across many more failure modes. My implementation is pragmatic and reliable for small-scale use—messages persist locally and eventually reconcile—but a production-grade system would need background syncing, robust retry semantics, and richer delivery/read-state models.

## UX improvements I’d make with more time

I’d add visible delivery states (sending, sent, failed) and a manual retry for failed sends. Channel UX could be improved with per-channel caching/pagination and smoother automatic scroll behavior when new messages come in. On mobile the chat input and scroll interactions would benefit from more polish (auto-focus rules, smarter auto-scroll only when user is near bottom). A small in-app debug overlay (socket id, joined channels, server URL) would also speed up diagnosing cross-device issues during development.

## Ensuring consistent real-time behavior across platforms

I enforced three pragmatic rules: platform-aware networking (explicitly prefer localhost on the iOS simulator, and allow an override via env), register socket listeners before calling `connect` to prevent missed events on fast platforms like web, and use durable local state (SQLite on native, localStorage on web) so optimistic writes and reconciliation behave identically everywhere. These measures—plus extensive, targeted logging—helped make behavior reproducible across web, simulator, and physical devices.

Overall this project emphasized building predictable, observable systems: simple models, explicit state transitions, and durability win in practice, especially when you need to debug cross-platform timing issues.
