export default function ProductsPage() {
  const t = require("../../locales/en.json");
  return (
    <main style={{ padding: 24 }}>
      <h1>{t.products}</h1>
      <p>Simple static page for dashboard testing.</p>
    </main>
  );
}

