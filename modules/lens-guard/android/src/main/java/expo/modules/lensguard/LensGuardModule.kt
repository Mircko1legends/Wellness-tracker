package expo.modules.lensguard

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class LensGuardConfig : Record {
  @Field val enabled: Boolean = false
  @Field val hour: Int = 23
  @Field val minute: Int = 0
  @Field val reminderOffsets: List<Int> = listOf(60, 30, 15)
  @Field val phone: String = ""
  @Field val friendName: String = ""
  @Field val message: String = ""
}

class LensGuardModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private fun state(): Map<String, Any?> {
    val store = LensGuardStore(context)
    val power = context.getSystemService(PowerManager::class.java)
    return mapOf(
      "enabled" to store.enabled,
      "hour" to store.hour,
      "minute" to store.minute,
      "reminderOffsets" to store.reminderOffsets,
      "phone" to store.phone,
      "friendName" to store.friendName,
      "message" to store.message,
      "confirmedAt" to store.confirmedAt.toDouble(),
      "lastAlertAt" to store.lastAlertAt.toDouble(),
      "lastAlertOk" to store.lastAlertOk,
      "nextDeadlineAt" to store.nextDeadlineAt.toDouble(),
      "exactAlarmsAllowed" to LensGuardScheduler.canScheduleExact(context),
      "smsPermission" to LensGuardAlerts.hasSmsPermission(context),
      "ignoringBatteryOptimizations" to power.isIgnoringBatteryOptimizations(context.packageName)
    )
  }

  private fun openSettings(action: String, withPackage: Boolean) {
    val intent = Intent(action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    if (withPackage) intent.data = Uri.parse("package:${context.packageName}")
    context.startActivity(intent)
  }

  override fun definition() = ModuleDefinition {
    Name("LensGuard")

    Function("configure") { config: LensGuardConfig ->
      val store = LensGuardStore(context)
      store.hour = config.hour
      store.minute = config.minute
      store.reminderOffsets = config.reminderOffsets
      store.phone = config.phone
      store.friendName = config.friendName
      store.message = config.message
      store.enabled = config.enabled
      LensGuardScheduler.scheduleAll(context)
      state()
    }

    Function("confirmRemoved") {
      LensGuardStore(context).confirmedAt = System.currentTimeMillis()
      state()
    }

    Function("undoConfirmation") {
      LensGuardStore(context).confirmedAt = 0L
      state()
    }

    Function("getState") { state() }

    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        openSettings(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, true)
      }
    }

    Function("openBatterySettings") {
      openSettings(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS, false)
    }

    Function("sendTestSms") { phone: String, message: String ->
      LensGuardAlerts.sendSms(context, phone, message)
    }
  }
}
