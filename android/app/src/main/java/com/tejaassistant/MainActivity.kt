package com.tejaassistant

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.NotificationManagerCompat
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider

class MainActivity : Activity() {

    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient
    private lateinit var statusText: TextView
    private lateinit var loginButton: Button

    private val RC_SIGN_IN = 9001
    private val TAG = "MainActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        auth = FirebaseAuth.getInstance()

        // Configure Google Sign In
        val webClientId = resources.getIdentifier("default_web_client_id", "string", packageName)
        val clientIdString = if (webClientId != 0) getString(webClientId) else ""

        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(clientIdString)
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(this, gso)

        // UI Setup
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(64, 64, 64, 64)
        }

        val title = TextView(this).apply {
            text = "Teja Assistant Login"
            textSize = 24f
            setPadding(0, 0, 0, 32)
        }

        loginButton = Button(this).apply {
            text = "Sign in with Google"
        }

        val permissionButton = Button(this).apply {
            text = "Enable Notification Access"
        }

        statusText = TextView(this).apply {
            text = "Not logged in"
            setPadding(0, 32, 0, 0)
        }

        layout.addView(title)
        layout.addView(loginButton)
        layout.addView(permissionButton)
        layout.addView(statusText)

        setContentView(layout)

        updateUI()

        loginButton.setOnClickListener {
            val signInIntent = googleSignInClient.signInIntent
            startActivityForResult(signInIntent, RC_SIGN_IN)
        }

        permissionButton.setOnClickListener {
            if (!isNotificationServiceEnabled()) {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            } else {
                Toast.makeText(this, "Permission already granted!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_SIGN_IN) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account = task.getResult(ApiException::class.java)!!
                Log.d(TAG, "firebaseAuthWithGoogle:" + account.id)
                firebaseAuthWithGoogle(account.idToken!!)
            } catch (e: ApiException) {
                Log.w(TAG, "Google sign in failed", e)
                Toast.makeText(this, "Google Sign-In failed: ${e.message}", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                if (task.isSuccessful) {
                    Toast.makeText(this, "Login Successful!", Toast.LENGTH_SHORT).show()
                    updateUI()
                } else {
                    Toast.makeText(this, "Authentication Failed: ${task.exception?.message}", Toast.LENGTH_LONG).show()
                    updateUI()
                }
            }
    }

    private fun updateUI() {
        val user = auth.currentUser
        if (user != null) {
            statusText.text = "Logged in as: ${user.email}"
            loginButton.visibility = android.view.View.GONE
        } else {
            statusText.text = "Not logged in"
            loginButton.visibility = android.view.View.VISIBLE
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val packageNames = NotificationManagerCompat.getEnabledListenerPackages(this)
        return packageNames.contains(packageName)
    }
}
