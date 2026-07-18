(() => {
  "use strict";

  const STATE_KEY = "zk-manager-online-demo-state";
  const USER_KEY = "zk-manager-online-demo-user";
  const ROOT = "C:\\DEMO\\DW000";
  const now = "2026-07-18T10:00:00.000Z";
  const folderNames = ["01 WYJSCIOWE", "02 PISMA", "03 GEODEZJA", "04 GEOTECHNIKA", "05 POMOCNICZE", "06 DROGI"];
  const virtualFiles = {
    [ROOT]: [],
    [`${ROOT}\\01 WYJSCIOWE`]: [{ name: "00 Dane wyjsciowe.txt", size: 1240 }],
    [`${ROOT}\\02 PISMA`]: [],
    [`${ROOT}\\02 PISMA\\01 WYCHODZACE`]: [{ name: "20260718. WT wystapienie o warunki.txt", size: 2860 }],
    [`${ROOT}\\02 PISMA\\02 PRZYCHODZACE`]: [{ name: "20260722. WT odpowiedz na warunki.txt", size: 3140 }],
    [`${ROOT}\\03 GEODEZJA`]: [{ name: "Mapa do celow projektowych.dwg", size: 248000 }],
    [`${ROOT}\\04 GEOTECHNIKA`]: [{ name: "Opinia geotechniczna.pdf", size: 640000 }],
    [`${ROOT}\\05 POMOCNICZE`]: [{ name: "Notatka projektowa.txt", size: 1850 }],
    [`${ROOT}\\06 DROGI`]: [{ name: "Projekt drogi.dwg", size: 512000 }]
  };

  function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
  }

  function bodyOf(options) {
    try { return JSON.parse(options?.body || "{}"); } catch { return {}; }
  }

  function foldersFor(path) {
    if (path === ROOT) return folderNames.map((name) => ({ name, path: `${ROOT}\\${name}`, modified: now }));
    if (path === `${ROOT}\\02 PISMA`) return ["01 WYCHODZACE", "02 PRZYCHODZACE"].map((name) => ({ name, path: `${path}\\${name}`, modified: now }));
    return [];
  }

  function filesFor(path) {
    return (virtualFiles[path] || []).map((file) => ({
      ...file,
      path: `${path}\\${file.name}`,
      extension: file.name.split(".").pop().toLowerCase(),
      modified: now,
      owner: "Demo"
    }));
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, options = {}) => {
    const raw = typeof input === "string" ? input : input.url;
    const url = new URL(raw, location.href);
    if (!url.pathname.startsWith("/api/")) return nativeFetch(input, options);
    const method = String(options.method || "GET").toUpperCase();

    if (url.pathname === "/api/state") {
      if (method === "POST") {
        localStorage.setItem(STATE_KEY, options.body || "{}");
        return json({ ok: true, revision: Date.now() });
      }
      const saved = localStorage.getItem(STATE_KEY);
      return json(saved ? JSON.parse(saved) : {});
    }
    if (url.pathname === "/api/user-state") {
      if (method === "POST") {
        localStorage.setItem(USER_KEY, options.body || "{}");
        return json({ ok: true, revision: Date.now() });
      }
      const saved = localStorage.getItem(USER_KEY);
      return json(saved ? JSON.parse(saved) : {});
    }
    if (url.pathname === "/api/me") return json({ displayName: "Uzytkownik Demo", assigneeName: "Przyklad", initials: "DE", color: "#287b91" });
    if (url.pathname === "/api/config") return json({ dataPath: "Pamięć przeglądarki (DEMO)", updateManifestUrl: "" });
    if (url.pathname === "/api/demo-project") return json({ folderUrl: "file:///C:/DEMO/DW000" });
    if (url.pathname === "/api/list-folder") {
      const path = String(bodyOf(options).path || ROOT).replaceAll("/", "\\");
      return json({ path, folders: foldersFor(path), files: filesFor(path) });
    }
    if (url.pathname === "/api/letters") return json({
      root: `${ROOT}\\02 PISMA`,
      outgoing: [{ id: "demo-out-1", name: "20260718. WT wystapienie o warunki.txt", direction: "outgoing", recipient: "Gestor sieci", folder: "01 WYCHODZACE", date: now, fileUrl: "file:///C:/DEMO/DW000/02%20PISMA/01%20WYCHODZACE/20260718.%20WT%20wystapienie%20o%20warunki.txt", folderUrl: "file:///C:/DEMO/DW000/02%20PISMA/01%20WYCHODZACE" }],
      incoming: [{ id: "demo-in-1", name: "20260722. WT odpowiedz na warunki.txt", direction: "incoming", recipient: "Gestor sieci", folder: "02 PRZYCHODZACE", date: "2026-07-22T10:00:00.000Z", fileUrl: "file:///C:/DEMO/DW000/02%20PISMA/02%20PRZYCHODZACE/20260722.%20WT%20odpowiedz%20na%20warunki.txt", folderUrl: "file:///C:/DEMO/DW000/02%20PISMA/02%20PRZYCHODZACE" }],
      count: 2
    });
    if (url.pathname === "/api/messages") return json({ messages: [], revision: 0 });
    if (url.pathname === "/api/board") return json({ imageData: "", strokes: [], revision: 0 });
    if (url.pathname === "/api/update/check") return json({ available: false, currentVersion: "DEMO ONLINE" });
    if (["/api/open-file", "/api/open-folder", "/api/file-operation", "/api/select-folder", "/api/map-folders", "/api/open-help"].includes(url.pathname)) {
      return json({ ok: true, demo: true, message: "Ta operacja jest dostępna w wersji Windows." });
    }
    return json({ ok: true });
  };

  window.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("online-demo-mode");
    const bar = document.createElement("div");
    bar.className = "online-demo-bar";
    bar.innerHTML = `<strong>DEMO ONLINE</strong><span>Dane są przykładowe i zapisują się tylko w tej przeglądarce.</span><button type="button">Przywróć demo</button>`;
    bar.querySelector("button").addEventListener("click", () => {
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem(USER_KEY);
      location.reload();
    });
    document.body.prepend(bar);
  });
})();
