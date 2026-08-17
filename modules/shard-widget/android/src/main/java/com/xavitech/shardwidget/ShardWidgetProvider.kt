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

    /**
     * `internal` rather than `private` so the render test can drive it.
     *
     * There is no other way to look at this file's output: a RemoteViews tree is
     * inflated by the launcher, in the launcher's process, and a mistake in it
     * surfaces to the user as "Can't load widget" with no stack trace anywhere
     * they will see. ShardWidgetRenderTest inflates it the same way the launcher
     * does, which is the only cheap guard against the view-allowlist trap this
     * file's comments keep warning about.
     */
    internal fun buildViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.shard_widget)
      val snapshot = WidgetStore.readSnapshot(context)

      // Signed out, or the app has never synced. Say so plainly instead of
      // rendering an empty shell that reads as a broken widget.
      if (snapshot == null) {
        // An unknown streak is drawn faint, not in ember. On a device the ember
        // dash read as a stray orange mark floating next to the shard rather
        // than as a placeholder for a number.
        views.setTextViewText(R.id.streak_value, "–")
        views.setTextColor(R.id.streak_value, context.getColor(R.color.widget_text_faint))
        views.setTextViewText(R.id.streak_label, "day streak")
        setStreakChip(views, null)
        // Says what the widget is for, rather than repeating the button. The
        // title used to read "Open Shard to get started" directly above a button
        // reading "Open Shard".
        views.setTextViewText(R.id.task_title, "Your streak and today's next task")
        views.setViewVisibility(R.id.task_meta, View.GONE)
        views.setViewVisibility(R.id.progress_row, View.GONE)
        // The button stays put and becomes the way in. Hiding it collapsed the
        // card to two-thirds of its height in exactly the state that already had
        // the least to show.
        setButton(context, views, "Get started", primary = true, intent = openAppIntent(context, null))
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, null))
        return views
      }

      views.setTextViewText(R.id.streak_value, snapshot.optInt("streak", 0).toString())
      // Reset explicitly: RemoteViews are recycled by the launcher, so the faint
      // colour set by the signed-out branch above would otherwise persist into
      // the next render once the user signs in.
      views.setTextColor(R.id.streak_value, context.getColor(R.color.widget_ember))
      views.setTextViewText(R.id.streak_label, "day streak")

      // A streak that is alive but not yet extended today is the moment the widget
      // exists for, so it gets a badge rather than a suffix on the label.
      val doneToday = snapshot.optBoolean("doneToday", false)
      setStreakChip(views, doneToday)

      // Today's progress, drawn as the app's XP bar. Absent on snapshots written
      // by a build that predates these fields, in which case the row stays hidden
      // rather than claiming 0 of 0.
      val total = snapshot.optInt("tasksTotal", 0)
      val done = snapshot.optInt("tasksDone", 0).coerceIn(0, total)
      if (total > 0) {
        views.setViewVisibility(R.id.progress_row, View.VISIBLE)
        views.setProgressBar(R.id.task_progress, 100, done * 100 / total, false)
        views.setTextViewText(R.id.task_count, "$done / $total")
      } else {
        views.setViewVisibility(R.id.progress_row, View.GONE)
      }

      val task = snapshot.optJSONObject("nextTask")

      if (task == null) {
        views.setViewVisibility(R.id.task_meta, View.VISIBLE)

        if (total > 0) {
          // Everything scheduled is finished. This is a reward state, not an
          // empty state — the widget should feel like a win when there is
          // nothing left.
          views.setTextViewText(R.id.task_title, "Today cleared 🔥")
          views.setTextViewText(R.id.task_meta, "Nothing left on the schedule")
          setButton(context, views, "Open Shard", primary = false, intent = openAppIntent(context, null))
        } else {
          // Nothing was ever scheduled, which is NOT the same thing and used to
          // render identically — the card congratulated the user with "Today
          // cleared" while the badge beside it said "At risk", because the
          // streak counts activity and none had happened.
          //
          // The streak does not care what the planner scheduled: it asks only
          // whether the user finished something today (Streak.ts —
          // `atRiskToday: lastDayKey !== today`). So on an empty day the card
          // has to say what will actually keep the streak alive, and hand over
          // an action rather than a compliment.
          views.setTextViewText(R.id.task_title, "Nothing scheduled today")
          if (doneToday) {
            views.setTextViewText(R.id.task_meta, "Streak already safe")
            setButton(context, views, "Open Shard", primary = false, intent = openAppIntent(context, null))
          } else {
            views.setTextViewText(R.id.task_meta, "Finish anything to keep your streak")
            setButton(context, views, "Pick a task", primary = true, intent = openAppIntent(context, null))
          }
        }

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

      // A side quest surfaced because the planner had nothing for today. Say so,
      // rather than showing a bare title the user has no context for — the meta
      // line is the only place that can explain why this is on the card at all.
      val isSideQuest = task.optString("kind") == "sideQuest"
      views.setTextViewText(
        R.id.task_meta,
        if (isSideQuest) {
          "Side quest · nothing scheduled today"
        } else {
          task.optString("shardTitle").ifBlank { task.optString("miniGoalTitle") }
        }
      )

      if (isSideQuest) {
        // completeTask cannot finish a side quest, and a "Mark done" that
        // silently did nothing would be worse than no button. Hand it over
        // instead — still one tap from the home screen to the right place.
        setButton(context, views, "Open Shard", primary = true, intent = openAppIntent(context, null))
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent(context, null))
        return views
      }

      if (isPending) {
        // Optimistic state: the tap is recorded but the app has not yet synced it.
        // Showing it as done immediately is the whole point — a widget that waits
        // for a round-trip before acknowledging a tap feels broken. Secondary
        // styling, because the button must stop soliciting a second tap without
        // disappearing and taking the card's height with it.
        setButton(context, views, "✓ Done", primary = false, intent = openAppIntent(context, null))
      } else {
        setButton(
          context,
          views,
          "Mark done",
          primary = true,
          intent = completeIntent(
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

    /**
     * Show one of the two pre-built streak badges, or neither.
     *
     * Two views swapped by visibility rather than one view recoloured with
     * setTextColor/setInt: it keeps every colour resolved from the resource table
     * at inflate time, which is what a values-night palette would need to work at
     * all. `null` means the streak is unknown (signed out), where a badge either
     * way would be a claim we can't make.
     */
    private fun setStreakChip(views: RemoteViews, doneToday: Boolean?) {
      views.setViewVisibility(
        R.id.streak_chip_safe,
        if (doneToday == true) View.VISIBLE else View.GONE
      )
      views.setViewVisibility(
        R.id.streak_chip_risk,
        if (doneToday == false) View.VISIBLE else View.GONE
      )
    }

    /**
     * The one action, in HudButton's primary or secondary variant.
     *
     * Colours are read back out of the resource table rather than written as
     * literals here — the palette has one home (values/colors.xml, itself a copy
     * of components/hud/palette.js) and a second copy in Kotlin is how the app
     * and the widget would come to disagree about what violet is.
     */
    private fun setButton(
      context: Context,
      views: RemoteViews,
      label: String,
      primary: Boolean,
      intent: PendingIntent
    ) {
      views.setTextViewText(R.id.complete_button, label)
      views.setInt(
        R.id.complete_button,
        "setBackgroundResource",
        if (primary) R.drawable.widget_button else R.drawable.widget_button_secondary
      )
      views.setTextColor(
        R.id.complete_button,
        context.getColor(if (primary) R.color.widget_text else R.color.widget_text_dim)
      )
      views.setOnClickPendingIntent(R.id.complete_button, intent)
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
