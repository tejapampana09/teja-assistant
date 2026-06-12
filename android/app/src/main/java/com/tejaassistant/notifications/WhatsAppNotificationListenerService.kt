package com.tejaassistant.notifications

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class WhatsAppNotificationListenerService : NotificationListenerService() {
    private val repository = WhatsAppNotificationRepository()

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!isWhatsAppNotification(sbn)) return

        val extras = sbn.notification.extras
        val senderName = extras.getCharSequence("android.title")?.toString()?.trim().orEmpty()
        val message = extras.getCharSequence("android.text")?.toString()?.trim().orEmpty()

        if (senderName.isBlank() || message.isBlank()) return

        val notification = WhatsAppNotification(
            senderName = senderName,
            message = message,
            timestamp = sbn.postTime,
            packageName = sbn.packageName
        )

        repository.storeIncomingNotification(notification)
    }

    private fun isWhatsAppNotification(sbn: StatusBarNotification): Boolean {
        return sbn.packageName == "com.whatsapp" || sbn.packageName == "com.whatsapp.w4b"
    }
}
