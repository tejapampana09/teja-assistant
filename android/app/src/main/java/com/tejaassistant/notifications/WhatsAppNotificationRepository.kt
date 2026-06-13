package com.tejaassistant.notifications

import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class WhatsAppNotificationRepository {
    private val TAG = "WhatsAppRepo"

    fun storeIncomingNotification(notification: WhatsAppNotification) {
        val auth = FirebaseAuth.getInstance()
        val user = auth.currentUser

        if (user == null) {
            Log.e(TAG, "User not logged in. Cannot save notification.")
            return
        }

        val db = FirebaseFirestore.getInstance()
        val userId = user.uid

        val timestampStr = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date(notification.timestamp))

        val payload = hashMapOf(
            "channel" to "whatsapp",
            "direction" to "incoming",
            "senderName" to notification.senderName,
            "content" to notification.message,
            "timestamp" to timestampStr,
            "source" to "android_notification",
            "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
        )

        // Generate a simple deterministic contact/conversation ID for now based on name to keep it unique
        val cleanName = notification.senderName.replace("[^a-zA-Z0-9]".toRegex(), "").lowercase()
        val contactId = "contact_$cleanName"
        val conversationId = "conv_whatsapp_$cleanName"

        // 1. Upsert Contact
        val contactRef = db.collection("users").document(userId).collection("contacts").document(contactId)
        contactRef.set(hashMapOf(
            "name" to notification.senderName,
            "category" to "Unknown",
            "channelHandles" to hashMapOf("whatsapp" to notification.senderName),
            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
        ), com.google.firebase.firestore.SetOptions.merge())

        // 2. Upsert Conversation
        val convRef = db.collection("users").document(userId).collection("conversations").document(conversationId)
        convRef.set(hashMapOf(
            "contactId" to contactId,
            "contactName" to notification.senderName,
            "channel" to "whatsapp",
            "lastMessage" to notification.message,
            "lastMessageAt" to timestampStr,
            "updatedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
        ), com.google.firebase.firestore.SetOptions.merge())

        // 3. Add Message
        payload["contactId"] = contactId
        payload["conversationId"] = conversationId
        
        db.collection("users").document(userId).collection("communicationMessages")
            .add(payload)
            .addOnSuccessListener {
                Log.d(TAG, "Notification stored successfully: ${it.id}")
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error storing notification", e)
            }
    }

    fun startAutoReplyListener(context: android.content.Context) {
        val auth = FirebaseAuth.getInstance()
        val user = auth.currentUser ?: return
        val db = FirebaseFirestore.getInstance()

        db.collection("users").document(user.uid).collection("communicationMessages")
            .whereEqualTo("direction", "outgoing")
            .whereEqualTo("status", "pending")
            .addSnapshotListener { snapshots, e ->
                if (e != null) {
                    Log.e(TAG, "Listen failed.", e)
                    return@addSnapshotListener
                }

                if (snapshots != null) {
                    for (dc in snapshots.documentChanges) {
                        if (dc.type == com.google.firebase.firestore.DocumentChange.Type.ADDED) {
                            val doc = dc.document
                            val contactId = doc.getString("contactId") ?: continue
                            val content = doc.getString("content") ?: continue
                            
                            val action = ReplyIntentStore.getIntent(contactId)
                            if (action != null) {
                                sendReply(context, action, content)
                                doc.reference.update("status", "sent")
                                Log.d(TAG, "Sent auto-reply for $contactId")
                            } else {
                                Log.w(TAG, "No pending intent found for $contactId")
                                doc.reference.update(
                                    "status", "failed",
                                    "error", "No active notification found to reply to"
                                )
                            }
                        }
                    }
                }
            }
    }

    private fun sendReply(context: android.content.Context, action: ReplyAction, replyText: String) {
        val intent = android.content.Intent()
        val bundle = android.os.Bundle()
        bundle.putCharSequence(action.remoteInput.resultKey, replyText)
        android.app.RemoteInput.addResultsToIntent(arrayOf(action.remoteInput), intent, bundle)
        
        try {
            action.pendingIntent.send(context, 0, intent)
        } catch (e: android.app.PendingIntent.CanceledException) {
            Log.e(TAG, "PendingIntent canceled", e)
        }
    }
}
