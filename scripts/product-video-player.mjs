// Portable media companion, not a route or component in the application.
export function productVideoPlayer(chapters) {
  const escape = (value) =>
    String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  const time = (seconds) =>
    `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Keelwatch — connected product walkthrough</title>
<style>
body { max-width: 80rem; margin: auto; padding: 1rem; font: 1rem/1.5 sans-serif; }
video { display: block; width: 100%; height: auto; background: black; }
button { font: inherit; padding: .5rem; text-align: left; }
button:focus-visible, a:focus-visible { outline: .2rem solid currentColor; outline-offset: .2rem; }
li { margin-block: .5rem; } a, button { overflow-wrap: anywhere; }
</style>
<main>
<h1>Keelwatch: connected maritime operations</h1>
<p>A silent local recording with synthetic data. English explanations are included below the app image.</p>
<video aria-label="Keelwatch product walkthrough" tabindex="0" controls playsinline preload="metadata" src="product-story.mp4">
<track kind="captions" srclang="en" label="English" src="product-story.en.vtt">
<track kind="chapters" srclang="en" label="Product areas" src="product-story.chapters.vtt">
</video>
<p id="media-state" role="status">Loading video metadata. Chapter controls become available when ready.</p>
<p><a href="product-story.mp4" download>Download MP4</a> · <a href="../../PRODUCT_WALKTHROUGH.md">Read transcript and context</a> · <a href="product-story.en.vtt" download>Download captions</a></p>
<nav aria-label="Video chapters"><h2>Chapters</h2><ol>
${chapters.map((chapter) => `<li><button type="button" data-time="${Number(chapter.start)}" disabled>${time(chapter.start)} — ${escape(chapter.title)}</button></li>`).join('\n')}
</ol></nav>
<noscript><p>JavaScript is needed only for chapter buttons. Native playback, the MP4's embedded chapters and the transcript remain available.</p></noscript>
</main>
<script>
const video = document.querySelector('video');
const state = document.querySelector('#media-state');
const chapters = [...document.querySelectorAll('button[data-time]')];
video.addEventListener('loadedmetadata', () => {
  chapters.forEach(button => { button.disabled = false; });
  state.textContent = 'Ready. Choose Play or select a chapter; selecting a chapter does not start playback.';
});
video.addEventListener('error', () => {
  chapters.forEach(button => { button.disabled = true; });
  state.textContent = 'Video unavailable. Use the transcript or download links above to continue.';
});
chapters.forEach(button => button.addEventListener('click', () => {
  video.pause();
  video.currentTime = Number(button.dataset.time);
}));
</script>
</html>\n`;
}
