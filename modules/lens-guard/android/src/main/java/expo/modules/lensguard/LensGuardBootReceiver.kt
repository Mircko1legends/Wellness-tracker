package expo.modules.lensguard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Alarms are wiped on reboot and app update, so re-arm them. */
class LensGuardBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    LensGuardScheduler.scheduleAll(context)
  }
}
