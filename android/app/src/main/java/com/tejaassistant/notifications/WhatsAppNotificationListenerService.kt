package com.tejaassistant.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class WhatsAppNotificationListenerService : NotificationListenerService() {
    private val repository = WhatsAppNotificationRepository()

    companion object {
        private const val TAG = "WhatsAppListener"
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Listener connected")
        repository.startAutoReplyListener(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try {
            handleNotificationPosted(sbn)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process notification from ${sbn.packageName}", e)
        }
    }

    private fun handleNotificationPosted(sbn: StatusBarNotification) {
        if (!isSupportedNotification(sbn)) return

        val extras = sbn.notification.extras
        val senderName = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        val message = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim().orEmpty()

        if (senderName.isBlank() || message.isBlank()) {
            Log.d(TAG, "Ignored notification with empty sender or message")
            return
        }

        val cleanName = senderName.replace("[^a-zA-Z0-9]".toRegex(), "").lowercase()
        if (cleanName.isBlank()) {
            Log.d(TAG, "Ignored notification with unsupported sender name: $senderName")
            return
        }

        val channel = when (sbn.packageName) {
            "com.instagram.android" -> "instagram"
            else -> "whatsapp"
        }
        val contactId = "contact_${channel}_$cleanName"
        
        extractReplyAction(sbn.notification)?.let { action ->
            Log.d(TAG, "Found reply action for $contactId")
            ReplyIntentStore.saveIntent(contactId, action)
        }

        val notification = WhatsAppNotification(
            senderName = senderName,
            message = message,
            timestamp = sbn.postTime,
            packageName = sbn.packageName
        )

        repository.storeIncomingNotification(notification)
        Log.d(TAG, "Queued notification from $senderName on $channel")
    }

    private fun extractReplyAction(notification: Notification): ReplyAction? {
        val actions = notification.actions ?: return null
        for (action in actions) {
            val remoteInputs = action.remoteInputs
            val pendingIntent = action.actionIntent
            if (!remoteInputs.isNullOrEmpty() && pendingIntent != null) {
                return ReplyAction(pendingIntent, remoteInputs[0])
            }
        }
        return null
    }

    private fun isSupportedNotification(sbn: StatusBarNotification): Boolean {
        val pkg = sbn.packageName
        return pkg == "com.whatsapp" || pkg == "com.whatsapp.w4b" || pkg == "com.instagram.android"
    }
}
