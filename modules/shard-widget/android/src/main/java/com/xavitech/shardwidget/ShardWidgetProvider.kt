package com.xavitech.shardwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews

/**
 * The home-screen widget: current streak, the next task, and a button to finish it.
 *
 * Shows ONE task, never a list. The widget's job is to remove the "open the app,
 * find the thing, tick it" friction that sits between doing the work and getting
 * credit for it — and a list re-introduces a decision at the exact moment we want
 * a single action. A list is also how a widget becomes a wall of everything the
 * user is behind on, which is a reason to remove it from the home screen.
 */
class ShardWidgetProvider : AppWidgetProvider() {

  companion object {
    const val ACTION_COMPLETE = "com.xavitech.shardwidget.ACTION_COMPLETE"
    const val ACTION_REFRESH = "com.xavitech.shardwidget.ACTION_REFRESH"

    private const val EXTRA_TASK_ID = "taskId"
    private const val EXTRA_MINI_GOAL_ID = "miniGoalId"
    private const val EXTRA_SHARD_ID = "shardId"
    private const val EXTRA_TASK_INDEX = "taskIndex"

    fun renderAll(context: Context, manager: AppWidgetManager, ids: IntArray) {
      for (id in ids) manager.updateAppWidget(id, buildViews(context))
    }

    private fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.shard_widget)
      val snapshot = WidgetStore.readSnapshot(context)

      // Signed out, or the app has never synced. Say so plainly instead of
      // rendering an empty shell that reads as a broken widget.
      if (snapshot == null) {
        views.setTextViewText(R.id.streak_value, "–")
        views.setTextViewText(R.id.task_title, "Open Shard to get started")
        views.setViewVisibility(R.id.task_meta, View.GONE)
        views.setViewVisibility(R.id.complete_button, View.GONE)
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, null))
        return views
      }

      views.setTextViewText(R.id.streak_value, snapshot.optInt("streak", 0).toString())

      // A streak that is alive but not yet extended today is the moment the widget
      // exists for, so it gets the emphasis rather than a generic label.
      val doneToday = snapshot.optBoolean("doneToday", false)
      views.setTextViewText(
        R.id.streak_label,
        if (doneToday) "day streak · safe" else "day streak · at risk"
      )

      val task = snapshot.optJSONObject("nextTask")

      if (task == null) {
        // Everything scheduled is finished. This is a reward state, not an empty
        // state — the widget should feel like a win when there is nothing left.
        views.setTextViewText(R.id.task_title, "All done for today")
        views.setTextViewText(R.id.task_meta, "Nothing left on the schedule")
        views.setViewVisibility(R.id.task_meta, View.VISIBLE)
        views.setViewVisibility(R.id.complete_button, View.GONE)
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, null))
        return views
      }

      val taskId = task.optString("id")
      val pendingIds = WidgetStore.readPending(context).let { arr ->
        (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.optString("taskId") }
      }
      val isPending = pendingIds.contains(taskId)

      views.setTextViewText(R.id.task_title, task.optString("title"))
      views.setViewVisibility(R.id.task_meta, View.VISIBLE)
      views.setTextViewText(
        R.id.task_meta,
        task.optString("shardTitle").ifBlank { task.optString("miniGoalTitle") }
      )

      if (isPending) {
        // Optimistic state: the tap is recorded but the app has not yet synced it.
        // Showing it as done immediately is the whole point — a widget that waits
        // for a round-trip before acknowledging a tap feels broken.
        views.setViewVisibility(R.id.complete_button, View.VISIBLE)
        views.setTextViewText(R.id.complete_button, "✓ Done")
        views.setOnClickPendingIntent(R.id.complete_button, openAppIntent(context, null))
      } else {
        views.setViewVisibility(R.id.complete_button, View.VISIBLE)
        views.setTextViewText(R.id.complete_button, "Mark done")
        views.setOnClickPendingIntent(
          R.id.complete_button,
          completeIntent(
            context,
            taskId,
            task.optString("miniGoalId"),
            task.optString("shardId"),
            task.optInt("taskIndex", -1)
          )
        )
      }

      // Tapping anywhere else opens the quest, so the widget is a way in as well
      // as a way to act.
      views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, task.optString("shardId")))
      return views
    }

    private fun completeIntent(
      context: Context,
      taskId: String,
      miniGoalId: String,
      shardId: String,
      taskIndex: Int
    ): PendingIntent {
      val intent = Intent(context, ShardWidgetProvider::class.java).apply {
        action = ACTION_COMPLETE
        putExtra(EXTRA_TASK_ID, taskId)
        putExtra(EXTRA_MINI_GOAL_ID, miniGoalId)
        putExtra(EXTRA_SHARD_ID, shardId)
        putExtra(EXTRA_TASK_INDEX, taskIndex)
        // Extras are not part of PendingIntent equality, so without a distinct
        // data Uri a second task would silently reuse the first one's intent and
        // complete the wrong thing.
        data = Uri.parse("shardwidget://complete/$taskId")
      }
      return PendingIntent.getBroadcast(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    private fun openAppIntent(context: Context, shardId: String?): PendingIntent {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_VIEW)
      launch.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      if (!shardId.isNullOrBlank()) {
        launch.putExtra("widgetShardId", shardId)
        launch.data = Uri.parse("shard://shard/$shardId")
      }
      return PendingIntent.getActivity(
        context,
        if (shardId.isNullOrBlank()) 0 else shardId.hashCode(),
        launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    renderAll(context, manager, ids)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)

    when (intent.action) {
      ACTION_COMPLETE -> {
        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
        WidgetStore.addPending(
          context,
          taskId,
          intent.getStringExtra(EXTRA_MINI_GOAL_ID).orEmpty(),
          intent.getStringExtra(EXTRA_SHARD_ID).orEmpty(),
          intent.getIntExtra(EXTRA_TASK_INDEX, -1)
        )
        // Re-render straight away so the tap is acknowledged on screen. The app
        // sends it to the server on next foreground; completeTask is idempotent,
        // so a replayed drain is safe.
        WidgetStore.notifyWidgets(context)
      }

      ACTION_REFRESH -> WidgetStore.notifyWidgets(context)
    }
  }
}
