package com.tejaassistant.notifications

import android.content.Context
import android.util.Log
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.DocumentChange
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WhatsAppNotificationRepository {

    companion object {
        private const val TAG = "WhatsAppRepo"
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun storeIncomingNotification(notification: WhatsAppNotification) {
        val user = Firebase.auth.currentUser
        if (user == null) {
            Log.w(TAG, "User not logged in; skipping notification storage")
            return
        }

        if (NotificationDeduplicator.isDuplicate(
                notification.senderName,
                notification.message,
                notification.timestamp
            )
        ) {
            Log.d(TAG, "Duplicate notification suppressed for ${notification.senderName}")
            return
        }

        scope.launch {
            try {
                val db = Firebase.firestore
                val userId = user.uid
                val timestampStr = SimpleDateFormat(
                    "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
                    Locale.US
                ).format(Date(notification.timestamp))

                val channel = when (notification.packageName) {
                    "com.instagram.android" -> "instagram"
                    else -> "whatsapp"
                }

                val cleanName = notification.senderName
                    .replace("[^a-zA-Z0-9]".toRegex(), "")
                    .lowercase()
                val contactId = "contact_${channel}_$cleanName"
                val conversationId = "conv_${channel}_$cleanName"

                db.collection("users")
                    .document(userId)
                    .collection("contacts")
                    .document(contactId)
                    .set(
                        hashMapOf(
                            "name" to notification.senderName,
                            "category" to "Unknown",
                            "channelHandles" to hashMapOf(channel to notification.senderName),
                            "updatedAt" to FieldValue.serverTimestamp()
                        ),
                        SetOptions.merge()
                    ).await()

                db.collection("users")
                    .document(userId)
                    .collection("conversations")
                    .document(conversationId)
                    .set(
                        hashMapOf(
                            "contactId" to contactId,
                            "contactName" to notification.senderName,
                            "channel" to channel,
                            "lastMessage" to notification.message,
                            "lastMessageAt" to timestampStr,
                            "updatedAt" to FieldValue.serverTimestamp()
                        ),
                        SetOptions.merge()
                    ).await()

                db.collection("users")
                    .document(userId)
                    .collection("communicationMessages")
                    .add(
                        hashMapOf(
                            "channel" to channel,
                            "direction" to "incoming",
                            "senderName" to notification.senderName,
                            "content" to notification.message,
                            "timestamp" to timestampStr,
                            "source" to "android_notification",
                            "contactId" to contactId,
                            "conversationId" to conversationId,
                            "createdAt" to FieldValue.serverTimestamp()
                        )
                    ).await()

                db.collection("users")
                    .document(userId)
                    .collection("notifications")
                    .add(
                        hashMapOf(
                            "senderName" to notification.senderName,
                            "message" to notification.message,
                            "packageName" to notification.packageName,
                            "timestamp" to timestampStr,
                            "processedAt" to FieldValue.serverTimestamp()
                        )
                    ).await()

                Log.d(TAG, "Notification stored successfully for ${notification.senderName}")
            } catch (e: Exception) {
                Log.e(TAG, "Error storing notification for ${notification.senderName}", e)
            }
        }
    }

    fun startAutoReplyListener(context: Context) {
        val user = Firebase.auth.currentUser ?: run {
            Log.w(TAG, "Auto-reply listener not started: user not logged in")
            return
        }
        val db = Firebase.firestore

        db.collection("users")
            .document(user.uid)
            .collection("communicationMessages")
            .whereEqualTo("direction", "outgoing")
            .whereEqualTo("status", "pending")
            .addSnapshotListener { snapshots, error ->
                if (error != null) {
                    Log.e(TAG, "Auto-reply listener failed", error)
                    return@addSnapshotListener
                }

                snapshots?.documentChanges
                    ?.filter { it.type == DocumentChange.Type.ADDED }
                    ?.forEach { change ->
                        val doc = change.document
                        val contactId = doc.getString("contactId") ?: return@forEach
                        val content = doc.getString("content") ?: return@forEach

                        val action = ReplyIntentStore.getIntent(contactId)
                        if (action != null) {
                            sendReply(context, action, content)
                            scope.launch {
                                try {
                                    doc.reference.update("status", "sent").await()
                                    Log.d(TAG, "Auto-reply sent for $contactId")
                                } catch (e: Exception) {
                                    Log.e(TAG, "Failed to update reply status", e)
                                }
                            }
                        } else {
                            Log.w(TAG, "No pending intent for $contactId")
                            scope.launch {
                                try {
                                    doc.reference.update(
                                        mapOf(
                                            "status" to "failed",
                                            "error" to "No active WhatsApp notification to reply to"
                                        )
                                    ).await()
                                } catch (e: Exception) {
                                    Log.e(TAG, "Failed to update failed status", e)
                                }
                            }
                        }
                    }
            }
    }

    private fun sendReply(context: Context, action: ReplyAction, replyText: String) {
        val intent = android.content.Intent()
        val bundle = android.os.Bundle()
        bundle.putCharSequence(action.remoteInput.resultKey, replyText)
        android.app.RemoteInput.addResultsToIntent(arrayOf(action.remoteInput), intent, bundle)
        try {
            action.pendingIntent.send(context, 0, intent)
        } catch (e: android.app.PendingIntent.CanceledException) {
            Log.e(TAG, "PendingIntent cancelled; notification may have been dismissed", e)
        }
    }
}
