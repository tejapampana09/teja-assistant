package com.tejaassistant.notifications

import android.app.PendingIntent
import android.app.RemoteInput

data class ReplyAction(
    val pendingIntent: PendingIntent,
    val remoteInput: RemoteInput
)

object ReplyIntentStore {
    // Maps contactId -> ReplyAction
    private val intents = mutableMapOf<String, ReplyAction>()

    fun saveIntent(contactId: String, action: ReplyAction) {
        intents[contactId] = action
    }

    fun getIntent(contactId: String): ReplyAction? {
        return intents[contactId]
    }
}
