package expo.modules.lensguard

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Android tells us here whether the SMS actually left the phone (sent) and reached the friend (delivered). */
class LensGuardSmsResultReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val store = LensGuardStore(context)
    when (intent.action) {
      LensGuardAlerts.ACTION_SMS_SENT -> {
        // Multipart message: one failed part means the message is broken, so a failure is never overwritten.
        val code = resultCode
        if (code != Activity.RESULT_OK) {
          store.lastSmsResultCode = code
          LensGuardAlerts.smsFailed(context, code)
        } else if (store.lastSmsResultCode == 0) {
          store.lastSmsResultCode = code
        }
        store.lastSmsResultAt = System.currentTimeMillis()
      }
      LensGuardAlerts.ACTION_SMS_DELIVERED -> {
        if (resultCode == Activity.RESULT_OK) store.lastSmsDeliveredAt = System.currentTimeMillis()
      }
    }
  }
}
