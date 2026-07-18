(() => {
  "use strict";

  const STATE_KEY = "zk-manager-online-demo-state";
  const USER_KEY = "zk-manager-online-demo-user";
  const WELCOME_KEY = "zk-manager-online-demo-welcome-seen";
  const DEMO_HINT_KEY = "zk-manager-online-demo-hint-seen";
  const CHAT_KEY = "zk-manager-online-demo-chat";
  const ROOT = "C:\\DEMO\\DW000";
  const demoThread = {
    id: "thread-demo-warunki-techniczne",
    name: "Warunki techniczne - gestor sieci",
    outgoing: ["demo-out-1"],
    incoming: ["demo-in-1"]
  };
  const demoOrders = [
    { taskIndex: 0, order: { id: "demo-order-przygotowanie", title: "Sprawdź dane wejściowe", description: "Zweryfikuj kompletność materiałów od inwestora.", status: "Do zrobienia", assignee: "Pracownik Demo", start: "2026-07-18", due: "2026-07-18", hours: 0, priority: "wysoki", checklist: [] } },
    { taskIndex: 1, order: { id: "demo-order-pomiary", title: "Przygotuj pomiary geodezyjne", description: "Przygotuj zakres pomiarów i przekaż do weryfikacji.", status: "Do zrobienia", assignee: "ZK Demo", start: "2026-07-18", due: "2026-07-19", hours: 0, priority: "sredni", checklist: [{ title: "Sprawdź zakres", done: false }, { title: "Przekaż materiały", done: false }] } },
    { taskIndex: 5, order: { id: "demo-order-kip", title: "Uzupełnij opis KIP", description: "Dodaj dane dotyczące oddziaływania inwestycji.", status: "Do zrobienia", assignee: "Pracownik Demo", start: "2026-07-19", due: "2026-07-22", hours: 0, priority: "niski", checklist: [] } }
  ];
  const now = "2026-07-18T10:00:00.000Z";
  const exampleChatMessage = {
    id: "demo-message-worker-v10",
    text: "Cześć, czy mogę już rozpocząć pomiary geodezyjne dla projektu DW000?",
    channel: "team",
    author: { id: "demo-worker", name: "Pracownik Demo", person: "Pracownik Demo", aliases: ["Pracownik Demo"], initials: "PD", color: "#8b5bb5" },
    recipient: null,
    projectId: "dk8",
    createdAt: "2026-07-18T08:00:00.000Z"
  };
  const folderNames = ["01 WYJSCIOWE", "02 PISMA", "03 GEODEZJA", "04 GEOTECHNIKA", "05 POMOCNICZE", "06 DROGI"];
  const virtualFiles = {
    [ROOT]: [
      { name: "DW000 Plan sytuacyjny.dwg", size: 824000 },
      { name: "DW000 Opis projektu.pdf", size: 356000 },
      { name: "DW000 Zestawienie terminow.xlsx", size: 48200 }
    ],
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
      const state = saved ? JSON.parse(saved) : {};
      state.letterLinks = state.letterLinks && typeof state.letterLinks === "object" ? state.letterLinks : {};
      const threads = Array.isArray(state.letterLinks.dk8) ? state.letterLinks.dk8 : [];
      if (!threads.some((thread) => thread?.id === demoThread.id)) threads.unshift(demoThread);
      state.letterLinks.dk8 = threads;
      state.assignmentPeople = Array.from(new Set([...(Array.isArray(state.assignmentPeople) ? state.assignmentPeople : []), "Pracownik Demo", "ZK Demo"]));
      state.employeeDirectory = Array.isArray(state.employeeDirectory) ? state.employeeDirectory : [];
      if (!state.employeeDirectory.some((person) => person?.name === "Pracownik Demo")) {
        state.employeeDirectory.push({ name: "Pracownik Demo", displayName: "Pracownik Demo", assigneeName: "Pracownik Demo", initials: "PD", color: "#8b5bb5", role: "pracownik" });
      }
      const demoProject = Array.isArray(state.projects) ? state.projects.find((project) => project?.id === "dk8" || project?.name === "DW000") : null;
      if (demoProject && Array.isArray(demoProject.tasks)) {
        demoOrders.forEach(({ taskIndex, order }) => {
          const task = demoProject.tasks[taskIndex];
          if (!task) return;
          task.orders = Array.isArray(task.orders) ? task.orders : [];
          if (!task.orders.some((item) => item?.id === order.id)) task.orders.unshift(order);
        });
      }
      return json(state);
    }
    if (url.pathname === "/api/user-state") {
      if (method === "POST") {
        localStorage.setItem(USER_KEY, options.body || "{}");
        return json({ ok: true, revision: Date.now() });
      }
      const saved = localStorage.getItem(USER_KEY);
      const userState = saved ? JSON.parse(saved) : {};
      userState.settings = userState.settings && typeof userState.settings === "object" ? userState.settings : {};
      userState.settings.userInitials = "ZK";
      return json(userState);
    }
    if (url.pathname === "/api/me") return json({ displayName: "ZK Demo", assigneeName: "ZK Demo", initials: "ZK", color: "#287b91" });
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
    if (url.pathname === "/api/messages") {
      let savedMessages = [];
      try { savedMessages = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); } catch {}
      if (method === "POST") {
        const incoming = bodyOf(options);
        const message = { ...incoming, id: `demo-reply-${Date.now()}`, createdAt: new Date().toISOString() };
        savedMessages.push(message);
        localStorage.setItem(CHAT_KEY, JSON.stringify(savedMessages));
        return json({ message });
      }
      if (method === "DELETE") {
        localStorage.setItem(CHAT_KEY, "[]");
        return json({ ok: true });
      }
      const messages = [exampleChatMessage, ...savedMessages];
      return json({ messages, all: messages, revision: messages.length });
    }
    if (url.pathname === "/api/board") return json({ imageData: "", strokes: [], revision: 0 });
    if (url.pathname === "/api/update/check") return json({ available: false, currentVersion: "DEMO ONLINE" });
    if (["/api/open-file", "/api/open-folder", "/api/file-operation", "/api/select-folder", "/api/map-folders", "/api/open-help"].includes(url.pathname)) {
      return json({ ok: true, demo: true, message: "Ta operacja jest dostępna w wersji Windows." });
    }
    return json({ ok: true });
  };

  window.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("online-demo-mode");
    const showDemoHint = () => {
      if (localStorage.getItem(DEMO_HINT_KEY) === "1") return;
      const hint = document.createElement("div");
      hint.className = "online-demo-welcome online-demo-hint";
      hint.setAttribute("role", "dialog");
      hint.setAttribute("aria-modal", "true");
      hint.setAttribute("aria-labelledby", "onlineDemoHintTitle");
      hint.innerHTML = `
        <section class="online-demo-welcome-card">
          <button class="online-demo-welcome-close" type="button" aria-label="Zamknij">×</button>
          <small>PREZENTACJA PROGRAMU</small>
          <h1 id="onlineDemoHintTitle">Kliknij przycisk DEMO</h1>
          <p>Przycisk <strong>DEMO</strong> znajduje się w górnym pasku programu. Kliknij go, aby przejść krok po kroku przez Pulpit, Eksplorator, Widok ogólny, Pisma, Wątki, Branże, Komunikator i Ustawienia.</p>
          <p>Po zakończeniu prezentacji możesz dalej swobodnie testować przykładowy projekt DW000.</p>
          <button class="online-demo-welcome-start" type="button">Rozumiem — pokaż program</button>
        </section>`;
      const closeHint = () => {
        localStorage.setItem(DEMO_HINT_KEY, "1");
        hint.remove();
      };
      hint.querySelector(".online-demo-welcome-close").addEventListener("click", closeHint);
      hint.querySelector(".online-demo-welcome-start").addEventListener("click", closeHint);
      hint.addEventListener("click", (event) => { if (event.target === hint) closeHint(); });
      document.body.append(hint);
    };
    if (localStorage.getItem(WELCOME_KEY) === "1") {
      showDemoHint();
      return;
    }
    const welcome = document.createElement("div");
    welcome.className = "online-demo-welcome";
    welcome.setAttribute("role", "dialog");
    welcome.setAttribute("aria-modal", "true");
    welcome.setAttribute("aria-labelledby", "onlineDemoWelcomeTitle");
    welcome.innerHTML = `
      <section class="online-demo-welcome-card">
        <button class="online-demo-welcome-close" type="button" aria-label="Zamknij">×</button>
        <small>DEMO ONLINE · WERSJA 11</small>
        <h1 id="onlineDemoWelcomeTitle">Witaj w ZK Managerze</h1>
        <p>To jest wersja demonstracyjna z przykładowym projektem DW000, harmonogramem, folderami i pismami.</p>
        <p>Możesz swobodnie klikać i zmieniać dane. Wszystkie zmiany zapisują się wyłącznie w tej przeglądarce i nie mają dostępu do plików Twojego komputera.</p>
        <button class="online-demo-welcome-start" type="button">Rozpocznij testowanie</button>
      </section>`;
    const closeWelcome = () => {
      localStorage.setItem(WELCOME_KEY, "1");
      welcome.remove();
      window.setTimeout(showDemoHint, 120);
    };
    welcome.querySelector(".online-demo-welcome-close").addEventListener("click", closeWelcome);
    welcome.querySelector(".online-demo-welcome-start").addEventListener("click", closeWelcome);
    welcome.addEventListener("click", (event) => { if (event.target === welcome) closeWelcome(); });
    document.body.append(welcome);
  });

  window.addEventListener("DOMContentLoaded", () => {
    const badge = document.createElement("span");
    badge.className = "online-demo-version";
    badge.textContent = "ONLINE v11";
    badge.title = "Wersja demonstracji internetowej";
    document.body.append(badge);
  });
})();
