package com.tejaassistant

import android.content.Intent
import android.provider.Settings
import android.util.Log
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat
import com.getcapacitor.BridgeActivity
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.tejaassistant.notifications.CallListenerService
import com.tejaassistant.notifications.ContactsSyncService
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : BridgeActivity() {

    private lateinit var googleSignInClient: GoogleSignInClient
    private var pendingGoogleCallbackId: String? = null

    companion object {
        private const val TAG = "MainActivity"
        private const val RC_SIGN_IN = 9001
        private const val REQUEST_PERMISSIONS = 1001
    }

    override fun onCreate(savedInstanceState: android.os.Bundle?) {
        super.onCreate(savedInstanceState)
        configureGoogleSignIn()
        bridge.webView.addJavascriptInterface(AndroidBridge(), "TejaAndroid")

        // Request all required permissions at startup
        requestAllPermissions()

        // Start the Firestore call listener service
        startCallListenerService()
    }

    // ─── Permission Handling ───────────────────────────────────────────────────

    private fun requestAllPermissions() {
        val permissions = arrayOf(
            android.Manifest.permission.READ_PHONE_STATE,
            android.Manifest.permission.READ_CALL_LOG,
            android.Manifest.permission.CALL_PHONE,
            android.Manifest.permission.READ_CONTACTS
        )
        val needed = permissions.filter {
            androidx.core.content.ContextCompat.checkSelfPermission(this, it) !=
                android.content.pm.PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            Log.d(TAG, "Requesting permissions: $needed")
            androidx.core.app.ActivityCompat.requestPermissions(
                this, needed.toTypedArray(), REQUEST_PERMISSIONS
            )
        } else {
            Log.d(TAG, "All permissions already granted")
            // Sync contacts now that permissions are available
            syncContacts()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            permissions.forEachIndexed { index, permission ->
                val granted = grantResults[index] == android.content.pm.PackageManager.PERMISSION_GRANTED
                Log.d(TAG, "Permission $permission: ${if (granted) "GRANTED" else "DENIED"}")
            }
            // Sync contacts after permissions granted (if READ_CONTACTS was granted)
            if (grantResults.any { it == android.content.pm.PackageManager.PERMISSION_GRANTED }) {
                syncContacts()
            }
        }
    }

    // ─── Service Startup ───────────────────────────────────────────────────────

    private fun startCallListenerService() {
        try {
            val intent = Intent(this, CallListenerService::class.java)
            startForegroundService(intent)
            Log.d(TAG, "CallListenerService started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start CallListenerService", e)
        }
    }

    private fun syncContacts() {
        val hasContactPerm = androidx.core.content.ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.READ_CONTACTS
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        if (hasContactPerm) {
            ContactsSyncService.syncContacts(this)
        } else {
            Log.w(TAG, "READ_CONTACTS not granted — skipping contact sync")
        }
    }

    // ─── Google Sign-In ────────────────────────────────────────────────────────

    private fun configureGoogleSignIn() {
        val webClientId = resources.getIdentifier("default_web_client_id", "string", packageName)
        val clientIdString = if (webClientId != 0) getString(webClientId) else ""

        val builder = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestEmail()

        if (clientIdString.isNotBlank()) {
            builder.requestIdToken(clientIdString)
        } else {
            Log.e(TAG, "Missing default_web_client_id generated from google-services.json")
        }

        googleSignInClient = GoogleSignIn.getClient(this, builder.build())
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode != RC_SIGN_IN) return

        val callbackId = pendingGoogleCallbackId ?: return
        pendingGoogleCallbackId = null

        try {
            val account = GoogleSignIn.getSignedInAccountFromIntent(data)
                .getResult(ApiException::class.java)
            val idToken = account.idToken
            if (idToken.isNullOrBlank()) {
                sendGoogleResult(callbackId, null, "Google sign-in returned no ID token")
            } else {
                sendGoogleResult(callbackId, idToken, null)
            }
        } catch (e: ApiException) {
            Log.w(TAG, "Google sign-in failed", e)
            sendGoogleResult(callbackId, null, e.message ?: "Google sign-in failed")
        }
    }

    private fun sendGoogleResult(callbackId: String, idToken: String?, error: String?) {
        val result = JSONObject()
            .put("idToken", idToken)
            .put("error", error)
            .toString()
        val script = "window.__tejaAndroidAuthResult && window.__tejaAndroidAuthResult(${JSONObject.quote(callbackId)}, $result);"
        bridge.webView.post {
            bridge.webView.evaluateJavascript(script, null)
        }
    }

    // ─── JavaScript Bridge ─────────────────────────────────────────────────────

    inner class AndroidBridge {

        /**
         * Initiates a phone call via ACTION_CALL intent.
         * Requires CALL_PHONE permission. Falls back to ACTION_DIAL if denied.
         */
        @JavascriptInterface
        fun initiateCall(phoneNumber: String) {
            Log.d(TAG, "initiateCall() called for: $phoneNumber")
            runOnUiThread {
                val hasCallPerm = androidx.core.content.ContextCompat.checkSelfPermission(
                    this@MainActivity, android.Manifest.permission.CALL_PHONE
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED

                try {
                    val uri = android.net.Uri.parse("tel:${phoneNumber.trim()}")
                    val action = if (hasCallPerm) Intent.ACTION_CALL else Intent.ACTION_DIAL
                    val intent = Intent(action, uri)
                    startActivity(intent)
                    Log.d(TAG, "Call intent fired: $action for $phoneNumber")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to initiate call to $phoneNumber", e)
                    Toast.makeText(this@MainActivity, "Could not place call: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }

        /**
         * Returns the device contacts as a JSON array string.
         * Format: [{"name":"...", "phoneNumber":"..."}, ...]
         */
        @JavascriptInterface
        fun getContacts(): String {
            Log.d(TAG, "getContacts() called")
            val hasContactPerm = androidx.core.content.ContextCompat.checkSelfPermission(
                this@MainActivity, android.Manifest.permission.READ_CONTACTS
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED

            if (!hasContactPerm) {
                Log.w(TAG, "READ_CONTACTS not granted — returning empty array")
                return "[]"
            }

            return try {
                val contactsList = JSONArray()
                val cursor = contentResolver.query(
                    android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    arrayOf(
                        android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                        android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER
                    ),
                    null, null,
                    android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
                )

                cursor?.use {
                    val nameIndex = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                    val numberIndex = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER)
                    while (it.moveToNext()) {
                        val name = it.getString(nameIndex) ?: continue
                        val number = it.getString(numberIndex) ?: continue
                        if (name.isBlank() || number.isBlank()) continue
                        contactsList.put(
                            JSONObject().put("name", name.trim()).put("phoneNumber", number.trim())
                        )
                    }
                }
                Log.d(TAG, "getContacts() returning ${contactsList.length()} contacts")
                contactsList.toString()
            } catch (e: Exception) {
                Log.e(TAG, "Error reading contacts", e)
                "[]"
            }
        }

        @JavascriptInterface
        fun signInWithGoogle(callbackId: String) {
            runOnUiThread {
                pendingGoogleCallbackId = callbackId
                @Suppress("DEPRECATION")
                startActivityForResult(googleSignInClient.signInIntent, RC_SIGN_IN)
            }
        }

        @JavascriptInterface
        fun openNotificationSettings() {
            runOnUiThread {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }

        @JavascriptInterface
        fun isNotificationListenerEnabled(): Boolean {
            return NotificationManagerCompat.getEnabledListenerPackages(this@MainActivity)
                .contains(packageName)
        }

        @JavascriptInterface
        fun showToast(message: String) {
            runOnUiThread {
                Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show()
            }
        }

        /** Trigger a fresh contact sync from JS */
        @JavascriptInterface
        fun syncContacts() {
            this@MainActivity.syncContacts()
        }
    }
}
