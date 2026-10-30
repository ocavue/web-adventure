// Astro leaves `client:only` islands out of the server build, but StyleX collects CSS there.
// `play.astro` imports this module, so the styles of the island's screens reach the page stylesheet.
import './Lesson.tsx'
import './Message.tsx'
import './Results.tsx'
