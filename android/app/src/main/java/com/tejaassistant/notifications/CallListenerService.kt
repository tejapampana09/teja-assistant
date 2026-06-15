package com.tejaassistant.notifications

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * CallListenerService — Foreground service that:
 * 1. Watches Firestore `users/{uid}/callRequest/outgoing` for status == "pending"
 * 2. When found, fires ACTION_CALL intent to dial the number on the device
 * 3. Updates the document status so the web UI knows it was received
 *
 * This is the Android side of the "Call via Phone" feature in the web dashboard.
 */
class CallListenerService : Service() {

    companion object {
        private const val TAG = "CallListenerService"
        private const val CHANNEL_ID = "teja_call_listener"
        private const val NOTIFICATION_ID = 1002
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var firestoreListenerRegistration: com.google.firebase.firestore.ListenerRegistration? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "CallListenerService created")
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        attachFirestoreListener()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "CallListenerService started")
        return START_STICKY // restart if killed
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "CallListenerService destroyed")
        firestoreListenerRegistration?.remove()
    }

    // ─── Foreground Notification ───────────────────────────────────────────────

    private fun buildForegroundNotification(): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Teja Call Listener",
            NotificationManager.IMPORTANCE_LOW
        ).apply {
            description = "Keeps Teja Assistant connected for remote calling"
            setShowBadge(false)
        }
        manager.createNotificationChannel(channel)

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Teja Assistant")
            .setContentText("Connected — ready for remote calls")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    // ─── Firestore Listener ────────────────────────────────────────────────────

    private fun attachFirestoreListener() {
        val user = Firebase.auth.currentUser
        if (user == null) {
            Log.w(TAG, "User not logged in — will retry in 5s")
            scope.launch {
                kotlinx.coroutines.delay(5000)
                attachFirestoreListener()
            }
            return
        }

        Log.d(TAG, "Attaching Firestore listener for uid: ${user.uid}")
        val db = Firebase.firestore
        val docRef = db.collection("users")
            .document(user.uid)
            .collection("callRequest")
            .document("outgoing")

        firestoreListenerRegistration = docRef.addSnapshotListener { snapshot, error ->
            if (error != null) {
                Log.e(TAG, "Firestore listener error: ${error.message}", error)
                return@addSnapshotListener
            }

            if (snapshot == null || !snapshot.exists()) {
                Log.d(TAG, "callRequest/outgoing doc does not exist yet")
                return@addSnapshotListener
            }

            val status = snapshot.getString("status") ?: "idle"
            val phoneNumber = snapshot.getString("to") ?: ""
            val displayName = snapshot.getString("displayName") ?: phoneNumber

            Log.d(TAG, "callRequest update — status: $status, to: $phoneNumber, name: $displayName")

            if (status == "pending" && phoneNumber.isNotBlank()) {
                Log.d(TAG, "Triggering call to $phoneNumber ($displayName)")
                triggerCall(user.uid, phoneNumber)
            }
        }
    }

    // ─── Dial Intent ───────────────────────────────────────────────────────────

    private fun triggerCall(uid: String, phoneNumber: String) {
        scope.launch {
            try {
                // Update status to "dialing" so web UI knows it was received
                val db = Firebase.firestore
                db.collection("users").document(uid)
                    .collection("callRequest").document("outgoing")
                    .update(mapOf(
                        "status" to "dialing",
                        "dialedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                    )).await()
                Log.d(TAG, "Status updated to 'dialing'")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update callRequest status", e)
            }
        }

        // Fire the call intent on the main thread
        val cleanNumber = phoneNumber.trim().replace(" ", "")
        val hasCallPerm = androidx.core.content.ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.CALL_PHONE
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        try {
            val uri = android.net.Uri.parse("tel:$cleanNumber")
            val callIntent = Intent(
                if (hasCallPerm) Intent.ACTION_CALL else Intent.ACTION_DIAL,
                uri
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(callIntent)
            Log.d(TAG, "Call intent fired for $cleanNumber (ACTION_CALL=$hasCallPerm)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start call intent for $cleanNumber", e)
            // Update status to error so web knows
            scope.launch {
                try {
                    Firebase.firestore.collection("users").document(uid)
                        .collection("callRequest").document("outgoing")
                        .update(mapOf(
                            "status" to "error",
                            "errorMessage" to (e.message ?: "Unknown error")
                        )).await()
                } catch (ex: Exception) {
                    Log.e(TAG, "Failed to update error status", ex)
                }
            }
        }
    }
}
