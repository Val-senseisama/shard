package com.xavitech.shardwidget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.util.TypedValue
import android.view.View
import android.widget.FrameLayout
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * Inflates the widget the way a launcher does, and looks at the result.
 *
 * A RemoteViews tree is built in this process and inflated in the launcher's,
 * which is why widget bugs are so expensive: an unsupported view type or a
 * missing resource throws inside SystemUI or the launcher, and all the user ever
 * sees is a grey box reading "Can't load widget". Nothing in a normal build —
 * not assembleRelease, not verifyReleaseResources, not lint — inflates the
 * layout, so nothing catches it.
 *
 * This does three things a compile cannot:
 *
 *   1. proves every view in the layout is on the RemoteViews allowlist,
 *   2. proves the button still lands inside the widget's bounds at the smallest
 *      size a launcher will hand out, which is what stops the one tappable thing
 *      on the card from being clipped off the bottom edge,
 *   3. writes a PNG of each state, because a widget is a visual artefact and
 *      there is otherwise no way to look at one without placing it by hand.
 *
 * The PNGs are written to the directory AGP hands the runner in
 * `additionalTestOutputDir` and copied off the device for you, ending up in:
 *   modules/shard-widget/android/build/outputs/connected_android_test_additional_output/
 *
 * They cannot simply go in the test app's own external files dir: the test APK
 * is uninstalled when the run finishes, which takes that directory with it.
 */
@RunWith(AndroidJUnit4::class)
class ShardWidgetRenderTest {

  private lateinit var context: Context
  private lateinit var outDir: File

  /**
   * The two sizes that matter.
   *
   * `tight` is the floor: minWidth/minHeight as declared in shard_widget_info,
   * i.e. the least a pre-Android-12 launcher can give a 2-row cell. `roomy` is
   * about what a modern 4x2 cell actually measures on a phone. Everything has to
   * survive the first; the layout is composed for the second.
   */
  private val sizes = listOf(
    "tight" to (250 to 110),
    "roomy" to (330 to 150)
  )

  @Before
  fun setUp() {
    context = InstrumentationRegistry.getInstrumentation().targetContext

    // AGP passes additionalTestOutputDir and copies whatever lands there back to
    // the host after the run. Falling back to the app's own external dir keeps
    // the test runnable straight from an IDE, where that argument is absent —
    // the files just don't survive the uninstall.
    val fromAgp = InstrumentationRegistry.getArguments().getString("additionalTestOutputDir")
    val base = if (fromAgp != null) File(fromAgp) else context.getExternalFilesDir(null)
    outDir = File(base, "widget-render").apply { mkdirs() }
  }

  private fun reset() {
    WidgetStore.prefs(context).edit().clear().commit()
  }

  private fun snapshot(
    streak: Int,
    doneToday: Boolean,
    tasksDone: Int,
    tasksTotal: Int,
    task: JSONObject?
  ) {
    val json = JSONObject()
      .put("streak", streak)
      .put("doneToday", doneToday)
      .put("tasksDone", tasksDone)
      .put("tasksTotal", tasksTotal)
      .put("updatedAt", System.currentTimeMillis())
    if (task != null) json.put("nextTask", task) else json.put("nextTask", JSONObject.NULL)
    WidgetStore.writeSnapshot(context, json.toString())
  }

  private fun task(title: String, shardTitle: String) = JSONObject()
    .put("id", "mg-1-2")
    .put("title", title)
    .put("kind", "task")
    .put("miniGoalId", "mg-1")
    .put("shardId", "shard-1")
    .put("shardTitle", shardTitle)
    .put("miniGoalTitle", "")
    .put("taskIndex", 2)

  /**
   * A side quest, surfaced by helpers/todayPlan.ts because the planner had
   * nothing for today. It carries no shard or mini-goal, because there is no
   * such thing to carry — `completeSideQuest` is a different mutation.
   */
  private fun sideQuest(title: String) = JSONObject()
    .put("id", "sq-1")
    .put("title", title)
    .put("kind", "sideQuest")
    .put("miniGoalId", "")
    .put("shardId", "")
    .put("shardTitle", JSONObject.NULL)
    .put("miniGoalTitle", JSONObject.NULL)
    .put("taskIndex", -1)

  private fun dp(value: Int): Int = TypedValue.applyDimension(
    TypedValue.COMPLEX_UNIT_DIP,
    value.toFloat(),
    context.resources.displayMetrics
  ).toInt()

  /**
   * Inflate, measure at an exact widget size, draw, and save.
   *
   * `apply()` is what the launcher calls, so anything it refuses to inflate
   * throws here too. It has to run on a Looper thread, hence runOnMainSync.
   */
  private fun render(name: String, sizeLabel: String, wDp: Int, hDp: Int): View {
    val w = dp(wDp)
    val h = dp(hDp)
    var view: View? = null

    InstrumentationRegistry.getInstrumentation().runOnMainSync {
      val views = ShardWidgetProvider.buildViews(context)
      val root = views.apply(context, FrameLayout(context))
      root.measure(
        View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY),
        View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY)
      )
      root.layout(0, 0, w, h)

      // A margin of wallpaper around the card, so the rounded corners and the
      // hairline border are actually visible in the PNG rather than bleeding
      // into the image edge.
      val pad = dp(12)
      val bmp = Bitmap.createBitmap(w + pad * 2, h + pad * 2, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bmp)
      canvas.drawColor(Color.parseColor("#14111C"))
      canvas.save()
      canvas.translate(pad.toFloat(), pad.toFloat())
      root.draw(canvas)
      canvas.restore()

      File(outDir, "$name-$sizeLabel.png").outputStream().use {
        bmp.compress(Bitmap.CompressFormat.PNG, 100, it)
      }
      view = root
    }

    return requireNonNull(view)
  }

  private fun requireNonNull(v: View?): View = v ?: throw AssertionError("apply() returned no view")

  /**
   * The button is the whole point of the widget, so it may never be clipped and
   * may never be invisible — not in any state, not at any size a launcher can
   * hand out.
   */
  private fun assertButtonUsable(root: View, label: String) {
    val button = root.findViewById<View>(R.id.complete_button)
      ?: throw AssertionError("$label: no complete_button in the inflated tree")

    assertEquals("$label: button must stay visible", View.VISIBLE, button.visibility)
    assertTrue("$label: button has no height", button.height > 0)

    var bottom = button.bottom
    var parent = button.parent
    while (parent is View && parent !== root) {
      bottom += parent.top
      parent = parent.parent
    }
    assertTrue(
      "$label: button bottom ($bottom) falls outside the widget (${root.height})",
      bottom <= root.height
    )
  }

  private fun renderAllSizes(name: String) {
    for ((label, size) in sizes) {
      val root = render(name, label, size.first, size.second)
      assertButtonUsable(root, "$name/$label")
    }
  }

  /**
   * The typefaces have to survive RemoteViews inflation.
   *
   * This is not paranoia: `@font/` in a layout is resolved by the framework
   * inflater, which only gained `Resources.getFont` at API 26, and a widget that
   * silently falls back to Roboto looks close enough in a screenshot to pass a
   * glance while breaking THE MONO RULE outright — the streak numeral would jitter
   * sideways every time it ticks past a digit boundary. Comparing against
   * Typeface.DEFAULT is the only way to tell from the outside.
   */
  @Test
  fun fontsSurviveRemoteViewsInflation() {
    reset()
    snapshot(7, false, 2, 5, task("Draft the launch email", "Ship the landing page"))
    val root = render("0-fonts", "roomy", 330, 150)

    val mono = context.resources.getFont(R.font.space_mono)
    val inter = context.resources.getFont(R.font.inter_semibold)

    val numerals = listOf(R.id.streak_value to "streak", R.id.task_count to "count")
    for ((id, label) in numerals) {
      val tf = root.findViewById<android.widget.TextView>(id).typeface
      assertEquals("$label must be SpaceMono — THE MONO RULE", mono, tf)
    }

    val words = listOf(
      R.id.task_title to "title",
      R.id.task_meta to "meta",
      R.id.streak_label to "streak label",
      R.id.complete_button to "button"
    )
    for ((id, label) in words) {
      val tf = root.findViewById<android.widget.TextView>(id).typeface
      assertEquals("$label must be Inter", inter, tf)
    }
  }

  @Test
  fun taskWaiting_streakAtRisk() {
    reset()
    snapshot(7, false, 2, 5, task("Draft the launch email", "Ship the landing page"))
    renderAllSizes("1-waiting")
  }

  @Test
  fun taskWaiting_longTitle() {
    reset()
    // The worst case for vertical fit: a title that wraps to the full two lines
    // on top of a meta line and the progress row.
    snapshot(
      142, false, 1, 9,
      task("Rewrite the onboarding copy end to end", "Q3 activation push")
    )
    renderAllSizes("2-long-title")
  }

  @Test
  fun tapped_pendingCompletion() {
    reset()
    snapshot(7, true, 3, 5, task("Draft the launch email", "Ship the landing page"))
    WidgetStore.addPending(context, "mg-1-2", "mg-1", "shard-1", 2)
    renderAllSizes("3-tapped")
  }

  @Test
  fun dayCleared() {
    reset()
    snapshot(8, true, 5, 5, null)
    renderAllSizes("4-cleared")
  }

  /**
   * Nothing scheduled and nothing done — the state that used to lie.
   *
   * "No tasks left" and "no tasks at all" both arrive as `nextTask == null`, and
   * the card rendered them identically as "Today cleared 🔥". On an empty day
   * with no activity that put a celebration directly above an "At risk" badge,
   * because the streak counts what the user finished and ignores what the
   * planner scheduled. The two must not converge again.
   */
  @Test
  fun nothingScheduled_streakStillAtRisk() {
    reset()
    snapshot(8, doneToday = false, tasksDone = 0, tasksTotal = 0, task = null)

    for ((label, size) in sizes) {
      val root = render("4b-nothing-scheduled", label, size.first, size.second)
      assertButtonUsable(root, "4b-nothing-scheduled/$label")

      val title = root.findViewById<android.widget.TextView>(R.id.task_title).text.toString()
      assertTrue(
        "an empty day must not be reported as a cleared one (was: \"$title\")",
        !title.contains("cleared", ignoreCase = true)
      )
      // The badge says the streak is at risk, so the card has to offer the way
      // to fix it rather than a button that just admires the situation.
      assertEquals(
        View.VISIBLE,
        root.findViewById<View>(R.id.streak_chip_risk).visibility
      )
    }
  }

  /**
   * The empty-day fallback: a side quest stands in for the schedule.
   *
   * The button must NOT offer to complete it. `completeTask` addresses a task by
   * shard + mini-goal + index, none of which a side quest has, so a "Mark done"
   * here would queue a completion that `drainWidgetCompletions` then discards as
   * malformed — a tap that silently does nothing, which is worse than no button.
   */
  @Test
  fun sideQuestFallback_cannotBeCompletedInPlace() {
    reset()
    snapshot(6, doneToday = false, tasksDone = 0, tasksTotal = 0, task = sideQuest("Walk 5k"))

    for ((label, size) in sizes) {
      val root = render("4c-side-quest", label, size.first, size.second)
      assertButtonUsable(root, "4c-side-quest/$label")

      val button = root.findViewById<android.widget.TextView>(R.id.complete_button).text.toString()
      assertTrue(
        "a side quest must not offer in-place completion (button read: \"$button\")",
        !button.contains("done", ignoreCase = true)
      )
    }
  }

  @Test
  fun signedOut() {
    reset()
    renderAllSizes("5-signed-out")
  }

  /**
   * A snapshot written by a build that predates tasksDone/tasksTotal. The bar
   * has to disappear rather than claim 0 of 0, and the rest of the card has to
   * carry on working — an OTA update ships new JS to an old APK, so this is a
   * real state, not a hypothetical one.
   */
  @Test
  fun snapshotWithoutCounts() {
    reset()
    val json = JSONObject()
      .put("streak", 4)
      .put("doneToday", false)
      .put("nextTask", task("Draft the launch email", "Ship the landing page"))
      .put("updatedAt", System.currentTimeMillis())
    WidgetStore.writeSnapshot(context, json.toString())

    for ((label, size) in sizes) {
      val root = render("6-no-counts", label, size.first, size.second)
      assertButtonUsable(root, "6-no-counts/$label")
      assertEquals(
        "progress row must hide when the snapshot has no counts",
        View.GONE,
        root.findViewById<View>(R.id.progress_row).visibility
      )
    }
  }
}
