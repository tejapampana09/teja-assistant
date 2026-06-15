package com.tejaassistant.notifications

import android.content.Context
import android.util.Log
import com.google.firebase.auth.ktx.auth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.SetOptions
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

/**
 * ContactsSyncService — Reads device contacts and writes them to Firestore.
 *
 * Firestore path: users/{uid}/contacts/{contactId}
 * Fields: name, phoneNumber, updatedAt
 *
 * Called from MainActivity after READ_CONTACTS permission is granted.
 */
object ContactsSyncService {

    private const val TAG = "ContactsSyncService"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun syncContacts(context: Context) {
        val user = Firebase.auth.currentUser
        if (user == null) {
            Log.w(TAG, "User not logged in — skipping contact sync")
            return
        }

        val hasContactPerm = androidx.core.content.ContextCompat.checkSelfPermission(
            context, android.Manifest.permission.READ_CONTACTS
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        if (!hasContactPerm) {
            Log.w(TAG, "READ_CONTACTS not granted — skipping")
            return
        }

        Log.d(TAG, "Starting contact sync for uid: ${user.uid}")

        scope.launch {
            try {
                val db = Firebase.firestore
                val uid = user.uid

                val cursor = context.contentResolver.query(
                    android.provider.ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    arrayOf(
                        android.provider.ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                        android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                        android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER,
                        android.provider.ContactsContract.CommonDataKinds.Phone.NORMALIZED_NUMBER
                    ),
                    null, null,
                    android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
                )

                var count = 0
                val batch = db.batch()
                val seen = mutableSetOf<String>()

                cursor?.use {
                    val idIdx = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.CONTACT_ID)
                    val nameIdx = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                    val numberIdx = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.NUMBER)
                    val normIdx = it.getColumnIndex(android.provider.ContactsContract.CommonDataKinds.Phone.NORMALIZED_NUMBER)

                    while (it.moveToNext()) {
                        val contactId = it.getString(idIdx) ?: continue
                        val name = it.getString(nameIdx)?.trim() ?: continue
                        val rawNumber = it.getString(numberIdx)?.trim() ?: continue
                        val normalizedNumber = it.getString(normIdx)?.trim() ?: rawNumber

                        if (name.isBlank() || rawNumber.isBlank()) continue

                        // Deduplicate by contactId — same contact may have multiple numbers
                        val docKey = "device_$contactId"
                        if (seen.contains(docKey)) continue
                        seen.add(docKey)

                        val docRef = db.collection("users").document(uid)
                            .collection("contacts").document(docKey)

                        batch.set(
                            docRef,
                            hashMapOf(
                                "name" to name,
                                "phoneNumber" to normalizedNumber.ifBlank { rawNumber },
                                "source" to "device_contacts",
                                "updatedAt" to FieldValue.serverTimestamp()
                            ),
                            SetOptions.merge()
                        )
                        count++

                        // Firestore batch limit is 500 — commit and start new batch
                        if (count % 400 == 0) {
                            batch.commit().await()
                            Log.d(TAG, "Committed batch of 400 contacts")
                        }
                    }
                }

                // Commit remaining
                if (count % 400 != 0) {
                    batch.commit().await()
                }

                Log.d(TAG, "Contact sync complete — $count contacts synced to Firestore")
            } catch (e: Exception) {
                Log.e(TAG, "Contact sync failed", e)
            }
        }
    }
}
