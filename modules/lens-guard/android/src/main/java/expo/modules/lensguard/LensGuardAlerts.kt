package expo.modules.lensguard

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object LensGuardAlerts {
  private const val CHANNEL_ID = "lens_guard"
  private const val REMINDER_NOTIFICATION_ID = 7300
  private const val ALERT_NOTIFICATION_ID = 7301

  fun hasSmsPermission(context: Context): Boolean =
    ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) == PackageManager.PERMISSION_GRANTED

  fun sendSms(context: Context, phone: String, message: String): Boolean {
    if (phone.isBlank() || message.isBlank() || !hasSmsPermission(context)) return false
    return try {
      val sms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      }
      sms.sendMultipartTextMessage(phone, null, sms.divideMessage(message), null, null)
      true
    } catch (e: Exception) {
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

  fun alerted(context: Context, ok: Boolean, friendName: String) {
    val who = friendName.ifBlank { "il tuo amico" }
    if (ok) {
      post(context, ALERT_NOTIFICATION_ID, "Ho avvisato $who", "Non avevi spuntato \"Lenti tolte\": gli ho mandato l'SMS automatico. Togli le lenti.")
    } else {
      post(context, ALERT_NOTIFICATION_ID, "SMS NON inviato", "Controlla permesso SMS e numero nell'app. Togli subito le lenti.")
    }
  }
}
