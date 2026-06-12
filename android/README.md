# Android Notification Listener Architecture

Phase 2 includes Android architecture only. It does not auto-reply and does not send messages.

## Purpose

The Android app listens for incoming WhatsApp notifications, extracts sender, message, and timestamp, then stores them in Firestore under the same communication structure used by the web app.

## Required Android Setup

- Kotlin Android app
- Firebase Auth user session
- Firebase Firestore SDK
- Notification listener permission enabled by the user in Android Settings

## Firestore Write Target

```text
users/{userId}/communicationMessages/{messageId}
users/{userId}/contacts/{contactId}
users/{userId}/conversations/{conversationId}
```

## Auto Reply

Not implemented in Phase 2. The service only reads notifications and stores data for AI reply suggestions.
