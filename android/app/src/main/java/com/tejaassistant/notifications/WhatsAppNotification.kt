package com.tejaassistant.notifications

data class WhatsAppNotification(
    val senderName: String,
    val message: String,
    val timestamp: Long,
    val packageName: String = "com.whatsapp"
)
