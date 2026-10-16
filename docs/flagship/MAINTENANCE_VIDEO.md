# Maintenance: a deliberate edit, in 2 minutes 24 seconds

[Watch or download the MP4](./media/maintenance/maintenance-story.mp4) ·
[English captions (WebVTT)](./media/maintenance/maintenance-story.en.vtt) ·
[Six contextual captures](./MAINTENANCE_JOURNEY.md) ·
[General product walkthrough](./PRODUCT_WALKTHROUGH.md) ·
[Case study](./CASE_STUDY.md)

This silent recording follows two Manager editors through a stale maintenance
save, retained draft, explicit review, deliberate save, Activity and Auditor
read-only access. English captions are included in the picture, below the app,
so they remain available in a basic video player. The transcript below includes
both their meaning and the visible context. No voice or audio track is present.

If a repository preview cannot play the file, download/open the MP4 in a browser
or use the transcript and six captures. Nothing on the README or case starts
playback automatically. The existing text and links remain useful without media.

## Transcript and visible action

Times are approximate chapter starts for this specific recording. “Editor A”
and “Editor B” mean separate tabs using the **same shared Demo Manager account**,
not separate visitor identities.

| Time  | Explanation and visible action                                                                                                                                                                                                                                     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 00:00 | Keelwatch: a deliberate maintenance edit. This is the real local app, API and PostgreSQL with synthetic data. The original order is “Inspect emergency bilge pump” on MV Demo Aurora, `KW-970001`.                                                                 |
| 00:06 | Editor A has reviewed revision 1. A second Manager has opened the same order. The record heading and edit form show the original title.                                                                                                                            |
| 00:12 | Editor B also holds revision 1. Both tabs use Demo Manager.                                                                                                                                                                                                        |
| 00:19 | Editor B types “Inspect bilge pump before departure” and keeps it as an unsaved draft. The record heading still reflects the saved revision.                                                                                                                       |
| 00:23 | Editor B keeps the title as an unsaved draft. No maintenance write has occurred; the heading still shows revision 1.                                                                                                                                               |
| 00:29 | Back in Editor A, the title is changed to “Inspect bilge pump and discharge line”.                                                                                                                                                                                 |
| 00:33 | Editor A chooses Save maintenance changes.                                                                                                                                                                                                                         |
| 00:38 | The first write is confirmed at revision 2. The heading and success Toast update; Editor B still holds a revision-1 draft.                                                                                                                                         |
| 00:48 | Editor B tries to save the older reviewed revision.                                                                                                                                                                                                                |
| 00:53 | The stale save is rejected. The form retains the draft, loads the current revision and presents the comparison. The server remains at revision 2.                                                                                                                  |
| 01:02 | Review the previous title, current title and draft. To keep the intended title, the editor leaves the draft unchanged rather than adopting the current saved title. The three labelled values appear in separate rows.                                             |
| 01:14 | After dismissing the conflict notification with a visible click, the editor activates Continue with reviewed values using Enter. This accepts the reviewed revision without writing. Save maintenance changes is now available and remains a separate decision.    |
| 01:24 | The deliberate save succeeds at revision 3. The final title is “Inspect bilge pump before departure”, with another confirmation Toast.                                                                                                                             |
| 01:38 | The vessel's Activity shows the newest creation and two confirmed updates. The order ledger was also checked: exactly three events for this order. The rejected attempt adds no successful event. Older seeded/retry history further down belongs to other orders. |
| 01:48 | Activity identifies the shared Demo Manager account, not the individual visitor or browser tab. The order remains unassigned; a maintenance responsible user would be an access-account user, distinct from a CrewMember.                                          |
| 01:58 | Demo Auditor reads the same final title and revision 3. Read-only maintenance view replaces the edit form.                                                                                                                                                         |
| 02:09 | A direct Auditor update request, checked by the recording script outside the visible UI, returned `403`. The script re-read the order and history and confirmed neither changed.                                                                                   |
| 02:17 | Explore the case, six contextual captures and source. This local recording does not establish public availability or capacity. [Crew](./CREW_CASE.md) remains a linked secondary consistency case.                                                                 |

## Source, delivery and checks

- Recorded on **2026-10-16 at 14:07:56 UTC**, against application source
  `951ddac8474140936c8bbc9bdaed15de2ae9cf34`. This recording repeats the real Maintenance scenario
  after the notification contrast and Crew selector corrections. Maintenance
  business behavior is unchanged; the six original captures retain their own
  earlier date, record IDs and source evidence.
- A fresh local `kw_capture_…` schema was verified empty before the twelve
  migrations and existing synthetic seeds. Before operational writes, `/access/me`
  was matched to the isolated Demo Manager User ID. The fifteen retained `public`
  tables, including the migration ledger, retained their counts and SHA-256
  fingerprints. No public environment was written, reset or measured.
- Chrome 155.0.8059.79 headless, Node 24.13.0, PostgreSQL **18.1**. The capture
  records real browser frames and their arrival times; idle frames are held until
  the next change. Scroll between sections is continuous and eased. A recording-only cursor,
  target outline and click ring guide native mouse actions; review still uses
  keyboard Enter. Explicit switches between the two Manager editors and the
  settled Auditor tab are intentional. The Activity link uses SPA navigation,
  with no document reload in the recorded view. These annotations never ship in
  the app and do not replace its controls or responses. Explanatory pauses are intentional. It is
  neither a slideshow made from the six PNGs nor a measurement of response time.
- MP4 with H.264 Main, yuv420p and faststart; 1280 × 800 app viewport plus a
  128 px caption band, giving **1280 × 928 at 30 fps**. Duration **143.989 seconds**,
  size **3,396,368 bytes (3.24 MiB)**, eighteen English caption cues, no audio.
  Captions stay outside the app image. Open the video at full size for small UI
  details; the transcript and original-resolution captures are the text alternative.
- Full decode and all 4,320 encoded frames were checked for a completely
  white app image: zero found. The gate scans every encoded app crop at 32 × 20
  grayscale and rejects a frame when over 95% of pixels exceed 240. This detects
  the previous full-white failure, not every possible visual defect. Sequence
  sheets across the whole recording, cue details and intermediate scroll frames
  were also inspected for legibility and continuity. Actual playback, beginning/middle/end seeks,
  all eighteen WebVTT cues and keyboard focus were verified in **Chrome
  155.0.8059.79 and Edge 155.0.4283.45** using local HTTP native-video controls.
  The verification fixture started paused with autoplay absent and preserved
  download/caption links when media was deliberately unavailable. It is not a
  new product route. Safari, Firefox and mobile-device playback were not tested.
- [Machine-readable video evidence](./media/maintenance/video-evidence.json)
  contains the source, timing, synthetic record references, results, file hash
  and browser verification. The capture checks expected revisions `1 → 1 → 2`,
  final revision 3, retained draft, review without a write, matching Activity and
  Auditor denial. It does not induce audit failure; the existing
  [Maintenance tests and technical case](./MAINTENANCE_CASE.md) cover rollback
  and competing writers separately.
- Encoding used FFmpeg 7.1 from the pinned `imageio-ffmpeg==0.6.0` Windows wheel,
  downloaded and extracted only under ignored `.scratch`. No package manifest,
  global installation, video service, paid tool or application upload was added.
  The MP4, WebVTT and evidence stay in this repository alongside the six PNGs;
  the separate portfolio will summarize/link approved content in #27.

**Owner content review accepted on 2026-10-16** for the combined README, case,
captures and both videos delivered at `8b88f46`. Publication and issue closure
remain separate. Any material content change needs renewed review before
portfolio integration.

## Reproduce this recording

Follow the [local capture prerequisites and isolation boundaries](./MAINTENANCE_JOURNEY.md#reproduce-locally).
Use an existing FFmpeg executable through `CAPTURE_FFMPEG`, or prepare the pinned
Windows tool without installing it:

```text
python -m pip download --no-deps --dest .scratch/maintenance-video-tools imageio-ffmpeg==0.6.0
python -m zipfile -e .scratch/maintenance-video-tools/imageio_ffmpeg-0.6.0-py3-none-win_amd64.whl .scratch/maintenance-video-tools
```

The wheel's SHA-256 used for this run is
`02fa47c83703c37df6bfe4896aab339013f62bf02c5ebf2dce6da56af04ffc0a`.
The recorder defaults to its extracted `imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe`.
`CAPTURE_CHROME` and `CAPTURE_EDGE` can point to existing browser executables;
the defaults are the normal Windows Chrome and Edge installation paths.

From the repository root, in the first terminal:

```text
npm run build
node scripts/maintenance-capture-env.mjs prepare
node scripts/maintenance-capture-env.mjs serve
```

Keep those temporary servers running and use a second terminal:

```text
node scripts/maintenance-capture.mjs --video
node scripts/check-maintenance-video.mjs
node scripts/maintenance-capture-env.mjs verify
```

Recording takes roughly three minutes. The mode reuses the real workflow checks,
adds deliberate pauses and gradual typing, and writes intermediate JPEG frames,
timings, encoding logs, Chrome profiles and milestone stills under ignored
`.scratch/maintenance-video/`. It preserves the published six PNGs. Encoding and
decode checks complete before replacing the delivered media; playback verification
is reset to pending until the checker succeeds on the new file. Failed commands
are not successful evidence, and no operational write is retried automatically.

The playback checker temporarily serves only its player fixture, MP4 and WebVTT
on loopback; it closes its server and browser processes. Stop the application
servers with Ctrl+C after the retained-data check. Schemas, synthetic orders and
raw files are kept rather than automatically deleted. Re-recording produces a
new date, order and timeline: review the actual video, captions, transcript times,
source and limits before committing or requesting renewed content approval.
