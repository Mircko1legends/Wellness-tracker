package expo.modules.lensguard

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

object LensGuardScheduler {
  const val ACTION_FIRE = "expo.modules.lensguard.FIRE"
  const val EXTRA_KIND = "kind"
  const val EXTRA_DEADLINE_AT = "deadlineAt"
  const val KIND_DEADLINE = "deadline"
  const val KIND_REMINDER = "reminder"

  private const val DEADLINE_REQUEST = 7100
  private const val REMINDER_REQUEST_BASE = 7101
  private const val MAX_REMINDERS = 8
  private const val LAUNCH_REQUEST = 7200

  fun nextDeadline(hour: Int, minute: Int, now: Long): Long {
    val cal = Calendar.getInstance().apply {
      timeInMillis = now
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
    if (cal.timeInMillis <= now) cal.add(Calendar.DAY_OF_YEAR, 1)
    return cal.timeInMillis
  }

  fun canScheduleExact(context: Context): Boolean {
    val am = context.getSystemService(AlarmManager::class.java)
    return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || am.canScheduleExactAlarms()
  }

  private fun fireIntent(context: Context) =
    Intent(context, LensGuardReceiver::class.java).setAction(ACTION_FIRE)

  private fun firePending(context: Context, requestCode: Int, kind: String, deadlineAt: Long): PendingIntent {
    val intent = fireIntent(context)
      .putExtra(EXTRA_KIND, kind)
      .putExtra(EXTRA_DEADLINE_AT, deadlineAt)
    return PendingIntent.getBroadcast(
      context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  fun launchPending(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(
      context, LAUNCH_REQUEST, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun cancelAll(context: Context) {
    val am = context.getSystemService(AlarmManager::class.java)
    for (code in DEADLINE_REQUEST until REMINDER_REQUEST_BASE + MAX_REMINDERS) {
      val existing = PendingIntent.getBroadcast(
        context, code, fireIntent(context), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
      ) ?: continue
      am.cancel(existing)
      existing.cancel()
    }
  }

  fun scheduleAll(context: Context) {
    val store = LensGuardStore(context)
    val am = context.getSystemService(AlarmManager::class.java)
    cancelAll(context)
    if (!store.enabled) {
      store.nextDeadlineAt = 0L
      return
    }

    val now = System.currentTimeMillis()
    val deadline = nextDeadline(store.hour, store.minute, now)
    store.nextDeadlineAt = deadline
    val exact = canScheduleExact(context)

    val deadlinePi = firePending(context, DEADLINE_REQUEST, KIND_DEADLINE, deadline)
    if (exact) {
      // Alarm-clock alarms are exempt from Doze: the safety net must fire on time.
      am.setAlarmClock(AlarmManager.AlarmClockInfo(deadline, launchPending(context)), deadlinePi)
    } else {
      am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, deadline, deadlinePi)
    }

    store.reminderOffsets.take(MAX_REMINDERS).forEachIndexed { index, offsetMin ->
      val at = deadline - offsetMin * 60_000L
      if (at <= now) return@forEachIndexed
      val pi = firePending(context, REMINDER_REQUEST_BASE + index, KIND_REMINDER, deadline)
      if (exact) {
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
      } else {
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
      }
    }
  }
}
