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

    /**
     * Whether the launcher will show a one-tap "add to home screen" dialog.
     *
     * Two things can say no. Below API 26 the API does not exist, and even above
     * it a launcher is free to decline — the AOSP launcher and every major OEM
     * one support it, but enough do not that asking first is the difference
     * between a button that works and a button that does nothing. Anything
     * offering the pin must check this, or it will render a dead control on
     * exactly the devices whose users cannot fix it.
     */
    Function("canPinWidget") {
      val context = appContext.reactContext ?: return@Function false
      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) return@Function false
      android.appwidget.AppWidgetManager.getInstance(context).isRequestPinAppWidgetSupported
    }

    /**
     * Ask the launcher to pin the widget.
     *
     * The return value is whether the *request* was accepted, not whether the
     * user went through with it — answering that needs a PendingIntent callback
     * and a receiver, and there is nothing to do with the answer that
     * isWidgetInstalled does not already tell us on next foreground. The prompt
     * that calls this hides itself once the widget exists, so the truth arrives
     * on its own.
     */
    Function("requestPinWidget") {
      val context = appContext.reactContext ?: return@Function false
      if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) return@Function false
      val manager = android.appwidget.AppWidgetManager.getInstance(context)
      if (!manager.isRequestPinAppWidgetSupported) return@Function false
      manager.requestPinAppWidget(
        android.content.ComponentName(context, ShardWidgetProvider::class.java),
        null,
        null
      )
    }
  }
}
