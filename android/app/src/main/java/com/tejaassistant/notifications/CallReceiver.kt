package com.tejaassistant.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FieldValue
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

class CallReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallReceiver"
        private var lastState = TelephonyManager.EXTRA_STATE_IDLE
        private var callStartTime: Long = 0
        private var incomingNumber: String? = null
        private var isIncoming: Boolean = false
        private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val stateStr = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
        val number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

        if (stateStr == null) return

        val user = Firebase.auth.currentUser
        if (user == null) {
            Log.w(TAG, "User not logged in; ignoring call state")
            return
        }

        if (stateStr == lastState) return
        
        Log.d(TAG, "Phone State Changed: $stateStr, Number: $number")

        when (stateStr) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                isIncoming = true
                callStartTime = System.currentTimeMillis()
                incomingNumber = number ?: "Unknown"
                lastState = TelephonyManager.EXTRA_STATE_RINGING
                
                syncCallState(user.uid, "ringing", incomingNumber!!, 0)
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                if (lastState != TelephonyManager.EXTRA_STATE_RINGING) {
                    isIncoming = false
                    callStartTime = System.currentTimeMillis()
                    incomingNumber = number ?: "Unknown"
                }
                lastState = TelephonyManager.EXTRA_STATE_OFFHOOK
                syncCallState(user.uid, "in_progress", incomingNumber!!, 0)
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                if (lastState == TelephonyManager.EXTRA_STATE_RINGING) {
                    // Missed Call
                    syncCallState(user.uid, "missed", incomingNumber ?: "Unknown", 0)
                } else if (lastState == TelephonyManager.EXTRA_STATE_OFFHOOK) {
                    // Completed Call
                    val duration = System.currentTimeMillis() - callStartTime
                    syncCallState(user.uid, "completed", incomingNumber ?: "Unknown", duration)
                }
                lastState = TelephonyManager.EXTRA_STATE_IDLE
            }
        }
    }

    private fun syncCallState(uid: String, status: String, number: String, durationMs: Long) {
        scope.launch {
            try {
                val db = Firebase.firestore
                val timestampStr = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())

                val cleanNumber = number.replace("[^0-9+]".toRegex(), "")
                val contactId = "call_${cleanNumber.ifBlank { "unknown" }}"
                val conversationId = "conv_call_${cleanNumber.ifBlank { "unknown" }}"

                val payload = hashMapOf(
                    "channel" to "call",
                    "direction" to if (isIncoming) "incoming" else "outgoing",
                    "senderName" to number,
                    "contactPhone" to number,
                    "content" to when(status) {
                        "ringing"     -> "📞 Incoming call ringing"
                        "in_progress" -> "📞 Call in progress"
                        "missed"      -> "📵 Missed call"
                        "completed"   -> "✅ Call ended (${formatDuration(durationMs)})"
                        else          -> "Call $status"
                    },
                    "timestamp" to timestampStr,
                    "source" to "android_telephony",
                    "status" to status,
                    "contactId" to contactId,
                    "conversationId" to conversationId,
                    "durationMs" to durationMs,
                    "createdAt" to FieldValue.serverTimestamp()
                )

                db.collection("users")
                    .document(uid)
                    .collection("communicationMessages")
                    .add(payload).await()

                Log.d(TAG, "Call state '$status' synced for $number (conversationId=$conversationId)")
            } catch (e: Exception) {
                Log.e(TAG, "Error syncing call state", e)
            }
        }
    }

    private fun formatDuration(ms: Long): String {
        val totalSec = ms / 1000
        val min = totalSec / 60
        val sec = totalSec % 60
        return "${min}m ${sec}s"
    }
}
