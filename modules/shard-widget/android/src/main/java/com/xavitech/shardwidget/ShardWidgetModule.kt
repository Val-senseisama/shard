package com.xavitech.shardwidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * JS bridge for the home-screen widget.
 *
 * The app owns all data and all network access; the widget only renders what it
 * is given and records taps. That split is deliberate — see WidgetStore for why
 * the widget never holds credentials or calls the API.
 */
class ShardWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ShardWidget")

    /**
     * Replace the widget's display state and re-render immediately.
     *
     * Called on app foreground and after anything that changes what the widget
     * shows (a completion, a streak change). Cheap enough to call liberally: it
     * is one SharedPreferences write plus a broadcast.
     */
    Function("setSnapshot") { json: String ->
      val context = appContext.reactContext ?: return@Function false
      WidgetStore.writeSnapshot(context, json)
      WidgetStore.notifyWidgets(context)
      true
    }

    /**
     * Completions the user tapped on the widget that have not reached the server.
     *
     * Returned as a JSON string rather than a typed record list to keep the
     * bridge surface trivial — the JS side parses it once and hands the ids
     * straight to the completeTask mutation.
     */
    Function("getPending") {
      val context = appContext.reactContext ?: return@Function "[]"
      WidgetStore.readPending(context).toString()
    }

    /** Drop queued completions the app has now successfully sent. */
    Function("clearPending") { taskIds: List<String> ->
      val context = appContext.reactContext ?: return@Function false
      WidgetStore.clearPending(context, taskIds)
      true
    }

    /** Force a re-render without changing the snapshot. */
    Function("requestUpdate") {
      val context = appContext.reactContext ?: return@Function false
      WidgetStore.notifyWidgets(context)
      true
    }

    /**
     * Whether the user actually has the widget on a home screen.
     *
     * Lets the app skip snapshot writes nobody will see, and — more usefully —
     * lets us measure widget adoption against retention rather than guessing at
     * whether it helped.
     */
    Function("isWidgetInstalled") {
      val context = appContext.reactContext ?: return@Function false
      val manager = android.appwidget.AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(
        android.content.ComponentName(context, ShardWidgetProvider::class.java)
      )
      ids.isNotEmpty()
    }
  }
}
