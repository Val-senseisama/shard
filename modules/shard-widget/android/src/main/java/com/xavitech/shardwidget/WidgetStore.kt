package com.xavitech.shardwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * The one place the app process and the widget process agree on storage.
 *
 * Why SharedPreferences and not AsyncStorage: on Android, AsyncStorage is backed
 * by a SQLite database owned by the React Native runtime. The widget runs in a
 * different process with no RN runtime, so it cannot read it. SharedPreferences
 * is a plain file readable by any component in the app's sandbox, which is
 * exactly what a widget needs.
 *
 * Nothing sensitive goes in here — the snapshot holds a streak count and a task
 * title, never the auth token. The widget never talks to the network, so it has
 * no use for credentials, and keeping them out means a widget bug can't leak a
 * session.
 */
object WidgetStore {
  private const val PREFS = "shard_widget_store"

  /** Current display state, written by the app. */
  private const val KEY_SNAPSHOT = "snapshot"

  /** Completions tapped on the widget that the app has not yet sent to the server. */
  private const val KEY_PENDING = "pending_completions"

  fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun readSnapshot(context: Context): JSONObject? =
    prefs(context).getString(KEY_SNAPSHOT, null)?.let {
      runCatching { JSONObject(it) }.getOrNull()
    }

  fun writeSnapshot(context: Context, json: String) {
    prefs(context).edit().putString(KEY_SNAPSHOT, json).apply()
  }

  fun readPending(context: Context): JSONArray =
    prefs(context).getString(KEY_PENDING, null)?.let {
      runCatching { JSONArray(it) }.getOrNull()
    } ?: JSONArray()

  /**
   * Queue a completion tapped on the widget.
   *
   * De-duplicated by composite id: a user double-tapping the button must not
   * enqueue the same completion twice. The server's completeTask is idempotent as
   * well, so this is belt-and-braces — but the queue is also what the UI counts,
   * so a duplicate here would show the wrong thing.
   */
  fun addPending(context: Context, taskId: String, miniGoalId: String, shardId: String, taskIndex: Int) {
    val pending = readPending(context)
    for (i in 0 until pending.length()) {
      if (pending.optJSONObject(i)?.optString("taskId") == taskId) return
    }
    pending.put(
      JSONObject().apply {
        put("taskId", taskId)
        put("miniGoalId", miniGoalId)
        put("shardId", shardId)
        put("taskIndex", taskIndex)
        put("at", System.currentTimeMillis())
      }
    )
    prefs(context).edit().putString(KEY_PENDING, pending.toString()).apply()
  }

  fun clearPending(context: Context, taskIds: List<String>) {
    if (taskIds.isEmpty()) return
    val remaining = JSONArray()
    val drop = taskIds.toHashSet()
    val pending = readPending(context)
    for (i in 0 until pending.length()) {
      val item = pending.optJSONObject(i) ?: continue
      if (!drop.contains(item.optString("taskId"))) remaining.put(item)
    }
    prefs(context).edit().putString(KEY_PENDING, remaining.toString()).apply()
  }

  /** Ask the launcher to re-render every placed instance of the widget. */
  fun notifyWidgets(context: Context) {
    val app = context.applicationContext
    val manager = AppWidgetManager.getInstance(app)
    val ids = manager.getAppWidgetIds(ComponentName(app, ShardWidgetProvider::class.java))
    if (ids.isEmpty()) return
    ShardWidgetProvider.renderAll(app, manager, ids)
  }
}
