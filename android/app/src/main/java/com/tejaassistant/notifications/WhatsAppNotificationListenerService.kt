package com.tejaassistant.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class WhatsAppNotificationListenerService : NotificationListenerService() {
    private val repository = WhatsAppNotificationRepository()

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d("WhatsAppListener", "Listener connected. Starting Auto-Reply engine.")
        repository.startAutoReplyListener(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!isWhatsAppNotification(sbn)) return

        val extras = sbn.notification.extras
        val senderName = extras.getCharSequence("android.title")?.toString()?.trim().orEmpty()
        val message = extras.getCharSequence("android.text")?.toString()?.trim().orEmpty()

        if (senderName.isBlank() || message.isBlank()) return

        // Extract RemoteInput for Auto Reply
        val cleanName = senderName.replace("[^a-zA-Z0-9]".toRegex(), "").lowercase()
        val contactId = "contact_$cleanName"
        
        extractReplyAction(sbn.notification)?.let { action ->
            Log.d("WhatsAppListener", "Found Reply Action for $contactId")
            ReplyIntentStore.saveIntent(contactId, action)
        }

        val notification = WhatsAppNotification(
            senderName = senderName,
            message = message,
            timestamp = sbn.postTime,
            packageName = sbn.packageName
        )

        repository.storeIncomingNotification(notification)
    }

    private fun extractReplyAction(notification: Notification): ReplyAction? {
        val actions = notification.actions ?: return null
        for (action in actions) {
            val remoteInputs = action.remoteInputs
            if (remoteInputs != null && remoteInputs.isNotEmpty()) {
                // Usually the first remote input is the reply text
                return ReplyAction(action.actionIntent, remoteInputs[0])
            }
        }
        return null
    }

    private fun isWhatsAppNotification(sbn: StatusBarNotification): Boolean {
        return sbn.packageName == "com.whatsapp" || sbn.packageName == "com.whatsapp.w4b"
    }
}
