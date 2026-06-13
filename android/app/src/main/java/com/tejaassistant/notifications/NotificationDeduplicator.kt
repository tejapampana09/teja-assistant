package com.tejaassistant.notifications

import java.util.LinkedHashMap

/**
 * Prevents duplicate Firestore writes when WhatsApp fires multiple
 * notification updates for the same message within a short time window.
 *
 * Uses an LRU cache keyed by a fingerprint: senderName + truncated content + minute-bucket.
 * Cache size = 200 entries max.
 */
object NotificationDeduplicator {

    private const val CACHE_SIZE = 200
    private const val TIME_BUCKET_MS = 60_000L // 1-minute window

    // LRU map: removes eldest entry when capacity is exceeded
    private val cache = object : LinkedHashMap<String, Long>(CACHE_SIZE, 0.75f, true) {
        override fun removeEldestEntry(eldest: Map.Entry<String, Long>): Boolean {
            return size > CACHE_SIZE
        }
    }

    /**
     * Returns true if this notification has already been processed recently.
     * Returns false (and records the fingerprint) if it is new.
     */
    @Synchronized
    fun isDuplicate(senderName: String, message: String, timestampMs: Long): Boolean {
        val fingerprint = buildFingerprint(senderName, message, timestampMs)
        val now = System.currentTimeMillis()

        val lastSeen = cache[fingerprint]
        return if (lastSeen != null && (now - lastSeen) < TIME_BUCKET_MS * 2) {
            true // Already processed within 2 minutes
        } else {
            cache[fingerprint] = now
            false
        }
    }

    private fun buildFingerprint(senderName: String, message: String, timestampMs: Long): String {
        // Bucket to the nearest minute to catch rapid re-fires
        val minuteBucket = timestampMs / TIME_BUCKET_MS
        val msgSnippet = message.take(40).replace("\\s+".toRegex(), " ").trim()
        return "${senderName.lowercase()}|${msgSnippet.lowercase()}|$minuteBucket"
    }
}
