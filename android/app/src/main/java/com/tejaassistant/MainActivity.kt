package com.tejaassistant

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import com.tejaassistant.databinding.ActivityMainBinding
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient

    companion object {
        private const val TAG = "MainActivity"
        private const val RC_SIGN_IN = 9001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        auth = Firebase.auth

        val webClientId = resources.getIdentifier("default_web_client_id", "string", packageName)
        val clientIdString = if (webClientId != 0) getString(webClientId) else ""

        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(clientIdString)
            .requestEmail()
            .build()

        googleSignInClient = GoogleSignIn.getClient(this, gso)

        binding.btnLogin.setOnClickListener {
            val signInIntent = googleSignInClient.signInIntent
            @Suppress("DEPRECATION")
            startActivityForResult(signInIntent, RC_SIGN_IN)
        }

        binding.btnPermission.setOnClickListener {
            if (isNotificationServiceEnabled()) {
                Toast.makeText(this, getString(R.string.permission_granted), Toast.LENGTH_SHORT).show()
            } else {
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
            }
        }
    }

    override fun onResume() {
        super.onResume()
        updateUI()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)

        if (requestCode == RC_SIGN_IN) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            try {
                val account = task.getResult(ApiException::class.java)!!
                Log.d(TAG, "firebaseAuthWithGoogle: ${account.id}")
                firebaseAuthWithGoogle(account.idToken!!)
            } catch (e: ApiException) {
                Log.w(TAG, "Google sign in failed", e)
                Toast.makeText(
                    this,
                    "${getString(R.string.login_failed)}${e.message}",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun firebaseAuthWithGoogle(idToken: String) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        lifecycleScope.launch {
            try {
                auth.signInWithCredential(credential).await()
                Toast.makeText(this@MainActivity, getString(R.string.login_success), Toast.LENGTH_SHORT).show()
                updateUI()
            } catch (e: Exception) {
                Log.e(TAG, "Authentication failed", e)
                Toast.makeText(
                    this@MainActivity,
                    "${getString(R.string.login_failed)}${e.message}",
                    Toast.LENGTH_LONG
                ).show()
                updateUI()
            }
        }
    }

    private fun updateUI() {
        val user = auth.currentUser
        val notificationEnabled = isNotificationServiceEnabled()

        if (user != null) {
            binding.tvStatus.text = "${getString(R.string.logged_in_as)}${user.email}"
            binding.btnLogin.visibility = View.GONE
        } else {
            binding.tvStatus.text = getString(R.string.not_logged_in)
            binding.btnLogin.visibility = View.VISIBLE
        }

        if (notificationEnabled) {
            binding.tvNotificationStatus.text = getString(R.string.notification_status_enabled)
            binding.tvNotificationStatus.setTextColor(0xFF4ADE80.toInt())
            binding.btnPermission.text = "Notification Access Active"
        } else {
            binding.tvNotificationStatus.text = getString(R.string.notification_status_disabled)
            binding.tvNotificationStatus.setTextColor(0xFFFB923C.toInt())
            binding.btnPermission.text = getString(R.string.enable_notification_access)
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        return NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)
    }
}
