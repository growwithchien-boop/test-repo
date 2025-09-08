export default function Page() {
  const t = require("../locales/en.json");
  return (
    <main style={{ padding: 24 }}>
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>
      <nav style={{ marginTop: 16 }}>
        <a href="/about">{t.about}</a> · {" "}
        <a href="/contact">{t.contact}</a> · {" "}
        <a href="/products">{t.products}</a> · {" "}
        <a href="/checkout">{t.checkout}</a>
      </nav>
    </main>
  );
}

