# Teja Assistant

Personal AI assistant web app with Firebase Authentication, Firestore realtime sync, AI chat history, memory management, task management, voice input/output, communication intelligence, and Android notification listener architecture.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Firebase Authentication
- Firebase Firestore realtime listeners
- Node.js + Express API wrapper for future AI providers

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add Firebase web app values.
3. In Firebase Console, enable Google provider under Authentication.
4. Create a Firestore database.
5. Install dependencies and run the app.

```bash
npm install
npm run dev:full
```

The frontend runs on `http://localhost:5173`.
The API runs on `http://localhost:8787`.

## Firestore Structure

```text
users/{userId}
  tasks/{taskId}
  memories/{memoryId}
  messages/{messageId}
  contacts/{contactId}
  conversations/{conversationId}
  communicationMessages/{messageId}
  settings/voice
```

## Phase 2 Features

- Voice Assistant using Web Speech API speech-to-text.
- Text-to-Speech controls with voice settings.
- Communication Hub with inbox UI, conversations, contacts, and reply suggestions.
- WhatsApp notification assistant architecture for Android/Kotlin.
- AI reply suggestions: short, friendly, and professional.
- Daily Briefing generated from tasks and communication messages.

## Android Notification Listener

Android architecture is stored in `android/`. It includes:

- `WhatsAppNotificationListenerService.kt`
- `WhatsAppNotificationRepository.kt`
- `WhatsAppNotification.kt`
- Android manifest service registration

This phase only reads notifications and prepares Firestore writes. It does not send WhatsApp replies.

## Optional Firestore Rules

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Future Expansion

The current architecture keeps future modules separate from Phase 1:

- WhatsApp, Gmail, Calendar, and LinkedIn integrations
- Coding assistant
- Study assistant
- Autonomous agent features
