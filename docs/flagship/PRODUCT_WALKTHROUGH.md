# Keelwatch: one vessel, connected operational work

[Watch or download the general MP4](./media/product/product-story.mp4) ·
[Chapter player](./media/product/product-player.html) ·
[English captions](./media/product/product-story.en.vtt) ·
[Maintenance conflict deep dive](./MAINTENANCE_VIDEO.md) ·
[Case study](./CASE_STUDY.md)

The general recording follows a Manager through vessel registration, certificate
evidence and risks, a crew profile and qualification, assignment planning,
maintenance work and Activity. An Auditor then reads the same data. It shows the
implemented product's principal actions and results without requiring a viewer
to interact with the application.

The second recording, [Maintenance in 2:24](./MAINTENANCE_VIDEO.md), examines stale
edits, retained drafts and deliberate recovery in depth. Its six contextual
captures, source, dates and record IDs remain separate from this recording.

Both videos are silent with English explanations below the app image. There is
no audio track or forced autoplay. The transcript below supplies the same context
without media. View the MP4 at full size for small interface details.

## Chapters and playback

The MP4 includes chapter metadata, with an additional
[WebVTT chapter track](./media/product/product-story.chapters.vtt). Players differ
in how they expose embedded chapters. The HTML companion provides explicit
keyboard-accessible chapter buttons and native playback controls; selecting a
chapter seeks while keeping playback paused.

GitHub may show the HTML source rather than run it. Open the companion from a
local checkout, keeping it beside the MP4 and VTT files, or use local HTTP as
described below. Captions are included in the picture even when a local file
browser blocks loading the separate VTT track. Read the transcript if a preview
cannot play the video. The companion keeps download/transcript links when media
is unavailable. It is a portable media artifact, not an application route.

Chapter times and the source/delivery measurements are recorded in the
[machine-readable evidence](./media/product/video-evidence.json). The transcript
chapter starts below are adjusted to the actual delivered file.

<!-- product-chapters:start -->

| Start | Chapter / transcript                                                  |
| ----- | --------------------------------------------------------------------- |
| 00:00 | [Access and product context](#access-and-product-context)             |
| 00:21 | [Fleet registration](#fleet-registration)                             |
| 00:43 | [Compliance and notifications](#compliance-and-notifications)         |
| 01:46 | [Crew qualifications and planning](#crew-qualifications-and-planning) |
| 03:02 | [Maintenance lifecycle](#maintenance-lifecycle)                       |
| 03:58 | [Activity and Auditor](#activity-and-auditor)                         |

<!-- product-chapters:end -->

## Transcript and visible action

### Access and product context

Keelwatch connects fleet records, certificate evidence, people and work. This is
an independent full-stack project with original code and synthetic data, recorded
against the real local app, API and PostgreSQL.

Demo Manager enters the protected workspace. The server resolves the account
and its permissions. Overview presents identity, granted capabilities and
documentary risks; it is not a dashboard of every business module.

### Fleet registration

The Manager opens Fleet and registers MV Demo Tern with a unique synthetic
registry reference. The confirmed record appears in the register. Opening that
record establishes the vessel workspace used throughout the rest of the story.

### Compliance and notifications

The new vessel starts with missing certificate evidence. The Manager enters the
existing safety-equipment certificate type, reference, synthetic issuer and
calendar dates. In this scenario the certificate expires fourteen days after the
UTC capture date. Recording it changes the derived state to Expiring soon; the
workspace explains the reason and dates. Attachments remain disabled.

The Manager opens the fleet-wide compliance watch, filters by this vessel's
registry reference and sees its risk. Running the bounded expiry check reconciles
the active notification log. The completed job and notification are checked
against the API. This demo log does not send external email. Other visible
notifications may belong to existing seeds or retained rehearsal vessels.

### Crew qualifications and planning

From the vessel workspace the Manager opens the crew registry and creates Avery
Demo, a synthetic CrewMember profile separate from any login account. A safety
familiarization qualification is recorded with validity dates; the ledger reports
its validity and preserves the evidence.

Back at the same vessel, the Manager selects that profile and a dated deck-role
plan. The recording visibly returns through Fleet, selects the crew profile,
sets the onboard function and enters both dates before choosing Evaluate requirements.
The optional evaluation covers the whole planned period. Safety evidence
is present, while missing deck evidence produces Incomplete coverage. The result
is advisory: a valid plan can still be saved. The confirmed assignment becomes
part of the vessel's plans. It does not prove boarding, actual presence or real
fitness approval.

### Maintenance lifecycle

The Manager creates “Inspect emergency lighting” for the vessel, with a target
date and an eligible responsible access user. This MaintenanceAssignee is distinct
from the CrewMember created earlier. The confirmed order starts Open.

The Manager opens the order, plans it using saved details, starts work and closes
it. The final status is Closed at revision 4. Creation plus the three transitions
produce four successful order-history events. Closing is final; the history
remains readable. Concurrent editing and recovery are demonstrated separately
in the Maintenance deep dive.

### Activity and Auditor

Returning to the vessel's Activity connects its registration, certificate,
assignment plan and maintenance changes: seven successful events. Crew profile
and qualification history are separate; Activity is not an individual visitor log.
The recorded actor is the shared Demo Manager account.

Demo Auditor opens the same vessel. Certificate evidence, plans and the completed
order remain readable, while operational write forms are absent. Query filters
remain available. A direct Auditor vessel update, performed by the recording
script outside the visible UI, returns 403. Re-reading the vessel and Activity
confirms that neither changed.

The story ends with a path to the Maintenance conflict/recovery recording, case,
demo and source. Local footage establishes no public availability, commercial
impact or capacity guarantee.

## Source and evidence boundaries

<!-- product-evidence:start -->

Recorded **2026-10-16 at 13:14:05.840 UTC** against application source
`7de7cf0c9551a6a450581a1d1c9148ad6ee452bd`. Featured vessel **MV Demo Tern**,
`KW-855705`; crew reference `KW-C-855705`.

The delivered MP4 plays for **about 04:48 (287.51 seconds)**,
**11,094,490 bytes (10.58 MiB)**, with
**32 English caption cues and six chapters**, no audio. Capture:
Chrome/155.0.8059.79, Node v24.13.0, PostgreSQL 18.1,
2667 browser frame events. Raw frame timings remain in ignored local scratch files.

Playback verified in **Chrome/155.0.8059.79 and Edg/155.0.4283.45**: beginning/middle/end
seeks, all captions, all six chapter buttons activated with Enter while paused,
actual playback progress and useful alternatives after a missing-media error.
The delivered HTML has no document overflow at 320/375/768/1024/1440 px and zero
axe violations for WCAG 2 A/AA and 2.1 AA tags in those runs. This checks the
companion, not a full product accessibility audit or physical-mobile playback.
The file hash and exact browser results are in the machine-readable evidence.

<!-- product-evidence:end -->

- The featured vessel, certificate, crew profile, qualification, plan and order
  are created through the recorded UI. Existing synthetic seeds support access
  and surrounding context. Failed rehearsals retain their synthetic records;
  they are not evidence of a successful recording or automatically retried writes.
  The final take uses a separately prepared fresh schema so rehearsal vessels do
  not crowd the notification watch. Earlier schemas and records remain intact.
- A fresh local schema is verified empty before the twelve existing migrations
  and synthetic seeds. API identity is matched to its isolated Demo Manager User
  before operational writes. Fifteen retained public tables are fingerprinted
  before preparation and checked again after the scenario. No public data is reset.
- The application source and preparation/capture dates are recorded separately
  in the evidence. Capture helpers are delivered with this media; application
  business code, contracts and schema are unchanged for this presentation.
- The recorder captures real browser frames during typing, navigation, scrolling
  and state changes, holding idle frames until the next change. The local app's
  native inputs/selects receive entry events and React submits real HTTP requests.
  No response or displayed record is mocked. Pauses explain the workflow; they
  are not response-time measurements.
- The revised take uses continuous eased scrolling, a visible pointer, click rings
  and outlines to guide attention. These are recording-only annotations using the
  product palette, not controls in the deployed app. Mouse clicks reach the real
  links and buttons; records and responses are unchanged by those annotations.
  SPA navigation preserves the page shell instead of reloading the document.
  A scan of every encoded frame rejects full white app images before delivery;
  it complements visual inspection rather than proving all motion quality.
- Encoding reuses FFmpeg 7.1 from the pinned free Windows tool described in the
  [Maintenance reproduction notes](./MAINTENANCE_VIDEO.md#reproduce-this-recording).
  H.264 Main/yuv420p/MP4 faststart, 1280 × 928, 30 fps, no audio. Captions occupy
  a separate 128 px band below the 1280 × 800 app image. Encoding and full decode
  are checked before replacing the delivered media.
- Real-scenario checks cover resulting records, certificate state, successful
  notification reconciliation, crew plan, maintenance revision/history, vessel
  Activity and Auditor denial. They complement existing domain regression tests;
  they do not replace their concurrency, rollback or negative-permission evidence.
- Delivered-file playback, chapter seeks, caption timing, legibility, media size
  and actual browser coverage are recorded with their limits. Local media checks
  are distinct from public-runtime checks. Safari, Firefox and physical mobile
  devices are not claimed as verified.

**Owner content review accepted on 2026-10-16**, after reviewing the delivered
README, case and both media pieces at `8b88f46`. This records approval of the
delivered content. Publication and issue closure remain separate; material
content changes require renewed review before portfolio integration.

## Reproduce locally

The repository README also offers a native GitHub player using a compression-only
copy of this recording. Its timeline, resolution, captions and chapters are
preserved; the original MP4 remains available above. Separate
[README embed evidence](./media/readme-embeds.json) records the uploaded copy and
its checks without changing this recording's provenance.

Use the [existing local capture prerequisites](./MAINTENANCE_JOURNEY.md#reproduce-locally)
and the pinned FFmpeg tool already documented for Maintenance. Chrome/Edge
executable overrides remain `CAPTURE_CHROME` and `CAPTURE_EDGE`; `CAPTURE_FFMPEG`
selects an existing encoder. No new service or package installation is required.

In the first terminal, from the repository root:

```text
npm run build
node scripts/maintenance-capture-env.mjs prepare
node scripts/maintenance-capture-env.mjs serve
```

Keep the temporary servers running. In the second terminal:

```text
node scripts/product-capture.mjs
node scripts/check-maintenance-video.mjs --product
node scripts/maintenance-capture-env.mjs verify
```

An optional `node scripts/product-capture.mjs --rehearse` checks the complete UI
scenario without timed holds or encoding. To keep that data out of the final
recording, stop the servers after rehearsal, preserve its private manifest, then
prepare and serve a new isolated schema for the actual take. This preserves the
earlier schema rather than resetting it.

The actual recording takes four to five minutes and creates a new synthetic
vessel reference. Raw frames, stills, profiles and intermediate files remain in
ignored `.scratch/product-video`. Published Maintenance media are preserved.
Stop the temporary application servers after the retained-data check; schemas
and synthetic records remain instead of being automatically deleted.

To open the chapter companion over loopback without starting the application:

```text
node scripts/check-maintenance-video.mjs --product --serve
```

Open the printed local URL. This mode serves only the delivered media, companion
and transcript; stop it with Ctrl+C. It performs no application writes and does
not replace the default playback verification command.

Re-recording changes dates, references and chapter times. Inspect the encoded
result and update transcript, measurements and content-review status before
committing a new package.
