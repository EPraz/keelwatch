# Maintenance: a deliberate edit, in 2 minutes 44 seconds

[Watch or download the MP4](./media/maintenance/maintenance-story.mp4) ·
[English captions (WebVTT)](./media/maintenance/maintenance-story.en.vtt) ·
[Six contextual captures](./MAINTENANCE_JOURNEY.md) ·
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
| 00:08 | Editor A has reviewed revision 1. A second Manager has opened the same order. The record heading and edit form show the original title.                                                                                                                            |
| 00:16 | Editor B also holds revision 1. Both tabs use Demo Manager.                                                                                                                                                                                                        |
| 00:24 | Editor B types “Inspect bilge pump before departure” and keeps it as an unsaved draft. The record heading still reflects the saved revision.                                                                                                                       |
| 00:36 | Back in Editor A, the title is changed to “Inspect bilge pump and discharge line”.                                                                                                                                                                                 |
| 00:40 | Editor A chooses Save maintenance changes.                                                                                                                                                                                                                         |
| 00:45 | The first write is confirmed at revision 2. The heading and success Toast update; Editor B still holds a revision-1 draft.                                                                                                                                         |
| 00:57 | Editor B tries to save the older reviewed revision.                                                                                                                                                                                                                |
| 01:01 | The stale save is rejected. The form retains the draft, loads the current revision and presents the comparison. The server remains at revision 2.                                                                                                                  |
| 01:11 | Review the previous title, current title and draft. To keep the intended title, the editor leaves the draft unchanged rather than adopting the current saved title. The product's existing comparison places these labels closely together.                        |
| 01:24 | The editor activates Continue with reviewed values using Enter. This accepts the reviewed revision without writing. Save maintenance changes is now available and remains a separate decision.                                                                     |
| 01:36 | The deliberate save succeeds at revision 3. The final title is “Inspect bilge pump before departure”, with another confirmation Toast.                                                                                                                             |
| 01:49 | The vessel's Activity shows the newest creation and two confirmed updates. The order ledger was also checked: exactly three events for this order. The rejected attempt adds no successful event. Older seeded/retry history further down belongs to other orders. |
| 02:01 | Activity identifies the shared Demo Manager account, not the individual visitor or browser tab. The order remains unassigned; a maintenance responsible user would be an access-account user, distinct from a CrewMember.                                          |
| 02:12 | Demo Auditor reads the same final title and revision 3. Read-only maintenance view replaces the edit form.                                                                                                                                                         |
| 02:26 | A direct Auditor update request, checked by the recording script outside the visible UI, returned `403`. The script re-read the order and history and confirmed neither changed.                                                                                   |
| 02:36 | Explore the case, six contextual captures and source. This local recording does not establish public availability or capacity. [Crew](./CREW_CASE.md) remains a linked secondary consistency case.                                                                 |

## Source, delivery and checks

- Recorded on **2026-10-15 at 15:18:55 UTC**, against application source
  `958fa2da2374cef320d109a6c41f9cea770a4b4a`. The application is unchanged from
  the source used for the six captures; this recording re-ran the actual scenario.
  The image set retains its own earlier date, record IDs and source evidence.
- A fresh local `kw_capture_…` schema was verified empty before the twelve
  migrations and existing synthetic seeds. Before operational writes, `/access/me`
  was matched to the isolated Demo Manager User ID. The fifteen retained `public`
  tables, including the migration ledger, retained their counts and SHA-256
  fingerprints. No public environment was written, reset or measured.
- Chrome 155.0.8059.79 headless, Node 24.13.0, PostgreSQL **18.1**. The capture
  records real browser frames and their arrival times; idle frames are held until
  the next change. Tab switches and explanatory pauses are intentional. It is
  neither a slideshow made from the six PNGs nor a measurement of response time.
- MP4 with H.264 Main, yuv420p and faststart; 1280 × 800 app viewport plus a
  128 px caption band, giving **1280 × 928 at 12 fps**. Duration **164.42 seconds**,
  size **1,181,842 bytes (1.13 MiB)**, eighteen English caption cues, no audio.
  Captions stay outside the app image. Open the video at full size for small UI
  details; the transcript and original-resolution captures are the text alternative.
- Full decode and representative frames from typing, save, conflict, review,
  Activity and Auditor were checked. Actual playback, beginning/middle/end seeks,
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

**Owner content review is pending** for the combined README, case, captures and
video. Completing or publishing #26 does not approve that package for portfolio
integration. Any material change to the delivered content needs renewed review.

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
