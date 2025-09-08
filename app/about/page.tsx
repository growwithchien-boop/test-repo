export default function AboutPage() {
  const t = require("../../locales/en.json");
  return (
    <main style={{ padding: 24 }}>
      <h1>{t.about}</h1>
      <p>Simple static page for dashboard testing.</p>
    </main>
  );
}

