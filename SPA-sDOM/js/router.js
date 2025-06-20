async function loadPage(page) {
  try {
    const res = await fetch(`/pages/${page}.html`);
    if (!res.ok) throw new Error(`Page not found: ${page}`);
    const html = await res.text();
    document.getElementById('content').innerHTML = html;

    // Optional: load page-specific CSS if it exists
    const styleId = "page-style";
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const link = document.createElement('link');
    link.id = styleId;
    link.rel = 'stylesheet';
    link.href = `/css/${page}.css`;
    link.onerror = () => link.remove(); // fail silently if CSS doesn't exist
    document.head.appendChild(link);
  } catch (err) {
    document.getElementById('content').innerHTML = `<p>Page failed to load.</p>`;
    console.error(err);
  }
}

function navigate(page) {
  window.location.hash = page;
}

window.addEventListener('hashchange', () => {
  const page = window.location.hash.slice(1) || 'home';
  loadPage(page);
});

window.addEventListener('DOMContentLoaded', () => {
  const page = window.location.hash.slice(1) || 'home';
  loadPage(page);
});
