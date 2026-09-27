package expo.modules.lensguard

import android.Manifest
import android.app.AppOpsManager
import android.app.NotificationChannel
import android.app.PendingIntent
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import android.telephony.SmsManager
import android.telephony.SubscriptionManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object LensGuardAlerts {
  // v2: same channel with the app's own lens sound (a channel's sound can't change after creation).
  private const val CHANNEL_ID = "lens_guard_v2"
  private const val REMINDER_NOTIFICATION_ID = 7300
  private const val ALERT_NOTIFICATION_ID = 7301

  const val ACTION_SMS_SENT = "expo.modules.lensguard.SMS_SENT"
  const val ACTION_SMS_DELIVERED = "expo.modules.lensguard.SMS_DELIVERED"

  fun hasSmsPermission(context: Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

  fun hasPhoneStatePermission(context: Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED

  /** The permission can look granted in Settings while the underlying app-op is blocked (e.g. restricted settings). */
  fun smsAppOpAllowed(context: Context): Boolean {
    return try {
      val ops = context.getSystemService(AppOpsManager::class.java) ?: return true
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_SEND_SMS, Process.myUid(), context.packageName)
      } else {
        @Suppress("DEPRECATION")
        ops.checkOpNoThrow(AppOpsManager.OPSTR_SEND_SMS, Process.myUid(), context.packageName)
      }
      mode == AppOpsManager.MODE_ALLOWED || mode == AppOpsManager.MODE_DEFAULT
    } catch (e: Exception) {
      true
    }
  }

  fun defaultSmsSubscription(): Int = SubscriptionManager.getDefaultSmsSubscriptionId()

  fun activeSimCount(context: Context): Int {
    if (!hasPhoneStatePermission(context)) return -1
    return try {
      context.getSystemService(SubscriptionManager::class.java)?.activeSubscriptionInfoList?.size ?: 0
    } catch (e: SecurityException) {
      -1
    }
  }

  /**
   * On dual-SIM phones set to "ask every time" there is no default SMS SIM and a plain send fails silently:
   * fall back to the first active SIM.
   */
  private fun chooseSubscription(context: Context): Int {
    val preferred = defaultSmsSubscription()
    if (preferred != SubscriptionManager.INVALID_SUBSCRIPTION_ID) return preferred
    if (!hasPhoneStatePermission(context)) return SubscriptionManager.INVALID_SUBSCRIPTION_ID
    return try {
      context.getSystemService(SubscriptionManager::class.java)?.activeSubscriptionInfoList
        ?.firstOrNull()?.subscriptionId ?: SubscriptionManager.INVALID_SUBSCRIPTION_ID
    } catch (e: SecurityException) {
      SubscriptionManager.INVALID_SUBSCRIPTION_ID
    }
  }

  private fun smsManager(context: Context, subId: Int): SmsManager {
    val valid = subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val base = context.getSystemService(SmsManager::class.java)
      if (valid) base.createForSubscriptionId(subId) else base
    } else {
      @Suppress("DEPRECATION")
      if (valid) SmsManager.getSmsManagerForSubscriptionId(subId) else SmsManager.getDefault()
    }
  }

  private fun resultIntent(context: Context, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, LensGuardSmsResultReceiver::class.java).setAction(action)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or
      (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
    return PendingIntent.getBroadcast(context, requestCode, intent, flags)
  }

  private fun normalize(phone: String): String = phone.filter { it.isDigit() || it == '+' }

  /** Hands the SMS to Android; the real outcome arrives in LensGuardSmsResultReceiver. */
  fun sendSms(context: Context, phone: String, message: String): Boolean {
    val store = LensGuardStore(context)
    val number = normalize(phone)
    store.lastSmsQueuedAt = System.currentTimeMillis()
    store.lastSmsResultCode = 0
    store.lastSmsError = ""
    if (number.length < 6 || message.isBlank()) {
      store.lastSmsError = "numero o messaggio mancante"
      return false
    }
    if (!hasSmsPermission(context)) {
      store.lastSmsError = "permesso SMS non concesso"
      return false
    }
    return try {
      val subId = chooseSubscription(context)
      store.lastSmsSubscription = subId
      val sms = smsManager(context, subId)
      val parts = sms.divideMessage(message)
      val sent = ArrayList<PendingIntent>()
      val delivered = ArrayList<PendingIntent>()
      parts.indices.forEach {
        sent.add(resultIntent(context, ACTION_SMS_SENT, 100 + it))
        delivered.add(resultIntent(context, ACTION_SMS_DELIVERED, 200 + it))
      }
      sms.sendMultipartTextMessage(number, null, parts, sent, delivered)
      true
    } catch (e: Exception) {
      store.lastSmsError = e.javaClass.simpleName + (e.message?.let { ": $it" } ?: "")
      false
    }
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Lenti a contatto", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Promemoria per togliere le lenti e avvisi all'amico"
      enableVibration(true)
      val soundId = context.resources.getIdentifier("lens", "raw", context.packageName)
      if (soundId != 0) {
        val attributes = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
        setSound(Uri.parse("android.resource://${context.packageName}/raw/lens"), attributes)
      }
    }
    manager.createNotificationChannel(channel)
  }

  private fun post(context: Context, id: Int, title: String, text: String) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return
    ensureChannel(context)
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_dialog_alert)
      .setContentTitle(title)
      .setContentText(text)
      .setStyle(NotificationCompat.BigTextStyle().bigText(text))
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setAutoCancel(true)
      .setContentIntent(LensGuardScheduler.launchPending(context))
      .build()
    NotificationManagerCompat.from(context).notify(id, notification)
  }

  fun remind(context: Context, deadlineAt: Long, friendName: String) {
    val time = SimpleDateFormat("HH:mm", Locale.ITALY).format(Date(deadlineAt))
    val who = friendName.ifBlank { "il tuo amico" }
    post(
      context,
      REMINDER_NOTIFICATION_ID,
      "Togli le lenti a contatto",
      "Toglile e spunta \"Lenti tolte\" nell'app. Se alle $time non l'hai fatto, avviso $who."
    )
  }

  fun smsFailed(context: Context, code: Int) {
    post(
      context,
      ALERT_NOTIFICATION_ID,
      "SMS all'amico NON partito",
      "Android ha rifiutato l'invio (${smsErrorText(code)}). Apri Lenti nell'app per la diagnosi. Togli le lenti."
    )
  }

  fun smsErrorText(code: Int): String = when (code) {
    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "errore generico: SIM per gli SMS non scelta, credito o numero"
    SmsManager.RESULT_ERROR_RADIO_OFF -> "rete spenta o modalità aereo"
    SmsManager.RESULT_ERROR_NULL_PDU -> "messaggio non valido"
    SmsManager.RESULT_ERROR_NO_SERVICE -> "nessun segnale"
    SmsManager.RESULT_ERROR_LIMIT_EXCEEDED -> "troppi SMS in poco tempo"
    else -> "codice $code"
  }

  fun alerted(context: Context, ok: Boolean, friendName: String) {
    val who = friendName.ifBlank { "il tuo amico" }
    if (ok) {
      post(context, ALERT_NOTIFICATION_ID, "Ho avvisato $who", "Non avevi spuntato \"Lenti tolte\": gli ho mandato l'SMS automatico. Togli le lenti.")
    } else {
      post(context, ALERT_NOTIFICATION_ID, "SMS NON inviato", "Controlla permesso SMS e numero nell'app. Togli subito le lenti.")
    }
  }
}
