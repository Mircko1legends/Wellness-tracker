package expo.modules.lensguard

import android.content.Context

private const val CONFIRM_WINDOW_MS = 12L * 60 * 60 * 1000

class LensGuardStore(context: Context) {
  private val prefs = context.getSharedPreferences("lens_guard", Context.MODE_PRIVATE)

  var enabled: Boolean
    get() = prefs.getBoolean("enabled", false)
    set(value) = prefs.edit().putBoolean("enabled", value).apply()

  var hour: Int
    get() = prefs.getInt("hour", 23)
    set(value) = prefs.edit().putInt("hour", value).apply()

  var minute: Int
    get() = prefs.getInt("minute", 0)
    set(value) = prefs.edit().putInt("minute", value).apply()

  var reminderOffsets: List<Int>
    get() = prefs.getString("reminderOffsets", "60,30,15")!!
      .split(",").mapNotNull { it.trim().toIntOrNull() }.filter { it > 0 }
    set(value) = prefs.edit().putString("reminderOffsets", value.joinToString(",")).apply()

  var phone: String
    get() = prefs.getString("phone", "")!!
    set(value) = prefs.edit().putString("phone", value).apply()

  var friendName: String
    get() = prefs.getString("friendName", "")!!
    set(value) = prefs.edit().putString("friendName", value).apply()

  var message: String
    get() = prefs.getString("message", "")!!
    set(value) = prefs.edit().putString("message", value).apply()

  // commit(): the alarm receiver may read this right after the user confirms.
  var confirmedAt: Long
    get() = prefs.getLong("confirmedAt", 0L)
    set(value) { prefs.edit().putLong("confirmedAt", value).commit() }

  var lastAlertAt: Long
    get() = prefs.getLong("lastAlertAt", 0L)
    set(value) = prefs.edit().putLong("lastAlertAt", value).apply()

  var lastAlertOk: Boolean
    get() = prefs.getBoolean("lastAlertOk", false)
    set(value) = prefs.edit().putBoolean("lastAlertOk", value).apply()

  var nextDeadlineAt: Long
    get() = prefs.getLong("nextDeadlineAt", 0L)
    set(value) = prefs.edit().putLong("nextDeadlineAt", value).apply()

  /** A confirmation counts for a deadline when it happened at most 12h before it (or any time after). */
  fun isConfirmedFor(deadlineAt: Long): Boolean = confirmedAt >= deadlineAt - CONFIRM_WINDOW_MS
}
