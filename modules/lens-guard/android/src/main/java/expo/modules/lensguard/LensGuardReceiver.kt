package expo.modules.lensguard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class LensGuardReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != LensGuardScheduler.ACTION_FIRE) return
    val store = LensGuardStore(context)
    val kind = intent.getStringExtra(LensGuardScheduler.EXTRA_KIND) ?: return
    val deadlineAt = intent.getLongExtra(LensGuardScheduler.EXTRA_DEADLINE_AT, 0L)
    if (!store.enabled) return
    val confirmed = store.isConfirmedFor(deadlineAt)

    when (kind) {
      LensGuardScheduler.KIND_REMINDER -> if (!confirmed) LensGuardAlerts.remind(context, deadlineAt, store.friendName)
      LensGuardScheduler.KIND_DEADLINE -> {
        if (!confirmed) {
          val ok = LensGuardAlerts.sendSms(context, store.phone, store.message)
          store.lastAlertAt = System.currentTimeMillis()
          store.lastAlertOk = ok
          LensGuardAlerts.alerted(context, ok, store.friendName)
        }
        LensGuardScheduler.scheduleAll(context)
      }
    }
  }
}
