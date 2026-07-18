const DAY = 24 * 60 * 60 * 1000;
const ASSIGNMENT_LEFT_WIDTH = 0;
const LETTERS_SPLIT_MIN = 16;
const LETTERS_SPLIT_MAX = 84;
const DATA_FOLDER_PROMPT_KEY = "zk-manager-data-folder-prompted-v1";
const DEFAULT_BRANCH_TYPES = [
  { name: "EN NN SN", color: "#b91c1c" },
  { name: "EN WN", color: "#b91c1c" },
  { name: "EN OSW ZA", color: "#b91c1c" },
  { name: "TKM", color: "#f97316" },
  { name: "KD", color: "#0f9f9a" },
  { name: "WKS", color: "#2563eb" },
  { name: "GAZ WC", color: "#c9971a" },
  { name: "GAZ NC SC", color: "#c9971a" },
  { name: "CPŁ", color: "#7c3aed" }
];
const DEFAULT_BRANCH_COLUMNS = ["DO ZLECENIA", "PRZEKAZANO", "KOLIZJE", "PB", "PT"];
const LEGACY_BRANCH_COLUMNS = ["Kolumna 1", "Kolumna 2", "Kolumna 3", "Kolumna 4", "Kolumna 5"];
const MAX_BRANCH_COLUMNS = 6;
const DEFAULT_ACCENT_COLOR = "#2f6272";
const today = new Date();
today.setHours(0, 0, 0, 0);
const desktopFolderUrl = "file:///C:/Users/Zbook/Desktop/";

let zkDialogResolver = null;

function openZkDialog({ title = "ZK Manager", message = "", mode = "alert", value = "", danger = false } = {}) {
  const dialog = document.getElementById("zkDialog");
  const form = document.getElementById("zkDialogForm");
  const heading = document.getElementById("zkDialogTitle");
  const messageNode = document.getElementById("zkDialogMessage");
  const input = document.getElementById("zkDialogInput");
  const cancel = document.getElementById("zkDialogCancel");
  const accept = document.getElementById("zkDialogAccept");
  const close = document.getElementById("zkDialogClose");
  if (!dialog || !form || !heading || !messageNode || !input || !cancel || !accept || !close) {
    return Promise.resolve(mode === "confirm" ? false : mode === "prompt" ? null : true);
  }
  if (dialog.open) {
    zkDialogResolver?.(mode === "confirm" ? false : mode === "prompt" ? null : true);
    dialog.close();
  }
  heading.textContent = title;
  messageNode.textContent = String(message || "");
  input.classList.toggle("hidden", mode !== "prompt");
  input.value = String(value ?? "");
  cancel.classList.toggle("hidden", mode === "alert");
  accept.textContent = mode === "alert" ? "Zamknij" : "OK";
  accept.classList.toggle("zk-dialog-danger", Boolean(danger));
  const fallback = mode === "confirm" ? false : mode === "prompt" ? null : true;
  return new Promise((resolve) => {
    zkDialogResolver = resolve;
    let finished = false;
    const finish = (result) => {
      if (finished) return;
      finished = true;
      zkDialogResolver = null;
      form.removeEventListener("submit", submitHandler);
      cancel.removeEventListener("click", cancelHandler);
      close.removeEventListener("click", cancelHandler);
      dialog.removeEventListener("cancel", dialogCancelHandler);
      if (dialog.open) dialog.close();
      resolve(result);
    };
    const submitHandler = (event) => {
      event.preventDefault();
      finish(mode === "prompt" ? input.value : true);
    };
    const cancelHandler = () => finish(fallback);
    const dialogCancelHandler = (event) => {
      event.preventDefault();
      finish(fallback);
    };
    form.addEventListener("submit", submitHandler);
    cancel.addEventListener("click", cancelHandler);
    close.addEventListener("click", cancelHandler);
    dialog.addEventListener("cancel", dialogCancelHandler);
    dialog.showModal();
    requestAnimationFrame(() => (mode === "prompt" ? input : accept).focus());
  });
}

function zkAlert(message, title = "Informacja") {
  return openZkDialog({ title, message, mode: "alert" });
}

function zkConfirm(message, { title = "Potwierdzenie", danger = false } = {}) {
  return openZkDialog({ title, message, mode: "confirm", danger });
}

function zkPrompt(message, value = "", title = "Wpisz dane") {
  return openZkDialog({ title, message, mode: "prompt", value });
}
let activeTaskKey = null;
let dnExpanded = false;
let dnSelection = null;
let dnExpandedStages = new Set();
let dnExpandedStagesByProject = {};
let dnExpandedTasks = new Set();
let dnExpandedTasksByProject = {};
let dnGanttMaximized = false;
let activeProjectId = null;
let dnShowForecast = false;
let activeOrderIndex = 0;
let dnHorizontalScroll = 0;
let dashboardCompact = false;
let previewCollapsed = true;
let previewPanelWidth = 300;
let sidebarCollapsed = false;
let sidebarModuleMode = "full";
const SECRET_COLUMNS = [
  { key: "name", label: "Nazwa", width: "minmax(220px, 1.7fr)" },
  { key: "extension", label: "Typ", width: "80px" },
  { key: "size", label: "Rozmiar", width: "92px" },
  { key: "modified", label: "Data", width: "150px" },
  { key: "owner", label: "Wlasciciel", width: "140px" },
  { key: "open", label: "", width: "84px" }
];
let secretVisibleColumns = SECRET_COLUMNS.map((column) => column.key);
let secretColumnOrder = SECRET_COLUMNS.map((column) => column.key);
let secretColumnWidths = {};
let secretHiddenExtensions = [];
let secretFavoriteFiles = [];
let secretFileClipboard = null;
let secretSortKey = "name";
let secretSortDirection = "asc";
let secretFileSearch = "";
let secretTreeMode = "tree";
let secretTreeFontSize = 13;
let secretExplorerViews = {};
let demoTourActive = false;
let demoTourStepIndex = 0;
const PROGRAM_DEMO_STEPS = [
  { view: "dashboard", selector: "#topbarDashboardBtn", title: "Pulpit", text: "Tu zaczyna się praca. Pulpit zbiera Twoje zlecenia, terminy i najważniejsze informacje z projektów." },
  { view: "dashboard", selector: ".assignment-timeline, #dashboardView", title: "Oś zleceń", text: "Oś pokazuje obciążenie i terminy. Przykładowy projekt DW000 zawiera gotowe etapy, zadania i zlecenia, więc wszystkie widoki można od razu wypróbować." },
  { view: "dashboard", selector: ".task-bundle-panel", title: "Zadania do wykonania", text: "Na środku Pulpitu znajdują się zlecenia do wykonania: na dziś, na jutro oraz w wybranym zakresie. Przykładowe zlecenia są już dodane, więc od razu widać sposób pracy." },
  { view: "assignment-entry", selector: "#assignmentForm", title: "Wpisz nowe zlecenie", text: "Wpisujesz nazwę i krótki opis zlecenia. Demo wypełniło przykład: „Przygotuj pomiary geodezyjne”. Ustawiasz też termin i priorytet." },
  { view: "assignment-entry", selector: "#assignmentSuggestion", title: "Automatyczny wybór zadania", text: "Program analizuje wpisaną nazwę i sam proponuje właściwy etap oraz zadanie projektu. Propozycję możesz zaakceptować albo ręcznie zmienić na inną." },
  { view: "assignment-entry", selector: "#assignmentTimeline", title: "Przypisanie tylko jednej osobie", text: "Gotowy kafelek przeciągasz na wiersz wybranego pracownika. Zlecenie trafia tylko do tej osoby — tutaj do „Pracownik Demo” — i nie pojawia się u pozostałych." },
  { view: "assignment-edit", selector: "#assignmentExistingPanel", title: "Edytuj istniejące zlecenie", text: "Po kliknięciu zlecenia na osi po prawej otwiera się edycja. Możesz zmienić nazwę, opis, priorytet, daty, przypisaną osobę, checklistę albo usunąć zlecenie." },
  { view: "secret", selector: "#topbarSecretBtn", title: "Eksplorator", text: "Eksplorator otwiera strukturę folderów projektu. Wbudowany DW000 ma bezpieczne pliki demonstracyjne, które użytkownik może później usunąć." },
  { view: "secret", selector: ".secret-tree-controls", title: "Foldery i widoki", text: "Przełączaj drzewko i kolumny, rozwijaj poziomy oraz ustawiaj wielkość tekstu." },
  { view: "secret", selector: "#secretFiles", title: "Pliki projektu", text: "Po prawej wyszukujesz, sortujesz i przypinasz pliki gwiazdką. Prawy przycisk udostępnia zmianę nazwy, kopiowanie, wklejanie i usuwanie." },
  { view: "full", selector: "#topbarFullBtn", title: "Widok ogólny", text: "Widok ogólny pokazuje cały harmonogram DW000: etapy, zadania i zlecenia na wspólnej osi czasu." },
  { view: "full", selector: "#dnGanttViewport", title: "Harmonogram projektu", text: "Możesz przewijać, skalować i przesuwać elementy bez utraty aktualnego położenia widoku." },
  { view: "letters", selector: "#topbarLettersBtn", title: "Pisma", text: "W Pismach zobaczysz przykładową korespondencję wychodzącą i przychodzącą z folderu DW000." },
  { view: "letters", selector: ".letters-split, #lettersOutgoing", title: "Korespondencja", text: "Pisma można wyszukiwać, sortować, łączyć w nazwane wątki i obsługiwać bezpośrednio z programu." },
  { view: "letters", selector: "#lettersThreadPanel", title: "Wątki", text: "Wątki układają kolejne pisma poziomo i pozwalają szybko przejść przez całą historię sprawy." },
  { view: "technical", selector: "#technicalPage", title: "Warunki techniczne", text: "Ten moduł jest celowo otwarty na rozwój. Tutaj czekamy na pomysły użytkowników: napiszcie, jakie dane, przypomnienia i automatyzacje powinny się tu znaleźć." },
  { view: "branches", selector: "#branchesBoard", title: "Branże", text: "Tablica branżowa porządkuje uzgodnienia i kontakty w kolumnach, które można dopasować do sposobu pracy zespołu." },
  { view: "chat-notification", selector: "#topbarChatBtn", title: "Powiadomienie o wiadomości", text: "Ikona Komunikatora w górnym pasku pokazuje licznik nowych wiadomości. W przykładzie „Pracownik Demo” wysłał pytanie dotyczące projektu DW000 — kliknij ikonę, aby otworzyć rozmowę." },
  { view: "chat", selector: ".team-chat-message", title: "Przykładowa wiadomość", text: "W rozmowie widzisz autora, godzinę i treść wiadomości. Pracownik Demo pyta, czy może rozpocząć pomiary geodezyjne." },
  { view: "chat-reply", selector: "#teamChatForm", title: "Odpowiedz na wiadomość", text: "Wpisujesz odpowiedź i klikasz „Wyślij”. Demo przygotowało przykładową odpowiedź — możesz ją wysłać i zobaczyć w rozmowie." },
  { view: "chat", selector: "#teamChatMessages", title: "Wyślij plik przeciągnięciem", text: "Przeciągnij plik bezpośrednio na okno rozmowy. Program doda go do wiadomości, aby zespół mógł go zobaczyć i otworzyć." },
  { view: "chat", selector: "#teamBoardOpen", title: "Wspólna tablica", text: "Ten przycisk otwiera wspólną tablicę. Możecie rysować po pustej kartce albo po wysłanym obrazie i wspólnie nanosić uwagi." },
  { view: "chat-board", selector: "#sharedBoardCanvas", title: "Rysowanie i uwagi", text: "Na tablicy rysujesz odręcznie, wybierasz kolor i przesyłasz zespołowi gotowe uwagi. Zmiany są widoczne dla uczestników rozmowy." },
  { view: "chat", selector: "#teamChatPathBtn", title: "Link do pliku lub folderu", text: "Wklej ścieżkę w polu wiadomości i kliknij ostatni przycisk z ikoną łańcucha. Program zamieni ją w link z osobnym otwieraniem pliku oraz folderu, w którym plik się znajduje." },
  { view: "settings", selector: "#settingsPanel", title: "Ustawienia", text: "Na końcu są ustawienia użytkownika i programu: wygląd, ścieżki danych, projekty, pracownicy, branże oraz aktualizacje." },
  { view: "dashboard", selector: "#topbarDemoBtn", final: true, title: "ZK PROJEKT", text: "Dziękujemy za obejrzenie ZK Managera. Zapraszamy do współpracy, testowania programu i dzielenia się pomysłami — wspólnie możemy rozwijać narzędzie dopasowane do rzeczywistej pracy projektowej." }
];
const secretExplorerState = {
  projectId: null,
  rootPath: "",
  selectedPath: "",
  expanded: new Set(),
  cache: new Map(),
  split: 34,
  splitterBound: false
};
let previewExpandedStages = {};
let viewBackStack = [];
let viewForwardStack = [];
let navigatingViewHistory = false;
let personFilter = "all";
let myProjectIds = null;
let currentUserProfile = null;
let userIconInitials = "";
let userIconColor = "";
let dashboardRange = "week";
let dashboardMode = "ops";
let planningProjectId = null;
let assignmentShowAllProjects = true;
let selectedAssignmentKey = null;
let assignmentTaskManuallySelected = false;
let assignmentViewStart = dateString(new Date(today.getFullYear(), today.getMonth(), 1));
let assignmentViewEnd = dateString(addDays(new Date(today.getFullYear(), today.getMonth() + 1, 1), -1));
let assignmentScrollDate = dateString(today);
let assignmentManualWindow = false;
let assignmentWindowLoadedFromUserState = false;
let dnGanttPanelHeight = 420;
let datePopover = null;
let technicalReminderEnabled = false;
let workWeekends = false;
let topicFoldersRoot = "";
let dataFolderPath = "";
let updateManifestUrl = "";
let latestUpdateInfo = null;
let updateCheckInProgress = false;
let persistenceReady = false;
let persistenceTimer = null;
let persistenceRevision = 0;
let userStateTimer = null;
let userStateRevision = 0;
let legacyUserState = null;
let persistenceClientId = "";
let pendingProjectColorUpdates = {};
let applyingRemoteState = false;
let remoteStateBaseline = null;
let chatMessages = [];
let chatLastSeen = "";
let chatSeenByTarget = {};
let chatDeletedBeforeByTarget = {};
let chatOpen = false;
let activeChatTarget = "team";
let chatPanelSize = { width: 360, height: 470 };
let chatSyncIssueCount = 0;
let chatOptimisticSeq = 0;
const CHAT_LOCAL_ECHO_TTL_MS = 30000;
let lastHostChatUnread = 0;
let chatNotifyBadge = true;
let chatNotifyFlash = true;
let chatResizeObserver = null;
let sharedBoard = { imageData: "", strokes: [], revision: 0 };
let sharedBoardImage = null;
let sharedBoardDrawing = null;
let sharedBoardOpen = false;
let sharedBoardTool = "pen";
let sharedBoardSyncTimer = null;
let sharedBoardSaveTimer = null;
let employeeDirectory = [];
let assignmentPeople = [];
let employeeLeaves = [];
let leaveCalendarMonth = new Date(today);
let leaveSelection = new Set();
const DEFAULT_LEAVE_DAYS = 26;
let appZoom = 1;
let zoomIndicatorTimer = null;
let draggedKanbanOrderIndex = null;
let letterLinks = {
  dk8: [{
    id: "thread-demo-warunki-techniczne",
    name: "Warunki techniczne - gestor sieci",
    outgoing: ["demo-out-1"],
    incoming: ["demo-in-1"]
  }]
};
let activeLettersProjectId = null;
let activeLettersData = { incoming: [], outgoing: [], root: "" };
const lettersDataCache = new Map();
let letterColumnWidths = {};
let letterFolderColors = {};
let letterHiddenExtensions = [];
let lettersSplitPercent = 50;
let lettersThreadHeight = 230;
let lettersThreadListWidth = 198;
let lettersThreadCardWidth = 243;
let selectedLetters = { incoming: "", outgoing: "" };
let focusedLetterLink = { incoming: [], outgoing: [] };
let letterThreadSearch = "";
let letterSortKey = "dateNumber";
let letterSortDirection = "desc";
let draggedLetterColumn = "";
let suppressLetterSortClick = false;
let branchTypes = DEFAULT_BRANCH_TYPES.map((type) => ({ ...type }));
const LETTER_DEFAULT_WIDTHS = [320, 56, 68, 112, 230, 300, 250, 118];
const LETTER_COLUMNS = [
  { key: "name", label: "Nazwa", width: 320 },
  { key: "type", label: "Typ", width: 56 },
  { key: "open", label: "Otworz", width: 68 },
  { key: "dateNumber", label: "Data / numer", incomingLabel: "Data", outgoingLabel: "Numer", width: 112 },
  { key: "entity", label: "Podmiot", width: 230 },
  { key: "subject", label: "Sprawa", width: 300 },
  { key: "folder", label: "Podfoldery", width: 250 },
  { key: "link", label: "Folder / odpowiedz", incomingLabel: "Folder", outgoingLabel: "Odpowiedz", width: 118 }
];
let letterVisibleColumns = LETTER_COLUMNS.map((column) => column.key);
let letterColumnOrder = LETTER_COLUMNS.map((column) => column.key);
const systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
const undoStack = [];
const UNDO_LIMIT = 50;
let undoRestoring = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const projects = [
  {
    id: "dk8",
    name: "DW000",
    client: "INWESTOR",
    folderUrl: "file:///C:/DEMO/DW000",
    selected: true,
    tasks: [
      { title: "PRZYGOTOWANIE", assignee: "Przyklad", due: "2026-07-10", priority: "wysoki", stage: "01 WYJSCIOWE", orders: [{ id: "demo-order-przygotowanie", title: "Sprawdź dane wejściowe", description: "Zweryfikuj kompletność materiałów od inwestora.", status: "Do zrobienia", assignee: "Pracownik Demo", start: "2026-07-18", due: "2026-07-18", hours: 0, priority: "wysoki", checklist: [] }] },
      { title: "POMIARY", assignee: "Przyklad", due: "2026-07-14", priority: "wysoki", stage: "01 WYJSCIOWE", orders: [{ id: "demo-order-pomiary", title: "Przygotuj pomiary geodezyjne", description: "Przygotuj zakres pomiarów i przekaż do weryfikacji.", status: "Do zrobienia", assignee: "ZK Demo", start: "2026-07-18", due: "2026-07-19", hours: 0, priority: "sredni", checklist: [{ title: "Sprawdź zakres", done: false }, { title: "Przekaż materiały", done: false }] }] },
      { title: "MDCP", assignee: "Przyklad", due: "2026-07-18", priority: "sredni", stage: "01 WYJSCIOWE" },
      { title: "EGIB", assignee: "Przyklad", due: "2026-07-21", priority: "sredni", stage: "01 WYJSCIOWE" },
      { title: "GEOLOGIA", assignee: "Przyklad", due: "2026-07-24", priority: "niski", stage: "01 WYJSCIOWE" },
      { title: "KIP", assignee: "Przyklad", due: "2026-07-29", priority: "sredni", stage: "02 DSU", orders: [{ id: "demo-order-kip", title: "Uzupełnij opis KIP", description: "Dodaj dane dotyczące oddziaływania inwestycji.", status: "Do zrobienia", assignee: "Pracownik Demo", start: "2026-07-19", due: "2026-07-22", hours: 0, priority: "niski", checklist: [] }] },
      { title: "ROOS", assignee: "Przyklad", due: "2026-08-02", priority: "sredni", stage: "02 DSU" },
      { title: "POSTEPOWANIE", assignee: "Przyklad", due: "2026-08-08", priority: "wysoki", stage: "02 DSU" },
      { title: "OWP", assignee: "Przyklad", due: "2026-08-12", priority: "sredni", stage: "03 PWP" },
      { title: "POSTEPOWANIE", assignee: "Przyklad", due: "2026-08-18", priority: "sredni", stage: "03 PWP" },
      { title: "WARUNKI I UZGODNIENIA", assignee: "Przyklad", due: "2026-08-21", priority: "sredni", stage: "04 KOORDYNACJA" },
      { title: "ZUD / KODGIK", assignee: "Przyklad", due: "2026-08-25", priority: "sredni", stage: "04 KOORDYNACJA" },
      { title: "WNIOSEK", assignee: "Przyklad", due: "2026-09-01", priority: "sredni", stage: "05 ZRID" },
      { title: "POSTEPOWANIE", assignee: "Przyklad", due: "2026-09-08", priority: "wysoki", stage: "05 ZRID" },
      { title: "OPISY / OBLICZENIA", assignee: "Przyklad", due: "2026-09-12", priority: "sredni", stage: "06 DROGI" },
      { title: "ORIENTACJA", assignee: "Przyklad", due: "2026-09-15", priority: "sredni", stage: "06 DROGI" },
      { title: "PLAN", assignee: "Przyklad", due: "2026-09-18", priority: "sredni", stage: "06 DROGI" },
      { title: "NORMALNE", assignee: "Przyklad", due: "2026-09-22", priority: "sredni", stage: "06 DROGI" },
      { title: "MODEL 3D", assignee: "Przyklad", due: "2026-09-26", priority: "sredni", stage: "06 DROGI" },
      { title: "ORGANIZACJA RUCHU", assignee: "Przyklad", due: "2026-09-30", priority: "sredni", stage: "06 DROGI" },
      { title: "MOSTY", assignee: "Przyklad", due: "2026-10-04", priority: "sredni", stage: "07 MOSTY" },
      { title: "PRZEPUSTY", assignee: "Przyklad", due: "2026-10-08", priority: "sredni", stage: "07 MOSTY" },
      { title: "EKRANY", assignee: "Przyklad", due: "2026-10-12", priority: "sredni", stage: "07 MOSTY" },
      { title: "ZBIORNIKI", assignee: "Przyklad", due: "2026-10-16", priority: "sredni", stage: "07 MOSTY" }
    ],
    stages: [
      { name: "01 WYJSCIOWE", start: "2026-07-08", end: "2026-07-25", status: "now" },
      { name: "02 DSU", start: "2026-07-26", end: "2026-08-09", status: "todo" },
      { name: "03 PWP", start: "2026-08-10", end: "2026-08-19", status: "todo" },
      { name: "04 KOORDYNACJA", start: "2026-08-20", end: "2026-08-27", status: "todo" },
      { name: "05 ZRID", start: "2026-08-28", end: "2026-09-09", status: "todo" },
      { name: "06 DROGI", start: "2026-09-10", end: "2026-10-01", status: "todo" },
      { name: "07 MOSTY", start: "2026-10-02", end: "2026-10-18", status: "todo" },
      { name: "08 BRANZE", start: "2026-10-19", end: "2026-10-31", status: "todo" },
      { name: "09 MAT.PRZETARGOWE", start: "2026-11-01", end: "2026-11-15", status: "todo" },
      { name: "10 REALIZACJA / NADZOR", start: "2026-11-16", end: "2026-12-15", status: "todo" }
    ]
  }
];

const el = {
  dashboardView: document.querySelector("#dashboardView"),
  appTopbarContext: document.querySelector("#appTopbarContext"),
  appZoomInBtn: document.querySelector("#appZoomInBtn"),
  appZoomOutBtn: document.querySelector("#appZoomOutBtn"),
  appZoomValueBtn: document.querySelector("#appZoomValueBtn"),
  updateNoticeBtn: document.querySelector("#updateNoticeBtn"),
  updateNoticeBadge: document.querySelector("#updateNoticeBadge"),
  topbarChatBtn: document.querySelector("#topbarChatBtn"),
  topbarChatUnread: document.querySelector("#topbarChatUnread"),
  topbarHelpBtn: document.querySelector("#topbarHelpBtn"),
  topbarDemoBtn: document.querySelector("#topbarDemoBtn"),
  demoTour: document.querySelector("#demoTour"),
  demoTourSpotlight: document.querySelector("#demoTourSpotlight"),
  demoTourCard: document.querySelector("#demoTourCard"),
  demoTourProgress: document.querySelector("#demoTourProgress"),
  demoTourTitle: document.querySelector("#demoTourTitle"),
  demoTourText: document.querySelector("#demoTourText"),
  demoTourLogo: document.querySelector("#demoTourLogo"),
  demoTourClose: document.querySelector("#demoTourClose"),
  demoTourPrev: document.querySelector("#demoTourPrev"),
  demoTourNext: document.querySelector("#demoTourNext"),
  topbarDashboardBtn: document.querySelector("#topbarDashboardBtn"),
  topbarFullBtn: document.querySelector("#topbarFullBtn"),
  topbarManageBtn: document.querySelector("#topbarManageBtn"),
  topbarLettersBtn: document.querySelector("#topbarLettersBtn"),
  topbarTechnicalBtn: document.querySelector("#topbarTechnicalBtn"),
  topbarBranchesBtn: document.querySelector("#topbarBranchesBtn"),
  topbarSecretBtn: document.querySelector("#topbarSecretBtn"),
  sidebarHomeBtn: document.querySelector("#sidebarHomeBtn"),
  sidebarBackBtn: document.querySelector("#sidebarBackBtn"),
  sidebarForwardBtn: document.querySelector("#sidebarForwardBtn"),
  sidebarCollapseBtn: document.querySelector("#sidebarCollapseBtn"),
  sidebarFullBtn: document.querySelector("#sidebarFullBtn"),
  sidebarManageBtn: document.querySelector("#sidebarManageBtn"),
  sidebarLettersBtn: document.querySelector("#sidebarLettersBtn"),
  projectPage: document.querySelector("#projectPage"),
  projectList: document.querySelector("#projectList"),
  todayTasks: document.querySelector("#todayTasks"),
  weekTasks: document.querySelector("#weekTasks"),
  endingStages: document.querySelector("#endingStages"),
  projectPreview: document.querySelector("#projectPreview"),
  previewPanel: document.querySelector(".preview-panel"),
  previewToggleBtn: document.querySelector("#previewToggleBtn"),
  previewSplitter: document.querySelector("#previewSplitter"),
  todayCount: document.querySelector("#todayCount"),
  weekCount: document.querySelector("#weekCount"),
  stageCount: document.querySelector("#stageCount"),
  todayLabel: document.querySelector("#todayLabel"),
  todayHeaderDate: document.querySelector("#todayHeaderDate"),
  tomorrowHeaderDate: document.querySelector("#tomorrowHeaderDate"),
  currentUserBadge: document.querySelector("#currentUserBadge"),
  dashboardOpsModeBtn: document.querySelector("#dashboardOpsModeBtn"),
  dashboardAssignModeBtn: document.querySelector("#dashboardAssignModeBtn"),
  personFilter: document.querySelector("#personFilter"),
  dashboardRangeFilter: document.querySelector("#dashboardRangeFilter"),
  assignmentMode: document.querySelector("#assignmentMode"),
  assignmentTimeline: document.querySelector("#assignmentTimeline"),
  assignmentCount: document.querySelector("#assignmentCount"),
  assignmentProjectLabel: document.querySelector("#assignmentProjectLabel"),
  assignmentExistingPanel: document.querySelector("#assignmentExistingPanel"),
  assignmentCreatePanel: document.querySelector("#assignmentCreatePanel"),
  assignmentForm: document.querySelector("#assignmentForm"),
  assignmentTitle: document.querySelector("#assignmentTitle"),
  assignmentDescription: document.querySelector("#assignmentDescription"),
  assignmentTask: document.querySelector("#assignmentTask"),
  assignmentStart: document.querySelector("#assignmentStart"),
  assignmentDue: document.querySelector("#assignmentDue"),
  assignmentPriority: document.querySelector("#assignmentPriority"),
  assignmentPriorityButtons: document.querySelector("#assignmentPriorityButtons"),
  priorityHighLimit: document.querySelector("#priorityHighLimit"),
  priorityMediumLimit: document.querySelector("#priorityMediumLimit"),
  priorityRanges: document.querySelector("#priorityRanges"),
  assignmentSuggestion: document.querySelector("#assignmentSuggestion"),
  assignmentPool: document.querySelector("#assignmentPool"),
  settingsBtn: document.querySelector("#settingsBtn"),
  settingsPanel: document.querySelector("#settingsPanel"),
  settingsTabs: document.querySelectorAll("[data-settings-tab]"),
  settingsUserPanel: document.querySelector("#settingsUserPanel"),
  settingsProgramPanel: document.querySelector("#settingsProgramPanel"),
  themeSelect: document.querySelector("#themeSelect"),
  accentColorInput: document.querySelector("#accentColorInput"),
  userInitialsInput: document.querySelector("#userInitialsInput"),
  userColorInput: document.querySelector("#userColorInput"),
  technicalReminderToggle: document.querySelector("#technicalReminderToggle"),
  workWeekendsToggle: document.querySelector("#workWeekendsToggle"),
  chatNotifyBadgeToggle: document.querySelector("#chatNotifyBadgeToggle"),
  chatNotifyFlashToggle: document.querySelector("#chatNotifyFlashToggle"),
  myProjectsList: document.querySelector("#myProjectsList"),
  topicFoldersRoot: document.querySelector("#topicFoldersRoot"),
  topicFoldersBrowse: document.querySelector("#topicFoldersBrowse"),
  topicFoldersMap: document.querySelector("#topicFoldersMap"),
  topicFoldersStatus: document.querySelector("#topicFoldersStatus"),
  dataFolderPath: document.querySelector("#dataFolderPath"),
  dataFolderBrowse: document.querySelector("#dataFolderBrowse"),
  dataFolderStatus: document.querySelector("#dataFolderStatus"),
  updateManifestUrl: document.querySelector("#updateManifestUrl"),
  checkUpdatesBtn: document.querySelector("#checkUpdatesBtn"),
  updateStatus: document.querySelector("#updateStatus"),
  employeeBaseList: document.querySelector("#employeeBaseList"),
  branchTypesList: document.querySelector("#branchTypesList"),
  addBranchTypeBtn: document.querySelector("#addBranchTypeBtn"),
  takeLeaveBtn: document.querySelector("#takeLeaveBtn"),
  leaveModal: document.querySelector("#leaveModal"),
  leaveCloseBtn: document.querySelector("#leaveCloseBtn"),
  leavePersonLabel: document.querySelector("#leavePersonLabel"),
  leavePrevMonth: document.querySelector("#leavePrevMonth"),
  leaveNextMonth: document.querySelector("#leaveNextMonth"),
  leaveMonthLabel: document.querySelector("#leaveMonthLabel"),
  leaveCalendar: document.querySelector("#leaveCalendar"),
  leaveClearSelection: document.querySelector("#leaveClearSelection"),
  leaveSaveBtn: document.querySelector("#leaveSaveBtn"),
  leaveList: document.querySelector("#leaveList"),
  dashboardCompactBtn: document.querySelector("#dashboardCompactBtn"),
  selectAllBtn: document.querySelector("#selectAllBtn"),
  hideOtherProjectsBtn: document.querySelector("#hideOtherProjectsBtn"),
  deleteProjectBtn: document.querySelector("#deleteProjectBtn"),
  addProjectBtn: document.querySelector("#addProjectBtn"),
  backBtn: document.querySelector("#backBtn"),
  lettersOpenBtn: document.querySelector("#lettersOpenBtn"),
  lettersModal: document.querySelector("#lettersModal"),
  technicalPage: document.querySelector("#technicalPage"),
  technicalTitle: document.querySelector("#technicalTitle"),
  technicalMessage: document.querySelector("#technicalMessage"),
  branchesBoard: document.querySelector("#branchesBoard"),
  secretPage: document.querySelector("#secretPage"),
  secretProjectName: document.querySelector("#secretProjectName"),
  secretRefreshBtn: document.querySelector("#secretRefreshBtn"),
  secretCurrentPath: document.querySelector("#secretCurrentPath"),
  secretExplorer: document.querySelector("#secretExplorer"),
  secretTree: document.querySelector("#secretTree"),
  secretTreeModeBtn: document.querySelector("#secretTreeModeBtn"),
  secretColumnsModeBtn: document.querySelector("#secretColumnsModeBtn"),
  secretExpandAllBtn: document.querySelector("#secretExpandAllBtn"),
  secretCollapseAllBtn: document.querySelector("#secretCollapseAllBtn"),
  secretTreeFontDown: document.querySelector("#secretTreeFontDown"),
  secretTreeFontUp: document.querySelector("#secretTreeFontUp"),
  secretFiles: document.querySelector("#secretFiles"),
  secretFilesSearch: document.querySelector("#secretFilesSearch"),
  secretSplitter: document.querySelector("#secretSplitter"),
  secretOptionsBtn: document.querySelector("#secretOptionsBtn"),
  secretOptionsPanel: document.querySelector("#secretOptionsPanel"),
  secretColumnOptions: document.querySelector("#secretColumnOptions"),
  secretExtensionOptions: document.querySelector("#secretExtensionOptions"),
  lettersTitle: document.querySelector("#lettersTitle"),
  lettersStatus: document.querySelector("#lettersStatus"),
  lettersSort: document.querySelector("#lettersSort"),
  lettersLinkBtn: document.querySelector("#lettersLinkBtn"),
  lettersUnlinkBtn: document.querySelector("#lettersUnlinkBtn"),
  lettersShowLinkBtn: document.querySelector("#lettersShowLinkBtn"),
  lettersRefreshBtn: document.querySelector("#lettersRefreshBtn"),
  lettersColumnsBtn: document.querySelector("#lettersColumnsBtn"),
  lettersColumnPanel: document.querySelector("#lettersColumnPanel"),
  lettersColumnOptions: document.querySelector("#lettersColumnOptions"),
  lettersExtensionOptions: document.querySelector("#lettersExtensionOptions"),
  lettersFolderColorOptions: document.querySelector("#lettersFolderColorOptions"),
  lettersCloseBtn: document.querySelector("#lettersCloseBtn"),
  lettersOutgoingCount: document.querySelector("#lettersOutgoingCount"),
  lettersIncomingCount: document.querySelector("#lettersIncomingCount"),
  lettersOutgoing: document.querySelector("#lettersOutgoing"),
  lettersIncoming: document.querySelector("#lettersIncoming"),
  lettersOutgoingSearch: document.querySelector("#lettersOutgoingSearch"),
  lettersIncomingSearch: document.querySelector("#lettersIncomingSearch"),
  lettersSplitter: document.querySelector("#lettersSplitter"),
  lettersThreadPanel: document.querySelector("#lettersThreadPanel"),
  lettersThreadSplitter: document.querySelector("#lettersThreadSplitter"),
  lettersThreadName: document.querySelector("#lettersThreadName"),
  lettersThreadList: document.querySelector("#lettersThreadList"),
  lettersThreadSearch: document.querySelector("#lettersThreadSearch"),
  lettersThreadNarrowBtn: document.querySelector("#lettersThreadNarrowBtn"),
  lettersThreadWidenBtn: document.querySelector("#lettersThreadWidenBtn"),
  lettersThreadIndexSplitter: document.querySelector("#lettersThreadIndexSplitter"),
  lettersThreadSummary: document.querySelector("#lettersThreadSummary"),
  lettersThreadContent: document.querySelector("#lettersThreadContent"),
  detailBreadcrumb: document.querySelector("#detailBreadcrumb"),
  detailTitle: document.querySelector("#detailTitle"),
  detailProgress: document.querySelector("#detailProgress"),
  detailProgressBar: document.querySelector("#detailProgressBar"),
  projectLayout: document.querySelector("#projectLayout"),
  detailStageCount: document.querySelector("#detailStageCount"),
  detailTaskCount: document.querySelector("#detailTaskCount"),
  detailStagesSection: document.querySelector("#detailStagesSection"),
  detailTasksSection: document.querySelector("#detailTasksSection"),
  detailStages: document.querySelector("#detailStages"),
  detailTasks: document.querySelector("#detailTasks"),
  stageBoardSection: document.querySelector("#stageBoardSection"),
  stageBoard: document.querySelector("#stageBoard"),
  detailGantt: document.querySelector("#detailGantt"),
  dnProjectView: document.querySelector("#dnProjectView"),
  dnContentSplitter: document.querySelector("#dnContentSplitter"),
  dnLevelStagesBtn: document.querySelector("#dnLevelStagesBtn"),
  dnLevelTasksBtn: document.querySelector("#dnLevelTasksBtn"),
  dnLevelOrdersBtn: document.querySelector("#dnLevelOrdersBtn"),
  dnZoomOutBtn: document.querySelector("#dnZoomOutBtn"),
  dnZoomInBtn: document.querySelector("#dnZoomInBtn"),
  dnMaximizeBtn: document.querySelector("#dnMaximizeBtn"),
  dnFullscreenBtn: document.querySelector("#dnFullscreenBtn"),
  dnForecastToggle: document.querySelector("#dnForecastToggle"),
  dnGanttRail: document.querySelector("#dnGanttRail"),
  dnGanttScaleHost: document.querySelector("#dnGanttScaleHost"),
  dnGantt: document.querySelector("#dnGantt"),
  dnGanttViewport: document.querySelector("#dnGanttViewport"),
  dnBottomScroll: document.querySelector("#dnBottomScroll"),
  dnBottomScrollInner: document.querySelector("#dnBottomScrollInner"),
  dnContentType: document.querySelector("#dnContentType"),
  dnContentTitle: document.querySelector("#dnContentTitle"),
  dnContentProgress: document.querySelector("#dnContentProgress"),
  dnContentBody: document.querySelector("#dnContentBody"),
  teamChat: document.querySelector("#teamChat"),
  teamChatToggle: document.querySelector("#teamChatToggle"),
  teamChatClose: document.querySelector("#teamChatClose"),
  teamChatUnread: document.querySelector("#teamChatUnread"),
  teamChatStatus: document.querySelector("#teamChatStatus"),
  teamChatRecipient: document.querySelector("#teamChatRecipient"),
  teamChatRecipients: document.querySelector("#teamChatRecipients"),
  teamChatResize: document.querySelector("#teamChatResize"),
  teamChatClear: document.querySelector("#teamChatClear"),
  teamChatMessages: document.querySelector("#teamChatMessages"),
  teamChatForm: document.querySelector("#teamChatForm"),
  teamChatInput: document.querySelector("#teamChatInput"),
  teamChatEmojiBtn: document.querySelector("#teamChatEmojiBtn"),
  teamChatEmojiPanel: document.querySelector("#teamChatEmojiPanel"),
  teamChatPathBtn: document.querySelector("#teamChatPathBtn"),
  teamBoardOpen: document.querySelector("#teamBoardOpen"),
  sharedBoard: document.querySelector("#sharedBoard"),
  sharedBoardClose: document.querySelector("#sharedBoardClose"),
  sharedBoardFile: document.querySelector("#sharedBoardFile"),
  sharedBoardColor: document.querySelector("#sharedBoardColor"),
  sharedBoardClear: document.querySelector("#sharedBoardClear"),
  sharedBoardSend: document.querySelector("#sharedBoardSend"),
  sharedBoardTools: document.querySelectorAll("[data-board-tool]"),
  sharedBoardCanvas: document.querySelector("#sharedBoardCanvas"),
  sharedBoardEmpty: document.querySelector("#sharedBoardEmpty"),
  sharedBoardStatus: document.querySelector("#sharedBoardStatus"),
  sharedBoardChat: document.querySelector("#sharedBoardChat"),
  sharedBoardChatForm: document.querySelector("#sharedBoardChatForm"),
  sharedBoardChatInput: document.querySelector("#sharedBoardChatInput"),
  zoomIndicator: document.querySelector("#zoomIndicator")
};

el.todayLabel.textContent = formatDate(today);
if (el.todayHeaderDate) el.todayHeaderDate.textContent = formatDate(today);
if (el.tomorrowHeaderDate) el.tomorrowHeaderDate.textContent = formatDate(addDays(today, 1));
el.assignmentStart.value = nativeDateInput(today);
el.assignmentDue.value = nativeDateInput(quickAssignmentDue(1));
el.assignmentPriority.value = "sredni";
renderPriorityRanges();
normalizeProjectData();
renderPeopleFilter();
el.dashboardOpsModeBtn.addEventListener("click", () => setDashboardMode("ops"));
el.dashboardAssignModeBtn?.addEventListener("click", () => setDashboardMode("ops"));
el.personFilter.addEventListener("change", () => {
  personFilter = el.personFilter.value;
  renderCenter();
});
el.dashboardRangeFilter.addEventListener("change", () => {
  dashboardRange = el.dashboardRangeFilter.value;
  renderCenter();
});
el.dashboardCompactBtn.addEventListener("click", () => {
  dashboardCompact = !dashboardCompact;
  el.dashboardView.classList.toggle("dashboard-compact", dashboardCompact);
  el.dashboardCompactBtn.textContent = dashboardCompact ? "Rozwin" : "Zwin";
});
el.settingsBtn?.addEventListener("click", toggleSettingsPanel);
el.currentUserBadge?.addEventListener("click", toggleSettingsPanel);
el.sidebarHomeBtn?.addEventListener("click", showHomeDashboard);
el.sidebarBackBtn?.addEventListener("click", goBackView);
el.sidebarForwardBtn?.addEventListener("click", goForwardView);
el.sidebarCollapseBtn?.addEventListener("click", toggleSidebar);
el.sidebarFullBtn?.addEventListener("click", () => setSidebarModuleMode("full", true));
el.sidebarManageBtn?.addEventListener("click", () => setSidebarModuleMode("manage", true));
el.sidebarLettersBtn?.addEventListener("click", () => setSidebarModuleMode("letters", true));
el.topbarDashboardBtn?.addEventListener("click", showHomeDashboard);
el.topbarFullBtn?.addEventListener("click", () => setSidebarModuleMode("full", true));
el.topbarManageBtn?.addEventListener("click", () => setSidebarModuleMode("manage", true));
el.topbarLettersBtn?.addEventListener("click", () => setSidebarModuleMode("letters", true));
el.topbarTechnicalBtn?.addEventListener("click", () => setSidebarModuleMode("technical", true));
el.topbarBranchesBtn?.addEventListener("click", () => setSidebarModuleMode("branches", true));
el.topbarSecretBtn?.addEventListener("click", () => setSidebarModuleMode("secret", true));
el.topbarHelpBtn?.addEventListener("click", () => {
  el.topbarHelpBtn.blur();
  openHelpPdf();
});
el.topbarDemoBtn?.addEventListener("click", startExplorerDemo);
el.demoTourClose?.addEventListener("click", closeDemoTour);
el.demoTourPrev?.addEventListener("click", () => changeDemoTourStep(-1));
el.demoTourNext?.addEventListener("click", () => changeDemoTourStep(1));
window.addEventListener("resize", () => { if (demoTourActive) positionDemoTour(); });
window.addEventListener("scroll", () => { if (demoTourActive) positionDemoTour(); }, true);
document.addEventListener("keydown", (event) => { if (demoTourActive && event.key === "Escape") closeDemoTour(); });
document.addEventListener("pointerdown", (event) => {
  if (el.settingsPanel?.classList.contains("hidden")) return;
  if (event.target?.closest?.("#settingsPanel, #settingsBtn, #currentUserBadge")) return;
  el.settingsPanel.classList.add("hidden");
});
el.themeSelect.addEventListener("change", () => {
  applyTheme();
  schedulePersist();
  persistUserState();
});
el.accentColorInput?.addEventListener("input", () => {
  applyAccentColor();
  schedulePersist();
  persistUserState();
});
el.userInitialsInput?.addEventListener("input", () => {
  userIconInitials = normalizeUserInitials(el.userInitialsInput.value, currentChatPersonName());
  el.userInitialsInput.value = userIconInitials;
  applyCurrentUserIconSettings({ persist: true });
});
el.userColorInput?.addEventListener("input", () => {
  userIconColor = normalizeAvatarColor(el.userColorInput.value, colorFromName(currentChatPersonName()));
  applyCurrentUserIconSettings({ persist: true });
});
el.previewToggleBtn?.addEventListener("click", () => {
  previewCollapsed = !previewCollapsed;
  applyPreviewState();
  schedulePersist();
});
el.previewSplitter?.addEventListener("pointerdown", startPreviewResize);
el.dnContentSplitter?.addEventListener("pointerdown", startDnContentResize);
systemThemeQuery?.addEventListener?.("change", () => {
  applyTheme();
  schedulePersist();
});
el.technicalReminderToggle.addEventListener("change", () => {
  technicalReminderEnabled = el.technicalReminderToggle.checked;
  schedulePersist();
});
el.workWeekendsToggle.addEventListener("change", () => {
  workWeekends = el.workWeekendsToggle.checked;
  el.assignmentStart.value = normalizeWorkdayDateInput(el.assignmentStart.value);
  el.assignmentDue.value = normalizeWorkdayDateInput(el.assignmentDue.value);
  renderPriorityRanges();
  renderAssignmentMode();
  if (activeProjectId) {
    const project = projects.find((item) => item.id === activeProjectId);
    if (project && usesDnTemplate(project)) renderDnView(project);
  }
  schedulePersist();
});
el.settingsTabs?.forEach((button) => {
  button.addEventListener("click", () => setSettingsTab(button.dataset.settingsTab || "user"));
});
el.chatNotifyBadgeToggle?.addEventListener("change", () => {
  chatNotifyBadge = el.chatNotifyBadgeToggle.checked;
  updateChatUnreadBadge(totalUnreadChatCount(), true);
  persistUserState();
});
el.chatNotifyFlashToggle?.addEventListener("change", () => {
  chatNotifyFlash = el.chatNotifyFlashToggle.checked;
  notifyHostChatUnread(totalUnreadChatCount(), true);
  persistUserState();
});

function setSettingsTab(tab) {
  const activeTab = tab === "program" ? "program" : "user";
  el.settingsTabs?.forEach((button) => {
    button.classList.toggle("active", button.dataset.settingsTab === activeTab);
  });
  el.settingsUserPanel?.classList.toggle("active", activeTab === "user");
  el.settingsProgramPanel?.classList.toggle("active", activeTab === "program");
}
el.topicFoldersRoot?.addEventListener("input", () => {
  topicFoldersRoot = el.topicFoldersRoot.value.trim();
  schedulePersist();
});
el.topicFoldersBrowse?.addEventListener("click", chooseTopicFoldersRoot);
el.topicFoldersMap?.addEventListener("click", mapTopicFolders);
el.dataFolderBrowse?.addEventListener("click", chooseDataFolderPath);
el.dataFolderPath?.addEventListener("change", () => saveDataFolderPath(el.dataFolderPath.value));
el.dataFolderPath?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  saveDataFolderPath(el.dataFolderPath.value);
});
el.updateNoticeBtn?.addEventListener("click", promptInstallUpdate);
el.checkUpdatesBtn?.addEventListener("click", checkUpdatesFromSettings);
el.updateManifestUrl?.addEventListener("change", () => saveUpdateManifestUrl(el.updateManifestUrl.value));
el.updateManifestUrl?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  saveUpdateManifestUrl(el.updateManifestUrl.value);
});
el.addBranchTypeBtn?.addEventListener("click", addBranchTypeSetting);
el.branchTypesList?.addEventListener("input", handleBranchTypeSettingsInput);
el.branchTypesList?.addEventListener("change", handleBranchTypeSettingsChange);
el.branchTypesList?.addEventListener("click", handleBranchTypeSettingsClick);
el.lettersOpenBtn?.addEventListener("click", () => openLettersModule());
el.lettersCloseBtn?.addEventListener("click", closeLettersModule);
el.lettersRefreshBtn?.addEventListener("click", () => loadLetters(activeLettersProjectId, true));
el.lettersSort?.addEventListener("change", () => {
  letterSortKey = el.lettersSort.value || "dateNumber";
  letterSortDirection = "desc";
  renderLetters();
  persistUserState();
});
el.lettersColumnsBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  renderLetterColumnOptions();
  el.lettersColumnPanel?.classList.toggle("hidden");
});
el.secretOptionsBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  el.secretOptionsPanel?.classList.toggle("hidden");
  renderSecretOptions();
});
el.secretFilesSearch?.addEventListener("input", () => {
  secretFileSearch = el.secretFilesSearch.value;
  renderSecretFiles();
});
el.secretFiles?.addEventListener("contextmenu", (event) => {
  if (event.target.closest("[data-secret-file-path]")) return;
  openSecretFolderMenu(event, secretExplorerState.selectedPath || secretExplorerState.rootPath);
});
el.secretTree?.addEventListener("contextmenu", (event) => {
  const target = event.target.closest("[data-secret-folder], [data-secret-column-folder]");
  const encodedPath = target?.dataset.secretFolder || target?.dataset.secretColumnFolder || "";
  const folderPath = encodedPath ? decodeURIComponent(encodedPath) : (secretExplorerState.selectedPath || secretExplorerState.rootPath);
  openSecretFolderMenu(event, folderPath);
});
el.secretTreeModeBtn?.addEventListener("click", () => setSecretTreeMode("tree"));
el.secretColumnsModeBtn?.addEventListener("click", () => setSecretTreeMode("columns"));
el.secretExpandAllBtn?.addEventListener("click", expandAllSecretFolders);
el.secretCollapseAllBtn?.addEventListener("click", collapseAllSecretFolders);
el.secretTreeFontDown?.addEventListener("click", () => changeSecretTreeFont(-1));
el.secretTreeFontUp?.addEventListener("click", () => changeSecretTreeFont(1));
el.secretRefreshBtn?.addEventListener("click", refreshSecretExplorer);
document.addEventListener("click", (event) => {
  if (!event.target?.closest?.(".secret-options-panel, #secretOptionsBtn")) el.secretOptionsPanel?.classList.add("hidden");
});
el.lettersLinkBtn?.addEventListener("click", linkSelectedLetters);
el.lettersUnlinkBtn?.addEventListener("click", unlinkSelectedLetters);
el.lettersShowLinkBtn?.addEventListener("click", showSelectedLetterLink);
el.lettersColumnPanel?.addEventListener("click", (event) => event.stopPropagation());
el.lettersOutgoingSearch?.addEventListener("input", renderLetters);
el.lettersIncomingSearch?.addEventListener("input", renderLetters);
el.lettersSplitter?.addEventListener("pointerdown", startLettersSplitResize);
el.lettersThreadSplitter?.addEventListener("pointerdown", startLettersThreadResize);
el.lettersThreadIndexSplitter?.addEventListener("pointerdown", startLettersThreadListResize);
el.lettersThreadSearch?.addEventListener("input", () => {
  letterThreadSearch = el.lettersThreadSearch.value;
  renderLetterThreadList();
});
el.lettersThreadNarrowBtn?.addEventListener("click", () => changeLettersThreadCardWidth(-18));
el.lettersThreadWidenBtn?.addEventListener("click", () => changeLettersThreadCardWidth(18));
el.lettersThreadList?.addEventListener("click", (event) => {
  const renameButton = event.target.closest("[data-letter-thread-rename]");
  if (renameButton) {
    const thread = projectLetterThreads()[Number(renameButton.dataset.letterThreadRename)];
    if (thread) renameLetterThread(thread);
    return;
  }
  const button = event.target.closest("[data-letter-thread-index]");
  if (!button) return;
  const thread = projectLetterThreads()[Number(button.dataset.letterThreadIndex)];
  if (!thread) return;
  focusedLetterLink = { incoming: [...(thread.incoming || [])], outgoing: [...(thread.outgoing || [])] };
  renderLetters();
});
el.lettersThreadList?.addEventListener("dblclick", (event) => {
  const button = event.target.closest("[data-letter-thread-index]");
  if (!button) return;
  const thread = projectLetterThreads()[Number(button.dataset.letterThreadIndex)];
  if (!thread) return;
  focusedLetterLink = { incoming: [...(thread.incoming || [])], outgoing: [...(thread.outgoing || [])] };
  renderLetters();
  requestAnimationFrame(renameFocusedLetterThread);
});
el.lettersModal?.addEventListener("click", (event) => {
  if (event.target === el.lettersModal) closeLettersModule();
  if (!event.target?.closest?.(".letters-column-panel, #lettersColumnsBtn")) {
    el.lettersColumnPanel?.classList.add("hidden");
  }
});
el.takeLeaveBtn?.addEventListener("click", openLeaveModal);
el.leaveCloseBtn?.addEventListener("click", closeLeaveModal);
el.leaveModal?.addEventListener("click", (event) => {
  if (event.target === el.leaveModal) closeLeaveModal();
});
el.leavePrevMonth?.addEventListener("click", () => shiftLeaveMonth(-1));
el.leaveNextMonth?.addEventListener("click", () => shiftLeaveMonth(1));
el.leaveClearSelection?.addEventListener("click", () => {
  leaveSelection.clear();
  renderLeaveModal();
});
el.leaveSaveBtn?.addEventListener("click", saveSelectedLeaveDays);
el.topbarChatBtn?.addEventListener("click", () => setChatOpen(!chatOpen));
el.appZoomInBtn?.addEventListener("click", () => setAppZoom(appZoom + 0.05, true));
el.appZoomOutBtn?.addEventListener("click", () => setAppZoom(appZoom - 0.05, true));
el.appZoomValueBtn?.addEventListener("click", () => setAppZoom(1, true));
el.teamChatToggle?.addEventListener("click", () => setChatOpen(!chatOpen));
el.teamChatClose?.addEventListener("click", () => setChatOpen(false));
el.teamChatRecipient?.addEventListener("change", () => {
  const target = el.teamChatRecipient.value;
  if (!target) return;
  setActiveChatTarget(target);
  el.teamChatRecipient.value = "";
});
el.teamChatRecipients?.addEventListener("click", (event) => {
  const button = event.target?.closest?.("[data-chat-target]");
  if (!button) return;
  setActiveChatTarget(button.dataset.chatTarget || "team");
});
el.teamChatClear?.addEventListener("click", clearActiveChatHistory);
el.teamChatForm?.addEventListener("submit", sendChatMessageFromMain);
const CHAT_EMOJIS = ["😀", "😊", "😂", "😉", "😍", "🥳", "😎", "🤔", "😮", "😢", "😡", "👍", "👎", "👏", "🙏", "💪", "👌", "✅", "❤️", "🔥", "🎉", "📌", "📎", "⚠️"];
if (el.teamChatEmojiPanel) {
  el.teamChatEmojiPanel.innerHTML = CHAT_EMOJIS.map((emoji) => `<button type="button" data-chat-emoji="${emoji}" title="${emoji}">${emoji}</button>`).join("");
}
el.teamChatEmojiBtn?.addEventListener("click", (event) => {
  event.stopPropagation();
  el.teamChatEmojiPanel?.classList.toggle("hidden");
});
el.teamChatEmojiPanel?.addEventListener("click", (event) => {
  event.stopPropagation();
  const button = event.target.closest("[data-chat-emoji]");
  if (!button || !el.teamChatInput) return;
  const start = el.teamChatInput.selectionStart ?? el.teamChatInput.value.length;
  const end = el.teamChatInput.selectionEnd ?? start;
  el.teamChatInput.setRangeText(button.dataset.chatEmoji, start, end, "end");
  el.teamChatInput.focus();
});
el.teamChatPathBtn?.addEventListener("click", sendChatPathLink);
document.addEventListener("click", (event) => {
  if (!event.target?.closest?.("#teamChatEmojiBtn, #teamChatEmojiPanel")) el.teamChatEmojiPanel?.classList.add("hidden");
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target?.closest?.(".secret-file-context-menu")) closeSecretFileMenu();
});
el.teamChatResize?.addEventListener("pointerdown", startChatPanelResize);
el.teamChat?.addEventListener("pointerup", (event) => {
  if (event.target?.closest?.("input, button, select, .team-chat-recipient-list")) return;
  rememberChatPanelSize();
});
el.teamChat?.addEventListener("transitionend", rememberChatPanelSize);
window.addEventListener("pointerup", rememberChatPanelSize);
window.addEventListener("focus", () => renderChat());
document.addEventListener("visibilitychange", () => renderChat());
el.teamBoardOpen?.addEventListener("click", openSharedBoard);
el.sharedBoardTools?.forEach((button) => {
  button.addEventListener("click", () => setSharedBoardTool(button.dataset.boardTool || "pen"));
});
el.sharedBoardClose?.addEventListener("click", closeSharedBoard);
el.sharedBoardFile?.addEventListener("change", loadSharedBoardImageFromFile);
el.sharedBoardClear?.addEventListener("click", clearSharedBoardStrokes);
el.sharedBoardSend?.addEventListener("click", sendSharedBoardSnapshot);
el.sharedBoardCanvas?.addEventListener("pointerdown", startBoardStroke);
el.sharedBoardCanvas?.addEventListener("pointermove", extendBoardStroke);
el.sharedBoardChatForm?.addEventListener("submit", sendChatMessageFromBoard);
document.addEventListener("paste", pasteSharedBoardImage);
document.addEventListener("click", openChatImageOnBoard);
document.addEventListener("wheel", handleAppZoomWheel, { passive: false });
document.addEventListener("keydown", handleAppZoomKeys);
window.addEventListener("pointerup", finishBoardStroke);
el.selectAllBtn?.addEventListener("click", toggleAllProjects);
el.hideOtherProjectsBtn?.addEventListener("click", hideOtherProjects);
el.deleteProjectBtn?.addEventListener("click", deleteSelectedProject);
el.addProjectBtn?.addEventListener("click", addProjectFromDk8Template);
el.backBtn.addEventListener("click", showDashboard);
el.assignmentTitle.addEventListener("input", () => {
  suggestAssignmentTask();
  renderAssignmentDraft();
});
el.assignmentDescription.addEventListener("input", () => {
  suggestAssignmentTask();
  renderAssignmentDraft();
});
el.assignmentStart.addEventListener("change", () => {
  el.assignmentStart.value = normalizeWorkdayDateInput(el.assignmentStart.value);
  renderAssignmentDraft();
});
el.assignmentDue.addEventListener("change", () => {
  el.assignmentDue.value = normalizeWorkdayDateInput(el.assignmentDue.value);
  renderPriorityRanges();
  renderAssignmentDraft();
});
document.querySelectorAll("[data-date-picker-for]").forEach((button) => {
  button.addEventListener("click", openTextDatePicker);
});
el.assignmentPriority.addEventListener("change", () => {
  renderPriorityRanges();
  renderAssignmentDraft();
});
el.assignmentTask.addEventListener("change", () => {
  assignmentTaskManuallySelected = true;
  renderAssignmentDraft();
  renderAssignmentSuggestionPicker(projects.find((item) => item.id === planningProjectId));
});
el.assignmentSuggestion.addEventListener("change", handleAssignmentSuggestionChange);
el.assignmentForm.addEventListener("submit", createAssignmentOrder);
el.assignmentPriorityButtons?.querySelectorAll("[data-priority-choice]").forEach((button) => {
  button.addEventListener("click", () => {
    el.assignmentPriority.value = button.dataset.priorityChoice || "sredni";
    renderPriorityRanges();
    renderAssignmentDraft();
  });
});
el.priorityHighLimit?.addEventListener("input", () => {
  renderPriorityRanges();
  renderAssignmentDraft();
});
el.priorityHighLimit?.addEventListener("change", () => {
  normalizePriorityThreshold(el.priorityHighLimit);
  renderPriorityRanges();
  renderAssignmentDraft();
});
el.priorityMediumLimit?.addEventListener("input", () => {
  renderPriorityRanges();
  renderAssignmentDraft();
});
el.priorityMediumLimit?.addEventListener("change", () => {
  normalizePriorityThreshold(el.priorityMediumLimit);
  renderPriorityRanges();
  renderAssignmentDraft();
});
setupQuickDateButtons();
setupQuickPrioritySelects();
el.assignmentForm.querySelectorAll("[data-quick-due]").forEach((button) => {
  button.addEventListener("click", () => {
    const control = button.closest(".quick-date-control");
    el.assignmentDue.value = nativeDateInput(quickAssignmentDue(Number(button.dataset.quickDue)));
    el.assignmentPriority.value = control?.dataset.quickPriority || el.assignmentPriority.value || "sredni";
    renderPriorityRanges();
    renderAssignmentDraft();
  });
});
el.dnLevelStagesBtn.addEventListener("click", () => setDnExpansionLevel(1));
el.dnLevelTasksBtn.addEventListener("click", () => setDnExpansionLevel(2));
el.dnLevelOrdersBtn.addEventListener("click", () => setDnExpansionLevel(3));
el.dnZoomOutBtn.addEventListener("click", () => zoomGanttWindow(activeGanttProject(), 1.25));
el.dnZoomInBtn.addEventListener("click", () => zoomGanttWindow(activeGanttProject(), 0.8));
el.dnMaximizeBtn.addEventListener("click", () => {
  const project = activeGanttProject();
  resetProjectWindow(project);
  schedulePersist();
  renderDnView(project);
  requestAnimationFrame(resetDnHorizontalScroll);
});
el.dnFullscreenBtn.addEventListener("click", () => {
  const project = activeGanttProject();
  dnGanttMaximized = !dnGanttMaximized;
  renderDnView(project);
  requestAnimationFrame(resetDnHorizontalScroll);
});
el.dnForecastToggle.addEventListener("change", () => {
  dnShowForecast = el.dnForecastToggle.checked;
  renderDnView(activeGanttProject());
});
bindUndoShortcuts();
bindPersistenceEvents();

initializeApp();

async function initializeApp() {
  persistenceClientId = getPersistenceClientId();
  loadChatSeenState();
  loadChatDeletedState();
  await loadAppConfig();
  maybePromptDataFolderOnFirstRun();
  checkForAppUpdate({ silent: true });
  await loadPersistedState();
  await loadLocalProfile();
  await loadUserState();
  setupChatResizeObserver();
  applyStartupDashboardView();
  normalizeProjectData();
  renderPeopleFilter();
  renderChatRecipients();
  restorePersistedControls();
  persistenceReady = true;
  registerCurrentUserAsEmployee();
  renderChatRecipients();
  persistNow();
  schedulePersist();
  setInterval(syncRemoteState, 2500);
  await loadChatMessages();
  await loadSharedBoard();
  setInterval(loadChatMessages, 2500);
  setInterval(loadSharedBoard, 1500);
  render();
}

function applyStartupDashboardView() {
  dashboardMode = "ops";
  activeProjectId = null;
  activeLettersProjectId = null;
  el.lettersModal?.classList.add("hidden");
  el.technicalPage?.classList.add("hidden");
  el.secretPage?.classList.add("hidden");
  el.sharedBoard?.classList.add("hidden");
  el.projectPage?.classList.add("hidden");
  el.dashboardView?.classList.remove("hidden");
  renderTopbarPath(["Pulpit"]);
}

function render() {
  ensureSingleSelectedProject();
  renderCurrentUserBadge();
  renderEmployeeBase();
  renderMyProjectsSettings();
  renderBranchTypeSettings();
  applyPreviewState();
  applySidebarState();
  renderProjects();
  renderCenter();
  renderPreview();
  renderAssignmentMode();
  updateSidebarNavButtons();
  updateSidebarModuleButtons();
}

function applyPreviewState() {
  document.body.classList.toggle("preview-collapsed", previewCollapsed);
  el.dashboardView?.classList.toggle("preview-collapsed", previewCollapsed);
  el.dashboardView?.style.setProperty("--preview-width", `${clamp(previewPanelWidth, 220, 560)}px`);
  el.previewPanel?.classList.toggle("collapsed", previewCollapsed);
  if (el.previewToggleBtn) {
    el.previewToggleBtn.title = previewCollapsed ? "Rozwin podglad" : "Zwin podglad";
    el.previewToggleBtn.setAttribute("aria-label", el.previewToggleBtn.title);
  }
}

function startPreviewResize(event) {
  if (previewCollapsed) return;
  event.preventDefault();
  const shell = el.dashboardView;
  if (!shell) return;
  const rect = shell.getBoundingClientRect();
  const move = (moveEvent) => {
    const nextWidth = rect.right - moveEvent.clientX - 16;
    previewPanelWidth = clamp(nextWidth, 220, 560);
    applyPreviewState();
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    persistNow();
    schedulePersist();
    persistUserState();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function applyDnGanttPanelHeight() {
  if (!el.dnProjectView) return;
  const maximum = Math.max(260, Math.min(720, window.innerHeight - 230));
  dnGanttPanelHeight = clamp(Number(dnGanttPanelHeight) || 420, 180, maximum);
  el.dnProjectView.style.setProperty("--dn-gantt-panel-height", `${Math.round(dnGanttPanelHeight)}px`);
}

function startDnContentResize(event) {
  if (!el.dnProjectView || el.dnProjectView.classList.contains("gantt-maximized")) return;
  event.preventDefault();
  event.stopPropagation();
  const panel = el.dnProjectView.querySelector(":scope > .dn-gantt-panel");
  if (!panel) return;
  const startY = event.clientY;
  const startHeight = panel.getBoundingClientRect().height;
  document.body.classList.add("resizing-dn-content");
  el.dnContentSplitter?.setPointerCapture?.(event.pointerId);
  const move = (moveEvent) => {
    const maximum = Math.max(260, Math.min(720, window.innerHeight - 230));
    dnGanttPanelHeight = clamp(startHeight + moveEvent.clientY - startY, 180, maximum);
    applyDnGanttPanelHeight();
  };
  const stop = () => {
    document.body.classList.remove("resizing-dn-content");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    persistUserState();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function applySidebarState() {
  document.body.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  if (el.sidebarCollapseBtn) {
    el.sidebarCollapseBtn.title = sidebarCollapsed ? "Rozwin panel" : "Zwin panel";
    el.sidebarCollapseBtn.setAttribute("aria-label", el.sidebarCollapseBtn.title);
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  applySidebarState();
  schedulePersist();
}

async function loadPersistedState() {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    const saved = await response.json();
    legacyUserState = extractLegacyUserState(saved);
    applyPersistedState(saved);
    remoteStateBaseline = cloneForSync(saved);
  } catch (error) {
    console.warn("Nie udalo sie wczytac stanu aplikacji.", error);
  }
}

async function loadAppConfig() {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    if (!response.ok) return;
    const config = await response.json();
    if (typeof config.dataPath === "string") {
      dataFolderPath = config.dataPath;
      renderDataFolderControls();
    }
    if (typeof config.updateManifestUrl === "string") {
      updateManifestUrl = config.updateManifestUrl;
      renderUpdateControls();
    }
  } catch (error) {
    console.warn("Nie udalo sie wczytac konfiguracji aplikacji.", error);
  }
}

function extractLegacyUserState(saved = {}) {
  const legacy = {};
  [
    "activeTaskKey",
    "dnExpanded",
    "dnSelection",
    "dnExpandedStages",
    "dnExpandedStagesByProject",
    "dnExpandedTasks",
    "dnExpandedTasksByProject",
    "dnGanttMaximized",
    "dnGanttPanelHeight",
    "activeProjectId",
    "dnShowForecast",
    "activeOrderIndex",
    "dashboardCompact",
    "previewCollapsed",
    "previewPanelWidth",
    "sidebarCollapsed",
    "sidebarModuleMode",
    "previewExpandedStages",
    "personFilter",
    "dashboardRange",
    "dashboardMode",
    "planningProjectId",
    "assignmentShowAllProjects",
    "selectedAssignmentKey",
    "assignmentViewStart",
    "assignmentViewEnd",
    "assignmentScrollDate",
    "assignmentManualWindow",
    "letterColumnWidths",
    "lettersSplitPercent",
    "letterVisibleColumns",
    "lettersSort",
    "letterSortDirection"
  ].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(saved, key)) legacy[key] = saved[key];
  });
  if (saved.settings && typeof saved.settings === "object") legacy.settings = saved.settings;
  return Object.keys(legacy).length ? legacy : null;
}

function applyPersistedState(saved = {}) {
  if (Number.isFinite(saved.revision)) persistenceRevision = saved.revision;
  if (Array.isArray(saved.projects) && saved.projects.length) {
    projects.splice(0, projects.length, ...saved.projects);
  }
  if (typeof saved.technicalReminderEnabled === "boolean") technicalReminderEnabled = saved.technicalReminderEnabled;
  if (typeof saved.workWeekends === "boolean") workWeekends = saved.workWeekends;
  if (typeof saved.topicFoldersRoot === "string") topicFoldersRoot = saved.topicFoldersRoot;
  if (Array.isArray(saved.employeeDirectory)) employeeDirectory = mergeEmployeeDirectories(employeeDirectory, saved.employeeDirectory);
  if (Array.isArray(saved.assignmentPeople)) assignmentPeople = mergeTextLists(assignmentPeople, saved.assignmentPeople);
  if (Array.isArray(saved.employeeLeaves)) employeeLeaves = saved.employeeLeaves;
  if (saved.letterLinks && typeof saved.letterLinks === "object") letterLinks = saved.letterLinks;
  branchTypes = normalizeBranchTypes(saved.branchTypes);
}

async function loadUserState() {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch("/api/user-state", { cache: "no-store" });
    if (!response.ok) return;
    const saved = await response.json();
    if (!Number.isFinite(saved.revision) && legacyUserState) {
      applyUserState(legacyUserState);
      return;
    }
    applyUserState(saved);
  } catch (error) {
    console.warn("Nie udalo sie wczytac ustawien uzytkownika.", error);
  }
}

function applyUserState(saved = {}) {
  if (Number.isFinite(saved.revision)) userStateRevision = saved.revision;
  if (typeof saved.activeTaskKey === "string" || saved.activeTaskKey === null) activeTaskKey = saved.activeTaskKey;
  if (typeof saved.dnExpanded === "boolean") dnExpanded = saved.dnExpanded;
  if (saved.dnSelection) dnSelection = saved.dnSelection;
  if (Array.isArray(saved.dnExpandedStages)) dnExpandedStages = new Set(saved.dnExpandedStages);
  if (saved.dnExpandedStagesByProject && typeof saved.dnExpandedStagesByProject === "object") dnExpandedStagesByProject = saved.dnExpandedStagesByProject;
  if (Array.isArray(saved.dnExpandedTasks)) dnExpandedTasks = new Set(saved.dnExpandedTasks);
  if (saved.dnExpandedTasksByProject && typeof saved.dnExpandedTasksByProject === "object") dnExpandedTasksByProject = saved.dnExpandedTasksByProject;
  if (typeof saved.dnGanttMaximized === "boolean") dnGanttMaximized = saved.dnGanttMaximized;
  if (Number.isFinite(saved.dnGanttPanelHeight)) dnGanttPanelHeight = clamp(Number(saved.dnGanttPanelHeight), 180, 720);
  if (typeof saved.activeProjectId === "string" || saved.activeProjectId === null) activeProjectId = saved.activeProjectId;
  if (typeof saved.dnShowForecast === "boolean") dnShowForecast = saved.dnShowForecast;
  if (Number.isFinite(saved.activeOrderIndex)) activeOrderIndex = saved.activeOrderIndex;
  if (typeof saved.dashboardCompact === "boolean") dashboardCompact = saved.dashboardCompact;
  if (typeof saved.previewCollapsed === "boolean") previewCollapsed = saved.previewCollapsed;
  if (Number.isFinite(saved.previewPanelWidth)) previewPanelWidth = clamp(saved.previewPanelWidth, 220, 560);
  if (typeof saved.sidebarCollapsed === "boolean") sidebarCollapsed = saved.sidebarCollapsed;
  if (typeof saved.sidebarModuleMode === "string") sidebarModuleMode = saved.sidebarModuleMode === "manage" ? "full" : saved.sidebarModuleMode;
  if (saved.previewExpandedStages && typeof saved.previewExpandedStages === "object") previewExpandedStages = saved.previewExpandedStages;
  if (typeof saved.personFilter === "string") personFilter = saved.personFilter;
  if (Array.isArray(saved.myProjectIds)) myProjectIds = saved.myProjectIds;
  if (typeof saved.dashboardRange === "string") dashboardRange = saved.dashboardRange;
  dashboardMode = "ops";
  if (typeof saved.planningProjectId === "string" || saved.planningProjectId === null) planningProjectId = saved.planningProjectId;
  if (typeof saved.assignmentShowAllProjects === "boolean") assignmentShowAllProjects = saved.assignmentShowAllProjects;
  if (typeof saved.selectedAssignmentKey === "string" || saved.selectedAssignmentKey === null) selectedAssignmentKey = saved.selectedAssignmentKey;
  if (typeof saved.assignmentViewStart === "string") {
    assignmentViewStart = saved.assignmentViewStart;
    assignmentWindowLoadedFromUserState = true;
  }
  if (typeof saved.assignmentViewEnd === "string") {
    assignmentViewEnd = saved.assignmentViewEnd;
    assignmentWindowLoadedFromUserState = true;
  }
  if (typeof saved.assignmentScrollDate === "string") {
    assignmentScrollDate = saved.assignmentScrollDate;
    assignmentWindowLoadedFromUserState = true;
  }
  if (typeof saved.assignmentManualWindow === "boolean") assignmentManualWindow = saved.assignmentManualWindow;
  if (saved.chatSeenByTarget && typeof saved.chatSeenByTarget === "object") chatSeenByTarget = saved.chatSeenByTarget;
  if (saved.chatDeletedBeforeByTarget && typeof saved.chatDeletedBeforeByTarget === "object") {
    chatDeletedBeforeByTarget = saved.chatDeletedBeforeByTarget;
  }
  if (Number.isFinite(saved.appZoom)) appZoom = clamp(Number(saved.appZoom), 0.6, 1.8);
  if (saved.chatPanelSize && typeof saved.chatPanelSize === "object") {
    chatPanelSize = {
      width: clamp(Number(saved.chatPanelSize.width) || 360, 280, 900),
      height: clamp(Number(saved.chatPanelSize.height) || 470, 320, 900)
    };
  }
  if (saved.settings?.theme) el.themeSelect.value = saved.settings.theme;
  if (saved.settings?.accentColor && el.accentColorInput) {
    el.accentColorInput.value = normalizeAccentColor(saved.settings.accentColor);
  }
  if (saved.settings?.userInitials) userIconInitials = normalizeUserInitials(saved.settings.userInitials, currentChatPersonName());
  if (saved.settings?.userColor) userIconColor = normalizeAvatarColor(saved.settings.userColor, colorFromName(currentChatPersonName()));
  if (typeof saved.settings?.chatNotifyBadge === "boolean") chatNotifyBadge = saved.settings.chatNotifyBadge;
  if (typeof saved.settings?.chatNotifyFlash === "boolean") chatNotifyFlash = saved.settings.chatNotifyFlash;
  if (Number.isFinite(saved.settings?.priorityHighLimit) && el.priorityHighLimit) el.priorityHighLimit.value = String(saved.settings.priorityHighLimit);
  if (Number.isFinite(saved.settings?.priorityMediumLimit) && el.priorityMediumLimit) el.priorityMediumLimit.value = String(saved.settings.priorityMediumLimit);
  if (saved.letterColumnWidths && typeof saved.letterColumnWidths === "object") letterColumnWidths = normalizeLetterColumnWidths(saved.letterColumnWidths);
  if (Number.isFinite(saved.lettersSplitPercent)) lettersSplitPercent = clamp(saved.lettersSplitPercent, LETTERS_SPLIT_MIN, LETTERS_SPLIT_MAX);
  if (Number.isFinite(saved.lettersThreadHeight)) lettersThreadHeight = Math.max(120, Number(saved.lettersThreadHeight));
  if (Number.isFinite(saved.lettersThreadListWidth)) {
    const savedWidth = Number(saved.lettersThreadListWidth);
    lettersThreadListWidth = savedWidth === 220 ? 198 : Math.max(150, savedWidth);
  }
  if (Number.isFinite(saved.lettersThreadCardWidth)) lettersThreadCardWidth = clamp(Number(saved.lettersThreadCardWidth), 180, 420);
  if (Array.isArray(saved.letterVisibleColumns)) letterVisibleColumns = normalizeLetterVisibleColumns(saved.letterVisibleColumns);
  if (Array.isArray(saved.letterColumnOrder)) letterColumnOrder = normalizeColumnOrder(saved.letterColumnOrder, LETTER_COLUMNS);
  if (saved.letterFolderColors && typeof saved.letterFolderColors === "object") letterFolderColors = saved.letterFolderColors;
  if (Array.isArray(saved.letterHiddenExtensions)) letterHiddenExtensions = saved.letterHiddenExtensions;
  if (Array.isArray(saved.secretVisibleColumns)) secretVisibleColumns = normalizeSecretVisibleColumns(saved.secretVisibleColumns);
  if (Array.isArray(saved.secretColumnOrder)) secretColumnOrder = normalizeColumnOrder(saved.secretColumnOrder, SECRET_COLUMNS);
  if (saved.secretColumnWidths && typeof saved.secretColumnWidths === "object") secretColumnWidths = normalizeSecretColumnWidths(saved.secretColumnWidths);
  if (Array.isArray(saved.secretHiddenExtensions)) secretHiddenExtensions = saved.secretHiddenExtensions;
  if (Array.isArray(saved.secretFavoriteFiles)) secretFavoriteFiles = [...new Set(saved.secretFavoriteFiles.map((path) => String(path || "")).filter(Boolean))];
  if (typeof saved.secretSortKey === "string") secretSortKey = saved.secretSortKey;
  if (saved.secretSortDirection === "desc") secretSortDirection = "desc";
  if (saved.secretTreeMode === "columns") secretTreeMode = "columns";
  if (Number.isFinite(saved.secretTreeFontSize)) secretTreeFontSize = clamp(Number(saved.secretTreeFontSize), 10, 18);
  if (saved.secretExplorerViews && typeof saved.secretExplorerViews === "object") secretExplorerViews = saved.secretExplorerViews;
  if (typeof saved.lettersSort === "string") letterSortKey = saved.lettersSort;
  if (typeof saved.letterSortDirection === "string") letterSortDirection = saved.letterSortDirection === "asc" ? "asc" : "desc";
}

function restorePersistedControls() {
  setAppZoom(appZoom);
  applyTheme();
  applyAccentColor();
  el.dashboardView.classList.toggle("dashboard-compact", dashboardCompact);
  el.dashboardCompactBtn.textContent = dashboardCompact ? "Rozwin" : "Zwin";
  applyPreviewState();
  applySidebarState();
  el.technicalReminderToggle.checked = technicalReminderEnabled;
  el.workWeekendsToggle.checked = workWeekends;
  if (el.chatNotifyBadgeToggle) el.chatNotifyBadgeToggle.checked = chatNotifyBadge;
  if (el.chatNotifyFlashToggle) el.chatNotifyFlashToggle.checked = chatNotifyFlash;
  syncCurrentUserIconControls();
  el.dnForecastToggle.checked = dnShowForecast;
  el.dashboardRangeFilter.value = dashboardRange;
  el.personFilter.value = personFilter;
  if (el.topicFoldersRoot) el.topicFoldersRoot.value = topicFoldersRoot;
  renderDataFolderControls();
  renderUpdateControls();
  el.dashboardView.classList.toggle("assignment-dashboard", dashboardMode === "assign");
  el.dashboardView.classList.toggle("personal-dashboard", dashboardMode === "ops");
  el.dashboardView.classList.toggle("management-empty-mode", dashboardMode === "assign");
  el.dashboardOpsModeBtn.classList.toggle("active", dashboardMode === "ops");
  el.dashboardAssignModeBtn?.classList.toggle("active", false);
  updateTopbarDashboardButton();
  applyChatPanelSize();
  applyLettersSplit();
  applyLettersThreadHeight();
  applyLettersThreadListWidth();
  applyLettersThreadCardWidth();
  applyDnGanttPanelHeight();
  renderLetterSortOptions();
  renderLetterColumnOptions();
  renderPriorityRanges();
}

function applyTheme() {
  const theme = el.themeSelect.value || "system";
  const dark = theme === "dark" || (theme === "system" && Boolean(systemThemeQuery?.matches));
  document.body.classList.toggle("dark-theme", dark);
}

function normalizeAccentColor(value) {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_ACCENT_COLOR;
}

function currentAccentColor() {
  return normalizeAccentColor(el.accentColorInput?.value || DEFAULT_ACCENT_COLOR);
}

function applyAccentColor() {
  const color = currentAccentColor();
  const dark = shadeColor(color, -18);
  if (el.accentColorInput && el.accentColorInput.value !== color) {
    el.accentColorInput.value = color;
  }
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-strong", dark);
  document.documentElement.style.setProperty("--header-accent", color);
  document.documentElement.style.setProperty("--header-accent-dark", dark);
  document.documentElement.style.setProperty("--header-accent-soft", hexToRgba(color, 0.16));
}

function createPersistedState() {
  return {
    version: 1,
    baseRevision: persistenceRevision,
    clientId: persistenceClientId,
    savedAt: new Date().toISOString(),
    projects,
    technicalReminderEnabled,
    workWeekends,
    topicFoldersRoot,
    employeeDirectory,
    assignmentPeople,
    employeeLeaves,
    branchTypes: normalizeBranchTypes(branchTypes),
    letterLinks
  };
}

function createUserState() {
  rememberSecretExplorerView();
  return {
    version: 1,
    baseRevision: userStateRevision,
    clientId: persistenceClientId,
    savedAt: new Date().toISOString(),
    activeTaskKey,
    dnExpanded,
    dnSelection,
    dnExpandedStages: [...dnExpandedStages],
    dnExpandedStagesByProject,
    dnExpandedTasks: [...dnExpandedTasks],
    dnExpandedTasksByProject,
    dnGanttMaximized,
    activeProjectId,
    dnShowForecast,
    activeOrderIndex,
    dashboardCompact,
    previewCollapsed,
    previewPanelWidth,
    sidebarCollapsed,
    sidebarModuleMode,
    previewExpandedStages,
    personFilter,
    myProjectIds,
    dashboardRange,
    dashboardMode,
    planningProjectId,
    assignmentShowAllProjects,
    selectedAssignmentKey,
    assignmentViewStart,
    assignmentViewEnd,
    assignmentScrollDate,
    assignmentManualWindow,
    appZoom,
    chatSeenByTarget,
    chatDeletedBeforeByTarget,
    chatPanelSize,
    dnGanttPanelHeight,
    letterColumnWidths,
    letterFolderColors,
    letterHiddenExtensions,
    lettersSplitPercent,
    lettersThreadHeight,
    lettersThreadListWidth,
    lettersThreadCardWidth,
    letterVisibleColumns,
    letterColumnOrder,
    lettersSort: letterSortKey,
    letterSortDirection,
    secretVisibleColumns,
    secretColumnOrder,
    secretColumnWidths,
    secretHiddenExtensions,
    secretFavoriteFiles,
    secretSortKey,
    secretSortDirection,
    secretTreeMode,
    secretTreeFontSize,
    secretExplorerViews,
    settings: {
      theme: el.themeSelect.value,
      accentColor: currentAccentColor(),
      userInitials: currentUserIconSettings().initials,
      userColor: currentUserIconSettings().color,
      chatNotifyBadge,
      chatNotifyFlash,
      priorityHighLimit: Number(el.priorityHighLimit?.value || 5),
      priorityMediumLimit: Number(el.priorityMediumLimit?.value || 10)
    }
  };
}

function bindPersistenceEvents() {
  ["change", "click", "drop", "pointerup"].forEach((eventName) => {
    document.addEventListener(eventName, () => schedulePersist(), false);
  });
  document.addEventListener("input", (event) => {
    if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) {
      schedulePersist();
    }
  }, false);
  window.addEventListener("beforeunload", () => {
    persistNow(true);
    persistUserState(true);
  });
}

function schedulePersist() {
  if (!persistenceReady || applyingRemoteState || location.protocol === "file:") return;
  clearTimeout(persistenceTimer);
  clearTimeout(userStateTimer);
  persistenceTimer = setTimeout(() => persistNow(), 350);
  userStateTimer = setTimeout(() => persistUserState(), 350);
}

function persistNow(useBeacon = false) {
  if (!persistenceReady || applyingRemoteState || location.protocol === "file:") return;
  const snapshot = createPersistedState();
  const payload = JSON.stringify(snapshot);
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/state", new Blob([payload], { type: "application/json" }));
    return;
  }
  fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true
  })
    .then(async (response) => {
      const saved = await response.json().catch(() => ({}));
      if (response.status === 409 && saved.current) {
        reconcileRemoteState(saved.current, true);
        return;
      }
      if (response.ok && Number.isFinite(saved.revision)) {
        persistenceRevision = saved.revision;
        remoteStateBaseline = cloneForSync({ ...snapshot, revision: saved.revision, baseRevision: saved.revision });
        pendingProjectColorUpdates = {};
      }
    })
    .catch((error) => console.warn("Nie udalo sie zapisac stanu aplikacji.", error));
}

function persistUserState(useBeacon = false, retryOnConflict = true) {
  if (!persistenceReady || applyingRemoteState || location.protocol === "file:") return;
  const payload = JSON.stringify(createUserState());
  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon("/api/user-state", new Blob([payload], { type: "application/json" }));
    return;
  }
  fetch("/api/user-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true
  })
    .then(async (response) => {
      const saved = await response.json().catch(() => ({}));
      if (response.status === 409 && saved.current) {
        if (retryOnConflict) {
          userStateRevision = Number(saved.current.revision || userStateRevision || 0);
          persistUserState(false, false);
        }
        return;
      }
      if (response.ok && Number.isFinite(saved.revision)) {
        userStateRevision = saved.revision;
      }
    })
    .catch((error) => console.warn("Nie udalo sie zapisac ustawien uzytkownika.", error));
}

async function syncRemoteState() {
  if (!persistenceReady || document.hidden || location.protocol === "file:") return;
  try {
    const response = await fetch(`/api/state?revision=${persistenceRevision}`, { cache: "no-store" });
    if (!response.ok) return;
    const saved = await response.json();
    if (!Number.isFinite(saved.revision) || saved.revision <= persistenceRevision) return;
    if (saved.clientId === persistenceClientId) {
      persistenceRevision = saved.revision;
      remoteStateBaseline = cloneForSync({ ...createPersistedState(), revision: saved.revision, baseRevision: saved.revision });
      return;
    }
    reconcileRemoteState(saved, true);
  } catch (error) {
    console.warn("Nie udalo sie zsynchronizowac stanu aplikacji.", error);
  }
}

function applyRemoteState(saved, baseline = saved) {
  applyingRemoteState = true;
  let employeeChanged = false;
  try {
    applyPersistedState(saved);
    applyPendingProjectColorUpdates();
    employeeChanged = registerCurrentUserAsEmployee();
    normalizeProjectData();
    renderPeopleFilter();
    renderChatRecipients();
    restorePersistedControls();
    refreshCurrentView();
    remoteStateBaseline = cloneForSync(baseline || saved);
  } finally {
    applyingRemoteState = false;
  }
  if (employeeChanged) persistNow();
}

function applyPendingProjectColorUpdates() {
  Object.entries(pendingProjectColorUpdates).forEach(([projectId, color]) => {
    const project = projects.find((item) => item.id === projectId);
    if (project && /^#[0-9a-f]{6}$/i.test(color)) project.color = color;
  });
}

function refreshCurrentView() {
  if (activeProjectId) {
    const project = projects.find((item) => item.id === activeProjectId);
    if (project) {
      el.dashboardView.classList.add("hidden");
      el.projectPage.classList.remove("hidden");
      if (usesDnTemplate(project)) renderDnView(project);
      else openProject(project);
      return;
    }
  }
  el.projectPage.classList.add("hidden");
  el.dashboardView.classList.remove("hidden");
  render();
}

function getPersistenceClientId() {
  try {
    const key = "zk-planer-client-id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, created);
    return created;
  } catch {
    return `${Date.now()}-${Math.random()}`;
  }
}

function renderCurrentUserBadge() {
  if (!el.currentUserBadge) return;
  const profile = currentUserProfile || {
    displayName: "Tryb lokalny",
    initials: "?",
    color: "#63717b",
    role: "offline"
  };
  const label = profile.displayName || profile.name || profile.fullName || profile.username || profile.login || "Uzytkownik";
  const icon = currentUserIconSettings(label);
  const assignee = profile.assigneeName ? ` / ${profile.assigneeName}` : "";
  el.currentUserBadge.title = `${label}${assignee} (${profile.role || "pracownik"})`;
  el.currentUserBadge.innerHTML = `
    <span class="person-avatar" style="--avatar: ${icon.color}">${escapeHtml(icon.initials)}</span>
    <strong>${label}</strong>
  `;
}

function handleAppZoomWheel(event) {
  if (!event.ctrlKey) return;
  event.preventDefault();
  const direction = event.deltaY < 0 ? 1 : -1;
  setAppZoom(appZoom + direction * 0.05, true);
}

function handleAppZoomKeys(event) {
  if (!event.ctrlKey && !event.metaKey) return;
  if (event.key === "0") {
    event.preventDefault();
    setAppZoom(1, true);
  }
  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    setAppZoom(appZoom + 0.05, true);
  }
  if (event.key === "-") {
    event.preventDefault();
    setAppZoom(appZoom - 0.05, true);
  }
}

function setAppZoom(value, persist = false) {
  appZoom = Math.max(0.6, Math.min(1.8, Math.round(value * 20) / 20));
  document.documentElement.style.setProperty("--app-zoom", appZoom);
  document.body.style.zoom = appZoom;
  updateAppZoomControl();
  showZoomIndicator();
  if (persist) persistUserState();
}

function updateAppZoomControl() {
  if (!el.appZoomValueBtn) return;
  el.appZoomValueBtn.textContent = `${Math.round(appZoom * 100)}%`;
  el.appZoomValueBtn.setAttribute("aria-label", `Skala interfejsu ${Math.round(appZoom * 100)}%. Kliknij, aby przywrocic 100%.`);
}

function showZoomIndicator() {
  if (!el.zoomIndicator) return;
  el.zoomIndicator.textContent = `${Math.round(appZoom * 100)}%`;
  el.zoomIndicator.classList.remove("hidden");
  window.clearTimeout(zoomIndicatorTimer);
  zoomIndicatorTimer = window.setTimeout(() => {
    el.zoomIndicator.classList.add("hidden");
  }, 900);
}

function registerCurrentUserAsEmployee() {
  if (!currentUserProfile) return false;
  const name = currentChatPersonName();
  if (!name) return false;
  const icon = currentUserIconSettings(name);
  currentUserProfile.initials = icon.initials;
  currentUserProfile.color = icon.color;
  let changed = upsertEmployee({
    name,
    displayName: currentUserProfile.displayName || currentUserProfile.fullName || name,
    assigneeName: currentUserProfile.assigneeName || name,
    initials: icon.initials,
    color: icon.color,
    login: currentUserProfile.login || currentUserProfile.username || "",
    username: currentUserProfile.username || currentUserProfile.login || "",
    role: currentUserProfile.role || "pracownik",
    lastSeenAt: new Date().toISOString()
  });
  if (!assignmentPeople.length) {
    assignmentPeople.push(name);
    changed = true;
  }
  return changed;
}

function upsertEmployee(employee) {
  return upsertEmployeeInto(employeeDirectory, employee);
}

function upsertEmployeeInto(directory, employee) {
  const name = employee.name || employee.displayName;
  if (!name) return false;
  const incomingAliases = employeeAliases(employee);
  const existing = directory.find((item) =>
    employeeAliases(item).some((alias) =>
      incomingAliases.some((incomingAlias) => samePerson(alias, incomingAlias))
    )
  );
  if (existing) {
    const merged = { ...existing, ...employee, name: existing.name || name };
    const changed = JSON.stringify(existing) !== JSON.stringify(merged);
    Object.assign(existing, merged);
    return changed;
  } else {
    directory.push(employee);
    return true;
  }
}

function mergeEmployeeDirectories(current = [], incoming = []) {
  const merged = Array.isArray(current) ? current.map((employee) => ({ ...employee })) : [];
  (Array.isArray(incoming) ? incoming : []).forEach((employee) => {
    if (employee && typeof employee === "object") upsertEmployeeInto(merged, employee);
  });
  return merged;
}

function mergeTextLists(current = [], incoming = []) {
  return uniqueTextValues([current, incoming]);
}

function samePerson(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function uniqueTextValues(values) {
  const seen = new Set();
  return values
    .flat()
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function employeeAliases(employee = {}) {
  return uniqueTextValues([
    employee.name,
    employee.displayName,
    employee.assigneeName,
    employee.fullName,
    employee.firstName,
    employee.username,
    employee.login
  ]);
}

function participantAliases(participant = {}) {
  return uniqueTextValues([
    participant.id,
    participant.name,
    participant.person,
    participant.displayName,
    participant.assigneeName,
    participant.username,
    participant.login,
    Array.isArray(participant.aliases) ? participant.aliases : []
  ]);
}

function participantMatchesAliases(participant, aliases) {
  const participantValues = participantAliases(participant);
  const expected = uniqueTextValues(aliases);
  return participantValues.some((value) => expected.some((alias) => samePerson(value, alias)));
}

function employeeForPerson(person) {
  return employeeForAliases([person]);
}

function employeeForAliases(values = []) {
  const aliases = uniqueTextValues(values);
  return employeeDirectory.find((employee) =>
    employeeAliases(employee).some((alias) => aliases.some((value) => samePerson(alias, value)))
  );
}

function employeeForParticipant(participant = {}) {
  return employeeForAliases(participantAliases(participant));
}

function chatTargetAliases(target) {
  target = normalizeChatTarget(target);
  if (target === "team") return ["team", "Biuro", "Zespol"];
  const employee = employeeForPerson(target);
  return uniqueTextValues([target, employee ? employeeAliases(employee) : []]);
}

function chatRecipientPayload(target) {
  target = normalizeChatTarget(target);
  const employee = employeeForPerson(target) || {};
  const aliases = chatTargetAliases(target);
  const name = employee.displayName || employee.name || target;
  return {
    id: employee.login || employee.username || target,
    name,
    person: employee.name || employee.assigneeName || name,
    aliases
  };
}

function normalizeChatTarget(target = "") {
  const value = String(target || "").trim();
  if (!value) return "";
  if (value === "team" || samePerson(value, "Biuro") || samePerson(value, "Zespol")) return "team";
  if (isLegacyBotName(value)) return "";
  return value;
}

function isLegacyBotName(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["zk bot", "zk-demo-bot", "zk-manager-demo-bot"].includes(normalized);
}

function isLegacyBotMessage(message = {}) {
  const author = message.author || {};
  const recipient = message.recipient || {};
  return [author.id, author.name, author.person, recipient.id, recipient.name, recipient.person]
    .some((value) => isLegacyBotName(value));
}

function employeeProfile(name = "Biuro") {
  const found = employeeDirectory.find((item) => samePerson(item.name, name) || samePerson(item.displayName, name));
  if (found) return found;
  return {
    name,
    displayName: name,
    initials: initialsFromName(name),
    color: colorFromName(name)
  };
}

function renderEmployeeBase() {
  if (!el.employeeBaseList) return;
  const employees = employeeDirectory
    .filter((employee) => employee.name || employee.displayName)
    .sort((a, b) => String(a.name || a.displayName).localeCompare(String(b.name || b.displayName)));
  el.employeeBaseList.innerHTML = employees.length
    ? employees.map((employee) => {
      const name = employee.name || employee.displayName;
      const active = peopleList().some((person) => samePerson(person, name));
      return `
        <div class="employee-base-item">
          ${avatar(name)}
          <span>
            <strong>${escapeHtml(employee.displayName || name)}</strong>
            <small>${active ? "na osi" : "w bazie"}</small>
          </span>
          <button type="button" class="employee-base-remove" data-remove-employee-base="${escapeAttr(name)}" title="Usun pracownika z bazy">-</button>
        </div>
      `;
    }).join("")
    : `<div class="employee-base-empty">Brak wykrytych pracownikow.</div>`;
  el.employeeBaseList.querySelectorAll("[data-remove-employee-base]").forEach((button) => {
    button.addEventListener("click", () => removeEmployeeFromBase(button.dataset.removeEmployeeBase));
  });
}

async function removeEmployeeFromBase(name) {
  const target = String(name || "").trim();
  if (!target) return;
  if (samePerson(target, currentChatPersonName())) {
    showToast("Nie mozna usunac aktualnego uzytkownika z bazy.");
    return;
  }
  if (!await zkConfirm(`Usunąć pracownika "${target}" z bazy?`, { danger: true })) return;
  employeeDirectory = employeeDirectory.filter((employee) => !samePerson(employee.name || employee.displayName, target));
  assignmentPeople = assignmentPeople.filter((person) => !samePerson(person, target));
  saveState();
  renderEmployeeBase();
  renderPeople();
  renderTimeline();
}

function defaultBranchTypes() {
  return DEFAULT_BRANCH_TYPES.map((type) => ({ ...type }));
}

function normalizeBranchColor(color, fallback = "#38bdf8") {
  const value = String(color || "").trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function sameBranchName(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function normalizeBranchTypes(types = branchTypes) {
  const source = Array.isArray(types) && types.length ? types : defaultBranchTypes();
  const seen = new Set();
  const normalized = source
    .map((type) => {
      const name = String(type?.name || "").trim();
      return {
        name,
        color: normalizeBranchColor(type?.color, name ? colorFromName(name) : "#38bdf8")
      };
    })
    .filter((type) => {
      if (!type.name) return false;
      const key = type.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return normalized.length ? normalized : defaultBranchTypes();
}

function syncBranchTypes() {
  branchTypes = normalizeBranchTypes(branchTypes);
  return branchTypes;
}

function renderBranchTypeSettings() {
  if (!el.branchTypesList) return;
  syncBranchTypes();
  el.branchTypesList.innerHTML = branchTypes.map((type, index) => `
    <div class="branch-type-settings-row" data-branch-type-index="${index}" data-branch-original-name="${escapeHtml(type.name)}">
      <input type="color" value="${escapeHtml(type.color)}" data-branch-type-color title="Kolor branzy" aria-label="Kolor branzy ${escapeHtml(type.name)}" />
      <input type="text" value="${escapeHtml(type.name)}" data-branch-type-name aria-label="Nazwa branzy" />
      <button type="button" data-remove-branch-type="${index}" title="Usun branze">x</button>
    </div>
  `).join("");
}

function addBranchTypeSetting() {
  syncBranchTypes();
  let counter = branchTypes.length + 1;
  let name = `Nowa branza ${counter}`;
  while (branchTypes.some((type) => sameBranchName(type.name, name))) {
    counter += 1;
    name = `Nowa branza ${counter}`;
  }
  branchTypes.push({ name, color: colorFromName(name) });
  renderBranchTypeSettings();
  refreshBranchesAfterTypeChange();
  schedulePersist();
}

function handleBranchTypeSettingsInput(event) {
  const row = event.target?.closest?.("[data-branch-type-index]");
  if (!row) return;
  const index = Number(row.dataset.branchTypeIndex);
  const type = branchTypes[index];
  if (!type) return;
  if (event.target.matches("[data-branch-type-color]")) {
    type.color = normalizeBranchColor(event.target.value, type.color);
    recolorBranchCards(type.name, type.color);
  }
  if (event.target.matches("[data-branch-type-name]")) {
    type.name = event.target.value;
  }
  refreshBranchesAfterTypeChange();
  schedulePersist();
}

function handleBranchTypeSettingsChange(event) {
  const row = event.target?.closest?.("[data-branch-type-index]");
  if (!row || !event.target.matches("[data-branch-type-name]")) return;
  const index = Number(row.dataset.branchTypeIndex);
  const type = branchTypes[index];
  if (!type) return;
  const previousName = row.dataset.branchOriginalName || "";
  const nextName = String(event.target.value || "").trim() || previousName || `Branza ${index + 1}`;
  type.name = nextName;
  event.target.value = nextName;
  if (previousName && previousName !== nextName) renameBranchCards(previousName, nextName, type.color);
  row.dataset.branchOriginalName = nextName;
  branchTypes = normalizeBranchTypes(branchTypes);
  renderBranchTypeSettings();
  refreshBranchesAfterTypeChange();
  schedulePersist();
}

function handleBranchTypeSettingsClick(event) {
  const button = event.target?.closest?.("[data-remove-branch-type]");
  if (!button) return;
  const index = Number(button.dataset.removeBranchType);
  syncBranchTypes();
  if (!branchTypes[index] || branchTypes.length <= 1) return;
  branchTypes.splice(index, 1);
  renderBranchTypeSettings();
  refreshBranchesAfterTypeChange();
  schedulePersist();
}

function renameBranchCards(previousName, nextName, color) {
  projects.forEach((project) => {
    ensureBranchesKanban(project).columns.forEach((column) => {
      column.cards.forEach((card) => {
        if (sameBranchName(card.type || card.name, previousName)) {
          card.type = nextName;
          card.color = color;
        }
      });
    });
  });
}

function recolorBranchCards(name, color) {
  projects.forEach((project) => {
    ensureBranchesKanban(project).columns.forEach((column) => {
      column.cards.forEach((card) => {
        if (sameBranchName(card.type || card.name, name)) card.color = color;
      });
    });
  });
}

function refreshBranchesAfterTypeChange() {
  if (sidebarModuleMode === "branches") {
    const project = projects.find((item) => item.id === activeProjectId) || selectedProject() || projects[0];
    if (project) renderBranchesBoard(project);
  }
}

function openSettingsPanel() {
  renderMyProjectsSettings();
  renderEmployeeBase();
  renderBranchTypeSettings();
  el.settingsPanel.classList.remove("hidden");
}

function toggleSettingsPanel() {
  if (!el.settingsPanel) return;
  if (!el.settingsPanel.classList.contains("hidden")) {
    el.settingsPanel.classList.add("hidden");
    return;
  }
  openSettingsPanel();
}

function visibleProjects() {
  if (!Array.isArray(myProjectIds)) return projects;
  const allowed = new Set(myProjectIds);
  return projects.filter((project) => allowed.has(project.id));
}

function isMyProject(project) {
  return !Array.isArray(myProjectIds) || myProjectIds.includes(project.id);
}

function renderMyProjectsSettings() {
  if (!el.myProjectsList) return;
  const selected = new Set(Array.isArray(myProjectIds) ? myProjectIds : projects.map((project) => project.id));
  el.myProjectsList.innerHTML = projects.map((project) => `
    <label class="my-projects-item">
      <input type="checkbox" value="${escapeHtml(project.id)}" ${selected.has(project.id) ? "checked" : ""} />
      <span style="--project-color:${ensureProjectColor(project)}"></span>
      <strong>${escapeHtml(project.name)}</strong>
      <small>${escapeHtml(project.client || "")}</small>
    </label>
  `).join("");
  el.myProjectsList.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      const checked = [...el.myProjectsList.querySelectorAll("input[type='checkbox']:checked")].map((item) => item.value);
      myProjectIds = checked.length === projects.length ? null : checked;
      if (Array.isArray(myProjectIds)) {
        projects.forEach((project) => {
          if (!myProjectIds.includes(project.id)) project.selected = false;
        });
        if (planningProjectId && !myProjectIds.includes(planningProjectId)) {
          planningProjectId = visibleProjects().find((project) => project.selected)?.id || visibleProjects()[0]?.id || null;
        }
      }
      render();
      renderMyProjectsSettings();
      persistUserState();
    });
  });
}

function openLeaveModal() {
  leaveCalendarMonth = new Date(today);
  leaveCalendarMonth.setDate(1);
  leaveSelection = new Set();
  renderLeaveModal();
  el.leaveModal?.classList.remove("hidden");
}

function closeLeaveModal() {
  el.leaveModal?.classList.add("hidden");
}

function shiftLeaveMonth(direction) {
  leaveCalendarMonth.setMonth(leaveCalendarMonth.getMonth() + direction);
  renderLeaveModal();
}

function renderLeaveModal() {
  if (!el.leaveCalendar || !el.leaveMonthLabel) return;
  const person = currentChatPersonName();
  el.leavePersonLabel.textContent = `${person} - ${DEFAULT_LEAVE_DAYS} dni`;
  el.leaveMonthLabel.textContent = `${monthName(leaveCalendarMonth)} ${leaveCalendarMonth.getFullYear()}`;
  const monthStart = new Date(leaveCalendarMonth);
  monthStart.setDate(1);
  const gridStart = startOfWeek(monthStart);
  const days = [];
  const cursor = new Date(gridStart);
  for (let index = 0; index < 42; index += 1) {
    const value = dateString(cursor);
    const outside = cursor.getMonth() !== leaveCalendarMonth.getMonth();
    const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    const selected = leaveSelection.has(value);
    const existing = isPersonOnLeave(person, value);
    days.push(`
      <button class="leave-day ${outside ? "outside" : ""} ${weekend ? "weekend" : ""} ${selected ? "selected" : ""} ${existing ? "existing" : ""}" type="button" data-leave-day="${value}">
        <strong>${cursor.getDate()}</strong>
      </button>
    `);
    cursor.setDate(cursor.getDate() + 1);
  }
  el.leaveCalendar.innerHTML = `
    ${["P", "W", "S", "C", "P", "S", "N"].map((day) => `<span class="leave-weekday">${day}</span>`).join("")}
    ${days.join("")}
  `;
  el.leaveCalendar.querySelectorAll("[data-leave-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.leaveDay;
      if (leaveSelection.has(value)) leaveSelection.delete(value);
      else leaveSelection.add(value);
      renderLeaveModal();
    });
  });
  renderLeaveList(person);
}

function renderLeaveList(person) {
  if (!el.leaveList) return;
  const leaves = employeeLeaves
    .filter((leave) => samePerson(leave.person, person))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  el.leaveList.innerHTML = leaves.length
    ? leaves.map((leave) => `
        <div class="leave-list-item">
          <span>${formatDate(parseDate(leave.date))}</span>
          <button type="button" data-delete-leave="${leave.id}" title="Usun urlop">x</button>
        </div>
      `).join("")
    : '<div class="employee-base-empty">Brak wpisanych urlopow.</div>';
  el.leaveList.querySelectorAll("[data-delete-leave]").forEach((button) => {
    button.addEventListener("click", () => {
      employeeLeaves = employeeLeaves.filter((leave) => leave.id !== button.dataset.deleteLeave);
      renderLeaveModal();
      renderAssignmentMode();
      schedulePersist();
    });
  });
}

function saveSelectedLeaveDays() {
  const person = currentChatPersonName();
  if (!person || person === "Uzytkownik") {
    void zkAlert("Nie rozpoznano aktualnego użytkownika. Sprawdź profil Windows lub ustawienia użytkownika.");
    return;
  }
  if (!leaveSelection.size) {
    void zkAlert("Zaznacz dni urlopu w kalendarzu.");
    return;
  }
  [...leaveSelection].forEach((date) => {
    if (employeeLeaves.some((leave) => samePerson(leave.person, person) && leave.date === date)) return;
    employeeLeaves.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      person,
      date,
      createdAt: new Date().toISOString()
    });
  });
  leaveSelection.clear();
  renderLeaveModal();
  renderAssignmentMode();
  schedulePersist();
}

function openLettersModule(projectId = activeProjectId) {
  const project = projects.find((item) => item.id === projectId) || activeGanttProject();
  if (!project) return;
  rememberViewBeforeNavigation({ type: "letters", projectId: project.id });
  sidebarModuleMode = "letters";
  updateSidebarModuleButtons();
  activeLettersProjectId = project.id;
  selectedLetters = { incoming: "", outgoing: "" };
  focusedLetterLink = { incoming: [], outgoing: [] };
  el.lettersModal?.classList.remove("hidden");
  el.technicalPage?.classList.add("hidden");
  el.secretPage?.classList.add("hidden");
  applyLettersSplit();
  applyLettersThreadHeight();
  requestAnimationFrame(applyLettersThreadListWidth);
  applyLettersThreadCardWidth();
  el.dashboardView.classList.add("hidden");
  el.projectPage.classList.add("hidden");
  updateSidebarModuleButtons();
  renderTopbarPath([projectPathLabel(project), projectModuleLabel("letters")]);
  if (el.lettersTitle) el.lettersTitle.textContent = `Pisma - ${project.name}`;
  loadLetters(project.id);
}

function closeLettersModule() {
  rememberViewBeforeNavigation(activeProjectId ? { type: "project", projectId: activeProjectId } : { type: "dashboard" });
  persistUserState();
  el.lettersModal?.classList.add("hidden");
  el.dashboardView.classList.add("hidden");
  el.projectPage.classList.remove("hidden");
  const project = projects.find((item) => item.id === activeProjectId);
  if (project) renderBreadcrumb(project);
  else renderTopbarPath(["Projekt"]);
}

async function loadLetters(projectId = activeLettersProjectId, force = false) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  activeLettersProjectId = project.id;
  const cached = lettersDataCache.get(project.id);
  if (!force && cached) {
    activeLettersData = cached.data;
    if (el.lettersStatus) el.lettersStatus.textContent = cached.status;
    renderLetters();
    return;
  }

  if (el.lettersStatus) el.lettersStatus.textContent = "Skanowanie folderu PISMA...";
  activeLettersData = { incoming: [], outgoing: [], root: "" };
  renderLetters();

  if (!project.folderUrl) {
    if (el.lettersStatus) el.lettersStatus.textContent = "Brak zmapowanego folderu projektu. Ustaw sciezke projektow i kliknij Mapuj linki.";
    return;
  }

  try {
    const response = await fetch("/api/letters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectFolderUrl: project.folderUrl, force })
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`${response.status} ${details || "letters scan failed"}`);
    }
    activeLettersData = await response.json();
    const status = activeLettersData.root
      ? `Folder: ${activeLettersData.root}`
      : "Nie znaleziono folderu PISMA w projekcie.";
    lettersDataCache.set(project.id, {
      data: activeLettersData,
      status,
      scannedAt: Date.now()
    });
    if (el.lettersStatus) {
      el.lettersStatus.textContent = status;
    }
  } catch (error) {
    console.warn("Nie udalo sie wczytac pism.", error);
    if (el.lettersStatus) el.lettersStatus.textContent = `Nie udalo sie przeskanowac folderu PISMA: ${error.message}`;
  }
  renderLetters();
}

function sortedLetters(items, direction) {
  const sortBy = letterSortKey || el.lettersSort?.value || "dateNumber";
  const multiplier = letterSortDirection === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = letterSortValue(a, direction, sortBy);
    const right = letterSortValue(b, direction, sortBy);
    return multiplier * String(left).localeCompare(String(right), "pl", { numeric: true, sensitivity: "base" });
  });
}

function projectLetterThreads(projectId = activeLettersProjectId) {
  if (!projectId) return [];
  const stored = letterLinks[projectId];
  if (Array.isArray(stored)) return stored;
  const migrated = Object.entries(stored || {}).filter(([, incoming]) => incoming).map(([outgoing, incoming], index) => ({
    id: `legacy-${index}-${outgoing}`,
    outgoing: [outgoing],
    incoming: [incoming]
  }));
  letterLinks[projectId] = migrated;
  return migrated;
}

function letterThread(direction, id) {
  if (!id) return null;
  return projectLetterThreads().find((thread) => (thread[direction] || []).includes(id)) || null;
}

function letterThreadMembers(direction, id, oppositeDirection) {
  const thread = letterThread(direction, id);
  return thread ? [...(thread[oppositeDirection] || [])] : [];
}

function letterById(direction, id) {
  return (activeLettersData[direction] || []).find((item) => item.id === id);
}

function compactLetterThread(thread) {
  thread.incoming = [...new Set(thread.incoming || [])].filter(Boolean);
  thread.outgoing = [...new Set(thread.outgoing || [])].filter(Boolean);
  return thread.incoming.length + thread.outgoing.length > 1;
}

function renderLetters() {
  if (!el.lettersIncoming || !el.lettersOutgoing) return;
  const incoming = filterLetters(sortedLetters(activeLettersData.incoming || [], "incoming"), "incoming");
  const outgoing = filterLetters(sortedLetters(activeLettersData.outgoing || [], "outgoing"), "outgoing");
  const threads = projectLetterThreads();
  const linkedIncomingIds = new Set(threads.flatMap((thread) => thread.incoming || []));
  const linkedOutgoingIds = new Set(threads.flatMap((thread) => thread.outgoing || []));
  const outgoingWithResponse = outgoing.filter((item) => linkedOutgoingIds.has(item.id)).length;
  const incomingWithResponse = incoming.filter((item) => linkedIncomingIds.has(item.id)).length;
  if (!incoming.some((item) => item.id === selectedLetters.incoming)) selectedLetters.incoming = "";
  if (!outgoing.some((item) => item.id === selectedLetters.outgoing)) selectedLetters.outgoing = "";
  el.lettersIncomingCount.textContent = `Liczba pism - ${incoming.length} | Liczba pism z odpowiedzia - ${incomingWithResponse}`;
  el.lettersOutgoingCount.textContent = `Liczba pism - ${outgoing.length} | Liczba pism z odpowiedzia - ${outgoingWithResponse}`;
  el.lettersIncoming.innerHTML = incoming.length
    ? letterTableHtml(incoming, "incoming")
    : '<div class="empty mini">Brak pism przychodzacych.</div>';
  el.lettersOutgoing.innerHTML = outgoing.length
    ? letterTableHtml(outgoing, "outgoing", incoming)
    : '<div class="empty mini">Brak pism wychodzacych.</div>';
  renderLetterThreadPanel();
  bindLetters();
  updateLettersLinkButtons();
  renderLetterFolderColorOptions();
  renderLetterExtensionOptions();
  scrollFocusedLetterLink();
}

function renderLetterThreadPanel() {
  if (!el.lettersThreadContent || !el.lettersThreadSummary) return;
  renderLetterThreadList();
  const focusedId = focusedLetterLink.outgoing?.[0] || focusedLetterLink.incoming?.[0];
  const focusedDirection = focusedLetterLink.outgoing?.[0] ? "outgoing" : "incoming";
  const thread = focusedId ? letterThread(focusedDirection, focusedId) : null;
  if (!thread) {
    el.lettersThreadPanel?.classList.remove("active");
    if (el.lettersThreadName) el.lettersThreadName.textContent = "Watek";
    el.lettersThreadSummary.textContent = "Wybierz pismo nalezace do watku i kliknij „Pokaz watek”.";
    el.lettersThreadContent.innerHTML = '<div class="letters-thread-empty">Tutaj pojawi sie caly watek korespondencji.</div>';
    return;
  }
  const members = [
    ...(thread.outgoing || []).map((id) => ({ direction: "outgoing", item: letterById("outgoing", id) })),
    ...(thread.incoming || []).map((id) => ({ direction: "incoming", item: letterById("incoming", id) }))
  ].filter((entry) => entry.item).sort((a, b) => {
    const left = new Date(a.item.date || 0).getTime();
    const right = new Date(b.item.date || 0).getTime();
    return left - right || String(a.item.name).localeCompare(String(b.item.name), "pl", { numeric: true });
  });
  el.lettersThreadPanel?.classList.add("active");
  if (el.lettersThreadName) el.lettersThreadName.textContent = thread.name || "Watek";
  el.lettersThreadSummary.textContent = `${members.length} elementow | wychodzace: ${thread.outgoing?.length || 0} | przychodzace: ${thread.incoming?.length || 0}`;
  el.lettersThreadContent.innerHTML = members.map((entry, index) => {
    const label = entry.direction === "outgoing" ? "Wyslane" : "Przychodzace";
    const date = formatLetterDate(entry.item.date);
    return `
      <article class="letters-thread-item ${entry.direction}">
        <div class="letters-thread-card-header">
          <span>${index + 1}</span>
          <strong>${label}</strong>
        </div>
        <div class="letters-thread-card-field">
          <span>Nazwa pisma</span>
          <strong title="${escapeHtml(entry.item.name)}">${escapeHtml(entry.item.name)}</strong>
        </div>
        <div class="letters-thread-card-field date">
          <span>Data</span>
          <strong>${escapeHtml(date)}</strong>
        </div>
        <button type="button" data-letter-file="${escapeHtml(entry.item.fileUrl)}">Otworz pismo</button>
      </article>
    `;
  }).join("");
}

function renderLetterThreadList() {
  if (!el.lettersThreadList) return;
  const threads = projectLetterThreads();
  if (!threads.length) {
    el.lettersThreadList.innerHTML = '<div class="letters-thread-list-empty">Brak watkow</div>';
    return;
  }
  const query = String(letterThreadSearch || "").trim().toLocaleLowerCase("pl");
  const visibleThreads = threads
    .map((thread, index) => ({ thread, index }))
    .filter(({ thread }) => !query || String(thread.name || "Watek").toLocaleLowerCase("pl").includes(query));
  if (!visibleThreads.length) {
    el.lettersThreadList.innerHTML = '<div class="letters-thread-list-empty">Brak pasujacych watkow</div>';
    return;
  }
  el.lettersThreadList.innerHTML = visibleThreads.map(({ thread, index }) => {
    const active = [...(thread.outgoing || []), ...(thread.incoming || [])].some((id) =>
      focusedLetterLink.outgoing.includes(id) || focusedLetterLink.incoming.includes(id));
    const count = (thread.outgoing?.length || 0) + (thread.incoming?.length || 0);
    return `<div class="letters-thread-list-row ${active ? "active" : ""}">
      <button type="button" class="letters-thread-select" data-letter-thread-index="${index}" title="${escapeHtml(thread.name || "Watek")}"><strong>${escapeHtml(thread.name || "Watek")}</strong></button>
      <span class="letters-thread-row-count" title="Liczba elementow">${count}</span>
      <button type="button" class="letters-thread-list-rename" data-letter-thread-rename="${index}">Zmien nazwe</button>
    </div>`;
  }).join("");
}

async function renameFocusedLetterThread() {
  const focusedId = focusedLetterLink.outgoing?.[0] || focusedLetterLink.incoming?.[0];
  const direction = focusedLetterLink.outgoing?.[0] ? "outgoing" : "incoming";
  const thread = focusedId ? letterThread(direction, focusedId) : null;
  if (!thread) {
    if (el.lettersThreadSummary) el.lettersThreadSummary.textContent = "Najpierw wybierz watek z listy WATKI.";
    return;
  }
  await renameLetterThread(thread);
}

async function renameLetterThread(thread) {
  if (!thread) return;
  const nextName = await showAppPrompt({
    title: "Zmien nazwe watku",
    message: "Wpisz nazwe, ktora bedzie widoczna na liscie WATKI.",
    value: thread.name || "Watek",
    placeholder: "Nazwa watku",
    confirmText: "Zapisz"
  });
  if (nextName === null) return;
  thread.name = String(nextName || "").trim() || "Watek";
  schedulePersist();
  renderLetters();
}

function letterTableHtml(items, direction, incoming = []) {
  const columns = visibleLetterColumns();
  const widths = letterColumnWidthsFor(direction, items, columns, incoming);
  const tableWidth = columns.reduce((sum, column) => sum + Number(widths[column.key] || column.width || 80), 0);
  return `
    <table class="letters-table ${direction}" style="width:${tableWidth}px">
      <colgroup>
        ${columns.map((column) => `<col data-letter-col-key="${column.key}" style="width:${widths[column.key]}px">`).join("")}
      </colgroup>
      <thead>
        <tr>
          ${columns.map((column) => {
            const header = letterColumnLabel(column, direction);
            const sorted = letterSortKey === column.key;
            const sortMark = sorted ? (letterSortDirection === "asc" ? " ↑" : " ↓") : "";
            const sortMarkLabel = sorted ? (letterSortDirection === "asc" ? " ^" : " v") : "";
            return `
            <th data-letter-col="${column.key}" class="${sorted ? "sorted" : ""}" draggable="true" title="Zlap i przesun kolumne">
              <button class="letter-sort-button" type="button" data-letter-sort="${column.key}" title="Sortuj po kolumnie ${header}">
                <span>${header}${sortMarkLabel}</span>
              </button>
              <button class="letter-col-resizer" type="button" data-letter-resize="${column.key}" aria-label="Zmien szerokosc kolumny ${header}"></button>
            </th>
          `;
          }).join("")}
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => letterRowHtml(item, direction, incoming)).join("")}
      </tbody>
    </table>
  `;
}

function normalizeLetterColumnWidths(value = {}) {
  return {
    incoming: normalizeLetterWidthsMap(value.incoming),
    outgoing: normalizeLetterWidthsMap(value.outgoing)
  };
}

function normalizeLetterVisibleColumns(keys) {
  const allowed = new Set(LETTER_COLUMNS.map((column) => column.key));
  const normalized = keys.filter((key) => allowed.has(key));
  return normalized.length ? normalized : ["name"];
}

function normalizeColumnOrder(keys, definitions) {
  const allowed = definitions.map((column) => column.key);
  const result = [...new Set((keys || []).filter((key) => allowed.includes(key)))];
  allowed.forEach((key) => { if (!result.includes(key)) result.push(key); });
  return result;
}

function moveColumnInOrder(order, key, delta) {
  const next = [...order];
  const index = next.indexOf(key);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function moveColumnBefore(order, sourceKey, targetKey, placeAfter = false) {
  const next = [...order];
  const sourceIndex = next.indexOf(sourceKey);
  const targetIndex = next.indexOf(targetKey);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return next;
  next.splice(sourceIndex, 1);
  next.splice(next.indexOf(targetKey) + (placeAfter ? 1 : 0), 0, sourceKey);
  return next;
}

function bindColumnOrderDragging(container, onMove) {
  if (!container) return;
  let draggedKey = "";
  container.querySelectorAll("[data-column-order-key]").forEach((row) => {
    row.addEventListener("dragstart", (event) => {
      draggedKey = row.dataset.columnOrderKey;
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedKey);
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (draggedKey && draggedKey !== row.dataset.columnOrderKey) row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      const targetKey = row.dataset.columnOrderKey;
      const placeAfter = event.clientY > row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2;
      if (draggedKey && targetKey && draggedKey !== targetKey) onMove(draggedKey, targetKey, placeAfter);
    });
    row.addEventListener("dragend", () => {
      container.querySelectorAll(".dragging, .drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
      draggedKey = "";
    });
  });
}

function visibleLetterColumns() {
  letterVisibleColumns = normalizeLetterVisibleColumns(letterVisibleColumns);
  letterColumnOrder = normalizeColumnOrder(letterColumnOrder, LETTER_COLUMNS);
  return letterColumnOrder
    .map((key) => LETTER_COLUMNS.find((column) => column.key === key))
    .filter((column) => column && letterVisibleColumns.includes(column.key));
}

function letterColumnLabel(column, direction) {
  return direction === "incoming"
    ? (column.incomingLabel || column.label)
    : (column.outgoingLabel || column.label);
}

function displayLetterFolder(folder, direction) {
  const parts = String(folder || "")
    .split(/[\\/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const first = normalizeSearchText(parts[0]);
  const obvious = direction === "outgoing"
    ? ["wychodzace", "wyslane"]
    : ["przychodzace", "odebrane"];
  const shouldTrim = obvious.some((word) => first.includes(word));
  return (shouldTrim ? parts.slice(1) : parts).join("\\");
}

function letterFolderKey(item, direction) {
  return normalizeLetterFolderKey(displayLetterFolder(item.folder || "", direction));
}

function normalizeLetterFolderKey(folder) {
  return String(folder || "")
    .split(/[\\/]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\\");
}

function activeLetterFolderColors() {
  if (!activeLettersProjectId) return {};
  letterFolderColors[activeLettersProjectId] = letterFolderColors[activeLettersProjectId] || {};
  return letterFolderColors[activeLettersProjectId];
}

function letterFolderColor(folder) {
  const colors = activeLetterFolderColors();
  const key = normalizeLetterFolderKey(folder);
  return colors[key] || colors[folder] || colors[String(folder || "").trim()] || "";
}

function letterFolderRowStyle(item, direction) {
  const color = letterFolderColor(letterFolderKey(item, direction));
  if (!color) return "";
  return ` style="--letter-folder-row:${hexToRgba(color, 0.24)}"`;
}

function hexToRgba(hex, alpha = 0.22) {
  const match = String(hex || "").match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return "transparent";
  const [, r, g, b] = match;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
}

function renderLetterSortOptions() {
  if (!el.lettersSort) return;
  const current = letterSortKey || el.lettersSort.value || "dateNumber";
  el.lettersSort.innerHTML = LETTER_COLUMNS
    .filter((column) => column.key !== "open")
    .map((column) => `<option value="${column.key}">${column.label}</option>`)
    .join("");
  letterSortKey = LETTER_COLUMNS.some((column) => column.key === current) ? current : "dateNumber";
  el.lettersSort.value = letterSortKey;
}

function setLetterSort(columnKey) {
  if (!LETTER_COLUMNS.some((column) => column.key === columnKey)) return;
  if (letterSortKey === columnKey) {
    letterSortDirection = letterSortDirection === "asc" ? "desc" : "asc";
  } else {
    letterSortKey = columnKey;
    letterSortDirection = "asc";
  }
  if (el.lettersSort) el.lettersSort.value = letterSortKey;
  renderLetters();
  persistUserState();
}

function renderLetterColumnOptions() {
  if (!el.lettersColumnOptions) return;
  const visible = new Set(normalizeLetterVisibleColumns(letterVisibleColumns));
  letterColumnOrder = normalizeColumnOrder(letterColumnOrder, LETTER_COLUMNS);
  el.lettersColumnOptions.innerHTML = letterColumnOrder.map((key, index) => LETTER_COLUMNS.find((column) => column.key === key)).filter(Boolean).map((column, index, columns) => `
    <label class="column-order-row" draggable="true" data-column-order-key="${column.key}">
      <span class="column-drag-handle" title="Zlap i przesun">⋮⋮</span>
      <input type="checkbox" value="${column.key}" ${visible.has(column.key) ? "checked" : ""} />
      <span>${column.label}</span>
      <button type="button" data-letter-column-up="${column.key}" ${index === 0 ? "disabled" : ""} title="Przesun w lewo">↑</button>
      <button type="button" data-letter-column-down="${column.key}" ${index === columns.length - 1 ? "disabled" : ""} title="Przesun w prawo">↓</button>
    </label>
  `).join("");
  el.lettersColumnOptions.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const next = [...el.lettersColumnOptions.querySelectorAll("input:checked")].map((item) => item.value);
      letterVisibleColumns = normalizeLetterVisibleColumns(next);
      renderLetterColumnOptions();
      renderLetters();
      persistUserState();
      window.setTimeout(() => { suppressLetterSortClick = false; }, 0);
    });
  });
  el.lettersColumnOptions.querySelectorAll("[data-letter-column-up], [data-letter-column-down]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.letterColumnUp || button.dataset.letterColumnDown;
      letterColumnOrder = moveColumnInOrder(letterColumnOrder, key, button.dataset.letterColumnUp ? -1 : 1);
      renderLetterColumnOptions();
      renderLetters();
      persistUserState();
    });
  });
  bindColumnOrderDragging(el.lettersColumnOptions, (sourceKey, targetKey, placeAfter) => {
    letterColumnOrder = moveColumnBefore(letterColumnOrder, sourceKey, targetKey, placeAfter);
    renderLetterColumnOptions();
    renderLetters();
    persistUserState();
  });
  renderLetterFolderColorOptions();
  renderLetterExtensionOptions();
}

function normalizedFileExtension(item) {
  const name = typeof item === "string" ? item : (item?.name || "");
  return (name.match(/\.([^.]+)$/)?.[1] || "bez rozszerzenia").toLowerCase();
}

function availableLetterExtensions() {
  return [...new Set([...(activeLettersData.incoming || []), ...(activeLettersData.outgoing || [])].map(normalizedFileExtension))]
    .sort((a, b) => a.localeCompare(b, "pl"));
}

function renderLetterExtensionOptions() {
  if (!el.lettersExtensionOptions) return;
  const extensions = availableLetterExtensions();
  el.lettersExtensionOptions.innerHTML = extensions.length ? extensions.map((extension) => `
    <label><input type="checkbox" value="${escapeHtml(extension)}" ${letterHiddenExtensions.includes(extension) ? "" : "checked"} /><span>.${escapeHtml(extension)}</span></label>
  `).join("") : '<span class="letters-folder-empty">Brak rozszerzen.</span>';
  el.lettersExtensionOptions.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      letterHiddenExtensions = extensions.filter((extension) => ![...el.lettersExtensionOptions.querySelectorAll("input:checked")].some((item) => item.value === extension));
      renderLetters();
      persistUserState();
    });
  });
}

function renderLetterFolderColorOptions() {
  if (!el.lettersFolderColorOptions) return;
  const folders = uniqueLetterFolders();
  const colors = activeLetterFolderColors();
  if (!folders.length) {
    el.lettersFolderColorOptions.innerHTML = `<span class="letters-folder-empty">Brak podfolderow.</span>`;
    return;
  }
  el.lettersFolderColorOptions.innerHTML = folders.map((folder) => `
    <label class="letters-folder-color-row">
      <span title="${escapeHtml(folder)}">${escapeHtml(folder)}</span>
      <input type="color" value="${escapeHtml(letterFolderColor(folder) || "#3f9a57")}" data-letter-folder-color="${escapeHtml(folder)}" />
      <button type="button" data-letter-folder-clear="${escapeHtml(folder)}" title="Wyczysc kolor">x</button>
    </label>
  `).join("");
  el.lettersFolderColorOptions.querySelectorAll("[data-letter-folder-color]").forEach((input) => {
    input.addEventListener("input", () => {
      colors[normalizeLetterFolderKey(input.dataset.letterFolderColor)] = input.value;
      renderLetters();
      persistUserState();
    });
  });
  el.lettersFolderColorOptions.querySelectorAll("[data-letter-folder-clear]").forEach((button) => {
    button.addEventListener("click", () => {
      const folder = button.dataset.letterFolderClear;
      delete colors[folder];
      delete colors[normalizeLetterFolderKey(folder)];
      renderLetters();
      persistUserState();
    });
  });
}

function uniqueLetterFolders() {
  const folders = [];
  ["outgoing", "incoming"].forEach((direction) => {
    (activeLettersData[direction] || []).forEach((item) => {
      const folder = letterFolderKey(item, direction);
      if (folder && !folders.includes(folder)) folders.push(folder);
    });
  });
  return folders.sort((a, b) => a.localeCompare(b, "pl", { numeric: true, sensitivity: "base" }));
}

function normalizeLetterWidthsMap(widths) {
  if (Array.isArray(widths)) {
    return LETTER_COLUMNS.reduce((map, column, index) => {
      const width = Number(widths[index]);
      if (Number.isFinite(width)) map[column.key] = clampLetterColumnWidth(width);
      return map;
    }, {});
  }
  if (!widths || typeof widths !== "object") return {};
  return LETTER_COLUMNS.reduce((map, column) => {
    const width = Number(widths[column.key]);
    if (Number.isFinite(width)) map[column.key] = clampLetterColumnWidth(width);
    return map;
  }, {});
}

function clampLetterColumnWidth(width) {
  return Math.max(42, Math.min(620, Math.round(width)));
}

function letterColumnWidthsFor(direction, items = [], columns = visibleLetterColumns(), incoming = []) {
  const saved = normalizeLetterWidthsMap(letterColumnWidths?.[direction]);
  return columns.reduce((map, column) => {
    const savedWidth = Number(saved[column.key]);
    map[column.key] = Number.isFinite(savedWidth)
      ? clampLetterColumnWidth(savedWidth)
      : autoLetterColumnWidth(column, direction, items, incoming);
    return map;
  }, {});
}

function autoLetterColumnWidth(column, direction, items, incoming = []) {
  const header = letterColumnLabel(column, direction);
  const texts = [header, ...items.map((item) => letterCellText(column, item, direction, incoming))];
  const longest = texts.reduce((max, text) => Math.max(max, String(text || "").length), 0);
  const base = column.key === "open" ? 58 : 24;
  const charWidth = column.key === "dateNumber" ? 8 : 7;
  return Math.max(42, Math.min(520, Math.ceil(longest * charWidth + base)));
}

function letterCellText(column, item, direction, incoming = []) {
  const meta = letterMeta(item, direction);
  if (column.key === "name") return item.name || "";
  if (column.key === "type") return meta.type || "";
  if (column.key === "open") return "Otworz";
  if (column.key === "dateNumber") return direction === "incoming" ? meta.date : meta.number;
  if (column.key === "entity") return meta.entity || "";
  if (column.key === "subject") return meta.subject || "";
  if (column.key === "folder") return displayLetterFolder(item.folder || "", direction);
  if (column.key === "link") {
    const opposite = direction === "outgoing" ? "incoming" : "outgoing";
    const names = letterThreadMembers(direction, item.id, opposite).map((id) => letterById(opposite, id)?.name).filter(Boolean);
    return names.length ? `${names.length}: ${names.join(" | ")}` : (direction === "incoming" ? "Folder" : "brak");
  }
  return "";
}

function letterRowHtml(item, direction, incoming = []) {
  const oppositeDirection = direction === "outgoing" ? "incoming" : "outgoing";
  const oppositeIds = letterThreadMembers(direction, item.id, oppositeDirection);
  const answered = oppositeIds.length > 0;
  const selected = selectedLetters[direction] === item.id;
  const linkedFocus = (focusedLetterLink[direction] || []).includes(item.id);
  const folderColored = Boolean(letterFolderColor(letterFolderKey(item, direction)));
  const meta = letterMeta(item, direction);
  const linkedItems = oppositeIds.map((id) => letterById(oppositeDirection, id)).filter(Boolean);
  const rowContext = { item, direction, meta, linkedItems };
  return `
    <tr class="${answered ? "answered" : ""} ${folderColored ? "folder-colored" : ""} ${selected ? "selected" : ""} ${linkedFocus ? "link-focus" : ""}"${letterFolderRowStyle(item, direction)} data-letter-row="${item.id}" data-letter-direction="${direction}">
      ${visibleLetterColumns().map((column) => letterCellHtml(column, rowContext)).join("")}
    </tr>
  `;
}

function letterCellHtml(column, context) {
  const { item, direction, meta, linkedItems } = context;
  const currentThread = letterThread(direction, item.id);
  const threadLabel = currentThread?.name || "Watek";
  if (column.key === "name") return `<td title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</td>`;
  if (column.key === "type") return `<td>${escapeHtml(meta.type)}</td>`;
  if (column.key === "open") return `<td><button type="button" data-letter-file="${escapeHtml(item.fileUrl)}">Otworz</button></td>`;
  if (column.key === "dateNumber") return `<td>${escapeHtml(direction === "incoming" ? meta.date : meta.number)}</td>`;
  if (column.key === "entity") return `<td title="${escapeHtml(meta.entity)}">${escapeHtml(meta.entity)}</td>`;
  if (column.key === "subject") return `<td title="${escapeHtml(meta.subject)}">${escapeHtml(meta.subject)}</td>`;
  if (column.key === "folder") {
    const folder = displayLetterFolder(item.folder || "", direction);
    return `<td title="${escapeHtml(folder)}">${escapeHtml(folder)}</td>`;
  }
  if (column.key === "link") {
    return `<td>${
      direction === "outgoing"
        ? linkedItems.length
          ? `<span class="letter-linked-dot" title="Element watku"></span><button class="letter-link-label letter-link-jump" type="button" data-letter-thread-direction="outgoing" data-letter-thread-id="${escapeHtml(item.id)}" title="Pokaz caly watek">${escapeHtml(threadLabel)} (${linkedItems.length + 1})</button>`
          : `<span class="letter-link-label">brak</span>`
        : `${linkedItems.length ? `<span class="letter-linked-dot" title="Element watku"></span><button class="letter-link-label letter-link-jump" type="button" data-letter-thread-direction="incoming" data-letter-thread-id="${escapeHtml(item.id)}" title="Pokaz caly watek">${escapeHtml(threadLabel)} (${linkedItems.length + 1})</button>` : ""}<button type="button" data-letter-folder="${escapeHtml(item.folderUrl)}">Folder</button>`
    }</td>`;
  }
  return "<td></td>";
}

function letterSortValue(item, direction, key) {
  const meta = letterMeta(item, direction);
  if (key === "name") return item.name || "";
  if (key === "type") return meta.type || "";
  if (key === "dateNumber") return direction === "incoming" ? meta.date : meta.number;
  if (key === "entity") return meta.entity || "";
  if (key === "subject") return meta.subject || "";
  if (key === "folder") return displayLetterFolder(item.folder || "", direction);
  if (key === "link") {
    const opposite = direction === "outgoing" ? "incoming" : "outgoing";
    return letterThreadMembers(direction, item.id, opposite).map((id) => letterById(opposite, id)?.name || "").join(" | ");
  }
  return item.name || "";
}

function filterLetters(items, direction) {
  items = items.filter((item) => !letterHiddenExtensions.includes(normalizedFileExtension(item)));
  const raw = direction === "incoming" ? el.lettersIncomingSearch?.value : el.lettersOutgoingSearch?.value;
  const query = String(raw || "").trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => letterSearchText(item, direction).includes(query));
}

function letterSearchText(item, direction) {
  const meta = letterMeta(item, direction);
  return [
    item.name,
    item.folder,
    item.recipient,
    meta.type,
    meta.date,
    meta.number,
    meta.entity,
    meta.subject
  ].filter(Boolean).join(" ").toLowerCase();
}

function letterMeta(item, direction) {
  const type = (item.name.match(/\.[^.]+$/)?.[0] || "").replace(".", "") || "-";
  const base = item.name.replace(/\.[^.]+$/, "");
  if (direction === "incoming") {
    const date = base.match(/^(\d{8})/)?.[1] || formatLetterDateCompact(item.date);
    const rest = base.replace(/^\d{8}\s*/, "").trim();
    const parts = rest.split(/\s+-\s+/).filter(Boolean);
    return {
      type,
      date,
      number: "",
      entity: parts[0] || rest || item.recipient || "-",
      subject: parts.slice(1).join(" - ") || rest || item.name
    };
  }
  const number = base.match(/^(\d{4}\.[A-Z0-9]+\.\d+)/i)?.[1] || "";
  const rest = base.replace(/^(\d{4}\.[A-Z0-9]+\.\d+)\s*/, "").trim();
  const parts = rest.split(/\s+-\s+/).filter(Boolean);
  return {
    type,
    date: "",
    number,
    entity: parts[0] || rest || item.recipient || "-",
    subject: parts.slice(1).join(" - ") || rest || item.name
  };
}

function formatLetterDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return formatDate(date);
}

function formatLetterDateCompact(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function bindLetters() {
  el.lettersModal?.querySelectorAll("[data-letter-sort]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (suppressLetterSortClick) return;
      setLetterSort(button.dataset.letterSort);
    });
  });
  el.lettersModal?.querySelectorAll("[data-letter-file]").forEach((button) => {
    button.addEventListener("click", () => openFolderPath(button.dataset.letterFile));
  });
  el.lettersModal?.querySelectorAll("[data-letter-folder]").forEach((button) => {
    button.addEventListener("click", () => openFolderPath(button.dataset.letterFolder));
  });
  el.lettersModal?.querySelectorAll("[data-letter-thread-direction][data-letter-thread-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      showLetterThread(button.dataset.letterThreadDirection, button.dataset.letterThreadId);
    });
  });
  el.lettersModal?.querySelectorAll("[data-letter-row]").forEach((row) => {
    row.addEventListener("click", selectLetterRow);
    row.addEventListener("contextmenu", (event) => {
      const direction = row.dataset.letterDirection;
      const item = letterById(direction, row.dataset.letterRow);
      if (item) openLetterFileMenu(event, item, direction);
    });
  });
  el.lettersModal?.querySelectorAll("[data-letter-resize]").forEach((handle) => {
    handle.addEventListener("pointerdown", startLetterColumnResize);
  });
  el.lettersModal?.querySelectorAll(".letters-table").forEach(bindLetterHeaderDragging);
}

function bindLetterHeaderDragging(table) {
  table.querySelectorAll("th[data-letter-col]").forEach((header) => {
    header.addEventListener("dragstart", (event) => {
      if (event.target.closest("[data-letter-resize]")) {
        event.preventDefault();
        return;
      }
      draggedLetterColumn = header.dataset.letterCol || "";
      suppressLetterSortClick = true;
      header.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedLetterColumn);
    });
    header.addEventListener("dragover", (event) => {
      if (!draggedLetterColumn || draggedLetterColumn === header.dataset.letterCol) return;
      event.preventDefault();
      header.classList.add("drag-over");
    });
    header.addEventListener("dragleave", () => header.classList.remove("drag-over"));
    header.addEventListener("drop", (event) => {
      event.preventDefault();
      const targetKey = header.dataset.letterCol || "";
      if (!draggedLetterColumn || !targetKey || draggedLetterColumn === targetKey) return;
      const bounds = header.getBoundingClientRect();
      const placeAfter = event.clientX > bounds.left + bounds.width / 2;
      letterColumnOrder = moveColumnBefore(letterColumnOrder, draggedLetterColumn, targetKey, placeAfter);
      renderLetterColumnOptions();
      renderLetters();
      persistUserState();
    });
    header.addEventListener("dragend", () => {
      el.lettersModal?.querySelectorAll(".letters-table th.dragging, .letters-table th.drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
      draggedLetterColumn = "";
      window.setTimeout(() => { suppressLetterSortClick = false; }, 0);
    });
  });
}

function selectLetterRow(event) {
  if (event.target?.closest?.("button, select, .letter-col-resizer")) return;
  const row = event.currentTarget;
  const direction = row.dataset.letterDirection;
  const id = row.dataset.letterRow;
  if (!direction || !id) return;
  selectedLetters[direction] = selectedLetters[direction] === id ? "" : id;
  renderLetters();
}

function openLetterFileMenu(event, item, direction) {
  if (!item?.fileUrl) return;
  event.preventDefault();
  event.stopPropagation();
  closeSecretFileMenu();
  const menu = document.createElement("div");
  menu.className = "secret-file-context-menu";
  menu.innerHTML = `
    <button type="button" data-letter-file-action="open">Otwórz pismo</button>
    <button type="button" data-letter-file-action="folder">Otwórz folder</button>
    <span></span>
    <button type="button" data-letter-file-action="rename">Zmień nazwę</button>
    <button type="button" data-letter-file-action="copy">Kopiuj</button>
    <button type="button" data-letter-file-action="paste" ${secretFileClipboard ? "" : "disabled"}>Wklej do tego folderu</button>
    <button type="button" data-letter-file-action="duplicate">Utwórz kopię tutaj</button>
    <button class="danger" type="button" data-letter-file-action="delete">Usuń</button>
  `;
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8))}px`;
  menu.addEventListener("click", async (clickEvent) => {
    const button = clickEvent.target.closest("[data-letter-file-action]");
    if (!button) return;
    const action = button.dataset.letterFileAction;
    closeSecretFileMenu();
    if (action === "open") return openSecretFile(item.fileUrl);
    if (action === "folder") return openSecretFileParent(item.fileUrl);
    if (action === "copy") {
      secretFileClipboard = { path: item.fileUrl, mode: "copy" };
      return;
    }
    if (action === "paste" && secretFileClipboard) return pasteLetterClipboard(item);
    if (action === "duplicate") return runLetterFileOperation("copy", item, direction);
    if (action === "rename") {
      const nextName = await zkPrompt("Podaj nową nazwę pisma wraz z rozszerzeniem.", item.name || "", "Zmień nazwę pisma");
      if (!nextName?.trim() || nextName.trim() === item.name) return;
      return runLetterFileOperation("rename", item, direction, nextName.trim());
    }
    if (action === "delete" && await zkConfirm(`Przenieść pismo „${item.name}” do Kosza?`, { title: "Usuń pismo", danger: true })) {
      return runLetterFileOperation("delete", item, direction);
    }
  });
}

async function pasteLetterClipboard(targetItem) {
  if (!secretFileClipboard || !targetItem?.fileUrl) return false;
  try {
    const response = await fetch("/api/file-operation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "paste",
        path: secretFileClipboard.path,
        destination: targetItem.fileUrl,
        mode: secretFileClipboard.mode || "copy"
      })
    });
    if (!response.ok) throw new Error(await response.text());
    if (secretFileClipboard.mode === "move") secretFileClipboard = null;
    await loadLetters(activeLettersProjectId, true);
    return true;
  } catch (error) {
    void zkAlert(`Nie udało się wkleić pisma.\n${error?.message || ""}`, "Błąd wklejania");
    return false;
  }
}

async function runLetterFileOperation(action, item, direction, name = "") {
  try {
    const response = await fetch("/api/file-operation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, path: item.fileUrl, name })
    });
    if (!response.ok) throw new Error(await response.text());
    const oldId = item.id;
    const oldFolder = item.folder || "";
    await loadLetters(activeLettersProjectId, true);
    const threads = projectLetterThreads();
    if (action === "rename") {
      const replacement = (activeLettersData[direction] || []).find((candidate) =>
        candidate.name === name && String(candidate.folder || "") === String(oldFolder));
      if (replacement) {
        threads.forEach((thread) => {
          thread[direction] = (thread[direction] || []).map((id) => id === oldId ? replacement.id : id);
        });
        selectedLetters[direction] = selectedLetters[direction] === oldId ? replacement.id : selectedLetters[direction];
        focusedLetterLink[direction] = (focusedLetterLink[direction] || []).map((id) => id === oldId ? replacement.id : id);
      }
    } else if (action === "delete") {
      threads.forEach((thread) => { thread[direction] = (thread[direction] || []).filter((id) => id !== oldId); });
      if (selectedLetters[direction] === oldId) selectedLetters[direction] = "";
      focusedLetterLink[direction] = (focusedLetterLink[direction] || []).filter((id) => id !== oldId);
      letterLinks[activeLettersProjectId] = threads.filter(compactLetterThread);
    }
    schedulePersist();
    renderLetters();
    return true;
  } catch (error) {
    void zkAlert(`Nie udało się wykonać operacji na piśmie.\n${error?.message || ""}`, "Błąd pisma");
    return false;
  }
}

function updateLettersLinkButtons() {
  const canLink = Boolean(selectedLetters.incoming && selectedLetters.outgoing);
  const hasLinkedPair = Boolean(resolveSelectedLetterLink());
  if (el.lettersLinkBtn) el.lettersLinkBtn.disabled = !canLink;
  if (el.lettersUnlinkBtn) el.lettersUnlinkBtn.disabled = !canLink && !selectedLetters.incoming && !selectedLetters.outgoing;
  if (el.lettersShowLinkBtn) el.lettersShowLinkBtn.disabled = !hasLinkedPair;
}

async function linkSelectedLetters() {
  if (!activeLettersProjectId || !selectedLetters.incoming || !selectedLetters.outgoing) return;
  const threads = projectLetterThreads();
  const incomingThread = letterThread("incoming", selectedLetters.incoming);
  const outgoingThread = letterThread("outgoing", selectedLetters.outgoing);
  const isNewThread = !incomingThread && !outgoingThread;
  const target = incomingThread || outgoingThread || { id: `thread-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "Watek", incoming: [], outgoing: [] };
  if (isNewThread) {
    const name = await showAppPrompt({
      title: "Nazwa nowego watku",
      message: "Podaj nazwe dla laczonych pism.",
      value: "Watek",
      placeholder: "Nazwa watku",
      confirmText: "Utworz watek"
    });
    if (name === null) return;
    target.name = String(name || "").trim() || "Watek";
  }
  if (!threads.includes(target)) threads.push(target);
  if (incomingThread && outgoingThread && incomingThread !== outgoingThread) {
    target.incoming.push(...(outgoingThread.incoming || []));
    target.outgoing.push(...(outgoingThread.outgoing || []));
    threads.splice(threads.indexOf(outgoingThread), 1);
  }
  target.incoming.push(selectedLetters.incoming);
  target.outgoing.push(selectedLetters.outgoing);
  compactLetterThread(target);
  showLetterThread("outgoing", selectedLetters.outgoing);
  renderLetters();
  schedulePersist();
}

function unlinkSelectedLetters() {
  if (!activeLettersProjectId) return;
  const threads = projectLetterThreads();
  threads.forEach((thread) => {
    if (selectedLetters.outgoing) thread.outgoing = (thread.outgoing || []).filter((id) => id !== selectedLetters.outgoing);
    if (selectedLetters.incoming) thread.incoming = (thread.incoming || []).filter((id) => id !== selectedLetters.incoming);
  });
  letterLinks[activeLettersProjectId] = threads.filter(compactLetterThread);
  focusedLetterLink = { incoming: [], outgoing: [] };
  renderLetters();
  schedulePersist();
}

function resolveSelectedLetterLink() {
  return (selectedLetters.outgoing && letterThread("outgoing", selectedLetters.outgoing))
    || (selectedLetters.incoming && letterThread("incoming", selectedLetters.incoming))
    || null;
}

function showSelectedLetterLink() {
  const thread = resolveSelectedLetterLink();
  if (!thread) return;
  showLetterThreadMembers(thread);
}

function showLetterThread(direction, id) {
  const thread = letterThread(direction, id);
  if (thread) showLetterThreadMembers(thread);
}

function showLetterThreadMembers(thread) {
  const next = { incoming: [...(thread.incoming || [])], outgoing: [...(thread.outgoing || [])] };
  const sameThreadVisible = next.incoming.length === focusedLetterLink.incoming.length
    && next.outgoing.length === focusedLetterLink.outgoing.length
    && next.incoming.every((id) => focusedLetterLink.incoming.includes(id))
    && next.outgoing.every((id) => focusedLetterLink.outgoing.includes(id));
  if (sameThreadVisible) {
    focusedLetterLink = { incoming: [], outgoing: [] };
    renderLetters();
    return;
  }
  focusedLetterLink = next;
  if (el.lettersOutgoingSearch) el.lettersOutgoingSearch.value = "";
  if (el.lettersIncomingSearch) el.lettersIncomingSearch.value = "";
  renderLetters();
}

function scrollFocusedLetterLink() {
  ["outgoing", "incoming"].forEach((direction) => {
    const id = focusedLetterLink[direction]?.[0];
    if (!id) return;
    const row = [...(el.lettersModal?.querySelectorAll(`[data-letter-direction="${direction}"]`) || [])]
      .find((item) => item.dataset.letterRow === id);
    row?.scrollIntoView({ block: "center", inline: "nearest" });
  });
}

function applyLettersSplit() {
  el.lettersModal?.style.setProperty("--letters-left", `${clamp(lettersSplitPercent, LETTERS_SPLIT_MIN, LETTERS_SPLIT_MAX)}%`);
}

function applyLettersThreadHeight() {
  if (!el.lettersModal) return;
  const shellHeight = el.lettersModal.querySelector(".letters-shell")?.clientHeight || window.innerHeight;
  const maximum = Math.max(120, shellHeight - 250);
  lettersThreadHeight = clamp(Number(lettersThreadHeight) || 230, 120, maximum);
  el.lettersModal.style.setProperty("--letters-thread-height", `${Math.round(lettersThreadHeight)}px`);
}

function applyLettersThreadListWidth() {
  if (!el.lettersThreadPanel) return;
  const panelWidth = el.lettersThreadPanel.clientWidth;
  if (panelWidth < 520) {
    el.lettersThreadPanel.style.setProperty("--letters-thread-list-width", `${Math.round(lettersThreadListWidth)}px`);
    return;
  }
  const maximum = Math.max(150, Math.min(420, panelWidth - 360));
  lettersThreadListWidth = clamp(Number(lettersThreadListWidth) || 198, 150, maximum);
  el.lettersThreadPanel.style.setProperty("--letters-thread-list-width", `${Math.round(lettersThreadListWidth)}px`);
}

function changeLettersThreadListWidth(factor) {
  const panelWidth = el.lettersThreadPanel?.clientWidth || window.innerWidth;
  const maximum = Math.max(150, Math.min(420, panelWidth - 360));
  lettersThreadListWidth = clamp(Math.round((Number(lettersThreadListWidth) || 198) * factor), 150, maximum);
  applyLettersThreadListWidth();
  persistUserState();
}

function applyLettersThreadCardWidth() {
  el.lettersThreadPanel?.style.setProperty("--letters-thread-card-width", `${Math.round(lettersThreadCardWidth)}px`);
}

function changeLettersThreadCardWidth(delta) {
  lettersThreadCardWidth = clamp(Math.round((Number(lettersThreadCardWidth) || 243) + delta), 180, 420);
  applyLettersThreadCardWidth();
  persistUserState();
}

function startLettersThreadListResize(event) {
  event.preventDefault();
  const panel = el.lettersThreadPanel;
  if (!panel) return;
  const bounds = panel.getBoundingClientRect();
  el.lettersThreadIndexSplitter?.setPointerCapture?.(event.pointerId);
  document.body.classList.add("resizing-letters-thread-list");
  const move = (moveEvent) => {
    lettersThreadListWidth = clamp(moveEvent.clientX - bounds.left, 150, Math.max(150, bounds.width - 360));
    applyLettersThreadListWidth();
  };
  const stop = () => {
    document.body.classList.remove("resizing-letters-thread-list");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    persistUserState();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function startLettersThreadResize(event) {
  event.preventDefault();
  const shell = el.lettersModal?.querySelector(".letters-shell");
  if (!shell) return;
  const bounds = shell.getBoundingClientRect();
  const headerHeight = shell.querySelector(":scope > header")?.getBoundingClientRect().height || 54;
  const minimumTablesHeight = 180;
  el.lettersThreadSplitter?.setPointerCapture?.(event.pointerId);
  document.body.classList.add("resizing-letters-thread");
  const move = (moveEvent) => {
    const maximum = Math.max(120, bounds.height - headerHeight - minimumTablesHeight - 8);
    lettersThreadHeight = clamp(bounds.bottom - moveEvent.clientY - 8, 120, maximum);
    applyLettersThreadHeight();
  };
  const stop = () => {
    document.body.classList.remove("resizing-letters-thread");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    persistUserState();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function startLettersSplitResize(event) {
  event.preventDefault();
  const columns = el.lettersModal?.querySelector(".letters-columns");
  if (!columns) return;
  const rect = columns.getBoundingClientRect();
  const move = (moveEvent) => {
    const raw = ((moveEvent.clientX - rect.left) / Math.max(1, rect.width)) * 100;
    lettersSplitPercent = clamp(raw, LETTERS_SPLIT_MIN, LETTERS_SPLIT_MAX);
    applyLettersSplit();
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    persistUserState();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function startLetterColumnResize(event) {
  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  const table = handle.closest(".letters-table");
  if (!table) return;
  const direction = table.classList.contains("outgoing") ? "outgoing" : "incoming";
  const key = handle.dataset.letterResize;
  if (!key) return;
  const col = table.querySelector(`col[data-letter-col-key="${CSS.escape(key)}"]`);
  if (!col) return;
  const widths = { ...normalizeLetterWidthsMap(letterColumnWidths?.[direction]) };
  const startX = event.clientX;
  const column = LETTER_COLUMNS.find((item) => item.key === key);
  const startWidth = col.getBoundingClientRect().width || widths[key] || column?.width || 80;
  table.classList.add("resizing");
  handle.setPointerCapture?.(event.pointerId);

  const move = (moveEvent) => {
    const nextWidth = clampLetterColumnWidth(startWidth + moveEvent.clientX - startX);
    widths[key] = nextWidth;
    col.style.width = `${nextWidth}px`;
    const tableWidth = [...table.querySelectorAll("col")]
      .reduce((sum, item) => sum + (Number.parseFloat(item.style.width) || item.getBoundingClientRect().width || 0), 0);
    if (tableWidth > 0) table.style.width = `${Math.round(tableWidth)}px`;
    letterColumnWidths[direction] = widths;
  };

  const stop = () => {
    table.classList.remove("resizing");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    persistUserState();
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function personLeaveDates(person) {
  return new Set(employeeLeaves.filter((leave) => samePerson(leave.person, person)).map((leave) => leave.date));
}

function isPersonOnLeave(person, value) {
  return employeeLeaves.some((leave) => samePerson(leave.person, person) && leave.date === dateString(parseDate(value)));
}

function assignmentRangeHitsLeave(person, startValue, endValue) {
  if (!person || person === "Zespol") return false;
  const leaves = personLeaveDates(person);
  if (!leaves.size) return false;
  const cursor = parseDate(startValue);
  const end = parseDate(endValue || startValue);
  while (cursor.getTime() <= end.getTime()) {
    if (leaves.has(dateString(cursor))) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

function firstLeaveInRange(person, startValue, endValue) {
  const leaves = personLeaveDates(person);
  if (!leaves.size) return null;
  const cursor = parseDate(startValue);
  const end = parseDate(endValue || startValue);
  while (cursor.getTime() <= end.getTime()) {
    const value = dateString(cursor);
    if (leaves.has(value)) return value;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

function moveOrderPastLeaves(order) {
  if (!order?.assignee || order.assignee === "Zespol") return;
  const duration = Math.max(0, daysBetween(order.start || order.due, order.due));
  let guard = 0;
  while (assignmentRangeHitsLeave(order.assignee, order.start || order.due, order.due) && guard < 366) {
    const conflict = firstLeaveInRange(order.assignee, order.start || order.due, order.due);
    if (!conflict) break;
    order.start = dateString(nextWorkday(addDays(conflict, 1)));
    order.due = dateString(nextWorkday(addDays(order.start, duration)));
    guard += 1;
  }
}

function alertLeaveCollision(person) {
  return showAppConfirm({
    title: "Urlop pracownika",
    message: `${person} ma urlop w tym terminie. Wybierz inny dzien albo inna osobe.`,
    detail: "Mozesz tez wymusic przypisanie, jesli to wyjatek.",
    confirmText: "Wykonaj mimo to",
    cancelText: "Cofnij"
  });
}

function showAppConfirm({ title, message, detail = "", confirmText = "OK", cancelText = "Anuluj" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("section");
    overlay.className = "app-dialog";
    overlay.innerHTML = `
      <div class="app-dialog-card" role="dialog" aria-modal="true">
        <header>
          <strong>${title}</strong>
        </header>
        <p>${message}</p>
        ${detail ? `<span>${detail}</span>` : ""}
        <footer>
          <button class="secondary" type="button" data-dialog-cancel>${cancelText}</button>
          <button type="button" data-dialog-confirm>${confirmText}</button>
        </footer>
      </div>
    `;
    const close = (value) => {
      overlay.remove();
      resolve(value);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-dialog-cancel]")) close(false);
      if (event.target.closest("[data-dialog-confirm]")) close(true);
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close(false);
      if (event.key === "Enter") close(true);
    });
    document.body.append(overlay);
    overlay.querySelector("[data-dialog-cancel]")?.focus();
  });
}

function showAppPrompt({
  title,
  message,
  detail = "",
  value = "",
  placeholder = "",
  confirmText = "Zapisz",
  cancelText = "Anuluj"
}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("section");
    overlay.className = "app-dialog";
    overlay.innerHTML = `
      <div class="app-dialog-card app-dialog-card-prompt" role="dialog" aria-modal="true">
        <header>
          <strong>${escapeHtml(title)}</strong>
        </header>
        ${message ? `<p>${escapeHtml(message)}</p>` : ""}
        ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
        <input
          class="app-dialog-input"
          type="text"
          value="${escapeHtml(value)}"
          placeholder="${escapeHtml(placeholder)}"
          data-dialog-input
        />
        <footer>
          <button class="secondary" type="button" data-dialog-cancel>${escapeHtml(cancelText)}</button>
          <button type="button" data-dialog-confirm>${escapeHtml(confirmText)}</button>
        </footer>
      </div>
    `;
    const input = overlay.querySelector("[data-dialog-input]");
    const close = (nextValue) => {
      overlay.remove();
      resolve(nextValue);
    };
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-dialog-cancel]")) close(null);
      if (event.target.closest("[data-dialog-confirm]")) close(input?.value.trim() || "");
    });
    overlay.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close(null);
      if (event.key === "Enter") close(input?.value.trim() || "");
    });
    document.body.append(overlay);
    input?.focus();
    input?.select();
  });
}

function colorFromName(name = "Uzytkownik") {
  const fixed = {
    Ola: "#c25a7c",
    Piotr: "#246b83",
    Anna: "#6f62b8",
    Marek: "#2f7a57",
    Konrad: "#607381",
    Zespol: "#63717b"
  };
  if (fixed[name]) return fixed[name];
  let hash = 0;
  String(name).split("").forEach((char) => {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  });
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 45% 42%)`;
}

function ensureProjectColor(project) {
  if (!project.color) {
    project.color = colorFromName(project.name || project.id || "projekt");
  }
  return project.color;
}

function currentProjectColor(projectId, fallbackName = "") {
  const project = projects.find((item) => item.id === projectId);
  return project ? ensureProjectColor(project) : colorFromName(fallbackName || projectId || "projekt");
}

function shadeColor(color, percent) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const amount = Math.round(2.55 * percent);
  const value = parseInt(color.slice(1), 16);
  const red = Math.max(0, Math.min(255, (value >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((value >> 8) & 0x00ff) + amount));
  const blue = Math.max(0, Math.min(255, (value & 0x0000ff) + amount));
  return `#${(0x1000000 + red * 0x10000 + green * 0x100 + blue).toString(16).slice(1)}`;
}

function hexToRgba(color, alpha = 1) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`;
  }
  const value = parseInt(color.slice(1), 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

async function chooseTopicFoldersRoot() {
  try {
    const response = await fetch("/api/select-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialPath: topicFoldersRoot })
    });
    if (!response.ok) throw new Error("folder dialog failed");
    const result = await response.json();
    if (!result.path) return;
    topicFoldersRoot = result.path;
    el.topicFoldersRoot.value = topicFoldersRoot;
    el.topicFoldersStatus.textContent = "Wybrano folder projektow. Kliknij Mapuj linki, zeby dopasowac foldery.";
    schedulePersist();
    mapTopicFolders();
  } catch {
    const fallback = await zkPrompt("Podaj folder z projektami", topicFoldersRoot || "", "Folder projektów");
    if (!fallback) return;
    topicFoldersRoot = fallback;
    el.topicFoldersRoot.value = topicFoldersRoot;
    schedulePersist();
  }
}

function renderDataFolderControls(message = "") {
  if (el.dataFolderPath) el.dataFolderPath.value = dataFolderPath || "";
  if (el.dataFolderStatus) {
    el.dataFolderStatus.textContent = message || "Tu sa zapisywane wspolne dane programu. Po zmianie uruchom ZK Manager ponownie.";
  }
}

async function chooseDataFolderPath() {
  try {
    const response = await fetch("/api/select-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initialPath: dataFolderPath })
    });
    if (!response.ok) throw new Error("folder dialog failed");
    const result = await response.json();
    if (!result.path) return;
    await saveDataFolderPath(result.path);
  } catch {
    const fallback = await zkPrompt("Podaj folder danych", dataFolderPath || "", "Folder danych");
    if (!fallback) return;
    await saveDataFolderPath(fallback);
  }
}

async function saveDataFolderPath(nextPath) {
  dataFolderPath = String(nextPath || "").trim();
  renderDataFolderControls("Zapisywanie folderu danych...");
  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataPath: dataFolderPath })
    });
    if (!response.ok) throw new Error("config save failed");
    const result = await response.json();
    if (typeof result.dataPath === "string") dataFolderPath = result.dataPath;
    renderDataFolderControls("Zapisano folder danych. Uruchom ZK Manager ponownie, zeby wczytac dane z tej lokalizacji.");
  } catch {
    renderDataFolderControls("Nie udalo sie zapisac folderu danych. Sprawdz uprawnienia do folderu.");
  }
}

function renderUpdateControls(message = "") {
  if (el.updateManifestUrl) el.updateManifestUrl.value = updateManifestUrl || "";
  if (el.updateStatus) {
    el.updateStatus.textContent = message || (updateManifestUrl
      ? "Aktualizacje beda sprawdzane przy starcie programu."
      : "Wklej publiczny manifest JSON albo GitHub Releases API. Login i haslo nie sa potrzebne.");
  }
  renderUpdateNotice();
}

function renderUpdateNotice() {
  const available = Boolean(latestUpdateInfo?.available);
  el.updateNoticeBtn?.classList.toggle("hidden", !available);
  if (el.updateNoticeBadge) {
    el.updateNoticeBadge.textContent = "1";
    el.updateNoticeBadge.classList.toggle("hidden", !available);
  }
  if (el.updateNoticeBtn && available) {
    const latest = latestUpdateInfo.latestVersion || "nowsza";
    el.updateNoticeBtn.title = `Dostepna aktualizacja ${latest}`;
    el.updateNoticeBtn.setAttribute("aria-label", el.updateNoticeBtn.title);
  }
}

async function saveUpdateManifestUrl(nextUrl) {
  updateManifestUrl = String(nextUrl || "").trim();
  latestUpdateInfo = null;
  renderUpdateControls("Zapisywanie ustawien aktualizacji...");
  if (location.protocol === "file:") {
    renderUpdateControls("Aktualizacje dzialaja w aplikacji lokalnej, nie z pliku HTML.");
    return;
  }
  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updateManifestUrl })
    });
    if (!response.ok) throw new Error("config save failed");
    const result = await response.json();
    if (typeof result.updateManifestUrl === "string") updateManifestUrl = result.updateManifestUrl;
    renderUpdateControls(updateManifestUrl ? "Zapisano manifest aktualizacji." : "Wyczyszczono manifest aktualizacji.");
    if (updateManifestUrl) checkForAppUpdate({ silent: false, force: true });
  } catch (error) {
    console.warn("Nie udalo sie zapisac ustawien aktualizacji.", error);
    renderUpdateControls("Nie udalo sie zapisac ustawien aktualizacji.");
  }
}

async function checkUpdatesFromSettings() {
  const typedUrl = String(el.updateManifestUrl?.value || "").trim();
  if (typedUrl !== updateManifestUrl) {
    await saveUpdateManifestUrl(typedUrl);
    return;
  }
  checkForAppUpdate({ silent: false, force: true });
}

async function checkForAppUpdate({ silent = true, force = false } = {}) {
  if (location.protocol === "file:") return;
  if (updateCheckInProgress && !force) return;
  if (!updateManifestUrl) {
    latestUpdateInfo = null;
    renderUpdateControls();
    return;
  }
  updateCheckInProgress = true;
  if (!silent) renderUpdateControls("Sprawdzanie aktualizacji...");
  try {
    const response = await fetch("/api/update/check", { cache: "no-store" });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    latestUpdateInfo = result.available ? result : null;
    if (result.available) {
      renderUpdateControls(`Dostepna wersja ${result.latestVersion}. Kliknij ikone aktualizacji na gornym pasku.`);
    } else if (!silent || result.error) {
      renderUpdateControls(result.error || `Masz aktualna wersje ${result.currentVersion || ""}.`);
    } else {
      renderUpdateControls();
    }
  } catch (error) {
    latestUpdateInfo = null;
    console.warn("Nie udalo sie sprawdzic aktualizacji.", error);
    if (!silent) renderUpdateControls("Nie udalo sie sprawdzic aktualizacji.");
  } finally {
    updateCheckInProgress = false;
    renderUpdateNotice();
  }
}

async function promptInstallUpdate() {
  if (!latestUpdateInfo?.available) return;
  const current = latestUpdateInfo.currentVersion || "obecna";
  const latest = latestUpdateInfo.latestVersion || "nowsza";
  const notes = latestUpdateInfo.notes ? `\n\nOpis zmian:\n${String(latestUpdateInfo.notes).slice(0, 700)}` : "";
  const accepted = await zkConfirm(`Masz wersję ${current}. Dostępna jest ${latest}.\n\nUruchomić aktualizację?${notes}`, { title: "Aktualizacja" });
  if (!accepted) return;
  persistNow();
  persistUserState();
  renderUpdateControls("Pobieranie aktualizacji...");
  try {
    const response = await fetch("/api/update/install", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: latestUpdateInfo.url })
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    latestUpdateInfo = null;
    renderUpdateControls("Instalator uruchomiony. ZK Manager zostanie zamkniety automatycznie.");
  } catch (error) {
    console.warn("Nie udalo sie uruchomic aktualizacji.", error);
    renderUpdateControls("Nie udalo sie pobrac albo uruchomic aktualizacji.");
    void zkAlert("Nie udało się pobrać albo uruchomić aktualizacji. Sprawdź manifest i połączenie z internetem.", "Błąd aktualizacji");
  }
}

function isDefaultDataFolderPath(pathValue) {
  const normalized = String(pathValue || "").replace(/\//g, "\\").toLowerCase();
  return !normalized || normalized.includes("\\programdata\\zkprojekt\\zk manager\\data");
}

function maybePromptDataFolderOnFirstRun() {
  if (location.protocol === "file:") return;
  if (localStorage.getItem(DATA_FOLDER_PROMPT_KEY)) return;
  localStorage.setItem(DATA_FOLDER_PROMPT_KEY, "1");
}

async function mapTopicFolders() {
  topicFoldersRoot = el.topicFoldersRoot.value.trim();
  if (!topicFoldersRoot) {
    el.topicFoldersStatus.textContent = "Najpierw wskaz folder z projektami.";
    return;
  }

  const payload = {
    rootPath: topicFoldersRoot,
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      client: project.client,
      stages: project.stages.map((stage) => ({ name: stage.name })),
      tasks: project.tasks.map((task, index) => ({ index, title: task.title, stage: task.stage }))
    }))
  };

  try {
    const response = await fetch("/api/map-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("mapping failed");
    const result = await response.json();
    applyFolderMapping(result);
    el.topicFoldersStatus.textContent = `Zmapowano linki: projekty ${result.projectCount || 0}, etapy ${result.stageCount || 0}, zadania ${result.taskCount || 0}.`;
    schedulePersist();
    render();
    if (sidebarModuleMode === "secret") {
      const project = projects.find((item) => item.id === activeProjectId) || selectedProject();
      renderSecretExplorer(project);
    }
  } catch {
    el.topicFoldersStatus.textContent = "Nie udalo sie zmapowac linkow. Sprawdz sciezke projektow.";
  }
}

function applyFolderMapping(result) {
  (result.projects || []).forEach((mappedProject) => {
    const project = projects.find((item) => item.id === mappedProject.id);
    if (!project) return;
    if (mappedProject.folderUrl && project.folderUrl !== mappedProject.folderUrl) {
      project.folderUrl = mappedProject.folderUrl;
      lettersDataCache.delete(project.id);
    }
    (mappedProject.stages || []).forEach((mappedStage) => {
      const stage = project.stages.find((item) => item.name === mappedStage.name);
      if (stage?.folderUrlManual) return;
      if (stage && mappedStage.folderUrl) stage.folderUrl = mappedStage.folderUrl;
    });
    (mappedProject.tasks || []).forEach((mappedTask) => {
      const task = project.tasks[Number(mappedTask.index)];
      if (task?.folderUrlManual) return;
      if (task && mappedTask.folderUrl) task.folderUrl = mappedTask.folderUrl;
    });
    if (!project.folderUrl) {
      const inferredFolder = inferProjectFolderUrl(project);
      if (inferredFolder) {
        project.folderUrl = inferredFolder;
        lettersDataCache.delete(project.id);
      }
    }
  });
}

function inferProjectFolderUrl(project) {
  if (!project) return "";
  const stageUrls = (project.stages || []).map((stage) => stage.folderUrl).filter(Boolean);
  if (stageUrls.length > 1) {
    const common = commonFolderPath(stageUrls.map(folderUrlToPath));
    if (common) return normalizeFolderUrl(common);
  }
  if (stageUrls.length === 1) return parentFolderUrl(stageUrls[0]);

  const taskUrls = (project.tasks || []).map((task) => task.folderUrl).filter(Boolean);
  if (taskUrls.length > 1) {
    const common = commonFolderPath(taskUrls.map(folderUrlToPath));
    if (common) return normalizeFolderUrl(common);
  }
  if (taskUrls.length === 1) return parentFolderUrl(taskUrls[0]);
  return "";
}

function parentFolderUrl(folderUrl) {
  const folderPath = folderUrlToPath(folderUrl).replace(/[\\/]+$/, "");
  if (!folderPath) return "";
  const parentPath = folderPath.replace(/[\\/][^\\/]+$/, "");
  if (!parentPath || parentPath === folderPath) return "";
  return normalizeFolderUrl(parentPath);
}

function commonFolderPath(paths) {
  const cleanPaths = paths.filter(Boolean).map((path) => String(path).replace(/[\\/]+$/, ""));
  if (!cleanPaths.length) return "";
  const parts = cleanPaths.map((path) => path.split(/[\\/]+/).filter(Boolean));
  const common = [];
  const maxLength = Math.min(...parts.map((item) => item.length));
  for (let index = 0; index < maxLength; index += 1) {
    const candidate = parts[0][index];
    if (!parts.every((item) => item[index]?.toLowerCase() === candidate.toLowerCase())) break;
    common.push(candidate);
  }
  if (!common.length) return "";
  const firstPath = cleanPaths[0];
  const prefix = firstPath.startsWith("\\\\") ? "\\\\" : "";
  return `${prefix}${common.join("\\")}`;
}

function renderChatRecipients() {
  const targets = chatTargetsWithMessages();
  const availableTargets = availableChatTargets();
  activeChatTarget = normalizeChatTarget(activeChatTarget);
  if (!targets.some((target) => normalizeChatTarget(target) === activeChatTarget || samePerson(target, activeChatTarget))) {
    activeChatTarget = "team";
  }
  if (el.teamChatRecipient) {
    const existingKeys = new Set(targets.map((target) => chatTargetKey(target)));
    const newTargets = availableTargets.filter((target) => !existingKeys.has(chatTargetKey(target)));
    el.teamChatRecipient.innerHTML = [
      `<option value="">+ nowa rozmowa</option>`,
      ...newTargets.map((target) => `<option value="${escapeAttr(target)}">${escapeHtml(chatTargetLabel(target))}</option>`)
    ]
      .join("");
    el.teamChatRecipient.disabled = !newTargets.length;
    el.teamChatRecipient.value = "";
  }
  if (el.teamChatRecipients) {
    el.teamChatRecipients.innerHTML = targets
      .map((target) => {
        const unread = unreadCountForChatTarget(target);
        const active = normalizeChatTarget(target) === activeChatTarget;
        const label = chatTargetLabel(target);
        return `
          <button class="team-chat-recipient-item${active ? " active" : ""}${unread ? " has-unread" : " is-read"}" type="button" data-chat-target="${escapeAttr(target)}" role="option" aria-selected="${active ? "true" : "false"}" title="${escapeAttr(label)}${unread ? ` - ${unread} nowych` : ""}" aria-label="${escapeAttr(label)}${unread ? `, ${unread} nowych wiadomosci` : ""}">
            ${chatTargetAvatar(target)}
            ${unread ? `<strong>${unread}</strong>` : ""}
          </button>
        `;
      })
      .join("");
  }
}

function chatTargetLabel(target) {
  const profile = chatTargetProfile(target);
  return profile.label;
}

function avatarHtml(profile) {
  return `<span class="person-avatar" style="--avatar: ${profile.color}" title="${escapeAttr(profile.label)}">${escapeHtml(profile.initials)}</span>`;
}

function chatTargetProfile(target) {
  const normalized = normalizeChatTarget(target);
  if (normalized === "team") {
    return {
      label: "Biuro",
      initials: "B",
      color: colorFromName("Biuro")
    };
  }
  const employee = employeeForPerson(target);
  const label = employee?.displayName || employee?.name || target || "Uzytkownik";
  return {
    label,
    initials: normalizeUserInitials(employee?.initials, label),
    color: normalizeAvatarColor(employee?.color, colorFromName(label))
  };
}

function chatTargetAvatar(target) {
  return avatarHtml(chatTargetProfile(target));
}

function chatParticipantProfile(participant = {}, fallback = "Uzytkownik") {
  const employee = employeeForParticipant(participant);
  const aliases = participantAliases(participant);
  const label =
    employee?.displayName ||
    employee?.name ||
    participant.displayName ||
    participant.name ||
    participant.person ||
    aliases[0] ||
    fallback;
  return {
    label,
    initials: normalizeUserInitials(employee?.initials || participant.initials, label),
    color: normalizeAvatarColor(employee?.color || participant.color, colorFromName(label))
  };
}

function availableChatTargets() {
  const currentPerson = currentChatPersonName();
  const knownEmployees = employeeDirectory
    .filter((employee) => employee.role !== "przyklad")
    .map((employee) => employee.name || employee.displayName || employee.assigneeName)
    .filter(Boolean);
  const people = mergeTextLists(knownEmployees, peopleList()).filter((person) =>
    person &&
    !samePerson(person, "Zespol") &&
    !samePerson(person, "Biuro") &&
    !samePerson(person, currentPerson) &&
    !isLegacyBotName(person)
  );
  return ["team", ...people];
}

function setActiveChatTarget(target) {
  const nextTarget = normalizeChatTarget(target || "team");
  if (nextTarget === activeChatTarget) {
    markChatSeen(activeChatTarget);
    renderChatRecipients();
    renderChat();
    return;
  }
  markChatSeen(activeChatTarget);
  activeChatTarget = nextTarget;
  chatLastSeen = chatSeenByTarget[chatTargetKey()] || "";
  loadSharedBoard(true);
  renderChatRecipients();
  renderChat();
}

function sortChatMessagesByDate(messages) {
  return [...(messages || [])].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function isLocalChatDraft(message) {
  return Boolean(message && (message.localPending || message.localFailed));
}

function isRecentLocalChatEcho(message) {
  return Boolean(message && Number(message.localEchoUntil || 0) > Date.now());
}

function isLocalChatOverlay(message) {
  return isLocalChatDraft(message) || isRecentLocalChatEcho(message);
}

function chatAttachmentSignature(message) {
  const attachment = message?.attachment;
  if (!attachment) return "";
  return [attachment.id, attachment.name, attachment.type, attachment.url].filter(Boolean).join("|");
}

function chatMessageAuthorKey(message) {
  const author = message?.author || {};
  return author.id || author.person || author.name || "";
}

function chatMessageRecipientKey(message) {
  const recipient = message?.recipient || {};
  return recipient.id || recipient.person || recipient.name || "";
}

function messageLooksLikeSavedDraft(remoteMessage, draftMessage) {
  if (!remoteMessage || !draftMessage) return false;
  if (remoteMessage.id === draftMessage.id) return true;
  if (String(remoteMessage.text || "") !== String(draftMessage.text || "")) return false;
  if (String(remoteMessage.channel || "team") !== String(draftMessage.channel || "team")) return false;
  if (chatMessageAuthorKey(remoteMessage) !== chatMessageAuthorKey(draftMessage)) return false;
  if (chatMessageRecipientKey(remoteMessage) !== chatMessageRecipientKey(draftMessage)) return false;
  if (chatAttachmentSignature(remoteMessage) !== chatAttachmentSignature(draftMessage)) return false;

  const remoteTime = Date.parse(remoteMessage.createdAt || "");
  const draftTime = Date.parse(draftMessage.createdAt || "");
  if (!Number.isFinite(remoteTime) || !Number.isFinite(draftTime)) return false;
  return Math.abs(remoteTime - draftTime) < 120000;
}

function mergeChatMessagesWithDrafts(remoteMessages) {
  const synced = sortChatMessagesByDate(visibleSyncedChatMessages(remoteMessages || []));
  const localOverlays = chatMessages
    .filter(isLocalChatOverlay)
    .filter((draft) => !synced.some((remoteMessage) => messageLooksLikeSavedDraft(remoteMessage, draft)));
  return sortChatMessagesByDate([...synced, ...localOverlays]);
}

function chatMessagesSignature(messages) {
  return (messages || [])
    .map((message) => `${message.id}:${message.createdAt}:${message.text}:${message.localPending ? "p" : ""}${message.localFailed ? "f" : ""}${message.localEchoUntil ? "e" : ""}`)
    .join("|");
}

function renderChatAfterLocalChange(scrollShared = false) {
  renderChatRecipients();
  renderChat();
  if (sharedBoardOpen && typeof renderSharedBoardChat === "function") {
    renderSharedBoardChat();
    if (scrollShared && typeof scrollSharedBoardChatToBottom === "function") scrollSharedBoardChatToBottom();
  }
}

function createOptimisticChatMessage(message) {
  chatOptimisticSeq += 1;
  return {
    ...message,
    id: `local-pending-${Date.now()}-${chatOptimisticSeq}`,
    createdAt: message.createdAt || new Date().toISOString(),
    localPending: true
  };
}

function replaceOptimisticChatMessage(optimisticId, savedMessage) {
  const normalizedSaved = {
    ...savedMessage,
    localPending: false,
    localFailed: false,
    localEchoUntil: Date.now() + CHAT_LOCAL_ECHO_TTL_MS
  };
  const index = chatMessages.findIndex((message) => message.id === optimisticId);
  if (index === -1) {
    if (!chatMessages.some((message) => message.id === normalizedSaved.id)) {
      chatMessages = sortChatMessagesByDate([...chatMessages, normalizedSaved]);
    }
  } else {
    chatMessages = sortChatMessagesByDate(chatMessages.map((message) => (message.id === optimisticId ? normalizedSaved : message)));
  }
  renderChatAfterLocalChange(true);
}

function markOptimisticChatMessageFailed(optimisticId) {
  chatMessages = chatMessages.map((message) => (
    message.id === optimisticId ? { ...message, localPending: false, localFailed: true } : message
  ));
  renderChatAfterLocalChange(true);
}

async function loadChatMessages() {
  if (location.protocol === "file:" || !el.teamChatMessages) return;
  try {
    const aliases = currentChatPersonAliases().join("|");
    const response = await fetch(`/api/messages?allTargets=1&current=${encodeURIComponent(currentChatPersonName())}&aliases=${encodeURIComponent(aliases)}`, { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    if (payload.unstable && chatMessages.length) {
      chatSyncIssueCount += 1;
      return;
    }
    chatSyncIssueCount = 0;
    const remoteMessages = Array.isArray(payload.all)
      ? payload.all
      : (Array.isArray(payload.messages) ? payload.messages : null);
    if (remoteMessages) {
      const nextMessages = mergeChatMessagesWithDrafts(remoteMessages.filter((message) => !isLegacyBotMessage(message)));
      if (chatMessagesSignature(chatMessages) !== chatMessagesSignature(nextMessages)) {
        chatMessages = nextMessages;
        renderChatAfterLocalChange();
      }
    }
  } catch (error) {
    chatSyncIssueCount += 1;
    if (chatSyncIssueCount === 1) renderChat();
  }
}

async function sendChatMessage(event) {
  event.preventDefault();
  const text = el.teamChatInput.value.trim();
  if (!text) return;

  const profile = currentUserProfile || {};
  const currentPerson = currentChatPersonName();
  const icon = currentUserIconSettings(currentPerson);
  const isDirect = activeChatTarget !== "team";
  const message = {
    text,
    channel: isDirect ? "direct" : "team",
    author: {
      id: profile.login || profile.username || persistenceClientId,
      name: profile.displayName || profile.name || profile.username || "Uzytkownik",
      person: currentPerson,
      aliases: currentChatPersonAliases(),
      initials: icon.initials,
      color: icon.color
    },
    recipient: isDirect ? chatRecipientPayload(activeChatTarget) : null,
    projectId: activeProjectId || planningProjectId || selectedProjects()[0]?.id || ""
  };

  const optimisticMessage = createOptimisticChatMessage(message);
  chatMessages = sortChatMessagesByDate([...chatMessages, optimisticMessage]);
  chatLastSeen = optimisticMessage.id;
  markChatSeen(activeChatTarget);
  el.teamChatInput.value = "";
  renderChatAfterLocalChange(true);

  if (location.protocol === "file:") {
    replaceOptimisticChatMessage(optimisticMessage.id, {
      ...message,
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: optimisticMessage.createdAt
    });
    return;
  }

  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error("message rejected");
    const saved = await response.json();
    const savedMessage = saved && saved.message ? saved.message : {
      ...message,
      id: optimisticMessage.id,
      createdAt: optimisticMessage.createdAt
    };
    chatLastSeen = savedMessage.id;
    replaceOptimisticChatMessage(optimisticMessage.id, savedMessage);
    markChatSeen(activeChatTarget);
  } catch (error) {
    el.teamChatStatus.textContent = "nie wyslano";
    markOptimisticChatMessageFailed(optimisticMessage.id);
    el.teamChatInput.value = text;
  }
}

async function sendChatMessageFromMain(event) {
  event.preventDefault();
  const text = el.teamChatInput.value.trim();
  if (!text || location.protocol === "file:") return;
  el.teamChatInput.value = "";
  const ok = await sendChatText(text);
  if (!ok) {
    el.teamChatStatus.textContent = "nie wyslano";
    el.teamChatInput.value = text;
  }
}

async function sendChatPathLink() {
  if (!el.teamChatInput) return;
  const original = el.teamChatInput.value.trim();
  const pathValue = original.replace(/^['"]|['"]$/g, "").trim();
  const isPath = /^(?:[a-z]:[\\/]|\\\\|file:\/\/)/i.test(pathValue);
  if (!isPath) {
    el.teamChatStatus.textContent = "wklej sciezke do pliku lub folderu";
    el.teamChatInput.focus();
    return;
  }
  if (location.protocol === "file:") return;
  const name = pathValue.split(/[\\/]+/).filter(Boolean).at(-1) || pathValue;
  el.teamChatInput.value = "";
  const ok = await sendChatText(pathValue, { type: "path", path: pathValue, name });
  if (!ok) {
    el.teamChatStatus.textContent = "nie wyslano linku";
    el.teamChatInput.value = original;
  }
}

async function sendChatMessageFromBoard(event) {
  event.preventDefault();
  const text = el.sharedBoardChatInput.value.trim();
  if (!text || location.protocol === "file:") return;
  el.sharedBoardChatInput.value = "";
  const ok = await sendChatText(text);
  if (ok) {
    renderSharedBoardChat();
    scrollSharedBoardChatToBottom();
  }
  if (!ok) {
    el.sharedBoardStatus.textContent = "nie wyslano komentarza";
    el.sharedBoardChatInput.value = text;
  }
}

async function sendChatText(text, attachment = null) {
  const profile = currentUserProfile || {};
  const currentPerson = currentChatPersonName();
  const icon = currentUserIconSettings(currentPerson);
  const isDirect = activeChatTarget !== "team";
  const message = {
    text,
    channel: isDirect ? "direct" : "team",
    author: {
      id: profile.login || profile.username || persistenceClientId,
      name: profile.displayName || profile.name || profile.username || "Uzytkownik",
      person: currentPerson,
      aliases: currentChatPersonAliases(),
      initials: icon.initials,
      color: icon.color
    },
    recipient: isDirect ? chatRecipientPayload(activeChatTarget) : null,
    projectId: activeProjectId || planningProjectId || selectedProjects()[0]?.id || "",
    board: sharedBoardOpen,
    attachment
  };

  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error("message rejected");
    const saved = await response.json();
    chatMessages.push(saved.message);
    chatLastSeen = saved.message.id;
    markChatSeen(activeChatTarget);
    renderChatRecipients();
    renderChat();
    return true;
  } catch {
    return false;
  }
}

async function sendChatImageFromFile(file) {
  const imageData = await readFileAsDataUrl(file);
  const ok = await sendChatText("screen", {
    type: "image",
    name: file.name || "screen.png",
    imageData
  });
  if (!ok) el.teamChatStatus.textContent = "nie wyslano obrazu";
}

async function clearActiveChatHistory() {
  if (location.protocol === "file:") return;
  const target = activeChatTarget;
  const label = target === "team" ? "czat biura" : `rozmowe z ${target}`;
  const confirmed = await showAppConfirm({
    title: "Historia rozmow",
    message: `Usunac ${label}?`,
    detail: "Znikna wiadomosci i wspolna tablica tej rozmowy. Projekty, zadania i zlecenia zostana bez zmian.",
    confirmText: "Usun historie",
    cancelText: "Zostaw"
  });
  if (!confirmed) return;

  const targetKey = chatTargetKey(target);
  chatDeletedBeforeByTarget[targetKey] = new Date().toISOString();
  saveChatDeletedState();
  replaceChatTargetMessages(target, []);
  chatMessages = chatMessages.filter((message) => !chatMessageMatchesTarget(message, target, { looseDirect: true }) && !chatMessageIsLocallyCleared(message));
  chatSeenByTarget[targetKey] = "";
  saveChatSeenState();
  chatLastSeen = "";
  renderChatRecipients();
  renderChat();

  try {
    const aliases = currentChatPersonAliases().join("|");
    const response = await fetch(`/api/messages?target=${encodeURIComponent(target)}&current=${encodeURIComponent(currentChatPersonName())}&aliases=${encodeURIComponent(aliases)}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("delete failed");
    const payload = await response.json();
    if (Array.isArray(payload.all)) chatMessages = visibleSyncedChatMessages(payload.all);
    replaceChatTargetMessages(target, []);
    chatMessages = chatMessages.filter((message) => !chatMessageMatchesTarget(message, target, { looseDirect: true }) && !chatMessageIsLocallyCleared(message));
    chatSeenByTarget[targetKey] = "";
    saveChatSeenState();
    chatLastSeen = "";
    sharedBoard = { imageData: "", strokes: [], revision: 0 };
    await prepareSharedBoardImage();
    drawSharedBoard();
    renderChatRecipients();
    renderChat();
  } catch {
    replaceChatTargetMessages(target, []);
    chatMessages = chatMessages.filter((message) => !chatMessageMatchesTarget(message, target, { looseDirect: true }) && !chatMessageIsLocallyCleared(message));
    chatLastSeen = chatSeenByTarget[targetKey] || "";
    renderChatRecipients();
    renderChat();
    el.teamChatStatus.textContent = "historia ukryta lokalnie";
  }
}

function visibleSyncedChatMessages(messages) {
  return (Array.isArray(messages) ? messages : []).filter((message) => !chatMessageIsLocallyCleared(message));
}

function chatMessageIsLocallyCleared(message) {
  return Object.entries(chatDeletedBeforeByTarget || {}).some(([targetKey, cutoff]) => {
    if (!cutoff || !message?.createdAt) return false;
    const target = targetKey === "team" ? "team" : targetKey.replace(/^direct:/, "");
    return String(message.createdAt) <= String(cutoff) &&
      chatMessageMatchesTarget(message, target, { looseDirect: true });
  });
}

function chatMessageMatchesTarget(message, target = activeChatTarget, options = {}) {
  target = normalizeChatTarget(target);
  if (target === "team") return (message.channel || "team") === "team";
  if (message.channel !== "direct") return false;
  const aliases = currentChatPersonAliases();
  const targetAliases = chatTargetAliases(target);
  if ((participantMatchesAliases(message.author, aliases) && participantMatchesAliases(message.recipient, targetAliases)) ||
    (participantMatchesAliases(message.author, targetAliases) && participantMatchesAliases(message.recipient, aliases))) return true;
  return Boolean(options.looseDirect) &&
    (participantMatchesAliases(message.author, targetAliases) || participantMatchesAliases(message.recipient, targetAliases));
}

function replaceChatTargetMessages(target, nextMessages) {
  const keep = chatMessages.filter((message) => !chatMessageMatchesTarget(message, target));
  const known = new Set(keep.map((message) => message.id));
  const incoming = nextMessages.filter((message) => !known.has(message.id));
  chatMessages = [...keep, ...incoming].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

function setChatOpen(open) {
  if (!open) rememberChatPanelSize();
  chatOpen = open;
  if (!el.teamChat) return;
  applyChatPanelSize();
  el.teamChat.classList.toggle("collapsed", !chatOpen);
  el.teamChat.classList.remove("hidden");
  el.topbarChatBtn?.classList.toggle("active", chatOpen);
  el.topbarChatBtn?.setAttribute("aria-pressed", chatOpen ? "true" : "false");
  if (chatOpen) {
    markChatSeen(activeChatTarget);
    renderChat();
    setTimeout(() => el.teamChatInput?.focus(), 50);
  }
}

function applyChatPanelSize() {
  if (!el.teamChat) return;
  el.teamChat.style.setProperty("--chat-width", `${clamp(chatPanelSize.width, 280, 900)}px`);
  el.teamChat.style.setProperty("--chat-height", `${clamp(chatPanelSize.height, 320, 900)}px`);
}

function setupChatResizeObserver() {
  if (!el.teamChat || chatResizeObserver || typeof ResizeObserver === "undefined") return;
  chatResizeObserver = new ResizeObserver(() => {
    if (!chatOpen) return;
    window.requestAnimationFrame(rememberChatPanelSize);
  });
  chatResizeObserver.observe(el.teamChat);
}

function rememberChatPanelSize() {
  if (!el.teamChat || !chatOpen) return;
  const rect = el.teamChat.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (!width || !height) return;
  const next = {
    width: clamp(width, 280, 900),
    height: clamp(height, 320, 900)
  };
  if (next.width === chatPanelSize.width && next.height === chatPanelSize.height) return;
  chatPanelSize = next;
  applyChatPanelSize();
  persistUserState();
}

function startChatPanelResize(event) {
  if (!el.teamChat || !chatOpen) return;
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = chatPanelSize.width;
  const startHeight = chatPanelSize.height;
  const pointerId = event.pointerId;
  el.teamChatResize?.setPointerCapture?.(pointerId);

  const move = (moveEvent) => {
    chatPanelSize = {
      width: clamp(startWidth + (startX - moveEvent.clientX), 280, 900),
      height: clamp(startHeight + (startY - moveEvent.clientY), 320, 900)
    };
    applyChatPanelSize();
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    el.teamChatResize?.releasePointerCapture?.(pointerId);
    rememberChatPanelSize();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function renderChatLegacy() {
  if (!el.teamChatMessages) return;
  el.teamChatStatus.textContent = chatMessages.length ? `${chatMessages.length} wiadomości` : "wspólny czat";
  el.teamChatMessages.innerHTML = chatMessages.length
    ? chatMessages.slice(-80).map(chatMessageHtml).join("")
    : `<div class="team-chat-empty">Brak wiadomości.</div>`;
  el.teamChatMessages.scrollTop = el.teamChatMessages.scrollHeight;

  const lastSeenIndex = chatMessages.findIndex((message) => message.id === chatLastSeen);
  const unread = chatOpen ? 0 : Math.max(0, chatMessages.length - (lastSeenIndex + 1 || 0));
  updateChatUnreadBadge(unread);
  if (chatOpen) chatLastSeen = chatMessages.at(-1)?.id || chatLastSeen;
}

function renderChat() {
  if (!el.teamChatMessages) return;
  const visible = visibleChatMessages();
  const activelyViewed = chatIsActivelyViewed();
  if (activelyViewed) markChatSeen(activeChatTarget);
  const lastSeen = chatSeenByTarget[chatTargetKey()] || "";
  el.teamChatStatus.textContent = activeChatTarget === "team"
    ? (visible.length ? `${visible.length} wiadomosci` : "wspolny czat")
    : `rozmowa z ${activeChatTarget}`;
  el.teamChatMessages.innerHTML = visible.length
    ? visible.slice(-80).map((message) => chatMessageHtml(message, visible, lastSeen)).join("")
    : `<div class="team-chat-empty">Brak wiadomosci.</div>`;
  el.teamChatMessages.scrollTop = el.teamChatMessages.scrollHeight;

  chatLastSeen = lastSeen;
  updateChatUnreadBadge(totalUnreadChatCount());
  renderChatRecipients();
  if (sharedBoardOpen) renderSharedBoardChat();
}

function chatIsActivelyViewed() {
  return Boolean(chatOpen && document.visibilityState !== "hidden" && document.hasFocus());
}

function updateChatUnreadBadge(unread, forceHost = false) {
  const normalizedUnread = Math.max(0, Number(unread) || 0);
  const showBadge = chatNotifyBadge && normalizedUnread > 0;
  [el.teamChatUnread, el.topbarChatUnread].forEach((badge) => {
    if (!badge) return;
    badge.textContent = normalizedUnread;
    badge.classList.toggle("hidden", !showBadge);
  });
  document.body.classList.toggle("chat-has-unread", showBadge);
  notifyHostChatUnread(normalizedUnread, forceHost);
}

function unreadCountForChatTarget(target) {
  const visible = chatMessagesForTarget(target);
  const lastSeen = chatSeenByTarget[chatTargetKey(target)] || "";
  const lastSeenIndex = visible.findIndex((message) => message.id === lastSeen);
  const unseen = visible.slice(lastSeenIndex >= 0 ? lastSeenIndex + 1 : 0);
  return unseen.filter((message) => !chatMessageAuthoredByCurrent(message)).length;
}

function chatMessageAuthoredByCurrent(message) {
  return participantMatchesAliases(message?.author, currentChatPersonAliases());
}

function chatMessagesForTarget(target) {
  if (target === "team") {
    return chatMessages.filter((message) => (message.channel || "team") === "team");
  }

  return chatMessages.filter((message) => chatMessageMatchesTarget(message, target));
}

function chatTargetsWithMessages() {
  const aliases = currentChatPersonAliases();
  const targets = new Set(["team"]);

  chatMessages.forEach((message) => {
    if (isLegacyBotMessage(message)) return;
    if ((message.channel || "team") === "team") {
      targets.add("team");
      return;
    }
    if (message.channel !== "direct") return;
    if (participantMatchesAliases(message.author, aliases)) {
      const target = participantAliases(message.recipient).find((value) => !samePerson(value, currentChatPersonName()));
      if (target) targets.add(normalizeChatTarget(target));
    }
    if (participantMatchesAliases(message.recipient, aliases)) {
      const target = participantAliases(message.author).find((value) => !samePerson(value, currentChatPersonName()));
      if (target) targets.add(normalizeChatTarget(target));
    }
  });

  if (activeChatTarget) targets.add(normalizeChatTarget(activeChatTarget));

  return [...targets];
}

function totalUnreadChatCount() {
  return chatMessages.reduce((sum, message) => {
    if (chatMessageAuthoredByCurrent(message)) return sum;
    const target = chatTargetForIncomingMessage(message);
    if (!target) return sum;
    const visible = chatMessagesForTarget(target);
    const lastSeen = chatSeenByTarget[chatTargetKey(target)] || "";
    const lastSeenIndex = visible.findIndex((item) => item.id === lastSeen);
    const messageIndex = visible.findIndex((item) => item.id === message.id);
    return sum + (messageIndex >= 0 && messageIndex > lastSeenIndex ? 1 : 0);
  }, 0);
}

function chatTargetForIncomingMessage(message) {
  if ((message?.channel || "team") === "team") return "team";
  if (message?.channel !== "direct") return "";
  const aliases = currentChatPersonAliases();
  if (participantMatchesAliases(message.recipient, aliases)) {
    return normalizeChatTarget(participantAliases(message.author).find((value) => !samePerson(value, currentChatPersonName())) || "");
  }
  if (participantMatchesAliases(message.author, aliases)) {
    return normalizeChatTarget(participantAliases(message.recipient).find((value) => !samePerson(value, currentChatPersonName())) || "");
  }
  return "";
}

function notifyHostChatUnread(unread, force = false) {
  const normalizedUnread = Math.max(0, Number(unread) || 0);
  const shouldNotifyHost = chatNotifyBadge || chatNotifyFlash;
  if (!shouldNotifyHost || normalizedUnread === 0) {
    if (lastHostChatUnread !== 0 || force) postHostMessage("chat-read", { unread: 0 });
    lastHostChatUnread = normalizedUnread;
    return;
  }

  if (normalizedUnread !== lastHostChatUnread || force) {
    postHostMessage("chat-unread", {
      unread: normalizedUnread,
      badge: chatNotifyBadge,
      flash: chatNotifyFlash
    });
  }
  lastHostChatUnread = normalizedUnread;
}

function postHostMessage(type, payload = {}) {
  try {
    window.chrome?.webview?.postMessage({ type, ...payload });
  } catch {
    // Browser preview without WebView host.
  }
}

function chatTargetKey(target = activeChatTarget) {
  target = normalizeChatTarget(target);
  return target === "team" ? "team" : `direct:${target}`;
}

function loadChatSeenState() {
  try {
    chatSeenByTarget = JSON.parse(localStorage.getItem("zk-planer-chat-seen") || "{}") || {};
  } catch {
    chatSeenByTarget = {};
  }
}

function saveChatSeenState() {
  try {
    localStorage.setItem("zk-planer-chat-seen", JSON.stringify(chatSeenByTarget));
  } catch {
    // Local storage can be unavailable in restricted views.
  }
  if (persistenceReady && location.protocol !== "file:") {
    clearTimeout(userStateTimer);
    userStateTimer = setTimeout(() => persistUserState(), 150);
  }
}

function loadChatDeletedState() {
  try {
    chatDeletedBeforeByTarget = JSON.parse(localStorage.getItem("zk-planer-chat-cleared") || "{}") || {};
  } catch {
    chatDeletedBeforeByTarget = {};
  }
}

function saveChatDeletedState() {
  try {
    localStorage.setItem("zk-planer-chat-cleared", JSON.stringify(chatDeletedBeforeByTarget));
  } catch {
    // Local storage can be unavailable in restricted views.
  }
  if (persistenceReady && location.protocol !== "file:") {
    clearTimeout(userStateTimer);
    userStateTimer = setTimeout(() => persistUserState(), 150);
  }
}

function markChatSeen(target = activeChatTarget) {
  const visible = visibleChatMessages();
  const last = visible.at(-1)?.id || "";
  if (!last) return;
  chatSeenByTarget[chatTargetKey(target)] = last;
  chatLastSeen = last;
  saveChatSeenState();
}

function visibleChatMessages() {
  if (activeChatTarget === "team") {
    return chatMessages.filter((message) => (message.channel || "team") === "team");
  }

  const aliases = currentChatPersonAliases();
  const targetAliases = chatTargetAliases(activeChatTarget);
  return chatMessages.filter((message) => {
    if (message.channel !== "direct") return false;
    return (participantMatchesAliases(message.author, aliases) && participantMatchesAliases(message.recipient, targetAliases)) ||
      (participantMatchesAliases(message.author, targetAliases) && participantMatchesAliases(message.recipient, aliases));
  });
}

function currentChatPersonName() {
  const profile = currentUserProfile || {};
  return profile.assigneeName || profile.displayName || profile.fullName || profile.name || profile.firstName || profile.username || profile.login || "Uzytkownik";
}

function currentChatPersonAliases() {
  const profile = currentUserProfile || {};
  return uniqueTextValues([
    currentChatPersonName(),
    profile.assigneeName,
    profile.displayName,
    profile.fullName,
    profile.name,
    profile.firstName,
    profile.username,
    profile.login
  ]);
}

function chatMessageUnreadInView(message, visible, lastSeen) {
  if (chatMessageAuthoredByCurrent(message)) return false;
  const lastSeenIndex = visible.findIndex((item) => item.id === lastSeen);
  const messageIndex = visible.findIndex((item) => item.id === message.id);
  return messageIndex >= 0 && messageIndex > lastSeenIndex;
}

function chatMessageHtml(message, visible = visibleChatMessages(), lastSeen = chatSeenByTarget[chatTargetKey()] || "") {
  const author = message.author || {};
  const authorProfile = chatParticipantProfile(author);
  const created = message.createdAt ? new Date(message.createdAt) : new Date();
  const unread = chatMessageUnreadInView(message, visible, lastSeen);
  return `
    <article class="team-chat-message ${unread ? "is-unread" : "is-read"}">
      ${avatarHtml(authorProfile)}
      <div>
        <header>
          <strong>${escapeHtml(authorProfile.label)}</strong>
          <time>${formatChatTime(created)}</time>
        </header>
        ${message.attachment?.type === "path" ? chatPathLinkHtml(message) : `<p>${linkMentions(escapeHtml(message.text || ""))}</p>`}
        ${message.attachment?.type === "image" ? chatImageHtml(message) : ""}
      </div>
    </article>
  `;
}

function chatPathLinkHtml(message) {
  const attachment = message.attachment || {};
  const pathValue = attachment.path || message.text || "";
  const label = attachment.name || pathValue;
  const encodedPath = encodeURIComponent(pathValue);
  return `<div class="chat-path-link" title="${escapeAttr(pathValue)}"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(pathValue)}</small></div><span class="chat-path-actions"><button type="button" data-chat-path="${encodedPath}" data-chat-path-action="open" title="Otworz plik" aria-label="Otworz plik">📄</button><button type="button" data-chat-path="${encodedPath}" data-chat-path-action="folder" title="Otworz folder pliku" aria-label="Otworz folder pliku">📁</button></span></div>`;
}

function chatImageHtml(message) {
  return `
    <button class="chat-image" type="button" data-chat-image="${escapeHtml(message.id)}" title="Otworz obraz i nanies uwagi">
      <img src="${message.attachment.imageData}" alt="${escapeHtml(message.attachment.name || "screen")}" />
      <span>Otworz i rysuj</span>
    </button>
  `;
}

function formatChatTime(date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function linkMentions(text) {
  return text.replace(/@([\p{L}\d._-]+)/gu, `<span class="chat-mention">@$1</span>`);
}

async function openSharedBoard() {
  sharedBoardOpen = true;
  el.sharedBoard.classList.remove("hidden");
  await loadSharedBoard(true);
  drawSharedBoard();
  renderSharedBoardChat();
  startSharedBoardLiveSync();
}

async function openChatImageOnBoard(event) {
  const button = event.target?.closest?.("[data-chat-image]");
  if (!button) return;
  const message = chatMessages.find((item) => item.id === button.dataset.chatImage);
  const imageData = message?.attachment?.imageData;
  if (!imageData) return;
  sharedBoard = {
    imageData,
    strokes: [],
    revision: sharedBoard.revision || 0,
    sourceMessageId: message.id,
    liveStroke: null,
    liveAuthor: ""
  };
  sharedBoardOpen = true;
  el.sharedBoard.classList.remove("hidden");
  await prepareSharedBoardImage();
  drawSharedBoard();
  renderSharedBoardChat();
  startSharedBoardLiveSync();
}

async function openChatPathLink(event) {
  const button = event.target?.closest?.("[data-chat-path]");
  if (!button) return;
  const pathValue = decodeURIComponent(button.dataset.chatPath || "");
  const openParent = button.dataset.chatPathAction === "folder";
  if (!pathValue || location.protocol === "file:") return;
  try {
    const response = await fetch("/api/open-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathValue, openParent })
    });
    if (!response.ok) throw new Error("open failed");
  } catch {
    if (el.teamChatStatus) el.teamChatStatus.textContent = "nie znaleziono pliku lub folderu";
  }
}

document.addEventListener("click", openChatPathLink);

function closeSharedBoard() {
  if (sharedBoardDrawing) {
    finishBoardStroke();
  } else if (sharedBoard.liveStroke && sharedBoard.liveAuthor === currentChatPersonName()) {
    sharedBoard.liveStroke = null;
    sharedBoard.liveAuthor = "";
    saveSharedBoard({ liveStroke: null, liveAuthor: "" });
  }
  stopSharedBoardLiveSync();
  sharedBoardOpen = false;
  el.sharedBoard.classList.add("hidden");
}

async function loadSharedBoard(force = false) {
  if (location.protocol === "file:" || !el.sharedBoardCanvas) return;
  if (sharedBoardDrawing && !force) return;
  try {
    const response = await fetch(`/api/board?channel=${encodeURIComponent(boardChannelKey())}&revision=${sharedBoard.revision || 0}`, { cache: "no-store" });
    if (!response.ok) return;
    const board = await response.json();
    if (!force && Number(board.revision || 0) <= Number(sharedBoard.revision || 0)) return;
    const previousSourceMessageId = sharedBoard.sourceMessageId || "";
    sharedBoard = {
      imageData: board.imageData || "",
      strokes: Array.isArray(board.strokes) ? board.strokes : [],
      revision: Number(board.revision || 0),
      clearToken: board.clearToken || "",
      sourceMessageId: board.sourceMessageId || previousSourceMessageId,
      liveStroke: board.liveStroke && typeof board.liveStroke === "object" ? board.liveStroke : null,
      liveAuthor: board.liveAuthor || ""
    };
    await prepareSharedBoardImage();
    drawSharedBoard();
  } catch {
    if (el.sharedBoardStatus) el.sharedBoardStatus.textContent = "brak synchronizacji tablicy";
  }
}

function loadSharedBoardImageFromFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  setSharedBoardImageFromFile(file);
  event.target.value = "";
}

function pasteSharedBoardImage(event) {
  const item = [...(event.clipboardData?.items || [])].find((entry) => entry.type.startsWith("image/"));
  if (!item) return;
  const file = item.getAsFile();
  if (!file) return;
  event.preventDefault();
  if (sharedBoardOpen) {
    setSharedBoardImageFromFile(file);
  } else if (document.activeElement === el.teamChatInput) {
    sendChatImageFromFile(file);
  }
}

function setSharedBoardImageFromFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", async () => {
    sharedBoard = {
      imageData: String(reader.result || ""),
      strokes: [],
      revision: sharedBoard.revision || 0,
      clearToken: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      liveStroke: null,
      liveAuthor: ""
    };
    await prepareSharedBoardImage();
    drawSharedBoard();
    await saveSharedBoard({ replaceStrokes: true, liveStroke: null, liveAuthor: "" });
  });
  reader.readAsDataURL(file);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

async function readClipboardImageData() {
  if (!navigator.clipboard?.read) {
    void zkAlert("Nie ma dostępu do schowka. Użyj przycisku obrazka i wybierz plik albo wklej zrzut ekranu w oknie tablicy.");
    return "";
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith("image/"));
      if (!imageType) continue;
      const blob = await item.getType(imageType);
      return await readFileAsDataUrl(blob);
    }
    void zkAlert("W schowku nie ma obrazu. Zrób zrzut ekranu i spróbuj ponownie.");
  } catch {
    void zkAlert("Nie udało się odczytać obrazu ze schowka. Windows albo przeglądarka mogły zablokować dostęp.");
  }
  return "";
}

function prepareSharedBoardImage() {
  return new Promise((resolve) => {
    if (!sharedBoard.imageData) {
      sharedBoardImage = null;
      resolve();
      return;
    }
    const image = new Image();
    image.onload = () => {
      sharedBoardImage = image;
      resolve();
    };
    image.onerror = () => {
      sharedBoardImage = null;
      resolve();
    };
    image.src = sharedBoard.imageData;
  });
}

function drawSharedBoard() {
  if (!el.sharedBoardCanvas) return;
  const canvas = el.sharedBoardCanvas;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4f8fa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (sharedBoardImage) {
    const fit = containRect(sharedBoardImage.width, sharedBoardImage.height, canvas.width, canvas.height);
    ctx.drawImage(sharedBoardImage, fit.x, fit.y, fit.width, fit.height);
  }

  sharedBoard.strokes.forEach((stroke) => drawBoardStroke(ctx, stroke));
  if (sharedBoard.liveStroke && sharedBoard.liveStroke.id !== sharedBoardDrawing?.id) {
    drawBoardStroke(ctx, sharedBoard.liveStroke);
  }
  if (sharedBoardDrawing) drawBoardStroke(ctx, sharedBoardDrawing);
  const liveStrokeVisible = Boolean(sharedBoard.liveStroke && sharedBoard.liveStroke.id !== sharedBoardDrawing?.id);
  const hasBoardContent = Boolean(sharedBoard.imageData || sharedBoard.strokes.length || sharedBoardDrawing || liveStrokeVisible);
  el.sharedBoardEmpty.classList.toggle("hidden", hasBoardContent);
  const strokeCount = sharedBoard.strokes.length + (liveStrokeVisible ? 1 : 0);
  el.sharedBoardStatus.textContent = sharedBoard.imageData
    ? `${strokeCount} uwag na obrazie`
    : strokeCount
      ? `${strokeCount} kresek na bialej kartce`
      : "biala kartka gotowa do rysowania";
}

function containRect(sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2,
    y: (targetHeight - height) / 2,
    width,
    height
  };
}

function drawBoardStroke(ctx, stroke) {
  const points = stroke.points || [];
  if (points.length < 2) return;
  const first = points[0];
  const last = points[points.length - 1];
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color || "#ff3b30";
  ctx.lineWidth = stroke.width || 4;
  ctx.beginPath();
  if (stroke.tool === "line") {
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(last.x, last.y);
  } else if (stroke.tool === "circle") {
    const radius = Math.max(2, Math.hypot(last.x - first.x, last.y - first.y));
    ctx.arc(first.x, first.y, radius, 0, Math.PI * 2);
  } else {
    ctx.moveTo(first.x, first.y);
    points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  }
  ctx.stroke();
  ctx.restore();
}

function setSharedBoardTool(tool) {
  sharedBoardTool = ["pen", "line", "circle"].includes(tool) ? tool : "pen";
  el.sharedBoardTools?.forEach((button) => {
    button.classList.toggle("active", button.dataset.boardTool === sharedBoardTool);
  });
}

function boardPoint(event) {
  const rect = el.sharedBoardCanvas.getBoundingClientRect();
  return {
    x: Math.round(((event.clientX - rect.left) / rect.width) * el.sharedBoardCanvas.width),
    y: Math.round(((event.clientY - rect.top) / rect.height) * el.sharedBoardCanvas.height)
  };
}

function startBoardStroke(event) {
  if (!sharedBoardOpen) return;
  el.sharedBoardCanvas.setPointerCapture?.(event.pointerId);
  sharedBoardDrawing = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    author: currentChatPersonName(),
    tool: sharedBoardTool,
    color: el.sharedBoardColor.value || "#ff3b30",
    width: 4,
    points: [boardPoint(event)]
  };
  sharedBoard.liveStroke = sharedBoardDrawing;
  sharedBoard.liveAuthor = sharedBoardDrawing.author;
  drawSharedBoard();
  queueSharedBoardLiveSave();
}

function extendBoardStroke(event) {
  if (!sharedBoardDrawing) return;
  sharedBoardDrawing.points.push(boardPoint(event));
  sharedBoard.liveStroke = sharedBoardDrawing;
  sharedBoard.liveAuthor = sharedBoardDrawing.author;
  drawSharedBoard();
  queueSharedBoardLiveSave();
}

async function finishBoardStroke() {
  if (!sharedBoardDrawing) return;
  if (sharedBoardSaveTimer) {
    clearTimeout(sharedBoardSaveTimer);
    sharedBoardSaveTimer = null;
  }
  if (sharedBoardDrawing.points.length > 1) {
    const finishedStroke = sharedBoardDrawing;
    sharedBoard.strokes.push(finishedStroke);
    sharedBoardDrawing = null;
    sharedBoard.liveStroke = null;
    sharedBoard.liveAuthor = "";
    drawSharedBoard();
    await saveSharedBoard({ strokes: [finishedStroke], liveStroke: null, liveAuthor: "" });
    return;
  }
  sharedBoardDrawing = null;
  sharedBoard.liveStroke = null;
  sharedBoard.liveAuthor = "";
  drawSharedBoard();
  await saveSharedBoard({ liveStroke: null, liveAuthor: "" });
}

async function clearSharedBoardStrokes() {
  if (!sharedBoard.strokes.length && !sharedBoardDrawing && !sharedBoard.liveStroke) return;
  if (!await zkConfirm("Wyczyścić wszystkie kreski z tablicy?", { danger: true })) return;
  sharedBoard.strokes = [];
  sharedBoard.liveStroke = null;
  sharedBoard.liveAuthor = "";
  sharedBoard.clearToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  drawSharedBoard();
  await saveSharedBoard({ replaceStrokes: true, liveStroke: null, liveAuthor: "" });
}

async function saveSharedBoard(options = {}) {
  if (location.protocol === "file:") return;
  const replaceStrokes = Boolean(options.replaceStrokes);
  const payload = {
    imageData: sharedBoard.imageData || "",
    strokes: replaceStrokes
      ? (Array.isArray(sharedBoard.strokes) ? sharedBoard.strokes : [])
      : (Array.isArray(options.strokes) ? options.strokes : []),
    replaceStrokes,
    clearToken: sharedBoard.clearToken || "",
    sourceMessageId: sharedBoard.sourceMessageId || "",
    liveStroke: Object.prototype.hasOwnProperty.call(options, "liveStroke") ? options.liveStroke : (sharedBoard.liveStroke || null),
    liveAuthor: Object.prototype.hasOwnProperty.call(options, "liveAuthor") ? options.liveAuthor : (sharedBoard.liveAuthor || "")
  };
  try {
    const response = await fetch(`/api/board?channel=${encodeURIComponent(boardChannelKey())}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const saved = await response.json().catch(() => ({}));
    if (Number.isFinite(saved.revision)) sharedBoard.revision = saved.revision;
  } catch {
    if (el.sharedBoardStatus) el.sharedBoardStatus.textContent = "nie zapisano tablicy";
  }
}

function queueSharedBoardLiveSave() {
  if (location.protocol === "file:" || !sharedBoardOpen || !sharedBoardDrawing) return;
  if (sharedBoardSaveTimer) clearTimeout(sharedBoardSaveTimer);
  sharedBoardSaveTimer = setTimeout(() => {
    sharedBoardSaveTimer = null;
    saveSharedBoard({
      liveStroke: sharedBoardDrawing,
      liveAuthor: sharedBoardDrawing?.author || currentChatPersonName()
    });
  }, 180);
}

function startSharedBoardLiveSync() {
  stopSharedBoardLiveSync();
  sharedBoardSyncTimer = setInterval(() => {
    if (!sharedBoardOpen) return;
    loadSharedBoard();
    loadChatMessages().then(() => {
      if (sharedBoardOpen) renderSharedBoardChat();
    });
  }, 1000);
}

function stopSharedBoardLiveSync() {
  if (sharedBoardSyncTimer) {
    clearInterval(sharedBoardSyncTimer);
    sharedBoardSyncTimer = null;
  }
  if (sharedBoardSaveTimer) {
    clearTimeout(sharedBoardSaveTimer);
    sharedBoardSaveTimer = null;
  }
}

function boardChannelKey() {
  return chatTargetKey().replace(/[^a-z0-9_-]+/gi, "_");
}

async function sendSharedBoardSnapshot() {
  if (!el.sharedBoardCanvas) return;
  if (!sharedBoard.imageData && !sharedBoard.strokes.length) {
    el.sharedBoardStatus.textContent = "najpierw narysuj cos na tablicy";
    return;
  }
  const output = document.createElement("canvas");
  output.width = el.sharedBoardCanvas.width;
  output.height = el.sharedBoardCanvas.height;
  const ctx = output.getContext("2d");
  ctx.drawImage(el.sharedBoardCanvas, 0, 0);
  const imageData = output.toDataURL("image/png");
  const ok = await sendChatText("uwagi na screenie", {
    type: "image",
    name: "uwagi.png",
    imageData,
    sourceMessageId: sharedBoard.sourceMessageId || ""
  });
  el.sharedBoardStatus.textContent = ok ? "odeslano obraz z uwagami" : "nie odeslano obrazu";
}

function renderSharedBoardChat() {
  if (!el.sharedBoardChat) return;
  const visible = visibleChatMessages().slice(-12);
  el.sharedBoardChat.innerHTML = visible.length
    ? visible.map(chatMessageHtml).join("")
    : `<div class="team-chat-empty">Brak wiadomosci w tej rozmowie.</div>`;
  scrollSharedBoardChatToBottom();
}

function scrollSharedBoardChatToBottom() {
  if (!el.sharedBoardChat) return;
  requestAnimationFrame(() => {
    el.sharedBoardChat.scrollTop = el.sharedBoardChat.scrollHeight;
  });
}

async function loadLocalProfile() {
  if (location.protocol === "file:") return;
  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) return;
    const profile = await response.json();
    currentUserProfile = profile;
    syncCurrentUserIconControls();
    registerCurrentUserAsEmployee();
    renderCurrentUserBadge();
    const knownPeople = peopleList();
    const preferredPerson = profile.assigneeName || profile.displayName || profile.fullName || profile.firstName;
    if (preferredPerson && knownPeople.includes(preferredPerson)) {
      personFilter = preferredPerson;
    }
    schedulePersist();
  } catch (error) {
    currentUserProfile = null;
  }
}

function bindUndoShortcuts() {
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
      event.preventDefault();
      restoreUndoSnapshot();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (isUndoTrackedTarget(event.target)) saveUndoSnapshot();
  }, true);
  document.addEventListener("click", (event) => {
    if (isUndoTrackedTarget(event.target)) saveUndoSnapshot();
  }, true);
  document.addEventListener("change", (event) => {
    if (isUndoTrackedTarget(event.target)) saveUndoSnapshot();
  }, true);
  document.addEventListener("input", (event) => {
    if (isUndoTrackedTarget(event.target)) saveUndoSnapshot();
  }, true);
}

function isUndoTrackedTarget(target) {
  if (undoRestoring || !target?.closest) return false;
  return Boolean(target.closest(`
    [data-assignment-person],
    [data-assignment-existing-field],
    [data-assignment-existing-delete],
    [data-assignment-handle],
    [data-assignment-order],
    [data-assignment-popover-field],
    [data-leave-day],
    [data-delete-leave],
    #leaveSaveBtn,
    #leaveClearSelection,
    [data-popover-field],
    [data-stage-date],
    [data-forecast-date],
    [data-task-date],
    [data-task-title],
    [data-task-description],
    [data-task-reminder],
    [data-dn-task],
    [data-dn-stage],
    [data-dn-task-handle],
    [data-dn-stage-handle],
    [data-complete-task],
    [data-add-order],
    [data-delete-order],
    [data-order-card],
    [data-order-drop],
    [data-order-title],
    [data-order-description],
    [data-order-assignee],
    [data-order-due],
    [data-order-hours],
    [data-order-image],
    [data-order-clipboard],
    [data-remove-order-image],
    [data-order-check],
    [data-letter-link],
    [data-add-check],
    [data-delete-check],
    [data-check-title],
    [data-check-image],
    [data-check-clipboard],
    [data-remove-check-image],
    [data-quick-due],
    #priorityHighLimit,
    #priorityMediumLimit,
    .assignment-draft-card
  `));
}

function createUndoSnapshot() {
  return {
    projects: cloneForUndo(projects),
    activeTaskKey,
    dnExpanded,
    dnSelection: cloneForUndo(dnSelection),
    dnExpandedStages: [...dnExpandedStages],
    dnExpandedStagesByProject: cloneForUndo(dnExpandedStagesByProject),
    dnExpandedTasks: [...dnExpandedTasks],
    dnExpandedTasksByProject: cloneForUndo(dnExpandedTasksByProject),
    dnGanttMaximized,
    activeProjectId,
    dnShowForecast,
    activeOrderIndex,
    dashboardCompact,
    previewCollapsed,
    previewPanelWidth,
    previewExpandedStages: cloneForUndo(previewExpandedStages),
    personFilter,
    dashboardRange,
    dashboardMode,
    planningProjectId,
    selectedAssignmentKey,
    assignmentViewStart,
    assignmentViewEnd,
    assignmentManualWindow,
    datePopover: cloneForUndo(datePopover),
    technicalReminderEnabled,
    workWeekends,
    employeeLeaves: cloneForUndo(employeeLeaves),
    letterLinks: cloneForUndo(letterLinks),
    form: {
      assignmentTitle: el.assignmentTitle?.value || "",
      assignmentDescription: el.assignmentDescription?.value || "",
      assignmentTask: el.assignmentTask?.value || "",
      assignmentStart: el.assignmentStart?.value || "",
      assignmentDue: el.assignmentDue?.value || "",
      assignmentPriority: el.assignmentPriority?.value || "sredni",
      priorityHighLimit: el.priorityHighLimit?.value || "5",
      priorityMediumLimit: el.priorityMediumLimit?.value || "10"
    }
  };
}

function saveUndoSnapshot() {
  if (undoRestoring) return;
  const snapshot = createUndoSnapshot();
  const signature = JSON.stringify(snapshot);
  if (undoStack.length && undoStack[undoStack.length - 1].signature === signature) return;
  undoStack.push({ snapshot, signature });
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

function restoreUndoSnapshot() {
  const entry = undoStack.pop();
  if (!entry) return;
  undoRestoring = true;
  const snapshot = entry.snapshot;
  projects.splice(0, projects.length, ...cloneForUndo(snapshot.projects));
  activeTaskKey = snapshot.activeTaskKey;
  dnExpanded = snapshot.dnExpanded;
  dnSelection = cloneForUndo(snapshot.dnSelection);
  dnExpandedStages = new Set(snapshot.dnExpandedStages || []);
  dnExpandedStagesByProject = cloneForUndo(snapshot.dnExpandedStagesByProject || {});
  dnExpandedTasks = new Set(snapshot.dnExpandedTasks || []);
  dnExpandedTasksByProject = cloneForUndo(snapshot.dnExpandedTasksByProject || {});
  dnGanttMaximized = snapshot.dnGanttMaximized;
  activeProjectId = snapshot.activeProjectId;
  dnShowForecast = snapshot.dnShowForecast;
  activeOrderIndex = snapshot.activeOrderIndex;
  dashboardCompact = snapshot.dashboardCompact;
  previewCollapsed = Boolean(snapshot.previewCollapsed);
  previewPanelWidth = Number.isFinite(snapshot.previewPanelWidth) ? clamp(snapshot.previewPanelWidth, 220, 560) : previewPanelWidth;
  previewExpandedStages = cloneForUndo(snapshot.previewExpandedStages || {});
  personFilter = snapshot.personFilter;
  dashboardRange = snapshot.dashboardRange;
  dashboardMode = "ops";
  planningProjectId = snapshot.planningProjectId;
  selectedAssignmentKey = snapshot.selectedAssignmentKey;
  assignmentViewStart = snapshot.assignmentViewStart;
  assignmentViewEnd = snapshot.assignmentViewEnd;
  assignmentManualWindow = Boolean(snapshot.assignmentManualWindow);
  datePopover = cloneForUndo(snapshot.datePopover);
  technicalReminderEnabled = snapshot.technicalReminderEnabled;
  workWeekends = Boolean(snapshot.workWeekends);
  employeeLeaves = cloneForUndo(snapshot.employeeLeaves || []);
  letterLinks = cloneForUndo(snapshot.letterLinks || {});
  restoreUndoForm(snapshot.form);
  renderAfterUndo(snapshot.form);
  undoRestoring = false;
}

function restoreUndoForm(form = {}) {
  if (el.assignmentTitle) el.assignmentTitle.value = form.assignmentTitle || "";
  if (el.assignmentDescription) el.assignmentDescription.value = form.assignmentDescription || "";
  if (el.assignmentTask) el.assignmentTask.value = form.assignmentTask || "";
  if (el.assignmentStart) el.assignmentStart.value = nativeDateInput(form.assignmentStart || today);
  if (el.assignmentDue) el.assignmentDue.value = nativeDateInput(form.assignmentDue || quickAssignmentDue(1));
  if (el.assignmentPriority) el.assignmentPriority.value = form.assignmentPriority || "sredni";
  if (el.priorityHighLimit) el.priorityHighLimit.value = form.priorityHighLimit || "5";
  if (el.priorityMediumLimit) el.priorityMediumLimit.value = form.priorityMediumLimit || "10";
}

function renderAfterUndo(form = {}) {
  el.dashboardView.classList.toggle("assignment-dashboard", dashboardMode === "assign");
  el.dashboardView.classList.toggle("personal-dashboard", dashboardMode === "ops");
  el.dashboardView.classList.toggle("management-empty-mode", dashboardMode === "assign");
  el.dashboardCompactBtn.textContent = dashboardCompact ? "Rozwin" : "Zwin";
  el.dashboardView.classList.toggle("dashboard-compact", dashboardCompact);
  applyPreviewState();
  el.technicalReminderToggle.checked = technicalReminderEnabled;
  el.workWeekendsToggle.checked = workWeekends;
  el.dnForecastToggle.checked = dnShowForecast;
  renderPeopleFilter();
  renderProjects();
  renderPreview();
  if (activeProjectId) {
    const project = projects.find((item) => item.id === activeProjectId);
    if (project) {
      el.dashboardView.classList.add("hidden");
      el.projectPage.classList.remove("hidden");
      if (usesDnTemplate(project)) {
        renderDnView(project);
      } else {
        openProject(project);
      }
    }
  } else {
    el.projectPage.classList.add("hidden");
    el.dashboardView.classList.remove("hidden");
    renderCenter();
    renderAssignmentMode();
  }
  restoreUndoForm(form);
  renderPriorityRanges();
}

function cloneForUndo(value) {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function createStableId(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const SYNC_META_KEYS = new Set(["version", "baseRevision", "clientId", "savedAt", "revision"]);

function cloneForSync(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return cloneForUndo(value);
}

function stripSyncMeta(value) {
  if (Array.isArray(value)) return value.map(stripSyncMeta);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SYNC_META_KEYS.has(key))
      .map(([key, item]) => [key, stripSyncMeta(item)])
  );
}

function sameSyncValue(left, right) {
  return JSON.stringify(stripSyncMeta(left)) === JSON.stringify(stripSyncMeta(right));
}

function isPlainSyncObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function syncItemKey(item) {
  if (!item || typeof item !== "object") return "";
  if (item.id !== undefined && item.id !== null) return `id:${item.id}`;
  if (item.key) return `key:${item.key}`;
  if (item.name && item.investor) return `project:${item.name}|${item.investor}`;
  if (item.title && item.stage) return `task:${item.stage}|${item.title}`;
  if (item.title && item.assignee) return `order:${item.title}|${item.assignee}`;
  if (item.name && (item.start || item.end || item.tasks)) return `stage:${item.name}`;
  if (item.text) return `text:${item.text}`;
  if (item.title) return `title:${item.title}`;
  if (item.name) return `name:${item.name}`;
  if (item.label) return `label:${item.label}`;
  return "";
}

function mergeSyncArray(remote = [], local = [], baseline = []) {
  const allItems = [...remote, ...local, ...baseline].filter((item) => item && typeof item === "object");
  const keyed = allItems.length > 0 && allItems.every((item) => syncItemKey(item));
  if (!keyed) return sameSyncValue(local, baseline) ? cloneForSync(remote) : cloneForSync(local);

  const remoteMap = new Map(remote.map((item) => [syncItemKey(item), item]));
  const localMap = new Map(local.map((item) => [syncItemKey(item), item]));
  const baselineMap = new Map(baseline.map((item) => [syncItemKey(item), item]));
  const result = [];
  const used = new Set();

  remote.forEach((remoteItem) => {
    const key = syncItemKey(remoteItem);
    const hasLocal = localMap.has(key);
    const hasBaseline = baselineMap.has(key);
    if (!hasLocal && hasBaseline) return;
    used.add(key);
    result.push(hasLocal ? mergeSyncValue(remoteItem, localMap.get(key), baselineMap.get(key)) : cloneForSync(remoteItem));
  });

  local.forEach((localItem) => {
    const key = syncItemKey(localItem);
    if (used.has(key)) return;
    if (baselineMap.has(key) && sameSyncValue(localItem, baselineMap.get(key))) return;
    result.push(cloneForSync(localItem));
  });

  return result;
}

function mergeSyncObject(remote = {}, local = {}, baseline = {}) {
  const result = {};
  const keys = new Set([
    ...Object.keys(remote || {}),
    ...Object.keys(local || {}),
    ...Object.keys(baseline || {})
  ]);
  keys.forEach((key) => {
    if (SYNC_META_KEYS.has(key)) return;
    const merged = mergeSyncValue(remote?.[key], local?.[key], baseline?.[key]);
    if (merged !== undefined) result[key] = merged;
  });
  return result;
}

function mergeSyncValue(remote, local, baseline) {
  if (Array.isArray(remote) || Array.isArray(local) || Array.isArray(baseline)) {
    return mergeSyncArray(
      Array.isArray(remote) ? remote : [],
      Array.isArray(local) ? local : [],
      Array.isArray(baseline) ? baseline : []
    );
  }
  if (isPlainSyncObject(remote) || isPlainSyncObject(local) || isPlainSyncObject(baseline)) {
    return mergeSyncObject(
      isPlainSyncObject(remote) ? remote : {},
      isPlainSyncObject(local) ? local : {},
      isPlainSyncObject(baseline) ? baseline : {}
    );
  }
  return sameSyncValue(local, baseline) ? cloneForSync(remote) : cloneForSync(local);
}

function mergePersistedState(remote, local = createPersistedState(), baseline = remoteStateBaseline || {}) {
  const merged = mergeSyncValue(remote || {}, local || {}, baseline || {});
  const revision = Number(remote?.revision || persistenceRevision || 0);
  return {
    ...merged,
    version: 1,
    baseRevision: revision,
    revision,
    clientId: persistenceClientId,
    savedAt: new Date().toISOString()
  };
}

function reconcileRemoteState(remote, saveMerged = false) {
  const local = createPersistedState();
  const merged = mergePersistedState(remote, local, remoteStateBaseline || {});
  const changed = !sameSyncValue(merged, remote);
  applyRemoteState(merged, remote);
  if (saveMerged && changed) persistNow();
}

function selectedProjects() {
  const selected = selectedProject();
  return selected ? [selected] : [];
}

function selectedProject() {
  return visibleProjects().find((project) => project.id === planningProjectId) ||
    visibleProjects().find((project) => project.selected) ||
    visibleProjects()[0] ||
    null;
}

function ensureSingleSelectedProject(projectId = planningProjectId) {
  const visible = visibleProjects();
  if (!visible.length) return null;
  const selected = visible.find((project) => project.id === projectId) ||
    visible.find((project) => project.selected) ||
    visible.find((project) => project.id === "dk8") ||
    visible[0];
  planningProjectId = selected.id;
  visible.forEach((project) => {
    project.selected = project.id === selected.id;
  });
  return selected;
}

function selectProject(project, navigate = false) {
  if (!project) return;
  const previousPlanningProjectId = planningProjectId;
  ensureSingleSelectedProject(project.id);
  if (previousPlanningProjectId !== planningProjectId) assignmentTaskManuallySelected = false;
  renderProjects();
  renderCenter();
  renderPreview();
  renderAssignmentMode();
  schedulePersist();
  if (navigate) navigateSelectedProjectModule();
  if (!navigate && sidebarModuleMode === "letters" && !el.lettersModal?.classList.contains("hidden")) {
    openLettersModule(project.id);
  }
}

function shouldNavigateProjectClick() {
  const onDashboard = !el.dashboardView?.classList.contains("hidden");
  return !(onDashboard && dashboardMode === "ops");
}

function setDashboardMode(mode) {
  dashboardMode = "ops";
  applyDefaultAssignmentWindowForMode("ops");
  el.dashboardView.classList.remove("assignment-dashboard", "management-empty-mode");
  el.dashboardView.classList.add("personal-dashboard");
  el.dashboardOpsModeBtn.classList.add("active");
  el.dashboardAssignModeBtn?.classList.toggle("active", false);
  updateDashboardTopbarPath();
  updateTopbarDashboardButton();
  renderCenter();
  renderPreview();
  renderAssignmentMode();
}

function applyDefaultAssignmentWindowForMode(mode = dashboardMode) {
  if (assignmentManualWindow) return;
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthsToShow = mode === "assign" ? 2 : 1;
  const rangeEnd = addDays(new Date(today.getFullYear(), today.getMonth() + monthsToShow, 1), -1);
  assignmentViewStart = dateString(monthStart);
  assignmentViewEnd = dateString(rangeEnd);
  assignmentScrollDate = dateString(today);
}

function updateDashboardTopbarPath() {
  renderTopbarPath(["Pulpit"]);
}

function setSidebarModuleMode(mode, navigate = false) {
  sidebarModuleMode = mode === "manage" ? "full" : mode;
  updateSidebarModuleButtons();
  schedulePersist();
  if (navigate) navigateSelectedProjectModule();
}

function updateSidebarModuleButtons() {
  const map = {
    full: [el.sidebarFullBtn, el.topbarFullBtn],
    manage: [el.sidebarManageBtn, el.topbarManageBtn],
    letters: [el.sidebarLettersBtn, el.topbarLettersBtn],
    technical: [el.topbarTechnicalBtn],
    branches: [el.topbarBranchesBtn],
    secret: [el.topbarSecretBtn]
  };
  Object.entries(map).forEach(([mode, buttons]) => {
    buttons.forEach((button) => {
      button?.classList.toggle("active", sidebarModuleMode === mode);
    });
  });
  updateTopbarDashboardButton();
}

function updateTopbarDashboardButton() {
  const onDashboard = !el.dashboardView?.classList.contains("hidden");
  el.topbarDashboardBtn?.classList.toggle("active", onDashboard && dashboardMode === "ops");
  el.topbarManageBtn?.classList.toggle("active", onDashboard && dashboardMode === "assign");
  [el.topbarFullBtn, el.topbarLettersBtn, el.topbarTechnicalBtn, el.topbarBranchesBtn, el.topbarSecretBtn].forEach((button) => {
    button?.classList.toggle("active", !onDashboard && button.classList.contains("active"));
  });
}

function navigateSelectedProjectModule() {
  const project = ensureSingleSelectedProject();
  if (!project) return;
  if (sidebarModuleMode === "letters") {
    openLettersModule(project.id);
    return;
  }
  if (sidebarModuleMode === "secret") {
    openSecretModule(project.id);
    return;
  }
  if (sidebarModuleMode === "technical" || sidebarModuleMode === "branches") {
    openTechnicalModule(project.id, sidebarModuleMode);
    return;
  }
  openProject(project);
}

function openTechnicalModule(projectId = activeProjectId, mode = "technical") {
  const project = projects.find((item) => item.id === projectId) || activeGanttProject();
  if (!project) return;
  const moduleMode = mode === "branches" ? "branches" : "technical";
  rememberViewBeforeNavigation({ type: moduleMode, projectId: project.id });
  sidebarModuleMode = moduleMode;
  updateSidebarModuleButtons();
  activeProjectId = project.id;
  el.lettersModal?.classList.add("hidden");
  el.secretPage?.classList.add("hidden");
  el.sharedBoard?.classList.add("hidden");
  sharedBoardOpen = false;
  el.dashboardView.classList.add("hidden");
  el.projectPage.classList.add("hidden");
  el.technicalPage?.classList.remove("hidden");
  el.technicalPage?.classList.toggle("branches-mode", moduleMode === "branches");
  updateSidebarModuleButtons();
  if (el.technicalTitle) el.technicalTitle.textContent = `${projectModuleLabel(moduleMode)} - ${project.name}`;
  if (el.technicalMessage) el.technicalMessage.textContent = `${projectModuleLabel(moduleMode)} - tutaj dodamy zawartosc`;
  if (el.branchesBoard) {
    el.branchesBoard.classList.toggle("hidden", moduleMode !== "branches");
    if (moduleMode === "branches") renderBranchesBoard(project);
  }
  renderTopbarPath([projectPathLabel(project), projectModuleLabel(moduleMode)]);
  updateSidebarNavButtons();
}

function openSecretModule(projectId = activeProjectId) {
  const project = projects.find((item) => item.id === projectId) || activeGanttProject() || selectedProject();
  rememberViewBeforeNavigation({ type: "secret", projectId: project?.id });
  sidebarModuleMode = "secret";
  updateSidebarModuleButtons();
  if (project) activeProjectId = project.id;
  el.lettersModal?.classList.add("hidden");
  el.technicalPage?.classList.add("hidden");
  el.secretPage?.classList.remove("hidden");
  el.sharedBoard?.classList.add("hidden");
  sharedBoardOpen = false;
  el.dashboardView.classList.add("hidden");
  el.projectPage.classList.add("hidden");
  renderTopbarPath(project ? [projectPathLabel(project), projectModuleLabel("secret")] : [projectModuleLabel("secret")]);
  renderSecretExplorer(project);
  updateSidebarNavButtons();
}

async function startExplorerDemo() {
  const project = projects.find((item) => item.name === "DW000") || projects.find((item) => item.id === activeProjectId) || activeGanttProject() || selectedProject() || projects[0];
  if (project) activeProjectId = project.id;
  if (project?.name === "DW000" && !project.folderUrl) {
    try {
      const response = await fetch("/api/demo-project", { method: "POST" });
      const result = await response.json();
      if (response.ok && result.folderUrl) {
        project.folderUrl = result.folderUrl;
        schedulePersist();
      }
    } catch {}
  }
  demoTourActive = true;
  demoTourStepIndex = 0;
  el.demoTour?.classList.remove("hidden");
  showDemoTourStep(0, 1);
}

function closeDemoTour() {
  demoTourActive = false;
  el.demoTour?.classList.add("hidden");
}

function changeDemoTourStep(delta) {
  if (!demoTourActive) return;
  showDemoTourStep(demoTourStepIndex + delta, delta < 0 ? -1 : 1);
}

function activateDemoView(view) {
  const project = projects.find((item) => item.id === activeProjectId) || selectedProject() || projects[0];
  if (view === "dashboard") showHomeDashboard();
  else if (view === "assignment" || view === "assignment-entry" || view === "assignment-edit") {
    showHomeDashboard();
    planningProjectId = project?.id || planningProjectId;
    renderAssignmentMode();
    if (view === "assignment-entry") {
      el.assignmentTitle.value = "Przygotuj pomiary geodezyjne";
      el.assignmentDescription.value = "Przygotuj zakres pomiarów i przekaż do weryfikacji.";
      assignmentTaskManuallySelected = false;
      suggestAssignmentTask();
      renderAssignmentDraft();
    } else if (view === "assignment-edit") {
      selectedAssignmentKey = `${project?.id || "dk8"}:0:0`;
      renderAssignmentMode();
    }
  }
  else if (view === "secret") openSecretModule(project?.id);
  else if (view === "full" && project) { sidebarModuleMode = "full"; openProject(project); }
  else if (view === "letters") openLettersModule(project?.id);
  else if (view === "technical") openTechnicalModule(project?.id, "technical");
  else if (view === "branches") openTechnicalModule(project?.id, "branches");
  else if (view === "chat-notification") {
    if (sharedBoardOpen) closeSharedBoard();
    setChatOpen(false);
    updateChatUnreadBadge(1, true);
  } else if (view === "chat") {
    if (sharedBoardOpen) closeSharedBoard();
    el.settingsPanel?.classList.add("hidden");
    if (!chatOpen) setChatOpen(true);
  } else if (view === "chat-reply") {
    if (!chatOpen) setChatOpen(true);
    el.teamChatInput.value = "Tak, rozpocznij pomiary. Po zakończeniu dodaj materiały do DW000.";
    el.teamChatInput.focus();
  } else if (view === "chat-board") {
    if (!chatOpen) setChatOpen(true);
    void openSharedBoard();
  } else if (view === "settings") {
    if (sharedBoardOpen) closeSharedBoard();
    setChatOpen(false);
    el.settingsPanel?.classList.remove("hidden");
  }
}

function showDemoTourStep(candidateIndex, direction = 1) {
  let index = candidateIndex;
  if (index < 0) index = 0;
  if (index >= PROGRAM_DEMO_STEPS.length) {
    closeDemoTour();
    return;
  }
  demoTourStepIndex = index;
  const step = PROGRAM_DEMO_STEPS[index];
  activateDemoView(step.view);
  if (el.demoTourProgress) el.demoTourProgress.textContent = `DEMO PROGRAMU · ${index + 1}/${PROGRAM_DEMO_STEPS.length}`;
  if (el.demoTourTitle) el.demoTourTitle.textContent = step.title;
  if (el.demoTourText) el.demoTourText.textContent = step.text;
  el.demoTourCard?.classList.toggle("is-final", Boolean(step.final));
  el.demoTourLogo?.classList.toggle("hidden", !step.final);
  if (el.demoTourPrev) el.demoTourPrev.disabled = index === 0;
  if (el.demoTourNext) el.demoTourNext.textContent = index === PROGRAM_DEMO_STEPS.length - 1 ? "Zakończ" : "Dalej";
  window.setTimeout(() => {
    const target = document.querySelector(step.selector);
    target?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "smooth" });
    window.setTimeout(positionDemoTour, 120);
  }, 160);
}

function positionDemoTour() {
  if (!demoTourActive) return;
  const step = PROGRAM_DEMO_STEPS[demoTourStepIndex];
  const target = step ? document.querySelector(step.selector) : null;
  if (!target || !el.demoTourSpotlight || !el.demoTourCard) return;
  const rect = target.getBoundingClientRect();
  const padding = 6;
  const left = Math.max(5, rect.left - padding);
  const top = Math.max(5, rect.top - padding);
  const width = Math.min(window.innerWidth - left - 5, rect.width + padding * 2);
  const height = Math.min(window.innerHeight - top - 5, rect.height + padding * 2);
  Object.assign(el.demoTourSpotlight.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  const cardWidth = Math.min(390, window.innerWidth - 24);
  el.demoTourCard.style.width = `${cardWidth}px`;
  const cardHeight = el.demoTourCard.getBoundingClientRect().height || 190;
  const belowTop = top + height + 12;
  const cardTop = belowTop + cardHeight <= window.innerHeight - 10 ? belowTop : Math.max(10, top - cardHeight - 12);
  const cardLeft = Math.max(12, Math.min(left, window.innerWidth - cardWidth - 12));
  el.demoTourCard.style.left = `${cardLeft}px`;
  el.demoTourCard.style.top = `${cardTop}px`;
}

async function renderSecretExplorer(project) {
  if (!el.secretPage) return;
  bindSecretSplitter();
  if (el.secretExplorer) el.secretExplorer.style.setProperty("--secret-tree-width", `${secretExplorerState.split}%`);
  applySecretTreePreferences();
  if (!project) {
    renderSecretExplorerMessage("Wybierz projekt po lewej stronie.");
    return;
  }
  if (!project.folderUrl) {
    const inferredFolder = inferProjectFolderUrl(project);
    if (inferredFolder) {
      project.folderUrl = inferredFolder;
      schedulePersist();
    }
  }
  const rootPath = folderUrlToPath(project.folderUrl || "");
  if (el.secretProjectName) el.secretProjectName.textContent = "EKSPLORATOR";
  if (!rootPath) {
    renderSecretExplorerMessage("Brak zmapowanego folderu projektu. Ustaw sciezke projektow i kliknij Mapuj linki.");
    return;
  }
  if (secretExplorerState.projectId !== project.id || secretExplorerState.rootPath !== rootPath) {
    rememberSecretExplorerView();
    const savedView = secretExplorerViews[project.id] || {};
    const pathBelongsToRoot = (value) => String(value || "").toLowerCase().startsWith(rootPath.toLowerCase());
    secretExplorerState.projectId = project.id;
    secretExplorerState.rootPath = rootPath;
    secretExplorerState.selectedPath = pathBelongsToRoot(savedView.selectedPath) ? savedView.selectedPath : rootPath;
    secretExplorerState.expanded = new Set([
      rootPath,
      ...(Array.isArray(savedView.expanded) ? savedView.expanded.filter(pathBelongsToRoot) : [])
    ]);
    if (Number.isFinite(savedView.split)) secretExplorerState.split = clamp(Number(savedView.split), 20, 55);
    secretExplorerState.cache = new Map();
  }
  if (el.secretExplorer) el.secretExplorer.style.setProperty("--secret-tree-width", `${secretExplorerState.split}%`);
  try {
    const pathsToRestore = [...new Set([
      rootPath,
      ...secretSelectedPathChain(),
      ...secretExplorerState.expanded,
      secretExplorerState.selectedPath
    ].filter(Boolean))];
    for (const folderPath of pathsToRestore) {
      try { await loadSecretFolder(folderPath); } catch { /* Pomin niedostepne stare sciezki. */ }
    }
    renderSecretTree();
    renderSecretFiles();
  } catch {
    renderSecretExplorerMessage("Nie udalo sie odczytac folderu projektu.");
  }
}

function rememberSecretExplorerView() {
  const projectId = secretExplorerState.projectId;
  if (!projectId || !secretExplorerState.rootPath) return;
  secretExplorerViews[projectId] = {
    rootPath: secretExplorerState.rootPath,
    selectedPath: secretExplorerState.selectedPath || secretExplorerState.rootPath,
    expanded: [...secretExplorerState.expanded],
    split: secretExplorerState.split
  };
}

async function refreshSecretExplorer() {
  const project = projects.find((item) => item.id === secretExplorerState.projectId) || activeGanttProject();
  if (!project) return;
  if (el.secretRefreshBtn) {
    el.secretRefreshBtn.disabled = true;
    el.secretRefreshBtn.textContent = "Odswiezanie...";
  }
  const selectedPath = secretExplorerState.selectedPath;
  const expandedPaths = [...secretExplorerState.expanded];
  const previousScrollLeft = el.secretTree?.scrollLeft || 0;
  const previousScrollTop = el.secretTree?.scrollTop || 0;
  const pathsToRestore = [...new Set([
    secretExplorerState.rootPath,
    ...secretSelectedPathChain(),
    ...expandedPaths,
    selectedPath
  ].filter(Boolean))];
  secretExplorerState.cache = new Map();
  try {
    for (const folderPath of pathsToRestore) {
      try { await loadSecretFolder(folderPath); } catch { /* Skip unavailable folders. */ }
    }
    secretExplorerState.selectedPath = selectedPath || secretExplorerState.rootPath;
    secretExplorerState.expanded = new Set(expandedPaths);
    renderSecretTree();
    renderSecretFiles();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!el.secretTree) return;
      el.secretTree.scrollLeft = previousScrollLeft;
      el.secretTree.scrollTop = previousScrollTop;
    }));
  } finally {
    if (el.secretRefreshBtn) {
      el.secretRefreshBtn.disabled = false;
      el.secretRefreshBtn.textContent = "Odswiez";
    }
  }
}

function renderSecretExplorerMessage(message) {
  if (el.secretProjectName) el.secretProjectName.textContent = "EKSPLORATOR";
  if (el.secretCurrentPath) el.secretCurrentPath.textContent = "";
  if (el.secretTree) el.secretTree.innerHTML = `<div class="secret-empty">${escapeHtml(message)}</div>`;
  if (el.secretFiles) el.secretFiles.innerHTML = `<div class="secret-empty">Wybierz folder projektu.</div>`;
}

async function loadSecretFolder(folderPath) {
  if (!folderPath) throw new Error("Missing folder path");
  if (secretExplorerState.cache.has(folderPath)) return secretExplorerState.cache.get(folderPath);
  const response = await fetch("/api/list-folder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: folderPath })
  });
  if (!response.ok) throw new Error("Cannot list folder");
  const data = await response.json();
  secretExplorerState.cache.set(folderPath, data);
  return data;
}

function renderSecretTree() {
  if (!el.secretTree) return;
  applySecretTreePreferences();
  if (secretTreeMode === "columns") {
    renderSecretColumns();
    return;
  }
  const root = secretExplorerState.cache.get(secretExplorerState.rootPath);
  if (!root) {
    el.secretTree.innerHTML = `<div class="secret-empty">Brak folderow.</div>`;
    return;
  }
  const project = projects.find((item) => item.id === secretExplorerState.projectId);
  const rows = [secretTreeRow({ name: project ? projectPathLabel(project) : "Projekt", path: root.path }, 0)];
  rows.push(...secretTreeChildren(root, 1));
  el.secretTree.innerHTML = rows.join("");
  el.secretTree.querySelectorAll("[data-secret-toggle]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const folderPath = decodeURIComponent(button.dataset.secretToggle || "");
      if (secretExplorerState.expanded.has(folderPath)) {
        secretExplorerState.expanded.delete(folderPath);
        renderSecretTree();
        return;
      }
      secretExplorerState.expanded.add(folderPath);
      try {
        await loadSecretFolder(folderPath);
      } catch {
        // Keep the tree responsive even when a folder cannot be read.
      }
      renderSecretTree();
    });
  });
  el.secretTree.querySelectorAll("[data-secret-folder]").forEach((button) => {
    button.addEventListener("click", async () => {
      const folderPath = decodeURIComponent(button.dataset.secretFolder || "");
      secretExplorerState.selectedPath = folderPath;
      if (secretExplorerState.expanded.has(folderPath)) {
        secretExplorerState.expanded.delete(folderPath);
      } else {
        secretExplorerState.expanded.add(folderPath);
        try {
          await loadSecretFolder(folderPath);
        } catch {
          // Rendering below will show the last known state.
        }
      }
      renderSecretTree();
      renderSecretFiles();
    });
  });
}

function applySecretTreePreferences() {
  if (el.secretExplorer) el.secretExplorer.style.setProperty("--secret-tree-font-size", `${secretTreeFontSize}px`);
  el.secretTree?.classList.toggle("columns-mode", secretTreeMode === "columns");
  el.secretTreeModeBtn?.classList.toggle("active", secretTreeMode === "tree");
  el.secretColumnsModeBtn?.classList.toggle("active", secretTreeMode === "columns");
  if (el.secretTreeFontDown) el.secretTreeFontDown.disabled = secretTreeFontSize <= 10;
  if (el.secretTreeFontUp) el.secretTreeFontUp.disabled = secretTreeFontSize >= 18;
  if (el.secretExpandAllBtn) el.secretExpandAllBtn.disabled = secretTreeMode !== "tree";
  if (el.secretCollapseAllBtn) el.secretCollapseAllBtn.disabled = secretTreeMode !== "tree";
}

async function expandAllSecretFolders() {
  const rootPath = secretExplorerState.rootPath;
  if (!rootPath || secretTreeMode !== "tree") return;
  if (el.secretExpandAllBtn) {
    el.secretExpandAllBtn.disabled = true;
    el.secretExpandAllBtn.textContent = "...";
  }
  const queue = [rootPath];
  const visited = new Set();
  const maximumFolders = 1500;
  while (queue.length && visited.size < maximumFolders) {
    const folderPath = queue.shift();
    if (!folderPath || visited.has(folderPath)) continue;
    visited.add(folderPath);
    secretExplorerState.expanded.add(folderPath);
    try {
      const folder = await loadSecretFolder(folderPath);
      (folder.folders || []).forEach((child) => queue.push(child.path));
    } catch {
      // Skip folders without read access.
    }
  }
  if (el.secretExpandAllBtn) el.secretExpandAllBtn.textContent = "⊞";
  renderSecretTree();
}

function collapseAllSecretFolders() {
  const rootPath = secretExplorerState.rootPath;
  secretExplorerState.expanded = new Set(rootPath ? [rootPath] : []);
  renderSecretTree();
}

function setSecretTreeMode(mode) {
  secretTreeMode = mode === "columns" ? "columns" : "tree";
  renderSecretTree();
  persistUserState();
}

function changeSecretTreeFont(delta) {
  secretTreeFontSize = clamp(secretTreeFontSize + delta, 10, 18);
  applySecretTreePreferences();
  persistUserState();
}

function secretSelectedPathChain() {
  const root = secretExplorerState.rootPath;
  const selected = secretExplorerState.selectedPath || root;
  if (!root) return [];
  const chain = [root];
  if (selected.toLowerCase() === root.toLowerCase()) return chain;
  let cursor = selected;
  const descendants = [];
  while (cursor && cursor.toLowerCase() !== root.toLowerCase()) {
    descendants.unshift(cursor);
    const parent = cursor.replace(/[\\/][^\\/]+$/, "");
    if (!parent || parent === cursor) break;
    cursor = parent;
  }
  if (cursor.toLowerCase() !== root.toLowerCase()) return chain;
  return [...chain, ...descendants];
}

function secretFolderColumnWidth(labels = []) {
  const fontSize = Number(secretTreeFontSize) || 13;
  let longestWidth = Math.max(...labels.map((label) => String(label || "").length * fontSize * 0.68), 0);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context) {
    context.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
    longestWidth = Math.max(...labels.map((label) => context.measureText(String(label || "")).width), 0);
  }
  return clamp(Math.ceil(longestWidth + 58), 132, 520);
}

function renderSecretColumns() {
  const paths = secretSelectedPathChain();
  if (!paths.length) {
    el.secretTree.innerHTML = '<div class="secret-empty">Brak folderow.</div>';
    return;
  }
  el.secretTree.innerHTML = paths.map((folderPath, columnIndex) => {
    const folder = secretExplorerState.cache.get(folderPath);
    const nextPath = paths[columnIndex + 1] || "";
    const name = folderPath.split(/[\\/]+/).filter(Boolean).at(-1) || "Projekt";
    const labels = [name, ...(folder?.folders || []).map((child) => child.name || "")];
    const columnWidth = secretFolderColumnWidth(labels);
    return `
      <section class="secret-folder-column" style="--secret-column-width:${columnWidth}px">
        <header title="${escapeHtml(folderPath)}">${escapeHtml(name)}</header>
        <div>
          ${(folder?.folders || []).map((child) => `
            <button type="button" class="secret-column-folder ${child.path === nextPath ? "selected" : ""}" data-secret-column-folder="${encodeURIComponent(child.path)}" title="${escapeHtml(child.path)}">
              <span class="folder-glyph" aria-hidden="true"></span><span>${escapeHtml(child.name)}</span><b>›</b>
            </button>
          `).join("") || '<span class="secret-column-empty">Brak podfolderow</span>'}
        </div>
      </section>
    `;
  }).join("");
  el.secretTree.querySelectorAll("[data-secret-column-folder]").forEach((button) => {
    button.addEventListener("click", async () => {
      const folderPath = decodeURIComponent(button.dataset.secretColumnFolder || "");
      secretExplorerState.selectedPath = folderPath;
      try { await loadSecretFolder(folderPath); } catch { /* Show the last known state. */ }
      renderSecretTree();
      renderSecretFiles();
    });
  });
  requestAnimationFrame(() => { el.secretTree.scrollLeft = el.secretTree.scrollWidth; });
}

function secretTreeChildren(folder, depth) {
  return (folder.folders || []).flatMap((child) => {
    const rows = [secretTreeRow(child, depth)];
    if (secretExplorerState.expanded.has(child.path) && secretExplorerState.cache.has(child.path)) {
      rows.push(...secretTreeChildren(secretExplorerState.cache.get(child.path), depth + 1));
    }
    return rows;
  });
}

function secretTreeRow(folder, depth) {
  const expanded = secretExplorerState.expanded.has(folder.path);
  const selected = secretExplorerState.selectedPath === folder.path;
  const encoded = encodeURIComponent(folder.path);
  return `
    <div class="secret-tree-row ${selected ? "selected" : ""}" style="--tree-depth:${depth}">
      <button class="secret-tree-toggle" type="button" data-secret-toggle="${encoded}" title="${expanded ? "Zwin folder" : "Rozwin folder"}">${expanded ? "▾" : "▸"}</button>
      <button class="secret-tree-folder" type="button" data-secret-folder="${encoded}" title="${escapeHtml(folder.path)}">
        <span class="folder-glyph" aria-hidden="true"></span>
        <span>${escapeHtml(folder.name)}</span>
      </button>
    </div>
  `;
}

function renderSecretFiles() {
  if (!el.secretFiles) return;
  const selectedPath = secretExplorerState.selectedPath || secretExplorerState.rootPath;
  const folder = secretExplorerState.cache.get(selectedPath);
  if (el.secretCurrentPath) el.secretCurrentPath.textContent = selectedPath || "";
  if (!folder) {
    el.secretFiles.innerHTML = `<div class="secret-empty">Nie odczytano folderu.</div>`;
    return;
  }
  const search = normalizeSearchText(secretFileSearch);
  const files = sortedSecretFiles((folder.files || [])
    .filter((file) => !secretHiddenExtensions.includes(normalizedFileExtension(file)))
    .filter((file) => !search || normalizeSearchText([file.name, file.extension, file.owner, file.path].filter(Boolean).join(" ")).includes(search)));
  renderSecretOptions();
  if (!files.length) {
    el.secretFiles.innerHTML = `<div class="secret-empty">${search ? "Brak plikow pasujacych do wyszukiwania." : "Ten folder nie ma plikow."}</div>`;
    return;
  }
  secretColumnOrder = normalizeColumnOrder(secretColumnOrder, SECRET_COLUMNS);
  const visibleSecretKeys = new Set(normalizeSecretVisibleColumns(secretVisibleColumns));
  const columns = secretColumnOrder.map((key) => SECRET_COLUMNS.find((column) => column.key === key)).filter((column) => column && visibleSecretKeys.has(column.key));
  const widths = secretColumnWidthsFor(columns, files);
  const grid = columns.map((column) => `${widths[column.key]}px`).join(" ");
  el.secretFiles.innerHTML = `
    <div class="secret-file-header" style="grid-template-columns:${grid}">
      ${columns.map((column) => `<div class="secret-file-header-cell ${secretSortKey === column.key ? "sorted" : ""}" draggable="true" data-secret-column-drag="${column.key}" title="Przeciagnij, aby zmienic kolejnosc"><button type="button" data-secret-sort="${column.key}">${escapeHtml(column.label)}${secretSortKey === column.key ? (secretSortDirection === "asc" ? " ↑" : " ↓") : ""}</button><button class="secret-col-resizer" type="button" data-secret-column-resize="${column.key}" aria-label="Zmien szerokosc kolumny ${escapeHtml(column.label || "Otworz")}"></button></div>`).join("")}
    </div>
    ${files.map((file) => secretFileRow(file, columns, grid)).join("")}
  `;
  el.secretFiles.querySelectorAll("[data-secret-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.secretSort;
      if (secretSortKey === key) secretSortDirection = secretSortDirection === "asc" ? "desc" : "asc";
      else { secretSortKey = key; secretSortDirection = "asc"; }
      renderSecretFiles();
      persistUserState();
    });
  });
  bindSecretColumnDragging();
  el.secretFiles.querySelectorAll("[data-secret-column-resize]").forEach((handle) => {
    handle.addEventListener("pointerdown", startSecretColumnResize);
  });
  el.secretFiles.querySelectorAll("[data-secret-open-file]").forEach((button) => {
    button.addEventListener("click", () => openSecretFile(decodeURIComponent(button.dataset.secretOpenFile || "")));
  });
  el.secretFiles.querySelectorAll("[data-secret-favorite-file]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSecretFavoriteFile(decodeURIComponent(button.dataset.secretFavoriteFile || ""));
    });
  });
  el.secretFiles.querySelectorAll("[data-secret-file-path]").forEach((row) => {
    row.addEventListener("contextmenu", (event) => openSecretFileMenu(event, decodeURIComponent(row.dataset.secretFilePath || "")));
  });
}

function bindSecretColumnDragging() {
  let draggedKey = "";
  el.secretFiles?.querySelectorAll("[data-secret-column-drag]").forEach((header) => {
    header.addEventListener("dragstart", (event) => {
      if (event.target.closest("[data-secret-column-resize]")) {
        event.preventDefault();
        return;
      }
      draggedKey = header.dataset.secretColumnDrag || "";
      header.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedKey);
    });
    header.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      header.classList.add("drag-over");
    });
    header.addEventListener("dragleave", () => header.classList.remove("drag-over"));
    header.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceKey = draggedKey || event.dataTransfer.getData("text/plain");
      const targetKey = header.dataset.secretColumnDrag || "";
      header.classList.remove("drag-over");
      if (!sourceKey || !targetKey || sourceKey === targetKey) return;
      const next = normalizeColumnOrder(secretColumnOrder, SECRET_COLUMNS);
      const sourceIndex = next.indexOf(sourceKey);
      const targetIndex = next.indexOf(targetKey);
      if (sourceIndex < 0 || targetIndex < 0) return;
      next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, sourceKey);
      secretColumnOrder = next;
      renderSecretFiles();
      persistUserState();
    });
    header.addEventListener("dragend", () => {
      el.secretFiles?.querySelectorAll(".dragging, .drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
      draggedKey = "";
    });
  });
}

function normalizeSecretColumnWidths(widths = {}) {
  if (!widths || typeof widths !== "object") return {};
  return SECRET_COLUMNS.reduce((result, column) => {
    const width = Number(widths[column.key]);
    if (Number.isFinite(width)) result[column.key] = clampSecretColumnWidth(width);
    return result;
  }, {});
}

function clampSecretColumnWidth(width) {
  return Math.max(48, Math.min(760, Math.round(Number(width) || 80)));
}

function secretColumnWidthsFor(columns, files = []) {
  const defaults = { name: 360, extension: 80, size: 92, modified: 150, owner: 140, open: 84 };
  const saved = normalizeSecretColumnWidths(secretColumnWidths);
  const widths = columns.reduce((result, column) => {
    if (Number.isFinite(saved[column.key])) {
      result[column.key] = saved[column.key];
      return result;
    }
    const values = [column.label || "Otworz", ...files.map((file) => secretFileCellText(file, column.key))];
    const longest = values.reduce((maximum, value) => Math.max(maximum, String(value || "").length), 0);
    result[column.key] = clampSecretColumnWidth(Math.max(defaults[column.key] || 80, longest * 7 + 28));
    return result;
  }, {});
  return widths;
}

function secretFileCellText(file, key) {
  if (key === "name") return file.name || "";
  if (key === "extension") return file.extension || "";
  if (key === "size") return formatSecretFileSize(file.size);
  if (key === "modified") return formatSecretFileDate(file.modified);
  if (key === "owner") return file.owner || "-";
  if (key === "open") return "Otworz";
  return "";
}

function startSecretColumnResize(event) {
  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  const key = handle.dataset.secretColumnResize;
  const header = handle.closest(".secret-file-header");
  if (!key || !header || !el.secretFiles) return;
  const cells = [...header.querySelectorAll("[data-secret-column-drag]")];
  const keys = cells.map((cell) => cell.dataset.secretColumnDrag);
  const index = keys.indexOf(key);
  if (index < 0) return;
  const startX = event.clientX;
  const startWidth = cells[index].getBoundingClientRect().width;
  const widths = keys.map((columnKey, cellIndex) => cellIndex === index
    ? startWidth
    : cells[cellIndex].getBoundingClientRect().width);
  header.classList.add("resizing");
  handle.setPointerCapture?.(event.pointerId);

  const move = (moveEvent) => {
    widths[index] = clampSecretColumnWidth(startWidth + moveEvent.clientX - startX);
    const grid = widths.map((width) => `${Math.round(width)}px`).join(" ");
    el.secretFiles.querySelectorAll(".secret-file-header, .secret-file-row").forEach((row) => {
      row.style.gridTemplateColumns = grid;
    });
    secretColumnWidths[key] = widths[index];
  };
  const stop = () => {
    header.classList.remove("resizing");
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    persistUserState();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop, { once: true });
}

function secretFileRow(file, columns, grid) {
  const favorite = isSecretFavoriteFile(file.path);
  return `
    <div class="secret-file-row ${favorite ? "favorite" : ""}" data-secret-file-path="${encodeURIComponent(file.path)}" style="grid-template-columns:${grid}" title="${escapeHtml(file.path)}">
      ${columns.map((column) => secretFileCell(file, column.key)).join("")}
    </div>
  `;
}

function secretFileCell(file, key) {
  if (key === "name") {
    const favorite = isSecretFavoriteFile(file.path);
    return `<span class="secret-file-name-cell"><button type="button" class="secret-file-favorite ${favorite ? "active" : ""}" data-secret-favorite-file="${encodeURIComponent(file.path)}" title="${favorite ? "Usun z ulubionych" : "Dodaj do ulubionych"}" aria-label="${favorite ? "Usun plik z ulubionych" : "Dodaj plik do ulubionych"}">${favorite ? "★" : "☆"}</button><span>${escapeHtml(file.name)}</span></span>`;
  }
  if (key === "extension") return `<span>${escapeHtml(file.extension || "")}</span>`;
  if (key === "size") return `<span>${formatSecretFileSize(file.size)}</span>`;
  if (key === "modified") return `<span>${formatSecretFileDate(file.modified)}</span>`;
  if (key === "owner") return `<span title="${escapeHtml(file.owner || "-")}">${escapeHtml(file.owner || "-")}</span>`;
  if (key === "open") return `<button type="button" data-secret-open-file="${encodeURIComponent(file.path)}">Otworz</button>`;
  return "";
}

function normalizeSecretVisibleColumns(keys) {
  const allowed = new Set(SECRET_COLUMNS.map((column) => column.key));
  const result = (keys || []).filter((key) => allowed.has(key));
  return result.length ? result : ["name"];
}

function sortedSecretFiles(files) {
  const multiplier = secretSortDirection === "desc" ? -1 : 1;
  return [...files].sort((a, b) => {
    const favoriteDifference = Number(isSecretFavoriteFile(b.path)) - Number(isSecretFavoriteFile(a.path));
    if (favoriteDifference) return favoriteDifference;
    const value = (file) => {
      if (secretSortKey === "extension") return file.extension || "";
      if (secretSortKey === "size") return Number(file.size) || 0;
      if (secretSortKey === "modified") return new Date(file.modified || 0).getTime();
      if (secretSortKey === "owner") return file.owner || "";
      return file.name || "";
    };
    const left = value(a); const right = value(b);
    if (typeof left === "number" && typeof right === "number") return multiplier * (left - right);
    return multiplier * String(left).localeCompare(String(right), "pl", { numeric: true, sensitivity: "base" });
  });
}

function secretFavoritePathKey(path = "") {
  return String(path || "").trim().replace(/\//g, "\\").toLocaleLowerCase("pl");
}

function isSecretFavoriteFile(path = "") {
  const key = secretFavoritePathKey(path);
  return Boolean(key && secretFavoriteFiles.some((item) => secretFavoritePathKey(item) === key));
}

function toggleSecretFavoriteFile(path = "") {
  if (!path) return;
  const key = secretFavoritePathKey(path);
  if (isSecretFavoriteFile(path)) {
    secretFavoriteFiles = secretFavoriteFiles.filter((item) => secretFavoritePathKey(item) !== key);
  } else {
    secretFavoriteFiles = [...secretFavoriteFiles, path];
  }
  renderSecretFiles();
  persistUserState();
}

function availableSecretExtensions() {
  return [...new Set([...secretExplorerState.cache.values()].flatMap((folder) => folder.files || []).map(normalizedFileExtension))]
    .sort((a, b) => a.localeCompare(b, "pl"));
}

function renderSecretOptions() {
  if (el.secretColumnOptions) {
    const visible = new Set(normalizeSecretVisibleColumns(secretVisibleColumns));
    secretColumnOrder = normalizeColumnOrder(secretColumnOrder, SECRET_COLUMNS);
    const orderedColumns = secretColumnOrder.map((key) => SECRET_COLUMNS.find((column) => column.key === key)).filter(Boolean);
    el.secretColumnOptions.innerHTML = orderedColumns.map((column, index) => `<label class="column-order-row" draggable="true" data-column-order-key="${column.key}"><span class="column-drag-handle" title="Zlap i przesun">⋮⋮</span><input type="checkbox" value="${column.key}" ${visible.has(column.key) ? "checked" : ""} /><span>${column.label || "Otworz"}</span><button type="button" data-secret-column-up="${column.key}" ${index === 0 ? "disabled" : ""} title="Przesun w lewo">←</button><button type="button" data-secret-column-down="${column.key}" ${index === orderedColumns.length - 1 ? "disabled" : ""} title="Przesun w prawo">→</button></label>`).join("");
    el.secretColumnOptions.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
      secretVisibleColumns = normalizeSecretVisibleColumns([...el.secretColumnOptions.querySelectorAll("input:checked")].map((item) => item.value));
      renderSecretFiles();
      persistUserState();
    }));
    el.secretColumnOptions.querySelectorAll("[data-secret-column-up], [data-secret-column-down]").forEach((button) => button.addEventListener("click", () => {
      const key = button.dataset.secretColumnUp || button.dataset.secretColumnDown;
      secretColumnOrder = moveColumnInOrder(secretColumnOrder, key, button.dataset.secretColumnUp ? -1 : 1);
      renderSecretOptions();
      renderSecretFiles();
      persistUserState();
    }));
    bindColumnOrderDragging(el.secretColumnOptions, (sourceKey, targetKey, placeAfter) => {
      secretColumnOrder = moveColumnBefore(secretColumnOrder, sourceKey, targetKey, placeAfter);
      renderSecretOptions();
      renderSecretFiles();
      persistUserState();
    });
  }
  if (el.secretExtensionOptions) {
    const extensions = availableSecretExtensions();
    el.secretExtensionOptions.innerHTML = extensions.length ? extensions.map((extension) => `<label><input type="checkbox" value="${escapeHtml(extension)}" ${secretHiddenExtensions.includes(extension) ? "" : "checked"} /><span>.${escapeHtml(extension)}</span></label>`).join("") : '<span class="secret-options-empty">Brak rozszerzen.</span>';
    el.secretExtensionOptions.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
      secretHiddenExtensions = extensions.filter((extension) => ![...el.secretExtensionOptions.querySelectorAll("input:checked")].some((item) => item.value === extension));
      renderSecretFiles();
      persistUserState();
    }));
  }
}

async function openSecretFile(filePath) {
  if (!filePath) return;
  try {
    await fetch("/api/open-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath })
    });
  } catch {
    // Local server will handle normal operation; no browser fallback for raw disk paths.
  }
}

function closeSecretFileMenu() {
  document.querySelector(".secret-file-context-menu")?.remove();
}

function openSecretFileMenu(event, filePath) {
  event.preventDefault();
  event.stopPropagation();
  closeSecretFileMenu();
  const menu = document.createElement("div");
  menu.className = "secret-file-context-menu";
  menu.innerHTML = `
    <button type="button" data-secret-file-action="open">Otwórz</button>
    <button type="button" data-secret-file-action="folder">Otwórz folder</button>
    <span></span>
    <button type="button" data-secret-file-action="rename">Zmień nazwę</button>
    <button type="button" data-secret-file-action="copy">Kopiuj</button>
    <button type="button" data-secret-file-action="cut">Wytnij</button>
    <button class="danger" type="button" data-secret-file-action="delete">Usuń</button>
  `;
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8))}px`;
  menu.addEventListener("click", async (clickEvent) => {
    const button = clickEvent.target.closest("[data-secret-file-action]");
    if (!button) return;
    const action = button.dataset.secretFileAction;
    closeSecretFileMenu();
    if (action === "open") return openSecretFile(filePath);
    if (action === "folder") return openSecretFileParent(filePath);
    if (action === "rename") {
      const currentName = String(filePath).split(/[\\/]/).pop() || "";
      const nextName = await zkPrompt("Podaj nową nazwę pliku wraz z rozszerzeniem.", currentName, "Zmień nazwę pliku");
      if (!nextName || nextName.trim() === currentName) return;
      await runSecretFileOperation("rename", filePath, nextName.trim());
      return;
    }
    if (action === "copy") {
      secretFileClipboard = { path: filePath, mode: "copy" };
      return;
    }
    if (action === "cut") {
      secretFileClipboard = { path: filePath, mode: "move" };
      return;
    }
    if (action === "delete" && await zkConfirm(`Przenieść plik „${String(filePath).split(/[\\/]/).pop()}” do Kosza?`, { title: "Usuń plik", danger: true })) {
      await runSecretFileOperation("delete", filePath);
    }
  });
}

function openSecretFolderMenu(event, folderPath) {
  if (!folderPath) return;
  event.preventDefault();
  event.stopPropagation();
  closeSecretFileMenu();
  const isRoot = secretFavoritePathKey(folderPath) === secretFavoritePathKey(secretExplorerState.rootPath);
  const menu = document.createElement("div");
  menu.className = "secret-file-context-menu";
  menu.innerHTML = `
    <button type="button" data-secret-folder-action="open">Otwórz folder</button>
    <button type="button" data-secret-folder-action="create">Nowy folder</button>
    <button type="button" data-secret-folder-action="paste" ${secretFileClipboard ? "" : "disabled"}>Wklej${secretFileClipboard?.mode === "move" ? " (przenieś)" : ""}</button>
    <span></span>
    <button type="button" data-secret-folder-action="rename" ${isRoot ? "disabled" : ""}>Zmień nazwę</button>
    <button type="button" data-secret-folder-action="copy" ${isRoot ? "disabled" : ""}>Kopiuj</button>
    <button type="button" data-secret-folder-action="cut" ${isRoot ? "disabled" : ""}>Wytnij</button>
    <button class="danger" type="button" data-secret-folder-action="delete" ${isRoot ? "disabled" : ""}>Usuń</button>
  `;
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8))}px`;
  menu.addEventListener("click", async (clickEvent) => {
    const button = clickEvent.target.closest("[data-secret-folder-action]");
    if (!button || button.disabled) return;
    const action = button.dataset.secretFolderAction;
    closeSecretFileMenu();
    if (action === "open") return openSecretFile(folderPath);
    if (action === "copy" || action === "cut") {
      secretFileClipboard = { path: folderPath, mode: action === "cut" ? "move" : "copy" };
      return;
    }
    if (action === "paste" && secretFileClipboard) {
      const clipboard = { ...secretFileClipboard };
      const ok = await runSecretFileOperation("paste", clipboard.path, "", { destination: folderPath, mode: clipboard.mode });
      if (ok && clipboard.mode === "move") secretFileClipboard = null;
      return;
    }
    if (action === "create") {
      const name = await zkPrompt("Podaj nazwę nowego folderu.", "Nowy folder", "Nowy folder");
      if (!name?.trim()) return;
      await runSecretFileOperation("create-folder", folderPath, name.trim());
      return;
    }
    if (action === "rename") {
      const currentName = String(folderPath).split(/[\\/]/).filter(Boolean).pop() || "";
      const name = await zkPrompt("Podaj nową nazwę folderu.", currentName, "Zmień nazwę folderu");
      if (!name?.trim() || name.trim() === currentName) return;
      await runSecretFileOperation("rename", folderPath, name.trim());
      return;
    }
    if (action === "delete" && await zkConfirm(`Przenieść folder „${String(folderPath).split(/[\\/]/).filter(Boolean).pop()}” do Kosza?`, { title: "Usuń folder", danger: true })) {
      await runSecretFileOperation("delete", folderPath);
    }
  });
}

async function openSecretFileParent(filePath) {
  await fetch("/api/open-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: filePath, openParent: true })
  });
}

async function runSecretFileOperation(action, filePath, name = "", options = {}) {
  try {
    const response = await fetch("/api/file-operation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, path: filePath, name, ...options })
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json().catch(() => ({}));
    const sourceKey = secretFavoritePathKey(filePath);
    const selectedKey = secretFavoritePathKey(secretExplorerState.selectedPath);
    const sourcePrefix = `${sourceKey}\\`;
    if ((action === "rename" || (action === "paste" && options.mode === "move")) && result.path) {
      if (selectedKey === sourceKey || selectedKey.startsWith(sourcePrefix)) {
        const suffix = String(secretExplorerState.selectedPath || "").slice(String(filePath).length);
        secretExplorerState.selectedPath = `${result.path}${suffix}`;
      }
      secretFavoriteFiles = secretFavoriteFiles.map((item) => secretFavoritePathKey(item) === sourceKey ? result.path : item);
    }
    if (action === "delete") {
      secretFavoriteFiles = secretFavoriteFiles.filter((item) => secretFavoritePathKey(item) !== sourceKey);
      if (selectedKey === sourceKey || selectedKey.startsWith(sourcePrefix)) {
        secretExplorerState.selectedPath = String(filePath).replace(/[\\/][^\\/]+[\\/]?$/, "") || secretExplorerState.rootPath;
      }
    }
    await refreshSecretExplorer();
    return true;
  } catch (error) {
    void zkAlert(`Nie udało się wykonać operacji na pliku.\n${error?.message || ""}`, "Błąd pliku");
    return false;
  }
}

function formatSecretFileSize(size = 0) {
  const value = Number(size) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatSecretFileDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function bindSecretSplitter() {
  if (secretExplorerState.splitterBound || !el.secretSplitter || !el.secretExplorer) return;
  secretExplorerState.splitterBound = true;
  el.secretSplitter.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const bounds = el.secretExplorer.getBoundingClientRect();
    const onMove = (moveEvent) => {
      const percent = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
      secretExplorerState.split = Math.max(20, Math.min(55, percent));
      el.secretExplorer.style.setProperty("--secret-tree-width", `${secretExplorerState.split}%`);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      rememberSecretExplorerView();
      persistUserState();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
}

function ensureBranchesKanban(project) {
  if (!project.branchesKanban || !Array.isArray(project.branchesKanban.columns)) {
    project.branchesKanban = {
      columns: DEFAULT_BRANCH_COLUMNS.map((title, index) => ({
        id: `branch-column-${index + 1}`,
        title,
        cards: []
      }))
    };
  }
  while (project.branchesKanban.columns.length < 5) {
    const index = project.branchesKanban.columns.length;
    project.branchesKanban.columns.push({
      id: `branch-column-${Date.now()}-${index}`,
      title: DEFAULT_BRANCH_COLUMNS[index] || `Kolumna ${index + 1}`,
      cards: []
    });
  }
  project.branchesKanban.columns = project.branchesKanban.columns.slice(0, MAX_BRANCH_COLUMNS).map((column, index) => ({
    id: column.id || `branch-column-${index + 1}`,
    title: LEGACY_BRANCH_COLUMNS[index] === column.title
      ? (DEFAULT_BRANCH_COLUMNS[index] || column.title)
      : (column.title || DEFAULT_BRANCH_COLUMNS[index] || `Kolumna ${index + 1}`),
    cards: Array.isArray(column.cards) ? column.cards : []
  }));
  return project.branchesKanban;
}

function branchTypeByName(name) {
  const types = syncBranchTypes();
  return types.find((item) => sameBranchName(item.name, name)) || types[0];
}

function renderBranchesBoard(project) {
  if (!el.branchesBoard || !project) return;
  const board = ensureBranchesKanban(project);
  el.branchesBoard.innerHTML = `
    <div class="branches-toolbar">
      ${board.columns.length < MAX_BRANCH_COLUMNS ? `<button type="button" data-add-branch-column>+ kolumna</button>` : ""}
    </div>
    <div class="branches-kanban" style="--branches-columns:${board.columns.length}">
      ${board.columns.map((column, columnIndex) => `
        <section class="branches-column ${branchColumnClass(columnIndex)}" data-branch-column="${columnIndex}">
          <header>
            <input class="branches-column-title" type="text" value="${escapeHtml(column.title)}" aria-label="Nazwa kolumny" data-branch-column-title="${columnIndex}" />
            <div class="branches-column-actions">
              <button type="button" data-toggle-branch-add="${columnIndex}" title="Dodaj branze">+</button>
              <button type="button" class="branches-delete-column" data-delete-branch-column="${columnIndex}" title="Usun kolumne">x</button>
            </div>
          </header>
          <div class="branches-card-list">
            ${column.cards.map((card, cardIndex) => branchCardHtml(card, columnIndex, cardIndex)).join("") || `<div class="branches-empty">Brak branz</div>`}
          </div>
          <div class="branches-add-row hidden" data-branch-add-row="${columnIndex}">
            ${syncBranchTypes().map((type) => `
              <button type="button" style="--branch-color:${type.color}" data-add-branch-card="${columnIndex}:${escapeHtml(type.name)}">
                <span class="branches-color-dot" aria-hidden="true"></span>
                <span>${escapeHtml(type.name)}</span>
              </button>
            `).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
  bindBranchesBoard(project);
}

function branchColumnClass(index) {
  return ["todo", "doing", "done", "todo", "doing"][index] || "todo";
}

function branchCardHtml(card, columnIndex, cardIndex) {
  const type = branchTypeByName(card.type || card.name);
  const color = type?.color || card.color || "#38bdf8";
  const fieldKey = (field) => `${columnIndex}:${cardIndex}:${field}`;
  return `
    <article class="branches-card kanban-order" draggable="true" style="--branch-color:${color}" data-branch-card="${columnIndex}:${cardIndex}">
      <div class="branches-card-head">
        <strong><span class="branches-color-dot" aria-hidden="true"></span>${escapeHtml(card.type || type.name)}</strong>
        <button type="button" class="delete-corner" title="Usun" data-delete-branch-card="${columnIndex}:${cardIndex}">x</button>
      </div>
      <div class="branches-card-dates">
        <input type="date" value="${escapeHtml(card.start || "")}" data-branch-field="${fieldKey("start")}" />
        <input type="date" value="${escapeHtml(card.end || "")}" data-branch-field="${fieldKey("end")}" />
      </div>
      <div class="branches-contact-row">
        <input class="branches-field" type="text" value="${escapeHtml(card.company || "")}" placeholder="Nazwa firmy" data-branch-field="${fieldKey("company")}" />
        <input class="branches-field" type="tel" value="${escapeHtml(card.phone || "")}" placeholder="Numer" data-branch-field="${fieldKey("phone")}" />
      </div>
      <div class="branches-card-actions">
      </div>
    </article>
  `;
}

function bindBranchesBoard(project) {
  el.branchesBoard.querySelectorAll("[data-branch-column-title]").forEach((input) => {
    input.addEventListener("change", () => {
      const board = ensureBranchesKanban(project);
      const column = board.columns[Number(input.dataset.branchColumnTitle)];
      if (!column) return;
      column.title = input.value.trim() || "Kolumna";
      schedulePersist();
      renderBranchesBoard(project);
    });
  });
  el.branchesBoard.querySelectorAll("[data-toggle-branch-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const row = el.branchesBoard.querySelector(`[data-branch-add-row="${button.dataset.toggleBranchAdd}"]`);
      row?.classList.toggle("hidden");
    });
  });
  el.branchesBoard.querySelectorAll("[data-delete-branch-column]").forEach((button) => {
    button.addEventListener("click", async () => {
      const board = ensureBranchesKanban(project);
      const columnIndex = Number(button.dataset.deleteBranchColumn);
      const column = board.columns[columnIndex];
      if (!column || board.columns.length <= 1) return;
      const suffix = column.cards.length ? ` Usunie tez ${column.cards.length} kart.` : "";
      if (!await zkConfirm(`Usunąć kolumnę ${column.title}?${suffix}`, { danger: true })) return;
      board.columns.splice(columnIndex, 1);
      schedulePersist();
      renderBranchesBoard(project);
    });
  });
  el.branchesBoard.querySelectorAll("[data-add-branch-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const board = ensureBranchesKanban(project);
      const [columnRaw, ...typeParts] = button.dataset.addBranchCard.split(":");
      const columnIndex = Number(columnRaw);
      const type = branchTypeByName(typeParts.join(":"));
      board.columns[columnIndex]?.cards.push({
        id: `branch-card-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: type.name,
        color: type.color,
        start: "",
        end: "",
        company: "",
        phone: ""
      });
      schedulePersist();
      renderBranchesBoard(project);
    });
  });
  el.branchesBoard.querySelector("[data-add-branch-column]")?.addEventListener("click", () => {
    const board = ensureBranchesKanban(project);
    if (board.columns.length >= MAX_BRANCH_COLUMNS) return;
    board.columns.push({
      id: `branch-column-${Date.now()}-${board.columns.length}`,
      title: DEFAULT_BRANCH_COLUMNS[board.columns.length] || `Kolumna ${board.columns.length + 1}`,
      cards: []
    });
    schedulePersist();
    renderBranchesBoard(project);
  });
  el.branchesBoard.querySelectorAll("[data-branch-field]").forEach((field) => {
    const update = () => {
      const [columnRaw, cardRaw, key] = field.dataset.branchField.split(":");
      const board = ensureBranchesKanban(project);
      const card = board.columns[Number(columnRaw)]?.cards[Number(cardRaw)];
      if (!card || !key) return;
      card[key] = field.value;
      schedulePersist();
    };
    field.addEventListener(field.tagName === "TEXTAREA" ? "input" : "change", update);
    if (field.tagName !== "TEXTAREA" && field.type !== "date") field.addEventListener("input", update);
  });
  bindBranchDragAndDrop(project);
  el.branchesBoard.querySelectorAll("[data-delete-branch-card]").forEach((button) => {
    button.addEventListener("click", () => {
      const [columnRaw, cardRaw] = button.dataset.deleteBranchCard.split(":");
      const board = ensureBranchesKanban(project);
      board.columns[Number(columnRaw)]?.cards.splice(Number(cardRaw), 1);
      schedulePersist();
      renderBranchesBoard(project);
    });
  });
}

function bindBranchDragAndDrop(project) {
  let draggedKey = "";

  const clearDragState = () => {
    el.branchesBoard.querySelectorAll(".drag-over, .drag-source").forEach((item) => {
      item.classList.remove("drag-over", "drag-source");
    });
  };

  el.branchesBoard.querySelectorAll("[data-branch-card]").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      if (event.target.closest("input, textarea, select, button")) {
        event.preventDefault();
        return;
      }
      draggedKey = card.dataset.branchCard;
      card.classList.add("drag-source");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedKey);
    });
    card.addEventListener("dragend", clearDragState);
  });

  el.branchesBoard.querySelectorAll("[data-branch-column]").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      if (!draggedKey && !event.dataTransfer.types.includes("text/plain")) return;
      event.preventDefault();
      column.classList.add("drag-over");
      event.dataTransfer.dropEffect = "move";
    });
    column.addEventListener("dragleave", (event) => {
      if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over");
    });
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      const sourceKey = draggedKey || event.dataTransfer.getData("text/plain");
      const [fromColumnRaw, fromCardRaw] = String(sourceKey || "").split(":");
      const fromColumn = Number(fromColumnRaw);
      const fromCard = Number(fromCardRaw);
      const toColumn = Number(column.dataset.branchColumn);
      const targetCard = event.target.closest("[data-branch-card]");
      const targetIndex = targetCard && targetCard.closest("[data-branch-column]") === column
        ? Number(targetCard.dataset.branchCard.split(":")[1])
        : null;
      moveBranchCardTo(project, fromColumn, fromCard, toColumn, targetIndex);
      draggedKey = "";
      clearDragState();
    });
  });
}

function moveBranchCardTo(project, fromColumnIndex, fromCardIndex, toColumnIndex, beforeIndex = null) {
  const board = ensureBranchesKanban(project);
  const from = board.columns[fromColumnIndex];
  const to = board.columns[toColumnIndex];
  if (!from || !to || !Number.isFinite(fromCardIndex) || !Number.isFinite(toColumnIndex)) return;
  const [card] = from.cards.splice(fromCardIndex, 1);
  if (!card) return;
  let insertAt = Number.isFinite(beforeIndex) ? beforeIndex : to.cards.length;
  if (from === to && insertAt > fromCardIndex) insertAt -= 1;
  insertAt = Math.max(0, Math.min(insertAt, to.cards.length));
  to.cards.splice(insertAt, 0, card);
  schedulePersist();
  renderBranchesBoard(project);
}

function moveBranchCard(project, columnIndex, cardIndex, direction) {
  const board = ensureBranchesKanban(project);
  const from = board.columns[columnIndex];
  const to = board.columns[columnIndex + direction];
  if (!from || !to) return;
  const [card] = from.cards.splice(cardIndex, 1);
  if (!card) return;
  to.cards.push(card);
  schedulePersist();
  renderBranchesBoard(project);
}

function renderProjects() {
  el.projectList.innerHTML = "";

  visibleProjects().forEach((project) => {
    ensureProjectColor(project);
    const row = document.createElement("div");
    row.className = `project-row ${project.selected ? "selected" : ""}`;
    row.draggable = true;
    row.dataset.projectId = project.id;
    row.style.setProperty("--project-color", project.color);
    row.innerHTML = `
      <button class="project-color-strip" type="button" title="Zmien kolor projektu" aria-label="Zmien kolor projektu ${project.name}"></button>
      <button class="project-open" type="button" aria-pressed="${project.selected ? "true" : "false"}">
        <strong data-short-name="${escapeHtml(project.name.slice(0, 5))}">${project.name}</strong>
        <span>${project.client}</span>
      </button>
      <div class="project-tools">
        <input class="project-color-input" type="color" value="${project.color}" aria-label="Kolor projektu ${project.name}" />
        <button class="folder-open" type="button" title="Kliknij: otworz folder. Przytrzymaj: ustaw sciezke." aria-label="Otworz folder projektu ${project.name}" data-project-folder="${project.id}">
          <span class="folder-icon" aria-hidden="true"></span>
        </button>
      </div>
    `;

    const openButton = row.querySelector(".project-open");
    openButton.addEventListener("click", () => {
      if (openButton.dataset.longPressed === "true") {
        openButton.dataset.longPressed = "false";
        return;
      }
      selectProject(project, shouldNavigateProjectClick());
    });
    openButton.addEventListener("dblclick", (event) => {
      event.preventDefault();
      event.stopPropagation();
      renameProject(project);
    });
    bindProjectNameLongPress(openButton, project);
    const colorInput = row.querySelector(".project-color-input");
    row.querySelector(".project-color-strip")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      colorInput?.click();
    });
    colorInput.addEventListener("input", (event) => {
      project.color = event.target.value;
      pendingProjectColorUpdates[project.id] = project.color;
      row.style.setProperty("--project-color", project.color);
      renderCenter();
      renderPreview();
      renderAssignmentMode();
      clearTimeout(persistenceTimer);
      persistenceTimer = setTimeout(() => persistNow(), 120);
    });
    bindProjectFolderButton(row.querySelector("[data-project-folder]"), project);
    row.addEventListener("click", (event) => {
      if (event.target.closest("button, input")) return;
      selectProject(project, shouldNavigateProjectClick());
    });
    row.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", project.id);
      event.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragover", (event) => event.preventDefault());
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      moveProject(event.dataTransfer.getData("text/plain"), project.id);
    });
    el.projectList.append(row);
  });
}

function bindProjectNameLongPress(button, project) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    startX = event.clientX;
    startY = event.clientY;
    clear();
    timer = window.setTimeout(() => {
      button.dataset.longPressed = "true";
      renameProject(project);
    }, 650);
  });

  button.addEventListener("pointermove", (event) => {
    if (Math.abs(event.clientX - startX) > 8 || Math.abs(event.clientY - startY) > 8) clear();
  });
  button.addEventListener("pointerup", clear);
  button.addEventListener("pointercancel", clear);
  button.addEventListener("pointerleave", clear);
}

function renderCenter() {
  const tomorrow = addDays(today, 1);
  const orders = assignmentOrders()
    .filter((order) => personFilter === "all" || order.assignee === personFilter)
    .filter((order) => orderProgress(order) < 100);
  const todayOrders = orders.filter((order) => sameDate(parseDate(order.due), today));
  const tomorrowOrders = orders.filter((order) => sameDate(parseDate(order.due), tomorrow));
  const rangeOrders = orders.filter((order) => dashboardRangeMatch(order));

  el.todayCount.textContent = todayOrders.length;
  el.weekCount.textContent = tomorrowOrders.length;
  el.stageCount.textContent = rangeOrders.length;
  renderOrderList(el.todayTasks, todayOrders, dashboardEmptyText("today"));
  renderOrderList(el.weekTasks, tomorrowOrders, dashboardEmptyText("tomorrow"));
  renderOrderList(el.endingStages, rangeOrders, dashboardRangeEmptyText());
}

function renderOrderList(container, orders, emptyText) {
  container.innerHTML = "";
  if (!orders.length) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  orders
    .sort((a, b) => parseDate(a.due) - parseDate(b.due))
    .forEach((order) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "task-card order-dashboard-card";
      const projectColor = currentProjectColor(order.projectId, order.project);
      card.style.setProperty("--order-project-color", projectColor);
      card.style.setProperty("--order-project-color-soft", hexToRgba(projectColor, 0.16));
      card.innerHTML = orderCardHtml(order, projectColor);
      card.addEventListener("click", () => {
        const project = projects.find((item) => item.id === order.projectId);
        activeOrderIndex = order.orderIndex;
        openProject(project, { type: "task", index: order.taskIndex, orderIndex: order.orderIndex });
      });
      container.append(card);
    });
}

function renderAssignmentMode() {
  el.assignmentMode.classList.toggle("hidden", false);
  el.assignmentMode.classList.toggle("personal-assignment", dashboardMode === "ops");

  const selected = selectedProjects();
  if (!planningProjectId || !selected.some((project) => project.id === planningProjectId)) {
    planningProjectId = selected[0]?.id || null;
  }
  const project = projects.find((item) => item.id === planningProjectId);
  el.assignmentProjectLabel.textContent = project ? `${project.name} - ${project.client}` : "Zaznacz projekt";
  el.assignmentForm.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !project;
  });
  renderAssignmentTaskOptions(project);
  renderAssignmentTimeline();
  renderAssignmentDraft();
  renderAssignmentExistingPanel();
  renderPriorityRanges();
}

function renderAssignmentTaskOptions(project) {
  const current = el.assignmentTask.value;
  if (!project) {
    el.assignmentTask.innerHTML = '<option value="">Brak projektu</option>';
    renderAssignmentSuggestionPicker(null);
    return;
  }
  project.tasks.forEach(ensureTaskOrders);
  el.assignmentTask.innerHTML = project.tasks
    .map((task, index) => `<option value="${index}">${task.title} / ${task.stage}</option>`)
    .join("");
  if (current && project.tasks[Number(current)]) {
    el.assignmentTask.value = current;
  }
  suggestAssignmentTask();
}

function assignmentStageNames(project) {
  return [...new Set((project?.tasks || []).map((task) => task.stage || "Etap"))];
}

function currentAssignmentTask(project) {
  if (!project?.tasks?.length) return null;
  const index = Number(el.assignmentTask.value);
  return project.tasks[index] ? { task: project.tasks[index], index } : { task: project.tasks[0], index: 0 };
}

function renderAssignmentSuggestionPicker(project) {
  if (!project?.tasks?.length) {
    el.assignmentSuggestion.innerHTML = "";
    return;
  }
  const current = currentAssignmentTask(project);
  if (!current) {
    el.assignmentSuggestion.innerHTML = "";
    return;
  }
  const projectOptions = visibleProjects()
    .map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === project.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
    .join("");
  const selectedStage = current.task.stage || "Etap";
  const stageOptions = assignmentStageNames(project)
    .map((stage) => `<option value="${escapeHtml(stage)}" ${stage === selectedStage ? "selected" : ""}>${escapeHtml(stage)}</option>`)
    .join("");
  const taskOptions = project.tasks
    .map((task, index) => ({ task, index }))
    .filter((item) => (item.task.stage || "Etap") === selectedStage)
    .map((item) => `<option value="${item.index}" ${item.index === current.index ? "selected" : ""}>${escapeHtml(item.task.title)}</option>`)
    .join("");

  el.assignmentSuggestion.innerHTML = `
    <div class="assignment-suggestion-picker">
      <label>
        <span>Projekt</span>
        <select data-assignment-project>${projectOptions}</select>
      </label>
      <label>
        <span>Etap</span>
        <select data-assignment-stage>${stageOptions}</select>
      </label>
      <label>
        <span>Zadanie</span>
        <select data-assignment-task>${taskOptions}</select>
      </label>
    </div>
  `;
}

function handleAssignmentSuggestionChange(event) {
  const project = projects.find((item) => item.id === planningProjectId);
  const projectSelect = event.target.closest("[data-assignment-project]");
  if (projectSelect) {
    planningProjectId = projectSelect.value;
    ensureSingleSelectedProject(planningProjectId);
    assignmentTaskManuallySelected = false;
    renderAssignmentMode();
    return;
  }
  if (!project) return;
  const stageSelect = event.target.closest("[data-assignment-stage]");
  const taskSelect = event.target.closest("[data-assignment-task]");
  if (stageSelect) {
    const index = project.tasks.findIndex((task) => (task.stage || "Etap") === stageSelect.value);
    if (index >= 0) el.assignmentTask.value = String(index);
    assignmentTaskManuallySelected = true;
    renderAssignmentDraft();
    renderAssignmentSuggestionPicker(project);
  }
  if (taskSelect) {
    el.assignmentTask.value = taskSelect.value;
    assignmentTaskManuallySelected = true;
    renderAssignmentDraft();
    renderAssignmentSuggestionPicker(project);
  }
}

function assignmentOrders() {
  const sourceProjects = assignmentShowAllProjects
    ? visibleProjects()
    : selectedProjects();
  return sourceProjects.flatMap((project) => {
    ensureTaskRanges(project);
    return project.tasks.flatMap((task, taskIndex) => {
      ensureTaskOrders(task);
      return task.orders.map((order, orderIndex) => ({
        ...order,
        projectId: project.id,
        project: project.name,
        projectColor: ensureProjectColor(project),
        taskIndex,
        taskTitle: task.title,
        orderIndex,
        priority: order.priority || task.priority || "sredni"
      }));
    });
  });
}

function renderAssignmentTimeline() {
  clampAssignmentWindowToLimits();
  const people = assignmentTimelinePeople();
  const orders = assignmentOrders()
    .filter((order) => order.assignee && order.assignee !== "Zespol")
    .filter((order) => people.some((person) => samePerson(order.assignee, person)));
  const dayWidth = assignmentDayWidthPercent();
  const visibleDays = assignmentVisibleDays();
  const axisWidth = assignmentAxisWidth(visibleDays);
  el.assignmentCount.textContent = orders.length;
  el.assignmentTimeline.innerHTML = `
    <div class="assignment-gantt-shell">
      <div class="assignment-left-rail">
        <div class="assignment-gantt-tools">
          <button class="dn-icon-button" type="button" data-assignment-zoom="1.25" title="Pomniejsz">-</button>
          <button class="dn-icon-button" type="button" data-assignment-zoom="0.8" title="Powieksz">+</button>
          <button class="dn-icon-button" type="button" data-assignment-reset title="Pelny zakres">[]</button>
          <button class="dn-icon-button assignment-all-projects ${assignmentShowAllProjects ? "active" : ""}" type="button" data-assignment-all-projects title="${assignmentShowAllProjects ? "Pokazuje wszystkie projekty" : "Pokaz zlecenia ze wszystkich projektow"}" aria-pressed="${assignmentShowAllProjects ? "true" : "false"}">W</button>
          <button class="dn-icon-button assignment-add-person" type="button" data-assignment-add-person title="Dodaj pracownika z bazy">+P</button>
          <button class="dn-icon-button assignment-remove-person" type="button" data-assignment-remove-person title="Usun pracownika z osi">-P</button>
        </div>
        <div class="assignment-left-scale-spacer"></div>
        ${people.map((person) => assignmentPersonRail(person)).join("")}
      </div>
      <div class="assignment-axis-viewport" style="--assignment-axis-width:${axisWidth}px">
        <div class="assignment-gantt" data-assignment-gantt-scroll style="--assignment-day-width:${dayWidth}%;--assignment-axis-width:${axisWidth}px">
          ${assignmentScale()}
          ${assignmentTodayLine(axisWidth)}
          ${people.map((person) => assignmentPersonAxisRows(person, orders.filter((order) => order.assignee === person))).join("")}
        </div>
        <div class="assignment-scrollbar-row">
          <button class="assignment-scroll-arrow" type="button" data-assignment-scroll-step="-1" aria-label="Przewin os w lewo"></button>
          <div class="assignment-bottom-scroll" data-assignment-bottom-scroll aria-label="Przewijanie osi zlecen w poziomie">
            <div style="width:${axisWidth}px"></div>
          </div>
          <button class="assignment-scroll-arrow right" type="button" data-assignment-scroll-step="1" aria-label="Przewin os w prawo"></button>
        </div>
      </div>
    </div>
    ${assignmentDatePopoverHtml()}
  `;
  bindAssignmentTimelineControls();
  syncAssignmentScrollbars();
  requestAnimationFrame(() => scrollAssignmentDateIntoView(assignmentScrollDate || today, false));
  bindAssignmentDrops();
  bindAssignmentDatePopover();
}

function clampAssignmentWindowToLimits() {
  // Recznie ustawiony zakres (takze zachowany podczas przesuwania zlecen)
  // nie moze byc przeliczany na podstawie nowych dat elementow.
  if (assignmentManualWindow) return;
  const range = assignmentOrdersDateRange();
  const minimum = range?.start || today;
  const maximum = addDays(today, 365);
  let start = parseDate(assignmentViewStart);
  let end = parseDate(assignmentViewEnd);
  const visibleDays = Math.max(1, daysBetween(start, end) + 1);
  if (start < minimum) {
    start = new Date(minimum);
    end = addDays(start, visibleDays - 1);
  }
  if (end > maximum) {
    end = new Date(maximum);
    start = addDays(end, -(visibleDays - 1));
    if (start < minimum) start = new Date(minimum);
  }
  assignmentViewStart = dateString(start);
  assignmentViewEnd = dateString(end);
  const remembered = parseDate(assignmentScrollDate || assignmentViewStart);
  if (remembered < start) assignmentScrollDate = assignmentViewStart;
  else if (remembered > end) assignmentScrollDate = assignmentViewEnd;
}

function assignmentTimelinePeople() {
  const currentPerson = currentChatPersonName();
  const source = dashboardMode === "ops" ? assignmentPeople : peopleList();
  const people = [];
  source.filter(Boolean).forEach((person) => {
    if (!people.some((item) => samePerson(item, person))) people.push(person);
  });

  if (dashboardMode === "ops" && currentPerson && !people.some((person) => samePerson(person, currentPerson))) {
    people.unshift(currentPerson);
  }

  if (!people.length && currentPerson) people.push(currentPerson);
  return people;
}

function assignmentPersonRow(person, orders) {
  const priorities = [
    ["wysoki", "Wysoki"],
    ["sredni", "Średni"],
    ["niski", "Niski"]
  ];
  return `
    <section class="assignment-person-row">
      <button class="assignment-person" type="button" data-assignment-person="${person}">
        ${avatar(person)}
        <strong>${person}</strong>
      </button>
      ${priorities
        .map(([priority, label]) => `
          <div class="assignment-priority-row">
            <div class="assignment-priority-name">${label}</div>
            <div class="assignment-lane" data-assignee="${person}" data-priority="${priority}">
              ${assignmentWeekendMarkers()}
              ${assignmentLeaveMarkers(person)}
              ${orders.filter((order) => (order.priority || "sredni") === priority).map(assignmentBarHtml).join("")}
            </div>
          </div>
        `)
        .join("")}
    </section>
  `;
}

function ensureExamplePeople(people) {
  const unique = [...new Set(people.filter(Boolean))];
  return unique;
}

function assignmentPersonRail(person) {
  const priorities = [
    ["wysoki", "Wysoki"],
    ["sredni", "Średni"],
    ["niski", "Niski"]
  ];
  return `
    <section class="assignment-person-rail">
      <button class="assignment-person" type="button" data-assignment-person="${person}">
        ${avatar(person)}
        <strong>${person}</strong>
      </button>
      ${priorities.map(([priority, label]) => `
        <div class="assignment-priority-name" data-priority-label="${priority}">${label}</div>
      `).join("")}
    </section>
  `;
}

function assignmentPersonAxisRows(person, orders) {
  const priorities = [
    ["wysoki", "Wysoki"],
    ["sredni", "Średni"],
    ["niski", "Niski"]
  ];
  return `
    <section class="assignment-person-axis-row">
      ${priorities.map(([priority]) => `
        <div class="assignment-lane" data-assignee="${person}" data-priority="${priority}">
          ${assignmentWeekendMarkers()}
          ${assignmentLeaveMarkers(person)}
          ${orders.filter((order) => (order.priority || "sredni") === priority).map(assignmentBarHtml).join("")}
        </div>
      `).join("")}
    </section>
  `;
}

function assignmentBarHtml(order) {
  const position = assignmentRangePosition(order.start || order.due, order.due);
  const key = `${order.projectId}:${order.taskIndex}:${order.orderIndex}`;
  const doneClass = orderProgress(order) >= 100 ? "done" : "";
  const projectColor = order.projectColor || colorFromName(order.project || order.projectId);
  const projectColorDark = shadeColor(projectColor, -18);
  return `
    <button class="assignment-bar ${doneClass} ${selectedAssignmentKey === key ? "active" : ""}" type="button" data-assignment-order="${key}" style="left:${position.left}%;width:${position.width}%;--assignment-color:${projectColor};--assignment-color-dark:${projectColorDark}">
      <span class="assignment-handle left" data-assignment-handle="${key}" data-edge="start"></span>
      <span class="assignment-bar-label">${order.title}</span>
      <span class="assignment-handle right" data-assignment-handle="${key}" data-edge="end"></span>
    </button>
  `;
}

function renderAssignmentDraft() {
  const project = projects.find((item) => item.id === planningProjectId);
  const title = el.assignmentTitle.value.trim();
  const description = el.assignmentDescription.value.trim();
  const task = project?.tasks?.[Number(el.assignmentTask.value)];
  const isReady = Boolean(project && title);
  if (el.assignmentCreatePanel) {
    el.assignmentCreatePanel.dataset.ready = isReady ? "true" : "false";
    el.assignmentCreatePanel.classList.toggle("draft-ready", isReady);
    el.assignmentCreatePanel.classList.toggle("empty", !title);
    el.assignmentCreatePanel.onpointerdown = title ? startAssignmentDraftPush : null;
  }
  el.assignmentPool.disabled = false;
  el.assignmentPool.draggable = false;
  el.assignmentPool.dataset.ready = isReady ? "true" : "false";
  el.assignmentPool.classList.toggle("empty", !title);
  el.assignmentPool.innerHTML = title
    ? `
      <strong>${title}</strong>
      ${description ? `<small>${description}</small>` : ""}
      <span>${project.name} / ${task?.title || "zadanie"} / ${formatDate(parseDate(el.assignmentStart.value || today))} - ${formatDate(parseDate(el.assignmentDue.value || today))}</span>
    `
    : `
      <strong>Nowe zlecenie</strong>
    `;
  el.assignmentPool.onpointerdown = title ? startAssignmentDraftPush : null;
}

function renderAssignmentExistingPanel() {
  if (!el.assignmentExistingPanel) return;
  const target = selectedAssignmentKey ? assignmentOrderTarget(selectedAssignmentKey) : null;
  if (!target) {
    el.assignmentExistingPanel.innerHTML = `
      <div class="assignment-existing-placeholder">
        <strong>Brak zaznaczonego zlecenia</strong>
        <span>Kliknij pasek na osi, zeby pokazac tutaj nazwe, opis, daty i osobe.</span>
      </div>
    `;
    return;
  }
  const order = target.order;
  const orderIndex = target.task.orders.indexOf(order);
  const priority = order.priority || "sredni";
  el.assignmentExistingPanel.innerHTML = `
    <div class="assignment-existing-grid">
      <label class="assignment-existing-title">
        <span>Nazwa</span>
        <input type="text" value="${escapeAttr(order.title || "")}" data-assignment-existing-field="title" />
      </label>
      <label class="assignment-existing-description">
        <span>Opis</span>
        <textarea rows="2" data-assignment-existing-field="description">${escapeHtml(order.description || "")}</textarea>
      </label>
      <div class="assignment-existing-control-row">
        <label class="assignment-existing-priority priority-${priority}">
          <span>Priorytet</span>
          <select data-assignment-existing-field="priority">
            <option value="wysoki" ${priority === "wysoki" ? "selected" : ""}>Wysoki</option>
            <option value="sredni" ${priority === "sredni" ? "selected" : ""}>Sredni</option>
            <option value="niski" ${priority === "niski" ? "selected" : ""}>Niski</option>
          </select>
        </label>
        <label class="assignment-existing-date start">
          <span>Od</span>
          <input type="date" value="${order.start || order.due}" data-assignment-existing-field="start" />
        </label>
        <label class="assignment-existing-date due">
          <span>Do</span>
          <input type="date" value="${order.due}" data-assignment-existing-field="due" />
        </label>
        <label class="assignment-existing-assignee">
          <span>Osoba</span>
          ${avatar(order.assignee || "Zespol")}
          <select data-assignment-existing-field="assignee">${peopleOptions(order.assignee)}</select>
        </label>
        <button type="button" data-assignment-existing-open>Otworz w projekcie</button>
        <button class="danger" type="button" data-assignment-existing-delete>Usun zlecenie</button>
      </div>
    </div>
    ${renderOrderChecklistPanel(order, orderIndex)}
  `;
  bindAssignmentExistingPanel();
}

function bindAssignmentExistingPanel() {
  if (!el.assignmentExistingPanel) return;
  if (el.assignmentExistingPanel.dataset.controlsBound !== "true") {
    el.assignmentExistingPanel.dataset.controlsBound = "true";

    el.assignmentExistingPanel.addEventListener("pointerdown", (event) => {
      if (event.target.closest("input, textarea, select, button")) event.stopPropagation();
    });

    el.assignmentExistingPanel.addEventListener("change", async (event) => {
      const input = event.target.closest("[data-assignment-existing-field]");
      if (!input) return;
      const target = selectedAssignmentKey ? assignmentOrderTarget(selectedAssignmentKey) : null;
      if (!target) return;
      const field = input.dataset.assignmentExistingField;
      const previous = {
        start: target.order.start,
        due: target.order.due,
        assignee: target.order.assignee,
        priority: target.order.priority
      };
      target.order[field] = field === "start" || field === "due" ? dateString(nextWorkday(input.value)) : input.value;
      if (parseDate(target.order.due) < parseDate(target.order.start || target.order.due)) {
        target.order.due = target.order.start || target.order.due;
      }
      if (assignmentRangeHitsLeave(target.order.assignee, target.order.start || target.order.due, target.order.due)) {
        const force = await alertLeaveCollision(target.order.assignee);
        if (!force) {
          Object.assign(target.order, previous);
          renderAssignmentMode();
          renderCenter();
          return;
        }
      }
      if (["start", "due", "assignee", "priority"].includes(field)) {
        resolveAssignmentLaneCollisions(target.order);
      }
      schedulePersist();
      renderPeopleFilter();
      renderAssignmentMode();
      renderCenter();
    });

    el.assignmentExistingPanel.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-assignment-existing-open]");
      const deleteButton = event.target.closest("[data-assignment-existing-delete]");
      if (!openButton && !deleteButton) return;
      event.preventDefault();
      event.stopPropagation();
      const target = selectedAssignmentKey ? assignmentOrderTarget(selectedAssignmentKey) : null;
      if (!target) return;
      if (openButton) {
        openProject(target.project, {
          type: "task",
          index: target.project.tasks.indexOf(target.task),
          orderIndex: target.task.orders.indexOf(target.order)
        });
        return;
      }
      deleteAssignmentExistingOrder(target);
    });

    el.assignmentExistingPanel.addEventListener("change", (event) => {
      const doneInput = event.target.closest("[data-assignment-existing-done]");
      if (!doneInput) return;
      const target = selectedAssignmentKey ? assignmentOrderTarget(selectedAssignmentKey) : null;
      if (target) setAssignmentExistingDone(target, doneInput.checked);
    });
  }

  const target = selectedAssignmentKey ? assignmentOrderTarget(selectedAssignmentKey) : null;
  if (!target) return;
  bindAssignmentChecklistPanel(target);
}

function setAssignmentExistingDone(target, done) {
  if (!target?.order) return;
  target.order.status = done ? "Zrobione" : "Do zrobienia";
  (target.order.checklist || []).forEach((item) => {
    item.done = done;
  });
  activeOrderIndex = Math.max(0, target.task.orders.indexOf(target.order));
  dnSelection = { type: "task", index: target.project.tasks.indexOf(target.task) };
  schedulePersist();
  renderPeopleFilter();
  renderAssignmentMode();
  renderCenter();
}

async function deleteAssignmentExistingOrder(target) {
  if (!target?.task || !target.order) return;
  const orderIndex = target.task.orders.indexOf(target.order);
  if (orderIndex < 0) return;
  if (!await zkConfirm(`Usunąć zlecenie "${target.order.title}" razem z checklistami?`, { danger: true })) return;
  target.task.orders.splice(orderIndex, 1);
  selectedAssignmentKey = null;
  activeOrderIndex = Math.max(0, orderIndex - 1);
  schedulePersist();
  renderPeopleFilter();
  renderAssignmentMode();
  renderCenter();
}

function bindAssignmentChecklistPanel(target) {
  if (!target || !el.assignmentExistingPanel) return;
  const task = target.task;
  const rerender = () => {
    renderAssignmentMode();
    renderCenter();
  };

  el.assignmentExistingPanel.querySelectorAll("[data-add-check]").forEach((button) => {
    button.addEventListener("click", () => {
      const orderIndex = Number(button.dataset.addCheck);
      const order = task.orders[orderIndex];
      if (!order) return;
      order.checklist = order.checklist || [];
      order.checklist.push({ text: "Nowa pozycja", done: false, image: "" });
      const checkIndex = order.checklist.length - 1;
      rerender();
      requestAnimationFrame(() => {
        const input = el.assignmentExistingPanel.querySelector(`[data-check-title][data-order-index="${orderIndex}"][data-check-index="${checkIndex}"]`);
        input?.focus();
        input?.select();
      });
    });
  });

  el.assignmentExistingPanel.querySelectorAll("[data-order-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const order = task.orders[Number(checkbox.dataset.orderIndex)];
      const item = order?.checklist?.[Number(checkbox.dataset.checkIndex)];
      if (!item) return;
      item.done = checkbox.checked;
      rerender();
    });
  });

  el.assignmentExistingPanel.querySelectorAll("[data-check-title]").forEach((input) => {
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("change", () => {
      const orderIndex = Number(input.dataset.orderIndex);
      const checkIndex = Number(input.dataset.checkIndex);
      const item = task.orders[orderIndex]?.checklist?.[checkIndex];
      const title = input.value.trim();
      if (!item || !title) {
        input.value = item?.text || "";
        return;
      }
      item.text = title;
      rerender();
    });
  });

  el.assignmentExistingPanel.querySelectorAll("[data-delete-check]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.orderIndex);
      const checkIndex = Number(button.dataset.checkIndex);
      const item = task.orders[orderIndex]?.checklist?.[checkIndex];
      if (!item || !await zkConfirm(`Usunąć pozycję checklisty "${item.text}"?`, { danger: true })) return;
      task.orders[orderIndex].checklist.splice(checkIndex, 1);
      rerender();
    });
  });

  el.assignmentExistingPanel.querySelectorAll("[data-check-image]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const orderIndex = Number(input.dataset.orderIndex);
      const checkIndex = Number(input.dataset.checkIndex);
      readFileAsDataUrl(file).then((imageData) => {
        const item = task.orders[orderIndex]?.checklist?.[checkIndex];
        if (!item) return;
        item.image = imageData;
        rerender();
      });
    });
  });

  el.assignmentExistingPanel.querySelectorAll("[data-check-clipboard]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.orderIndex);
      const checkIndex = Number(button.dataset.checkIndex);
      const imageData = await readClipboardImageData();
      const item = task.orders[orderIndex]?.checklist?.[checkIndex];
      if (!imageData || !item) return;
      item.image = imageData;
      rerender();
    });
  });

  el.assignmentExistingPanel.querySelectorAll("[data-remove-check-image]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.orderIndex);
      const checkIndex = Number(button.dataset.checkIndex);
      const item = task.orders[orderIndex]?.checklist?.[checkIndex];
      if (!item) return;
      item.image = "";
      rerender();
    });
  });
}

function startAssignmentDraftPush(event) {
  const source = event.currentTarget?.closest?.(".assignment-create-panel, .assignment-draft-card") || el.assignmentPool;
  if (source !== el.assignmentPool && event.target.closest("input, textarea, select, button")) return;
  if (el.assignmentPool.dataset.ready !== "true") return;
  event.preventDefault();
  event.stopPropagation();
  source.setPointerCapture?.(event.pointerId);
  const sourceRect = source.getBoundingClientRect();
  const ghost = source.cloneNode(true);
  ghost.classList.add("dragging");
  ghost.style.position = "fixed";
  ghost.style.left = `${sourceRect.left}px`;
  ghost.style.top = `${sourceRect.top}px`;
  ghost.style.width = `${sourceRect.width}px`;
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "999";
  document.body.append(ghost);

  const offsetX = event.clientX - sourceRect.left;
  const offsetY = event.clientY - sourceRect.top;
  let lastClientX = event.clientX;
  let lastClientY = event.clientY;
  const moveGhost = (clientX, clientY) => {
    lastClientX = clientX;
    lastClientY = clientY;
    ghost.style.left = `${clientX - offsetX}px`;
    ghost.style.top = `${clientY - offsetY}px`;
  };

  const onMove = (moveEvent) => {
    moveGhost(moveEvent.clientX, moveEvent.clientY);
    document.querySelectorAll(".assignment-lane.drag-over").forEach((lane) => lane.classList.remove("drag-over"));
    document.querySelectorAll("[data-assignment-person].drag-over").forEach((button) => button.classList.remove("drag-over"));
    const target = assignmentDropTargetFromPoint(moveEvent.clientX, moveEvent.clientY);
    target?.lane?.classList.add("drag-over");
    target?.person?.classList.add("drag-over");
  };

  const onUp = async (upEvent) => {
    const clientX = upEvent.clientX || lastClientX;
    const clientY = upEvent.clientY || lastClientY;
    const target = assignmentDropTargetFromPoint(clientX, clientY);
    document.querySelectorAll(".assignment-lane.drag-over").forEach((item) => item.classList.remove("drag-over"));
    document.querySelectorAll("[data-assignment-person].drag-over").forEach((button) => button.classList.remove("drag-over"));
    ghost.remove();
    source.releasePointerCapture?.(event.pointerId);
    source.removeEventListener("pointermove", onMove);
    source.removeEventListener("pointerup", onUp);
    source.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    if (target?.person?.dataset.assignmentPerson) {
      await createAssignmentForPerson(target.person.dataset.assignmentPerson);
      return;
    }
    const lane = target?.lane;
    if (!lane?.dataset.assignee || !lane?.dataset.priority) return;

    await createAssignmentOnLane(lane);
  };

  const onCancel = () => {
    document.querySelectorAll(".assignment-lane.drag-over").forEach((item) => item.classList.remove("drag-over"));
    document.querySelectorAll("[data-assignment-person].drag-over").forEach((button) => button.classList.remove("drag-over"));
    ghost.remove();
    source.releasePointerCapture?.(event.pointerId);
    source.removeEventListener("pointermove", onMove);
    source.removeEventListener("pointerup", onUp);
    source.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  };

  source.addEventListener("pointermove", onMove);
  source.addEventListener("pointerup", onUp, { once: true });
  source.addEventListener("pointercancel", onCancel, { once: true });
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
  window.addEventListener("pointercancel", onCancel, { once: true });
}

function assignmentDropTargetFromPoint(clientX, clientY) {
  const person = document.elementFromPoint(clientX, clientY)?.closest("[data-assignment-person]");
  if (person) return { person };
  const lane = assignmentLaneFromPoint(clientX, clientY);
  return lane ? { lane } : null;
}

function assignmentLaneFromPoint(clientX, clientY) {
  const direct = document.elementFromPoint(clientX, clientY)?.closest(".assignment-lane");
  if (direct) return direct;

  let nearest = null;
  let nearestDistance = Infinity;
  document.querySelectorAll(".assignment-lane").forEach((lane) => {
    const rect = lane.getBoundingClientRect();
    const insideX = clientX >= rect.left && clientX <= rect.right;
    const insideY = clientY >= rect.top - 10 && clientY <= rect.bottom + 10;
    if (insideX && insideY) {
      nearest = lane;
      nearestDistance = 0;
      return;
    }

    const dx = clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
    const dy = clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
    const distance = Math.hypot(dx, dy);
    if (distance < nearestDistance) {
      nearest = lane;
      nearestDistance = distance;
    }
  });

  return nearestDistance <= 36 ? nearest : null;
}

function assignmentDraftReady() {
  return el.assignmentPool.dataset.ready === "true" && Boolean(el.assignmentTitle.value.trim());
}

async function createAssignmentOnLane(lane) {
  if (!assignmentDraftReady() || !lane?.dataset.assignee || !lane?.dataset.priority) return null;
  const target = await createAssignmentOrderFromForm({
    assignee: lane.dataset.assignee,
    priority: lane.dataset.priority
  });
  if (!target) return null;
  resolveAssignmentLaneCollisions(target.order);
  dnSelection = { type: "task", index: target.taskIndex };
  activeOrderIndex = target.orderIndex;
  selectedAssignmentKey = `${target.project.id}:${target.taskIndex}:${target.orderIndex}`;
  renderPeopleFilter();
  renderAssignmentMode();
  renderCenter();
  return target;
}

async function createAssignmentForPerson(person, priority = el.assignmentPriority.value) {
  if (!assignmentDraftReady() || !person) return null;
  const target = await createAssignmentOrderFromForm({
    assignee: person,
    priority
  });
  if (!target) return null;
  resolveAssignmentLaneCollisions(target.order);
  dnSelection = { type: "task", index: target.taskIndex };
  activeOrderIndex = target.orderIndex;
  selectedAssignmentKey = `${target.project.id}:${target.taskIndex}:${target.orderIndex}`;
  renderPeopleFilter();
  renderAssignmentMode();
  renderCenter();
  return target;
}

function bindAssignmentDraggables() {
  document.querySelectorAll("[data-assignment-order]").forEach((item) => {
    item.addEventListener("dblclick", async () => {
      const target = assignmentOrderTarget(item.dataset.assignmentOrder);
      if (!target) return;
      const title = await zkPrompt("Nazwa drugiej części zlecenia", `${target.order.title} - część 2`, "Podziel zlecenie");
      if (!title) return;
      target.task.orders.push({
        ...target.order,
        id: createStableId("order"),
        title,
        checklist: []
      });
      renderAssignmentMode();
      renderCenter();
    });
  });
}

function bindAssignmentDrops() {
  bindAssignmentDraggables();
  el.assignmentTimeline.querySelectorAll("[data-assignment-person]").forEach((personButton) => {
    personButton.title = "Kliknij, aby przypisac nowe zlecenie do tej osoby.";
    personButton.addEventListener("click", async () => {
      await createAssignmentForPerson(personButton.dataset.assignmentPerson);
    });
  });
  el.assignmentTimeline.querySelectorAll("[data-assignee][data-priority]").forEach((lane) => {
    lane.title = "Istniejace zlecenia mozna tu przesuwac i zmieniac daty.";
    lane.title = "Kliknij, aby wstawić zlecenie z formularza w tym wierszu.";
    lane.title = "Istniejace zlecenia mozna tu przesuwac i zmieniac daty.";
    lane.addEventListener("click", (event) => {
      if (event.target.closest(".assignment-bar")) return;
      selectedAssignmentKey = null;
      renderAssignmentExistingPanel();
    });
    lane.addEventListener("dragover", (event) => {
      event.preventDefault();
      lane.classList.add("drag-over");
    });
    lane.addEventListener("dragleave", () => lane.classList.remove("drag-over"));
    lane.addEventListener("drop", async (event) => {
      event.preventDefault();
      lane.classList.remove("drag-over");
      const payload = event.dataTransfer.getData("text/plain");
      if (payload !== "assignment-draft") return;
      const target = await createAssignmentOnLane(lane);
      if (!target) return;
    });
  });

  el.assignmentTimeline.querySelectorAll("[data-assignment-handle]").forEach((handle) => {
    handle.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      startAssignmentResize(event, handle.dataset.assignmentHandle, handle.dataset.edge);
    });
  });

  el.assignmentTimeline.querySelectorAll(".assignment-bar").forEach((bar) => {
    bar.addEventListener("click", (event) => {
      event.stopPropagation();
      if (bar.dataset.dragged === "true") {
        bar.dataset.dragged = "false";
        return;
      }
      selectAssignmentOrder(bar.dataset.assignmentOrder);
    });
    bar.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-assignment-handle]")) return;
      startAssignmentMove(event, bar.dataset.assignmentOrder);
    });
  });
}

function selectAssignmentOrder(key) {
  selectedAssignmentKey = key;
  datePopover = null;
  renderAssignmentMode();
}

function assignmentDatePopoverHtml() {
  if (!datePopover || datePopover.type !== "assignment") return "";
  const target = assignmentOrderTarget(datePopover.key);
  const order = target?.order;
  if (!order) return "";
  return `
    <div class="date-popover assignment-date-popover" style="left:${datePopover.x}px;top:${datePopover.y}px" data-assignment-date-popover>
      <strong>${order.title}</strong>
      <div class="date-popover-range">
        <input type="date" value="${order.start || order.due}" data-assignment-popover-field="start" />
        <input type="date" value="${order.due}" data-assignment-popover-field="due" />
      </div>
      <div class="date-popover-days">${dateRangeDays(order.start || order.due, order.due).map((day) => `<span>${formatShortDate(day)}</span>`).join("")}</div>
      <button type="button" data-assignment-open-project>Otworz w projekcie</button>
      <button type="button" data-assignment-popover-close>Zamknij</button>
    </div>
  `;
}

function bindAssignmentDatePopover() {
  if (!datePopover || datePopover.type !== "assignment") return;
  const popover = el.assignmentTimeline.querySelector("[data-assignment-date-popover]");
  const target = assignmentOrderTarget(datePopover.key);
  if (!popover || !target) return;
  popover.querySelectorAll("[data-assignment-popover-field]").forEach((input) => {
    input.addEventListener("change", () => {
      target.order[input.dataset.assignmentPopoverField] = dateString(nextWorkday(input.value));
      if (parseDate(target.order.due) < parseDate(target.order.start || target.order.due)) {
        target.order.due = target.order.start || target.order.due;
      }
      renderAssignmentMode();
      renderCenter();
    });
  });
  popover.querySelector("[data-assignment-popover-close]")?.addEventListener("click", () => {
    datePopover = null;
    renderAssignmentMode();
  });
  popover.querySelector("[data-assignment-open-project]")?.addEventListener("click", () => {
    datePopover = null;
    openProject(target.project, {
      type: "task",
      index: target.project.tasks.indexOf(target.task),
      orderIndex: target.task.orders.indexOf(target.order)
    });
  });
}

function showAssignmentDatePopover(key, x, y) {
  datePopover = {
    type: "assignment",
    key,
    x: Math.min(Math.max(12, x - 90), window.innerWidth - 260),
    y: Math.min(Math.max(90, y + 12), window.innerHeight - 190)
  };
  renderAssignmentMode();
}

function bindAssignmentTimelineControls() {
  el.assignmentTimeline.querySelector("[data-assignment-add-person]")?.addEventListener("click", addAssignmentPersonFromBase);
  el.assignmentTimeline.querySelector("[data-assignment-remove-person]")?.addEventListener("click", removeAssignmentPersonFromAxis);
  el.assignmentTimeline.querySelector("[data-assignment-all-projects]")?.addEventListener("click", () => {
    assignmentShowAllProjects = !assignmentShowAllProjects;
    renderAssignmentMode();
    renderCenter();
    persistUserState();
  });
  el.assignmentTimeline.querySelectorAll("[data-assignment-zoom]").forEach((button) => {
    button.addEventListener("click", () => zoomAssignmentWindow(Number(button.dataset.assignmentZoom)));
  });
  el.assignmentTimeline.querySelector("[data-assignment-reset]")?.addEventListener("click", resetAssignmentWindow);
  el.assignmentTimeline.querySelectorAll("[data-assignment-month]").forEach((button) => {
    button.addEventListener("click", () => {
      setAssignmentWindow(button.dataset.monthStart, button.dataset.monthEnd, button.dataset.monthStart);
    });
  });
  el.assignmentTimeline.querySelectorAll("[data-assignment-week]").forEach((button) => {
    button.addEventListener("click", () => {
      setAssignmentWindow(button.dataset.weekStart, button.dataset.weekEnd, button.dataset.weekStart);
    });
  });
  el.assignmentTimeline.querySelectorAll("[data-assignment-day]").forEach((button) => {
    button.addEventListener("click", () => {
      setAssignmentWindow(button.dataset.day, button.dataset.day, button.dataset.day);
    });
  });
  el.assignmentTimeline.querySelector("[data-assignment-range]")?.addEventListener("click", resetAssignmentWindow);
}

function assignmentDayPixelWidth(visibleDays) {
  if (visibleDays > 260) return 4;
  if (visibleDays > 210) return 5;
  if (visibleDays > 170) return 7;
  if (visibleDays > 120) return 10;
  if (visibleDays > 90) return 15;
  if (visibleDays > 45) return 32;
  return 54;
}

function assignmentScrollBufferWidth(viewportWidth, visibleDays) {
  if (viewportWidth <= 0) return 0;
  const bufferDays = visibleDays <= 31 ? 7 : 14;
  const dateBuffer = assignmentDayPixelWidth(visibleDays) * bufferDays;
  return Math.max(180, Math.min(viewportWidth * 0.5, dateBuffer));
}

function assignmentAxisWidth(visibleDays) {
  const viewportWidth = Math.floor(el.assignmentTimeline?.querySelector(".assignment-axis-viewport")?.clientWidth || 0);
  const contentWidth = visibleDays <= 31 && viewportWidth > 0
    ? Math.max(1, viewportWidth - 2)
    : Math.max(viewportWidth, visibleDays * assignmentDayPixelWidth(visibleDays));
  return Math.ceil(contentWidth + assignmentScrollBufferWidth(viewportWidth, visibleDays));
}

function syncAssignmentScrollbars() {
  const gantt = el.assignmentTimeline.querySelector("[data-assignment-gantt-scroll]");
  const bottom = el.assignmentTimeline.querySelector("[data-assignment-bottom-scroll]");
  if (!gantt || !bottom) return;
  let syncing = false;
  const sync = (source, target) => {
    if (syncing) return;
    syncing = true;
    target.scrollLeft = source.scrollLeft;
    updateAssignmentScrollDate(source);
    schedulePersist();
    requestAnimationFrame(() => {
      syncing = false;
    });
  };
  gantt.addEventListener("scroll", () => sync(gantt, bottom));
  bottom.addEventListener("scroll", () => sync(bottom, gantt));
  el.assignmentTimeline.querySelectorAll("[data-assignment-scroll-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const step = Number(button.dataset.assignmentScrollStep || 0);
      bottom.scrollBy({ left: step * Math.max(160, bottom.clientWidth * 0.55), behavior: "smooth" });
    });
  });
  [gantt, bottom].forEach((scroller) => {
    scroller.addEventListener("wheel", (event) => {
      if (event.ctrlKey) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!delta) return;
      event.preventDefault();
      const maxScroll = Math.max(0, bottom.scrollWidth - bottom.clientWidth);
      const atRightEdge = bottom.scrollLeft >= maxScroll - 2;
      const atLeftEdge = bottom.scrollLeft <= 2;
      if ((delta > 0 && atRightEdge) || (delta < 0 && atLeftEdge)) {
        shiftAssignmentWindowFromWheel(delta > 0 ? 1 : -1);
        return;
      }
      const next = Math.max(0, Math.min(maxScroll, bottom.scrollLeft + delta));
      bottom.scrollLeft = next;
      gantt.scrollLeft = next;
      updateAssignmentScrollDate(bottom);
    }, { passive: false });
  });
  bottom.scrollLeft = gantt.scrollLeft;
}

function shiftAssignmentWindowFromWheel(direction) {
  const currentStart = parseDate(assignmentViewStart);
  const currentEnd = parseDate(assignmentViewEnd);
  const visibleDays = Math.max(1, daysBetween(currentStart, currentEnd) + 1);
  const shiftDays = Math.max(3, Math.round(visibleDays * 0.4)) * direction;
  const ordersRange = assignmentOrdersDateRange();
  const earliestTaskDate = ordersRange?.start || today;
  const futureLimit = addDays(today, 365);
  if (direction > 0 && currentEnd >= futureLimit) return false;
  if (direction < 0 && currentStart <= earliestTaskDate) return false;

  let nextStart = addDays(currentStart, shiftDays);
  let nextEnd = addDays(currentEnd, shiftDays);
  if (direction > 0 && nextEnd > futureLimit) {
    nextEnd = futureLimit;
    nextStart = addDays(nextEnd, -(visibleDays - 1));
  }
  if (direction < 0 && nextStart < earliestTaskDate) {
    nextStart = new Date(earliestTaskDate);
    nextEnd = addDays(nextStart, visibleDays - 1);
  }
  const rememberedDate = parseDate(assignmentScrollDate || assignmentViewStart);
  const actualShiftDays = daysBetween(currentStart, nextStart);
  assignmentViewStart = dateString(nextStart);
  assignmentViewEnd = dateString(nextEnd);
  assignmentScrollDate = dateString(addDays(rememberedDate, actualShiftDays));
  assignmentManualWindow = true;
  renderAssignmentMode();
  persistUserState();
  return true;
}

function updateAssignmentScrollDate(scroller) {
  const contentWidth = Math.max(1, scroller.scrollWidth - ASSIGNMENT_LEFT_WIDTH);
  const center = scroller.scrollLeft + Math.min(scroller.clientWidth * 0.45, scroller.clientWidth - 1);
  const ratio = Math.max(0, Math.min(1, (center - ASSIGNMENT_LEFT_WIDTH) / contentWidth));
  assignmentScrollDate = assignmentDateFromRatio(ratio);
}

function scrollAssignmentDateIntoView(value = today, remember = true) {
  const gantt = el.assignmentTimeline.querySelector("[data-assignment-gantt-scroll]");
  const bottom = el.assignmentTimeline.querySelector("[data-assignment-bottom-scroll]");
  if (!gantt || !bottom) return;
  const { min, max } = assignmentTimeBounds();
  const date = parseDate(value);
  if (date.getTime() < min || date.getTime() > max) return;
  const ratio = (date.getTime() - min) / Math.max(1, max - min);
  const contentWidth = Math.max(1, bottom.scrollWidth - ASSIGNMENT_LEFT_WIDTH);
  const target = Math.max(0, ASSIGNMENT_LEFT_WIDTH + contentWidth * ratio - bottom.clientWidth * 0.45);
  bottom.scrollLeft = target;
  gantt.scrollLeft = target;
  if (remember) {
    assignmentScrollDate = dateString(date);
    persistUserState();
  }
}

async function addAssignmentPersonFromBase() {
  const active = new Set(peopleList().map((person) => person.toLowerCase()));
  const candidates = employeeDirectory
    .map((employee) => employee.name || employee.displayName)
    .filter(Boolean);
  if (!candidates.some((name) => samePerson(name, "Przykład"))) candidates.push("Przykład");
  const available = [...new Set(candidates)].filter((name) => !active.has(name.toLowerCase()));
  if (!available.length) {
    void zkAlert("Nie ma kolejnych pracowników w bazie do dodania na oś.");
    return;
  }
  let selected = available[0];
  if (available.length > 1) {
    const answer = await zkPrompt(`Kogo dodać na oś?\n${available.map((name, index) => `${index + 1}. ${name}`).join("\n")}`, "1", "Dodaj pracownika");
    if (!answer) return;
    const byIndex = available[Number(answer) - 1];
    selected = byIndex || available.find((name) => samePerson(name, answer));
    if (!selected) return;
  }
  assignmentPeople.push(selected);
  renderPeopleFilter();
  renderChatRecipients();
  renderAssignmentMode();
  renderEmployeeBase();
  schedulePersist();
}

async function removeAssignmentPersonFromAxis() {
  const people = peopleList();
  if (!people.length) {
    void zkAlert("Nie ma pracowników do usunięcia z osi.");
    return;
  }

  let selected = people.find((person) => samePerson(person, "Przykład")) || people[0];
  if (people.length > 1) {
    const answer = await zkPrompt(`Kogo usunąć z osi?\n${people.map((name, index) => `${index + 1}. ${name}`).join("\n")}`, String(people.indexOf(selected) + 1), "Usuń pracownika");
    if (!answer) return;
    const byIndex = people[Number(answer) - 1];
    selected = byIndex || people.find((name) => samePerson(name, answer));
    if (!selected) return;
  } else {
    const confirmed = await zkConfirm(`Usunąć pracownika "${selected}" z osi?`, { danger: true });
    if (!confirmed) return;
  }

  assignmentPeople = assignmentPeople.filter((person) => !samePerson(person, selected));
  renderPeopleFilter();
  renderAssignmentMode();
  renderEmployeeBase();
  schedulePersist();
}

function assignmentScale() {
  const { min, max, startDate, endDate } = assignmentTimeBounds();
  const months = [];
  const weeks = [];
  const days = [];
  const visibleDays = assignmentVisibleDays();
  const showDailyLabels = visibleDays <= 95;
  const showWeekLabels = visibleDays <= 240;
  const cursor = new Date(startDate);
  cursor.setDate(1);

  while (cursor.getTime() < max) {
    const monthStart = new Date(cursor);
    const nextMonth = new Date(cursor);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const segmentStart = Math.max(monthStart.getTime(), min);
    const segmentEnd = Math.min(nextMonth.getTime(), max);
    const left = ((segmentStart - min) / Math.max(1, max - min)) * 100;
    const width = ((segmentEnd - segmentStart) / Math.max(1, max - min)) * 100;
    const monthEnd = addDays(nextMonth, -1);
    months.push(`<button class="dn-scale-month" type="button" data-assignment-month data-month-start="${dateString(monthStart)}" data-month-end="${dateString(monthEnd)}" style="left:${left}%;width:${width}%">${monthName(monthStart)} ${monthStart.getFullYear()}</button>`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const weekCursor = startOfWeek(startDate);
  while (weekCursor.getTime() < max) {
    const weekStart = new Date(weekCursor);
    const weekEnd = addDays(weekStart, 6);
    const segmentStart = Math.max(weekStart.getTime(), min);
    const segmentEnd = Math.min(addDays(weekEnd, 1).getTime(), max);
    const left = ((segmentStart - min) / Math.max(1, max - min)) * 100;
    const width = ((segmentEnd - segmentStart) / Math.max(1, max - min)) * 100;
    const label = `${String(weekStart.getDate()).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;
    weeks.push(`<button class="assignment-scale-week" type="button" data-assignment-week data-week-start="${dateString(weekStart)}" data-week-end="${dateString(weekEnd)}" style="left:${left}%;width:${width}%">${showWeekLabels ? label : ""}</button>`);
    weekCursor.setDate(weekCursor.getDate() + 7);
  }

  const dayLabels = ["N", "P", "W", "S", "C", "P", "S"];
  const dayCursor = new Date(min);
  while (dayCursor.getTime() < max) {
    const left = ((dayCursor.getTime() - min) / Math.max(1, max - min)) * 100;
    const width = (DAY / Math.max(1, max - min)) * 100;
    const weekend = !workWeekends && (dayCursor.getDay() === 0 || dayCursor.getDay() === 6);
    days.push(`<button class="assignment-scale-day ${weekend ? "weekend" : ""} ${showDailyLabels ? "" : "compact"}" type="button" data-assignment-day data-day="${dateString(dayCursor)}" style="left:${left}%;width:${width}%">${showDailyLabels ? `<b>${String(dayCursor.getDate()).padStart(2, "0")}</b><em>${dayLabels[dayCursor.getDay()]}</em>` : ""}</button>`);
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  const rangeLabel = `${monthName(startDate)} ${startDate.getFullYear()} - ${monthName(endDate)} ${endDate.getFullYear()}`;
  return `
    <div class="dn-scale assignment-scale">
      <button class="dn-scale-range" type="button" data-assignment-range>${rangeLabel}</button>
      <div class="dn-scale-months">${months.join("")}</div>
      <div class="assignment-scale-weeks">${weeks.join("")}</div>
      <div class="dn-scale-days">${days.join("")}</div>
    </div>
  `;
}

function startOfWeek(value) {
  const date = parseDate(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function assignmentWeekendMarkers() {
  if (workWeekends) return "";
  const { min, max } = assignmentTimeBounds();
  const markers = [];
  const cursor = new Date(min);
  while (cursor.getTime() < max) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) {
      const left = ((cursor.getTime() - min) / Math.max(1, max - min)) * 100;
      const width = (DAY / Math.max(1, max - min)) * 100;
      markers.push(`<span class="weekend-marker assignment-weekend" style="left:${left}%;width:${width}%"></span>`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return markers.join("");
}

function assignmentLeaveMarkers(person) {
  const { min, max } = assignmentTimeBounds();
  return employeeLeaves
    .filter((leave) => samePerson(leave.person, person))
    .map((leave) => {
      const date = parseDate(leave.date);
      const time = date.getTime();
      if (time < min || time >= max) return "";
      const left = ((time - min) / Math.max(1, max - min)) * 100;
      const width = (DAY / Math.max(1, max - min)) * 100;
      return `<span class="assignment-leave" style="left:${left}%;width:${width}%" title="Urlop: ${formatDate(date)}"></span>`;
    })
    .join("");
}

function assignmentTodayLine(axisWidth) {
  const { min, max } = assignmentTimeBounds();
  const time = today.getTime();
  if (time < min || time > max) return "";
  const left = ((time - min) / Math.max(1, max - min)) * Math.max(1, Number(axisWidth) || 1);
  return `<span class="assignment-today-line" style="left:${left}px" aria-hidden="true"></span>`;
}

function assignmentTimeBounds() {
  const startDate = parseDate(assignmentViewStart);
  const endDate = parseDate(assignmentViewEnd);
  const exclusiveEnd = addDays(endDate, 1);
  return {
    min: startDate.getTime(),
    max: exclusiveEnd.getTime(),
    startDate,
    endDate
  };
}

function assignmentDayWidthPercent() {
  return 100 / assignmentVisibleDays();
}

function assignmentVisibleDays() {
  const { min, max } = assignmentTimeBounds();
  return Math.max(1, Math.round((max - min) / DAY));
}

function assignmentRangePosition(startValue, endValue) {
  const { min, max } = assignmentTimeBounds();
  const start = parseDate(startValue).getTime();
  const endDate = parseDate(endValue || startValue);
  endDate.setDate(endDate.getDate() + 1);
  const end = endDate.getTime();
  const left = ((start - min) / Math.max(1, max - min)) * 100;
  const right = ((end - min) / Math.max(1, max - min)) * 100;
  const oneDayWidth = (DAY / Math.max(1, max - min)) * 100;
  return {
    left: Math.max(0, Math.min(99, left)),
    width: Math.max(oneDayWidth, Math.min(100, right - left || oneDayWidth))
  };
}

function assignmentDateFromRatio(ratio, bounds = assignmentTimeBounds()) {
  const rawDays = Math.max(1, Math.round((bounds.max - bounds.min) / DAY));
  const dayIndex = Math.max(0, Math.min(rawDays - 1, Math.round(rawDays * ratio)));
  const time = bounds.min + dayIndex * DAY;
  return dateString(nextWorkday(new Date(time)));
}

function assignmentDateFromClientX(track, clientX) {
  const rect = track.getBoundingClientRect();
  if (!rect.width) return null;
  const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return assignmentDateFromRatio(ratio);
}

function assignmentDayDeltaFromPixels(pixelDelta, trackWidth) {
  const visibleDays = assignmentVisibleDays();
  const dayWidth = Math.max(1, trackWidth / visibleDays);
  const direction = Math.sign(pixelDelta);
  return direction * Math.floor(Math.abs(pixelDelta) / dayWidth + 0.35);
}

function assignmentDateByDayDelta(value, dayDelta) {
  const date = addDays(parseDate(value), dayDelta);
  return dateString(dayDelta < 0 ? previousWorkday(date) : nextWorkday(date));
}

function moveAssignmentOrderToDate(order, nextStart) {
  const duration = Math.max(0, daysBetween(order.start || order.due, order.due));
  order.start = nextStart;
  order.due = dateString(nextWorkday(addDays(nextStart, duration)));
}

function assignmentOrderRange(order) {
  const start = dateString(nextWorkday(order.start || order.due || today));
  let due = dateString(nextWorkday(order.due || start));
  if (parseDate(due) < parseDate(start)) due = start;
  return { start, due };
}

function assignmentRangesOverlap(first, second) {
  return parseDate(first.start) <= parseDate(second.due) && parseDate(first.due) >= parseDate(second.start);
}

function placeNewAssignmentAfterLaneQueue(order) {
  if (!order?.assignee || !order?.priority) return;
  const originalRange = assignmentOrderRange(order);
  order.start = originalRange.start;
  order.due = originalRange.due;
  const duration = Math.max(0, daysBetween(order.start, order.due));
  const laneOrders = assignmentLaneOrderRefs(order.assignee, order.priority)
    .map((item) => item.order)
    .filter((item) => item !== order)
    .sort((a, b) => parseDate(a.start || a.due) - parseDate(b.start || b.due));

  let guard = 0;
  while (guard < laneOrders.length + 366) {
    const currentRange = assignmentOrderRange(order);
    const conflict = laneOrders.find((item) => assignmentRangesOverlap(currentRange, assignmentOrderRange(item)));
    if (!conflict) break;
    const conflictRange = assignmentOrderRange(conflict);
    const nextStart = dateString(nextWorkday(addDays(conflictRange.due, 1)));
    order.start = nextStart;
    order.due = dateString(nextWorkday(addDays(nextStart, duration)));
    guard += 1;
  }
}

function resolveAssignmentLaneCollisions(anchorOrder) {
  if (!anchorOrder?.assignee || !anchorOrder?.priority) return;
  const ordered = assignmentLaneOrderRefs(anchorOrder.assignee, anchorOrder.priority)
    .map((item) => item.order)
    .sort((a, b) => {
      const diff = parseDate(a.start || a.due) - parseDate(b.start || b.due);
      if (diff) return diff;
      if (a === anchorOrder) return -1;
      if (b === anchorOrder) return 1;
      return 0;
    });

  const anchorDuration = Math.max(0, daysBetween(anchorOrder.start || anchorOrder.due, anchorOrder.due));
  anchorOrder.start = dateString(nextWorkday(anchorOrder.start || anchorOrder.due));
  anchorOrder.due = dateString(nextWorkday(addDays(anchorOrder.start, anchorDuration)));
  moveOrderPastLeaves(anchorOrder);
  const anchorStart = parseDate(anchorOrder.start);
  const queue = [
    anchorOrder,
    ...ordered.filter((order) => order !== anchorOrder && parseDate(order.due || order.start) >= anchorStart)
  ].sort((a, b) => {
    if (a === anchorOrder) return -1;
    if (b === anchorOrder) return 1;
    return parseDate(a.start || a.due) - parseDate(b.start || b.due);
  });

  let previous = anchorOrder;
  queue.slice(1).forEach((order) => {
    const currentStart = parseDate(order.start || order.due);
    const minimumStart = nextWorkday(addDays(previous.due, 1));
    if (currentStart <= parseDate(previous.due)) {
      const duration = Math.max(0, daysBetween(order.start || order.due, order.due));
      order.start = dateString(minimumStart);
      order.due = dateString(nextWorkday(addDays(order.start, duration)));
    }
    moveOrderPastLeaves(order);
    previous = order;
  });
}

function assignmentLaneOrderRefs(assignee, priority) {
  return projects.flatMap((project) =>
    project.tasks.flatMap((task, taskIndex) => {
      ensureTaskOrders(task);
      return task.orders.map((order, orderIndex) => ({ project, task, taskIndex, order, orderIndex }));
    })
  ).filter((item) => item.order.assignee === assignee && (item.order.priority || "sredni") === priority);
}

function startAssignmentMove(event, key) {
  const target = assignmentOrderTarget(key);
  const track = event.currentTarget.closest(".assignment-lane");
  if (!target || !track) return;

  event.preventDefault();
  event.stopPropagation();
  const bar = event.currentTarget;
  const barRect = bar.getBoundingClientRect();
  const grabOffsetX = event.clientX - barRect.left;
  const grabOffsetY = event.clientY - barRect.top;
  const ghost = bar.cloneNode(true);
  ghost.classList.add("assignment-bar-ghost");
  ghost.style.position = "fixed";
  ghost.style.left = `${event.clientX - grabOffsetX}px`;
  ghost.style.top = `${event.clientY - grabOffsetY}px`;
  ghost.style.right = "auto";
  ghost.style.bottom = "auto";
  ghost.style.width = `${barRect.width}px`;
  ghost.style.height = `${barRect.height}px`;
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "1000";
  document.body.append(ghost);
  bar.classList.add("drag-source");
  bar.setPointerCapture?.(event.pointerId);

  const rect = track.getBoundingClientRect();
  const startX = event.clientX;
  const startY = event.clientY;
  const originalStart = target.order.start || target.order.due;
  const duration = Math.max(0, daysBetween(target.order.start || target.order.due, target.order.due));
  let nextStart = originalStart;
  let currentLane = track;

  const preview = (clientX, clientY) => {
    const dayDelta = assignmentDayDeltaFromPixels(clientX - startX, rect.width);
    nextStart = assignmentDateByDayDelta(originalStart, dayDelta);
    ghost.style.left = `${clientX - grabOffsetX}px`;
    ghost.style.top = `${clientY - grabOffsetY}px`;
    document.querySelectorAll(".assignment-lane.drag-over").forEach((lane) => lane.classList.remove("drag-over"));
    currentLane = assignmentLaneFromPoint(clientX, clientY) || currentLane;
    currentLane?.classList.add("drag-over");
  };

  const cleanup = () => {
    ghost.remove();
    bar.classList.remove("drag-source");
    bar.releasePointerCapture?.(event.pointerId);
    document.querySelectorAll(".assignment-lane.drag-over").forEach((lane) => lane.classList.remove("drag-over"));
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
  };

  const onMove = (moveEvent) => preview(moveEvent.clientX, moveEvent.clientY);
  const onUp = async (upEvent) => {
    const horizontalDelta = upEvent.clientX - startX;
    const verticalDelta = upEvent.clientY - startY;
    const wasDragged = Math.abs(horizontalDelta) > 4 || Math.abs(verticalDelta) > 4;
    bar.dataset.dragged = wasDragged ? "true" : "false";
    if (!wasDragged) {
      cleanup();
      selectAssignmentOrder(key);
      return;
    }
    if (Math.abs(horizontalDelta) >= 4) {
      const dayDelta = assignmentDayDeltaFromPixels(horizontalDelta, rect.width);
      nextStart = assignmentDateByDayDelta(originalStart, dayDelta);
    } else {
      nextStart = originalStart;
    }
    const lane = assignmentLaneFromPoint(upEvent.clientX, upEvent.clientY) || currentLane;
    const nextEnd = dateString(nextWorkday(addDays(nextStart, duration)));
    const nextAssignee = lane?.dataset.assignee || target.order.assignee;
    if (assignmentRangeHitsLeave(nextAssignee, nextStart, nextEnd)) {
      const force = await alertLeaveCollision(nextAssignee);
      if (!force) {
        cleanup();
        return;
      }
    }
    if (lane?.dataset.assignee && lane?.dataset.priority) {
      target.order.assignee = lane.dataset.assignee;
      target.order.priority = lane.dataset.priority;
      moveAssignmentOrderToDate(target.order, nextStart);
    } else {
      moveAssignmentOrderToDate(target.order, nextStart);
    }
    resolveAssignmentLaneCollisions(target.order);
    // Przesuwanie zlecenia zmienia tylko jego daty. Zakres osi i pozycja
    // przewiniecia maja pozostac dokladnie takie jak przed przeciaganiem.
    assignmentManualWindow = true;
    schedulePersist();
    persistUserState();
    renderPeopleFilter();
    renderAssignmentMode();
    renderCenter();
    cleanup();
  };
  const onCancel = cleanup;
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
  window.addEventListener("pointercancel", onCancel, { once: true });
}

function startAssignmentResize(event, key, edge) {
  const target = assignmentOrderTarget(key);
  const track = event.currentTarget.closest(".assignment-lane");
  if (!target || !track) return;

  event.preventDefault();
  event.stopPropagation();
  const handle = event.currentTarget;
  const bar = handle.closest(".assignment-bar");
  const rect = track.getBoundingClientRect();
  const startX = event.clientX;
  const originalStart = target.order.start || target.order.due;
  const originalEnd = target.order.due;
  let nextStart = originalStart;
  let nextEnd = originalEnd;
  handle.setPointerCapture(event.pointerId);

  const preview = (clientX) => {
    const dayDelta = assignmentDayDeltaFromPixels(clientX - startX, rect.width);
    if (edge === "start") {
      nextStart = assignmentDateByDayDelta(originalStart, dayDelta);
      if (parseDate(nextStart) > parseDate(nextEnd)) nextStart = nextEnd;
    } else {
      nextEnd = assignmentDateByDayDelta(originalEnd, dayDelta);
      if (parseDate(nextEnd) < parseDate(nextStart)) nextEnd = nextStart;
    }
    if (bar) {
      const position = assignmentRangePosition(nextStart, nextEnd);
      bar.style.left = `${position.left}%`;
      bar.style.width = `${position.width}%`;
    }
  };

  const onMove = (moveEvent) => preview(moveEvent.clientX);
  const onUp = async (upEvent) => {
    if (Math.abs(upEvent.clientX - startX) >= 4) preview(upEvent.clientX);
    const previous = {
      start: target.order.start,
      due: target.order.due
    };
    target.order.start = dateString(nextWorkday(nextStart));
    target.order.due = dateString(nextWorkday(nextEnd));
    if (parseDate(target.order.due) < parseDate(target.order.start)) {
      target.order.due = target.order.start;
    }
    if (assignmentRangeHitsLeave(target.order.assignee, target.order.start, target.order.due)) {
      const force = await alertLeaveCollision(target.order.assignee);
      if (!force) Object.assign(target.order, previous);
      renderAssignmentMode();
      renderCenter();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      return;
    }
    resolveAssignmentLaneCollisions(target.order);
    // Wydluzanie i skracanie nie moze przyblizac ani przesuwac osi czasu.
    assignmentManualWindow = true;
    schedulePersist();
    persistUserState();
    renderAssignmentMode();
    renderCenter();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function assignmentDatePosition(value) {
  const { min, max } = assignmentTimeBounds();
  const time = parseDate(value).getTime();
  return ((time - min) / Math.max(1, max - min)) * 100;
}

function shiftAssignmentWindow(direction) {
  const width = Math.max(7, daysBetween(assignmentViewStart, assignmentViewEnd));
  const shift = Math.max(3, Math.round(width * 0.25)) * direction;
  assignmentViewStart = dateString(addDays(assignmentViewStart, shift));
  assignmentViewEnd = dateString(addDays(assignmentViewEnd, shift));
  assignmentScrollDate = assignmentViewStart;
  assignmentManualWindow = true;
  renderAssignmentMode();
  persistUserState();
}

function setAssignmentWindow(startValue, endValue = startValue, scrollValue = startValue, renderNow = true) {
  const start = parseDate(startValue);
  const rawEnd = parseDate(endValue || startValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(rawEnd.getTime())) return;
  const end = rawEnd < start ? new Date(start) : rawEnd;
  assignmentViewStart = dateString(start);
  assignmentViewEnd = dateString(end);
  assignmentScrollDate = dateString(parseDate(scrollValue || start));
  assignmentManualWindow = true;
  if (renderNow) {
    renderAssignmentMode();
    requestAnimationFrame(() => scrollAssignmentDateIntoView(assignmentScrollDate));
  }
  persistUserState();
}

function zoomAssignmentWindow(factor) {
  const start = parseDate(assignmentViewStart);
  const end = parseDate(assignmentViewEnd);
  const scrollCenter = parseDate(assignmentScrollDate || assignmentViewStart);
  const center = scrollCenter.getTime() >= start.getTime() && scrollCenter.getTime() <= end.getTime()
    ? scrollCenter
    : new Date((start.getTime() + end.getTime()) / 2);
  const currentDays = Math.max(1, daysBetween(assignmentViewStart, assignmentViewEnd) + 1);
  const scaledDays = factor < 1 ? Math.floor(currentDays * factor) : Math.ceil(currentDays * factor);
  const nextDays = Math.max(1, Math.min(365, scaledDays));
  const nextStart = new Date(center);
  nextStart.setDate(center.getDate() - Math.floor(nextDays / 2));
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextStart.getDate() + nextDays - 1);
  setAssignmentWindow(nextStart, nextEnd, center);
}

function assignmentOrdersDateRange() {
  const dates = assignmentOrders()
    .filter((order) => order.assignee && order.assignee !== "Zespol")
    .flatMap((order) => [order.start || order.due, order.due])
    .map(parseDate)
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!dates.length) return null;
  const minDate = new Date(Math.min(...dates.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));
  return {
    start: minDate,
    end: maxDate
  };
}

function ensureAssignmentWindowCoversOrders(orders = assignmentOrders()) {
  const datedOrders = orders
    .filter((order) => order.assignee && order.assignee !== "Zespol")
    .flatMap((order) => [order.start || order.due, order.due])
    .map(parseDate)
    .filter((date) => !Number.isNaN(date.getTime()));
  if (!datedOrders.length) return false;
  const minDate = new Date(Math.min(...datedOrders.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...datedOrders.map((date) => date.getTime())));
  return ensureAssignmentWindowCoversRange(dateString(minDate), dateString(maxDate), 14);
}

function ensureAssignmentWindowCoversRange(startValue, endValue, bufferDays = 21) {
  const start = parseDate(startValue);
  const end = parseDate(endValue || startValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  const currentStart = parseDate(assignmentViewStart);
  const currentEnd = parseDate(assignmentViewEnd);
  let nextStart = new Date(currentStart);
  let nextEnd = new Date(currentEnd);

  if (start <= addDays(currentStart, 2)) {
    nextStart = addDays(start, -bufferDays);
  }
  if (end >= addDays(currentEnd, -2)) {
    nextEnd = addDays(end, bufferDays);
  }
  if (nextStart.getTime() === currentStart.getTime() && nextEnd.getTime() === currentEnd.getTime()) {
    return false;
  }

  assignmentViewStart = dateString(nextStart);
  assignmentViewEnd = dateString(nextEnd);
  return true;
}

function resetAssignmentWindow(renderNow = true) {
  const range = assignmentOrdersDateRange();
  if (range) {
    setAssignmentWindow(range.start, range.end, range.start, renderNow);
  } else {
    setAssignmentWindow(today, today, today, renderNow);
  }
}

function assignmentOrderTarget(value) {
  const [projectId, taskIndexRaw, orderIndexRaw] = value.split(":");
  const project = projects.find((item) => item.id === projectId);
  const task = project?.tasks?.[Number(taskIndexRaw)];
  const order = task?.orders?.[Number(orderIndexRaw)];
  return order ? { project, task, order } : null;
}

function createAssignmentOrder(event) {
  event.preventDefault();
  renderAssignmentDraft();
}

async function createAssignmentOrderFromForm(options = {}) {
  const project = projects.find((item) => item.id === planningProjectId);
  if (!project) return null;
  const task = project.tasks[Number(el.assignmentTask.value)];
  if (!task) return null;
  ensureTaskOrders(task);
  const title = el.assignmentTitle.value.trim();
  if (!title) return null;
  const start = dateString(nextWorkday(options.start || el.assignmentStart.value || dateString(today)));
  const due = dateString(nextWorkday(el.assignmentDue.value || el.assignmentStart.value || dateString(today)));
  if (options.assignee && assignmentRangeHitsLeave(options.assignee, start, due)) {
    const force = await alertLeaveCollision(options.assignee);
    if (!force) return null;
  }
  const order = {
    id: createStableId("order"),
    title,
    description: el.assignmentDescription.value.trim(),
    status: "Do zrobienia",
    assignee: options.assignee || "Zespol",
    start,
    due,
    hours: 0,
    priority: options.priority || el.assignmentPriority.value,
    checklist: []
  };
  if (options.assignee) placeNewAssignmentAfterLaneQueue(order);
  task.orders.push(order);
  const orderIndex = task.orders.length - 1;
  if (options.assignee) clearAssignmentForm();
  return { project, task, order, orderIndex, taskIndex: project.tasks.indexOf(task) };
}

function clearAssignmentForm() {
  el.assignmentTitle.value = "";
  el.assignmentDescription.value = "";
  el.assignmentStart.value = nativeDateInput(today);
  el.assignmentDue.value = nativeDateInput(quickAssignmentDue(1));
  el.assignmentPriority.value = "sredni";
  assignmentTaskManuallySelected = false;
  suggestAssignmentTask();
  renderPriorityRanges();
}

function suggestAssignmentTask() {
  const project = projects.find((item) => item.id === planningProjectId);
  if (!project || !el.assignmentTitle.value.trim()) {
    el.assignmentSuggestion.textContent = "";
    return;
  }
  const suggestion = bestTaskSuggestion(project, `${el.assignmentTitle.value} ${el.assignmentDescription.value}`);
  if (!suggestion) return;
  el.assignmentTask.value = String(suggestion.index);
  el.assignmentSuggestion.textContent = `Propozycja: ${suggestion.task.title} (${suggestion.task.stage})`;
}

function renderAssignmentDraft() {
  const project = projects.find((item) => item.id === planningProjectId);
  const title = el.assignmentTitle.value.trim();
  const description = el.assignmentDescription.value.trim();
  const task = project?.tasks?.[Number(el.assignmentTask.value)];
  const isReady = Boolean(project && title);
  const draftTitle = title || "Nowe zlecenie";
  const draftDescription = description;
  const draftProject = project?.name || "Projekt";
  const draftStage = task?.stage || "Etap";
  const draftTask = task?.title || "Zadanie";

  if (el.assignmentCreatePanel) {
    el.assignmentCreatePanel.dataset.ready = isReady ? "true" : "false";
    el.assignmentCreatePanel.classList.toggle("draft-ready", isReady);
    el.assignmentCreatePanel.classList.toggle("empty", !title);
    el.assignmentCreatePanel.onpointerdown = title ? startAssignmentDraftPush : null;
  }
  el.assignmentPool.disabled = false;
  el.assignmentPool.draggable = false;
  el.assignmentPool.dataset.ready = isReady ? "true" : "false";
  el.assignmentPool.classList.toggle("empty", !title);
  el.assignmentPool.innerHTML = `
    <span class="assignment-draft-main">
      <strong>${draftTitle}</strong>
      ${draftDescription ? `<small>${draftDescription}</small>` : ""}
    </span>
  `;
  el.assignmentPool.onpointerdown = title ? startAssignmentDraftPush : null;
}

function suggestAssignmentTask() {
  const project = projects.find((item) => item.id === planningProjectId);
  if (!project) {
    renderAssignmentSuggestionPicker(null);
    return;
  }
  if (!assignmentTaskManuallySelected && el.assignmentTitle.value.trim()) {
    const suggestion = bestTaskSuggestion(project, `${el.assignmentTitle.value} ${el.assignmentDescription.value}`);
    if (suggestion) el.assignmentTask.value = String(suggestion.index);
  }
  if (!project.tasks[Number(el.assignmentTask.value)] && project.tasks.length) {
    el.assignmentTask.value = "0";
  }
  renderAssignmentSuggestionPicker(project);
}

function bestTaskSuggestion(project, title) {
  const words = searchTokens(title);
  let best = null;
  project.tasks.forEach((task, index) => {
    const taskTokens = searchTokens(`${task.title} ${task.stage}`);
    const text = taskTokens.join(" ");
    const score = words.reduce((sum, word) => {
      if (text.includes(word)) return sum + 2;
      return sum + (taskTokens.some((token) => token.includes(word) || word.includes(token)) ? 1 : 0);
    }, 0);
    if (!best || score > best.score) best = { task, index, score };
  });
  return best?.score > 0 ? best : { task: project.tasks[0], index: 0, score: 0 };
}

function searchTokens(value) {
  return normalizeSearchText(value)
    .split(/\W+/)
    .map(searchStem)
    .filter((word) => word.length > 2);
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

function searchStem(word) {
  return word.replace(/(ami|ach|ego|emu|owa|owe|owych|owej|ami|ie|iu|em|om|ow|a|u|y|e|i)$/i, "");
}

function dashboardRangeMatch(order) {
  if (dashboardRange === "all") return true;
  const days = daysFromToday(order.due);
  if (dashboardRange === "two-weeks") return days >= 0 && days <= 14;
  if (dashboardRange === "month") return days >= 0 && days <= 31;
  return days >= 0 && days <= 7;
}

function dashboardRangeEmptyText() {
  const scope = dashboardProjectScopeLabel();
  if (dashboardRange === "two-weeks") return `W dwa tygodnie brak aktywnych zlecen dla ${scope}.`;
  if (dashboardRange === "month") return `W tym miesiacu brak aktywnych zlecen dla ${scope}.`;
  if (dashboardRange === "all") return `Brak aktywnych zlecen dla ${scope}.`;
  return `W tym tygodniu brak aktywnych zlecen dla ${scope}.`;
}

function dashboardEmptyText(type) {
  const scope = dashboardProjectScopeLabel();
  if (type === "tomorrow") return `Na jutro nie ma zlecen dla ${scope}.`;
  return `Na dzis nie ma zlecen dla ${scope}.`;
}

function dashboardProjectScopeLabel() {
  return assignmentShowAllProjects ? "wszystkich projektow" : "zaznaczonych projektow";
}

function renderTaskList(container, tasks, emptyText) {
  container.innerHTML = "";
  if (!tasks.length) {
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  tasks
    .sort((a, b) => parseDate(a.due) - parseDate(b.due))
    .forEach((task) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "task-card";
      card.innerHTML = taskCardHtml(task, true);
      card.addEventListener("click", () => {
        const project = projects.find((item) => item.id === task.projectId);
        openProject(project, { type: "task", index: task.taskIndex });
      });
      container.append(card);
    });
}

function renderStageList(container, stages) {
  container.innerHTML = "";
  if (!stages.length) {
    container.innerHTML = '<div class="empty">Zaden etap z zaznaczonych projektow nie konczy sie w ciagu 7 dni.</div>';
    return;
  }

  stages.forEach((stage) => {
    const card = document.createElement("article");
    card.className = "stage-card";
    card.innerHTML = `
      <div class="stage-mini">
        <strong>${stage.project} - ${stage.name}</strong>
        <span class="badge ${stage.status === "late" ? "high" : "now"}">${stage.status === "late" ? "opozniony" : "konczy sie"}</span>
      </div>
      <div class="meta">
        <span>${formatDate(parseDate(stage.start))} - ${formatDate(parseDate(stage.end))}</span>
        <span>${daysFromToday(stage.end)} dni</span>
      </div>
    `;
    container.append(card);
  });
}

function renderPreview() {
  if (!el.projectPreview) return;

  const selected = selectedProjects();
  el.projectPreview.innerHTML = "";

  if (!selected.length) {
    el.projectPreview.innerHTML = '<div class="empty">Zaznacz projekty po lewej, zeby zobaczyc mini-Gantta.</div>';
    return;
  }

  selected.forEach((project) => {
    ensureProjectWindow(project);
    ensureTaskRanges(project);
    const progress = projectProgress(project);
    const card = document.createElement("article");
    card.className = "project-card";
    card.innerHTML = `
      <header>
        <div>
          <h3>${project.name}</h3>
          <p>${project.client}</p>
        </div>
        <span class="progress-number">${progress}%</span>
      </header>
      <div class="progress-track"><div class="progress-bar" style="width: ${progress}%"></div></div>
      ${previewGanttHtml(project)}
    `;
    el.projectPreview.append(card);
    card.querySelectorAll("[data-preview-stage]").forEach((stageButton) => {
      stageButton.addEventListener("click", () => {
        togglePreviewStage(project.id, stageButton.dataset.previewStage);
      });
    });
    card.querySelectorAll("[data-preview-task]").forEach((taskButton) => {
      taskButton.addEventListener("click", () => {
        openProject(project, { type: "task", index: Number(taskButton.dataset.previewTask) });
      });
    });
  });
}

function togglePreviewStage(projectId, stageName) {
  const expanded = new Set(previewExpandedStages[projectId] || []);
  if (expanded.has(stageName)) {
    expanded.delete(stageName);
  } else {
    expanded.add(stageName);
  }
  previewExpandedStages[projectId] = [...expanded];
  renderPreview();
  schedulePersist();
}

function currentViewState() {
  if (!el.lettersModal?.classList.contains("hidden")) {
    return { type: "letters", projectId: activeLettersProjectId || activeProjectId };
  }
  if (!el.technicalPage?.classList.contains("hidden") && activeProjectId) {
    return { type: sidebarModuleMode === "branches" ? "branches" : "technical", projectId: activeProjectId };
  }
  if (!el.secretPage?.classList.contains("hidden") && activeProjectId) {
    return { type: "secret", projectId: activeProjectId };
  }
  if (!el.projectPage?.classList.contains("hidden") && activeProjectId) {
    return { type: "project", projectId: activeProjectId };
  }
  return { type: "dashboard" };
}

function sameViewState(a, b) {
  return a?.type === b?.type && (a?.projectId || "") === (b?.projectId || "");
}

function rememberViewBeforeNavigation(nextState = null) {
  if (navigatingViewHistory) return;
  const current = currentViewState();
  if (nextState && sameViewState(current, nextState)) return;
  if (!viewBackStack.length || !sameViewState(viewBackStack.at(-1), current)) {
    viewBackStack.push(current);
    if (viewBackStack.length > 40) viewBackStack.shift();
  }
  viewForwardStack = [];
  updateSidebarNavButtons();
}

function goBackView() {
  const previous = viewBackStack.pop();
  if (!previous) return;
  viewForwardStack.push(currentViewState());
  navigateToViewState(previous);
}

function goForwardView() {
  const next = viewForwardStack.pop();
  if (!next) return;
  viewBackStack.push(currentViewState());
  navigateToViewState(next);
}

function navigateToViewState(state) {
  navigatingViewHistory = true;
  if (state.type === "project") {
    const project = projects.find((item) => item.id === state.projectId);
    if (project) openProject(project);
  } else if (state.type === "letters") {
    openLettersModule(state.projectId);
  } else if (state.type === "technical") {
    openTechnicalModule(state.projectId, "technical");
  } else if (state.type === "branches") {
    openTechnicalModule(state.projectId, "branches");
  } else if (state.type === "secret") {
    openSecretModule(state.projectId);
  } else {
    showDashboard();
  }
  navigatingViewHistory = false;
  updateSidebarNavButtons();
}

function updateSidebarNavButtons() {
  if (el.sidebarBackBtn) el.sidebarBackBtn.disabled = !viewBackStack.length;
  if (el.sidebarForwardBtn) el.sidebarForwardBtn.disabled = !viewForwardStack.length;
}

function openProject(project, initialSelection = null) {
  rememberViewBeforeNavigation({ type: "project", projectId: project?.id });
  sidebarModuleMode = "full";
  updateSidebarModuleButtons();
  ensureProjectWindow(project);
  const progress = projectProgress(project);
  const isStageBoardProject = project.id === "owb4";
  const isDnProject = usesDnTemplate(project);
  activeProjectId = project.id;
  activeTaskKey = null;
  dnSelection = null;
  if (isStageBoardProject && initialSelection?.type === "task") {
    activeTaskKey = `${project.id}-${initialSelection.index}`;
  }
  if (isDnProject) {
    restoreDnExpandedStages(project);
    dnGanttMaximized = false;
    if (initialSelection?.type === "stage") {
      dnSelection = initialSelection;
      dnExpandedStages.add(initialSelection.name);
      rememberDnExpandedStages(project);
    }
    if (initialSelection?.type === "task") {
      const task = project.tasks[initialSelection.index];
      dnSelection = initialSelection;
      activeOrderIndex = initialSelection.orderIndex ?? 0;
      if (task) {
        dnExpandedStages.add(task.stage);
        if (Number.isFinite(initialSelection.orderIndex)) dnExpandedTasks.add(dnTaskExpandKey(initialSelection.index));
        rememberDnExpandedStages(project);
      }
    }
  }

  el.lettersModal?.classList.add("hidden");
  el.technicalPage?.classList.add("hidden");
  el.secretPage?.classList.add("hidden");
  el.sharedBoard?.classList.add("hidden");
  sharedBoardOpen = false;
  el.dashboardView.classList.add("hidden");
  el.projectPage.classList.remove("hidden");
  updateSidebarModuleButtons();
  el.detailTitle.textContent = `${project.name} - ${project.client}`;
  renderBreadcrumb(project);
  el.detailProgress.textContent = `${progress}%`;
  el.detailProgressBar.style.width = `${progress}%`;
  el.detailStageCount.textContent = project.stages.length;
  el.detailTaskCount.textContent = project.tasks.length;
  el.detailStagesSection.classList.toggle("hidden", isStageBoardProject);
  el.detailTasksSection.classList.toggle("hidden", isStageBoardProject);
  el.projectLayout.classList.toggle("hidden", isDnProject);
  el.dnProjectView.classList.toggle("hidden", !isDnProject);

  if (isDnProject) {
    renderDnView(project);
  } else {
    renderDetailStages(project);
    renderDetailTasks(project);
    renderStageBoard(project);
    renderDetailGantt(project);
  }
  updateSidebarNavButtons();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showDashboard() {
  rememberViewBeforeNavigation({ type: "dashboard" });
  el.lettersModal?.classList.add("hidden");
  el.technicalPage?.classList.add("hidden");
  el.secretPage?.classList.add("hidden");
  el.sharedBoard?.classList.add("hidden");
  sharedBoardOpen = false;
  el.projectPage.classList.add("hidden");
  el.dashboardView.classList.remove("hidden");
  activeProjectId = null;
  renderTopbarPath(["Pulpit"]);
  updateTopbarDashboardButton();
  updateSidebarNavButtons();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function showHomeDashboard() {
  dashboardMode = "ops";
  showDashboard();
  setDashboardMode("ops");
}

function renderDetailStages(project) {
  el.detailStages.innerHTML = project.stages
    .map(
      (stage) => `
        <article class="detail-row">
          <div>
            <strong>${stage.name}</strong>
            <span>${formatDate(parseDate(stage.start))} - ${formatDate(parseDate(stage.end))}</span>
          </div>
          <span class="badge ${stage.status === "done" ? "done" : stage.status === "late" ? "high" : "now"}">${stageLabel(stage.status)}</span>
        </article>
      `
    )
    .join("");
}

function renderDetailTasks(project) {
  el.detailTasks.innerHTML = project.tasks
    .slice()
    .sort((a, b) => parseDate(a.due) - parseDate(b.due))
    .map((task) => `<article class="task-card">${taskCardHtml(task, false)}</article>`)
    .join("");
}

function renderStageBoard(project) {
  const isTestProject = project.id === "owb4";
  el.stageBoardSection.classList.toggle("hidden", !isTestProject);
  if (!isTestProject) {
    el.stageBoard.innerHTML = "";
    return;
  }

  el.stageBoard.innerHTML = project.stages
    .map((stage) => {
      const stageTasks = project.tasks.filter((task) => task.stage === stage.name);
      return `
        <article class="stage-column">
          <header>
            <strong>${stage.name}</strong>
            <span class="badge ${stage.status === "done" ? "done" : stage.status === "late" ? "high" : "now"}">${stageLabel(stage.status)}</span>
          </header>
          <div class="stage-dates">${formatDate(parseDate(stage.start))} - ${formatDate(parseDate(stage.end))}</div>
          <div class="stage-column-tasks">
            ${
              stageTasks.length
                ? stageTasks
                    .map(
                      (task) => `
                        <button class="stage-task linked-task ${taskKey(project, task) === activeTaskKey ? "active" : ""}" type="button" data-task-key="${taskKey(project, task)}">
                          <strong>${task.title}</strong>
                          <span>${task.assignee} - ${formatDate(parseDate(task.due))}</span>
                        </button>
                      `
                    )
                    .join("")
                : '<div class="stage-task empty-task">Brak zadan</div>'
            }
          </div>
        </article>
      `;
    })
    .join("");
  bindTaskLinks(project);
}

function renderDetailGantt(project) {
  el.detailGantt.innerHTML = `
    <div class="detail-scale">
      <span>${formatDate(parseDate(project.stages[0].start))}</span>
      <span>Dzis: ${formatDate(today)}</span>
      <span>${formatDate(parseDate(project.stages.at(-1).end))}</span>
    </div>
    ${project.stages.map((stage) => detailGanttRow(project, stage)).join("")}
  `;
  bindTaskLinks(project);
}

function renderDnView(project) {
  if (!project) return;
  ensureTaskRanges(project);
  ensureProjectWindow(project);
  updateProjectProgress(project);
  renderBreadcrumb(project);
  const dnVisibleDays = Math.max(1, daysBetween(project.viewStart, project.viewEnd) + 1);
  const dnAxisWidth = projectAxisWidth(dnVisibleDays);
  const dnTodayPosition = ganttTodayPosition(project);
  [el.dnProjectView, el.dnGantt, el.dnGanttScaleHost, el.dnBottomScroll, el.dnBottomScrollInner].filter(Boolean).forEach((node) => {
    node.style.setProperty("--dn-visible-days", String(dnVisibleDays));
    node.style.setProperty("--dn-day-width", `${100 / dnVisibleDays}%`);
    node.style.setProperty("--dn-axis-width", `${dnAxisWidth}px`);
  });

  el.dnProjectView.classList.toggle("gantt-maximized", dnGanttMaximized);
  el.dnForecastToggle.checked = dnShowForecast;
  syncDnExpansionLevelButtons(project);
  el.dnMaximizeBtn.textContent = "[]";
  el.dnMaximizeBtn.title = "Pelny zakres";
  el.dnMaximizeBtn.setAttribute("aria-label", el.dnMaximizeBtn.title);
  el.dnFullscreenBtn.textContent = dnGanttMaximized ? "][" : "⛶";
  el.dnFullscreenBtn.title = dnGanttMaximized ? "Przywroc widok" : "Gantt na cale okno";
  el.dnFullscreenBtn.setAttribute("aria-label", el.dnFullscreenBtn.title);
  const rows = dnGanttRows(project);
  if (el.dnGanttRail) {
    el.dnGanttRail.innerHTML = `
      <div class="project-gantt-scale-spacer"></div>
      ${rows.map((row) => dnRailRow(project, row)).join("")}
    `;
  }
  const scaleHtml = dnScale(project);
  if (el.dnGanttScaleHost) {
    el.dnGanttScaleHost.innerHTML = scaleHtml;
  }
  el.dnGantt.innerHTML = `
    ${datePopoverHtml(project)}
    ${el.dnGanttScaleHost ? "" : scaleHtml}
    ${dnTodayPosition == null ? "" : `<div class="dn-today-line" style="left:${dnTodayPosition}%" aria-hidden="true"></div>`}
    ${rows.map((row) => dnAxisRow(project, row)).join("")}
  `;

  bindDnGantt(project);
  syncDnGanttScrollbar();

  if (!dnSelection) {
    renderDnEmptyContent();
    return;
  }

  if (dnSelection.type === "stage") {
    const stage = project.stages.find((item) => item.name === dnSelection.name);
    renderDnStageContent(project, stage);
  }

  if (dnSelection.type === "task") {
    renderDnTaskContent(project, project.tasks[dnSelection.index], dnSelection.index);
  }
}

function syncDnGanttScrollbar() {
  const viewport = el.dnGanttViewport;
  const bottom = el.dnBottomScroll;
  const inner = el.dnBottomScrollInner;
  if (!viewport || !bottom || !inner || !el.dnGantt) return;
  const currentScale = () => el.dnGanttScaleHost?.querySelector(".dn-scale");
  // Pasek ma byc aktywny i widoczny w kazdym trybie (etapy, zadania,
  // zlecenia, widok zwykly i powiekszony), nawet gdy os miesci sie na ekranie.
  const axisWidth = Math.max(viewport.scrollWidth, el.dnGantt.scrollWidth, currentScale()?.scrollWidth || 0, viewport.clientWidth + 2);
  inner.style.width = `${axisWidth}px`;
  const applyScroll = (left) => {
    const scale = currentScale();
    const currentAxisWidth = Math.max(inner.scrollWidth, el.dnGantt.scrollWidth, scale?.scrollWidth || 0, viewport.clientWidth);
    const max = Math.max(0, currentAxisWidth - bottom.clientWidth);
    const next = clamp(Number(left) || 0, 0, max);
    dnHorizontalScroll = next;
    if (viewport.scrollLeft !== next) viewport.scrollLeft = next;
    if (bottom.scrollLeft !== next) bottom.scrollLeft = next;
    const transform = next ? `translateX(${-next}px)` : "";
    el.dnGantt.style.transform = transform;
    if (scale) scale.style.transform = transform;
  };
  viewport.__dnApplyScroll = applyScroll;
  requestAnimationFrame(() => applyScroll(dnHorizontalScroll || viewport.scrollLeft || bottom.scrollLeft));
  if (viewport.dataset.scrollBound === "true") return;
  viewport.dataset.scrollBound = "true";
  let syncing = false;
  const sync = (source) => {
    if (syncing) return;
    syncing = true;
    viewport.__dnApplyScroll?.(source.scrollLeft);
    requestAnimationFrame(() => { syncing = false; });
  };
  viewport.addEventListener("scroll", () => sync(viewport));
  bottom.addEventListener("scroll", () => sync(bottom));
  [viewport, bottom].forEach((scroller) => {
    scroller.addEventListener("wheel", (event) => {
      if (event.ctrlKey) return;
      const horizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!event.shiftKey && !horizontalGesture) return;
      const delta = horizontalGesture ? event.deltaX : event.deltaY;
      if (!delta) return;
      const max = Math.max(0, inner.scrollWidth - bottom.clientWidth);
      if (max <= 0) return;
      event.preventDefault();
      const next = clamp(bottom.scrollLeft + delta, 0, max);
      viewport.__dnApplyScroll?.(next);
    }, { passive: false });
  });
}

function resetDnHorizontalScroll() {
  dnHorizontalScroll = 0;
  if (el.dnGanttViewport) el.dnGanttViewport.scrollLeft = 0;
  if (el.dnBottomScroll) el.dnBottomScroll.scrollLeft = 0;
  if (el.dnGantt) el.dnGantt.style.transform = "";
  const scale = el.dnGanttScaleHost?.querySelector(".dn-scale");
  if (scale) scale.style.transform = "";
}

function usesDnTemplate(project) {
  return Boolean(project);
}

function activeGanttProject() {
  return projects.find((item) => item.id === activeProjectId) || projects.find((item) => item.id === "dk8") || projects[0];
}

function restoreDnExpandedStages(project) {
  const saved = dnExpandedStagesByProject[project.id];
  dnExpandedStages = new Set(Array.isArray(saved) ? saved.filter((name) => project.stages.some((stage) => stage.name === name)) : []);
  dnExpanded = dnExpandedStages.size === project.stages.length && project.stages.length > 0;
  const savedTasks = dnExpandedTasksByProject[project.id];
  const validTaskKeys = new Set(project.tasks.map((task, index) => dnTaskExpandKey(index)));
  dnExpandedTasks = new Set(Array.isArray(savedTasks) ? savedTasks.filter((key) => validTaskKeys.has(key)) : []);
}

function rememberDnExpandedStages(project) {
  if (!project) return;
  dnExpandedStagesByProject[project.id] = [...dnExpandedStages].filter((name) => project.stages.some((stage) => stage.name === name));
  dnExpanded = dnExpandedStages.size === project.stages.length && project.stages.length > 0;
  const validTaskKeys = new Set(project.tasks.map((task, index) => dnTaskExpandKey(index)));
  dnExpandedTasksByProject[project.id] = [...dnExpandedTasks].filter((key) => validTaskKeys.has(key));
}

function setDnExpansionLevel(level) {
  const project = activeGanttProject();
  if (!project) return;
  const stageNames = project.stages.map((stage) => stage.name);
  const taskKeys = project.tasks.map((task, index) => dnTaskExpandKey(index));

  if (level === 1) {
    dnExpandedStages = new Set();
    dnExpandedTasks = new Set();
  } else if (level === 2) {
    dnExpandedStages = new Set(stageNames);
    dnExpandedTasks = new Set();
  } else {
    dnExpandedStages = new Set(stageNames);
    dnExpandedTasks = new Set(taskKeys);
  }

  dnExpanded = dnExpandedStages.size === stageNames.length && stageNames.length > 0;
  rememberDnExpandedStages(project);
  renderDnView(project);
}

function syncDnExpansionLevelButtons(project) {
  if (!project) return;
  const stageNames = project.stages.map((stage) => stage.name);
  const taskKeys = project.tasks.map((task, index) => dnTaskExpandKey(index));
  const allStagesExpanded = stageNames.length > 0 && stageNames.every((name) => dnExpandedStages.has(name));
  const noStagesExpanded = stageNames.every((name) => !dnExpandedStages.has(name));
  const allTasksExpanded = taskKeys.length > 0 && taskKeys.every((key) => dnExpandedTasks.has(key));
  const noTasksExpanded = taskKeys.every((key) => !dnExpandedTasks.has(key));
  const activeLevel = noStagesExpanded
    ? 1
    : allStagesExpanded && noTasksExpanded
      ? 2
      : allStagesExpanded && allTasksExpanded
        ? 3
        : 0;

  [
    [el.dnLevelStagesBtn, 1],
    [el.dnLevelTasksBtn, 2],
    [el.dnLevelOrdersBtn, 3],
  ].forEach(([button, level]) => {
    button?.classList.toggle("active", activeLevel === level);
    button?.setAttribute("aria-pressed", activeLevel === level ? "true" : "false");
  });
}

function dnTaskExpandKey(taskIndex) {
  return String(taskIndex);
}

function dnStageGroup(project, stage) {
  const position = ganttPosition(project, stage);
  const todayPosition = ganttTodayPosition(project);
  const compactRange = `${formatShortDate(parseDate(stage.start))} - ${formatShortDate(parseDate(stage.end))}`;
  const projectColor = ensureProjectColor(project);
  const projectColorDark = shadeColor(projectColor, -18);
  const stageTasks = project.tasks
    .map((task, index) => ({ ...task, index }))
    .filter((task) => task.stage === stage.name);
  const active = dnSelection?.type === "stage" && dnSelection.name === stage.name;
  const expanded = dnExpandedStages.has(stage.name);

  return `
    <section class="dn-stage-group">
      <div class="dn-gantt-row">
        <button class="dn-row-name ${active ? "active" : ""}" type="button" data-dn-stage="${stage.name}">
          <span class="dn-row-title">
            <strong>${stage.name}</strong>
          </span>
          <span>${formatDate(parseDate(stage.start))} - ${formatDate(parseDate(stage.end))}</span>
        </button>
        <div class="dn-track">
          ${weekendMarkers(project)}
          ${forecastBar(project, stage)}
          ${todayPosition == null ? "" : `<div class="today-marker detail" style="left: ${todayPosition}%"></div>`}
          <button class="dn-stage-bar ${stage.status} ${active ? "active" : ""}" type="button" data-dn-stage="${stage.name}" style="left: ${position.left}%; width: ${position.width}%; --project-color:${projectColor}; --project-color-dark:${projectColorDark}">
            <span class="stage-handle left" data-dn-stage-handle="${stage.name}" data-stage-edge="start" aria-hidden="true"></span>
            <span class="bar-label">${stage.name}</span>
            <span class="stage-handle right" data-dn-stage-handle="${stage.name}" data-stage-edge="end" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      ${expanded ? stageTasks.map((task) => dnTaskRow(project, task)).join("") : ""}
    </section>
  `;
}

function dnGanttRows(project) {
  const rows = [];
  project.stages.forEach((stage) => {
    const stageTasks = project.tasks
      .map((task, index) => ({ ...task, index }))
      .filter((task) => task.stage === stage.name);
    rows.push({ type: "stage", stage, tasks: stageTasks });
    if (dnExpandedStages.has(stage.name)) {
      stageTasks.forEach((task) => {
        rows.push({ type: "task", task });
        if (dnExpandedTasks.has(dnTaskExpandKey(task.index))) {
          (project.tasks[task.index].orders || []).forEach((order, orderIndex) => {
            rows.push({ type: "order", taskIndex: task.index, order, orderIndex });
          });
        }
      });
    }
  });
  return rows;
}

function dnRailRow(project, row) {
  if (row.type === "stage") {
    const stage = row.stage;
    const active = dnSelection?.type === "stage" && dnSelection.name === stage.name;
    return `
      <div class="project-gantt-rail-row stage">
        <button class="dn-row-name ${active ? "active" : ""}" type="button" data-dn-stage="${stage.name}">
          <span class="dn-row-title"><strong>${stage.name}</strong></span>
          <span>${formatDate(parseDate(stage.start))} - ${formatDate(parseDate(stage.end))}</span>
        </button>
      </div>
    `;
  }
  if (row.type === "task") {
    const task = project.tasks[row.task.index];
    const active = dnSelection?.type === "task" && dnSelection.index === row.task.index;
    return `
      <div class="project-gantt-rail-row task">
        <button class="dn-row-name task ${active ? "active" : ""}" type="button" data-dn-task="${row.task.index}">
          <span class="dn-row-title"><strong>${task.title}</strong></span>
          <span>${formatDate(parseDate(task.start || task.due))} - ${formatDate(parseDate(task.end || task.due))}</span>
        </button>
      </div>
    `;
  }
  const start = row.order.start || row.order.due;
  const end = row.order.due || row.order.start;
  const active = dnSelection?.type === "task" && dnSelection.index === row.taskIndex && activeOrderIndex === row.orderIndex;
  return `
    <div class="project-gantt-rail-row order">
      <button class="dn-row-name order ${active ? "active" : ""}" type="button" data-dn-order="${row.taskIndex}:${row.orderIndex}">
        <span class="dn-row-title"><strong>${row.order.title || "Zlecenie"}</strong></span>
        <span>${formatDate(parseDate(start))} - ${formatDate(parseDate(end))}</span>
      </button>
    </div>
  `;
}

function dnAxisRow(project, row) {
  if (row.type === "stage") return dnStageAxisRow(project, row.stage);
  if (row.type === "task") return dnTaskAxisRow(project, row.task);
  return dnOrderAxisRow(project, row.taskIndex, row.order, row.orderIndex);
}

function dnStageAxisRow(project, stage) {
  const position = ganttPosition(project, stage);
  const active = dnSelection?.type === "stage" && dnSelection.name === stage.name;
  const projectColor = ensureProjectColor(project);
  const projectColorDark = shadeColor(projectColor, -18);
  return `
    <div class="dn-gantt-row stage">
      <div class="dn-track">
        ${weekendMarkers(project)}
        ${forecastBar(project, stage)}
        <button class="dn-stage-bar ${stage.status} ${active ? "active" : ""}" type="button" data-dn-stage="${stage.name}" style="left: ${position.left}%; width: ${position.width}%; --project-color:${projectColor}; --project-color-dark:${projectColorDark}">
          <span class="stage-handle left" data-dn-stage-handle="${stage.name}" data-stage-edge="start" aria-hidden="true"></span>
          <span class="bar-label">${stage.name}</span>
          <span class="stage-handle right" data-dn-stage-handle="${stage.name}" data-stage-edge="end" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;
}

function dnTaskAxisRow(project, task) {
  const source = project.tasks[task.index];
  const position = taskPosition(project, source);
  const active = dnSelection?.type === "task" && dnSelection.index === task.index;
  const complete = checklistProgress(source) === 100;
  const projectColor = ensureProjectColor(project);
  const projectColorDark = shadeColor(projectColor, -18);
  return `
    <div class="dn-gantt-row task">
      <div class="dn-track task">
        ${weekendMarkers(project)}
        <button class="dn-task-dot ${active ? "active" : ""} ${complete ? "complete" : ""}" type="button" data-dn-task="${task.index}" style="left: ${position.left}%; width: ${position.width}%; --project-color:${projectColor}; --project-color-dark:${projectColorDark}">
          <span class="task-handle left" data-dn-task-handle="${task.index}" data-task-edge="start" aria-hidden="true"></span>
          <span class="task-label">${task.title}</span>
          <span class="task-handle right" data-dn-task-handle="${task.index}" data-task-edge="end" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;
}

function dnOrderAxisRow(project, taskIndex, order, orderIndex) {
  const position = orderGanttPosition(project, order);
  const active = dnSelection?.type === "task" && dnSelection.index === taskIndex && activeOrderIndex === orderIndex;
  const complete = orderProgress(order) >= 100 || order.status === "Zrobione";
  const projectColor = ensureProjectColor(project);
  const projectColorDark = shadeColor(projectColor, -18);
  return `
    <div class="dn-gantt-row order">
      <div class="dn-track order">
        ${weekendMarkers(project)}
        <button class="dn-order-bar ${active ? "active" : ""} ${complete ? "complete" : ""}" type="button" data-dn-order="${taskIndex}:${orderIndex}" style="left: ${position.left}%; width: ${position.width}%; --project-color:${projectColor}; --project-color-dark:${projectColorDark}">
          <span class="order-handle left" data-dn-order-handle="${taskIndex}:${orderIndex}" data-order-edge="start" aria-hidden="true"></span>
          <span class="task-label">${order.title || "Zlecenie"}</span>
          <span class="order-handle right" data-dn-order-handle="${taskIndex}:${orderIndex}" data-order-edge="end" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;
}

function dnTaskRow(project, task) {
  const position = taskPosition(project, project.tasks[task.index]);
  const active = dnSelection?.type === "task" && dnSelection.index === task.index;
  const complete = checklistProgress(project.tasks[task.index]) === 100;
  const projectColor = ensureProjectColor(project);
  const projectColorDark = shadeColor(projectColor, -18);
  const orders = (project.tasks[task.index].orders || []).map((order, orderIndex) => dnOrderRow(project, task.index, order, orderIndex)).join("");

  return `
    <div class="dn-gantt-row task">
      <button class="dn-row-name task ${active ? "active" : ""}" type="button" data-dn-task="${task.index}">
        <span class="dn-row-title">
          <strong>${task.title}</strong>
        </span>
        <span>${formatDate(parseDate(project.tasks[task.index].start))} - ${formatDate(parseDate(project.tasks[task.index].end))}</span>
      </button>
      <div class="dn-track task">
        ${weekendMarkers(project)}
        <button class="dn-task-dot ${active ? "active" : ""} ${complete ? "complete" : ""}" type="button" data-dn-task="${task.index}" style="left: ${position.left}%; width: ${position.width}%; --project-color:${projectColor}; --project-color-dark:${projectColorDark}">
                <span class="task-handle left" data-dn-task-handle="${task.index}" data-task-edge="start" aria-hidden="true"></span>
                <span class="task-label">${task.title}</span>
                <span class="task-handle right" data-dn-task-handle="${task.index}" data-task-edge="end" aria-hidden="true"></span>
        </button>
      </div>
    </div>
    ${orders}
  `;
}

function dnOrderRow(project, taskIndex, order, orderIndex) {
  const position = orderGanttPosition(project, order);
  const active = dnSelection?.type === "task" && dnSelection.index === taskIndex && activeOrderIndex === orderIndex;
  const complete = orderProgress(order) >= 100 || order.status === "Zrobione";
  const projectColor = ensureProjectColor(project);
  const projectColorDark = shadeColor(projectColor, -18);
  const start = order.start || order.due;
  const end = order.due || order.start;
  return `
    <div class="dn-gantt-row order">
      <button class="dn-row-name order ${active ? "active" : ""}" type="button" data-dn-order="${taskIndex}:${orderIndex}">
        <span class="dn-row-title">
          <strong>${order.title || "Zlecenie"}</strong>
        </span>
        <span>${formatDate(parseDate(start))} - ${formatDate(parseDate(end))}</span>
      </button>
      <div class="dn-track order">
        ${weekendMarkers(project)}
        <button class="dn-order-bar ${active ? "active" : ""} ${complete ? "complete" : ""}" type="button" data-dn-order="${taskIndex}:${orderIndex}" style="left: ${position.left}%; width: ${position.width}%; --project-color:${projectColor}; --project-color-dark:${projectColorDark}">
          <span class="order-handle left" data-dn-order-handle="${taskIndex}:${orderIndex}" data-order-edge="start" aria-hidden="true"></span>
          <span class="task-label">${order.title || "Zlecenie"}</span>
          <span class="order-handle right" data-dn-order-handle="${taskIndex}:${orderIndex}" data-order-edge="end" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  `;
}

function bindDnGantt(project) {
  bindFolderButtons(project, el.dnGantt);
  bindFileButtons(project, el.dnGantt);
  bindDatePopover(project);
  const root = el.dnProjectView || el.dnGantt;
  const scaleRoot = el.dnGanttScaleHost || el.dnGantt;

  root.querySelectorAll("[data-dn-stage]").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.dataset.dragged === "true") {
        item.dataset.dragged = "false";
        return;
      }
      const stageName = item.dataset.dnStage;
      dnSelection = { type: "stage", name: stageName };
      if (dnExpandedStages.has(stageName)) {
        dnExpandedStages.delete(stageName);
      } else {
        dnExpandedStages.add(stageName);
      }
      rememberDnExpandedStages(project);
      renderDnView(project);
    });
  });

  root.querySelectorAll("[data-dn-task]").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.dataset.dragged === "true") {
        item.dataset.dragged = "false";
        return;
      }
      dnSelection = { type: "task", index: Number(item.dataset.dnTask) };
      activeOrderIndex = 0;
      const taskKey = dnTaskExpandKey(Number(item.dataset.dnTask));
      if (dnExpandedTasks.has(taskKey)) {
        dnExpandedTasks.delete(taskKey);
      } else {
        dnExpandedTasks.add(taskKey);
      }
      rememberDnExpandedStages(project);
      renderDnView(project);
    });
    item.addEventListener("pointerdown", (event) => startDnTaskMove(event, project, Number(item.dataset.dnTask)));
  });

  root.querySelectorAll("[data-dn-order]").forEach((item) => {
    item.addEventListener("click", () => {
      if (item.dataset.dragged === "true") {
        item.dataset.dragged = "false";
        return;
      }
      const [taskIndexRaw, orderIndexRaw] = item.dataset.dnOrder.split(":");
      const taskIndex = Number(taskIndexRaw);
      const orderIndex = Number(orderIndexRaw);
      dnSelection = { type: "task", index: taskIndex };
      activeOrderIndex = orderIndex;
      renderDnView(project);
    });
  });

  el.dnGantt.querySelectorAll(".dn-order-bar[data-dn-order]").forEach((item) => {
    item.addEventListener("pointerdown", (event) => {
      if (event.target.closest("[data-dn-order-handle]")) return;
      const [taskIndexRaw, orderIndexRaw] = item.dataset.dnOrder.split(":");
      startDnOrderMove(event, project, Number(taskIndexRaw), Number(orderIndexRaw));
    });
  });

  root.querySelectorAll("[data-dn-stage]").forEach((item) => {
    item.addEventListener("pointerdown", (event) => startDnStageMove(event, project, item.dataset.dnStage));
  });

  scaleRoot.querySelectorAll("[data-scale-month]").forEach((item) => {
    item.addEventListener("click", () => {
      setProjectWindow(project, item.dataset.monthStart, item.dataset.monthEnd);
    });
  });
  scaleRoot.querySelectorAll("[data-scale-week]").forEach((item) => {
    item.addEventListener("click", () => {
      setProjectWindow(project, item.dataset.weekStart, item.dataset.weekEnd);
    });
  });
  scaleRoot.querySelectorAll("[data-scale-day]").forEach((item) => {
    item.addEventListener("click", () => {
      setProjectWindow(project, item.dataset.day, item.dataset.day);
    });
  });

  scaleRoot.querySelector("[data-scale-reset]")?.addEventListener("click", () => {
    resetProjectWindow(project);
    schedulePersist();
    renderDnView(project);
    requestAnimationFrame(resetDnHorizontalScroll);
  });

  el.dnGantt.querySelectorAll("[data-dn-task-handle]").forEach((item) => {
    item.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      startDnTaskResize(event, project, Number(item.dataset.dnTaskHandle), item.dataset.taskEdge);
    });
  });

  el.dnGantt.querySelectorAll("[data-dn-order-handle]").forEach((item) => {
    item.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      const [taskIndexRaw, orderIndexRaw] = item.dataset.dnOrderHandle.split(":");
      startDnOrderResize(event, project, Number(taskIndexRaw), Number(orderIndexRaw), item.dataset.orderEdge);
    });
  });

  el.dnGantt.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const taskIndex = Number(button.dataset.deleteTask);
      const task = project.tasks[taskIndex];
      if (!task || !await zkConfirm(`Usunąć zadanie "${task.title}" razem ze zleceniami i checklistami?`, { danger: true })) return;
      project.tasks.splice(taskIndex, 1);
      activeOrderIndex = 0;
      if (project.tasks.length) {
        dnSelection = { type: "task", index: Math.min(taskIndex, project.tasks.length - 1) };
      } else {
        dnSelection = null;
      }
      renderPeopleFilter();
      renderDnView(project);
    });
  });

  el.dnGantt.querySelectorAll("[data-dn-stage-handle]").forEach((item) => {
    item.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      startDnStageResize(event, project, item.dataset.dnStageHandle, item.dataset.stageEdge);
    });
  });
}

function datePopoverHtml(project) {
  if (!datePopover) return "";
  const item = datePopover.type === "stage" ? project.stages.find((stage) => stage.name === datePopover.key) : project.tasks[Number(datePopover.key)];
  if (!item) return "";
  return `
    <div class="date-popover" style="left: ${datePopover.x}px; top: ${datePopover.y}px" data-date-popover>
      <strong>${item.name || item.title}</strong>
      <div class="date-popover-range">
        <input type="date" value="${item.start}" data-popover-field="start" />
        <input type="date" value="${item.end}" data-popover-field="end" />
      </div>
      <div class="date-popover-days">${dateRangeDays(item.start, item.end).map((day) => `<span>${formatShortDate(day)}</span>`).join("")}</div>
      <button type="button" data-popover-close>Zamknij</button>
    </div>
  `;
}

function bindDatePopover(project) {
  if (!datePopover) return;
  const popover = el.dnGantt.querySelector("[data-date-popover]");
  if (!popover) return;
  const item = datePopover.type === "stage" ? project.stages.find((stage) => stage.name === datePopover.key) : project.tasks[Number(datePopover.key)];
  if (!item) return;
  popover.querySelectorAll("[data-popover-field]").forEach((input) => {
    input.addEventListener("change", () => {
      item[input.dataset.popoverField] = input.value;
      if (parseDate(item.end) < parseDate(item.start)) item.end = item.start;
      if (datePopover.type === "task") item.due = item.end;
      renderDnView(project);
    });
  });
  popover.querySelector("[data-popover-close]")?.addEventListener("click", () => {
    datePopover = null;
    renderDnView(project);
  });
}

function showDatePopover(project, item, type, key, x, y) {
  datePopover = {
    type,
    key,
    x: Math.min(Math.max(12, x - 90), window.innerWidth - 260),
    y: Math.min(Math.max(90, y + 12), window.innerHeight - 190)
  };
  if (type === "stage") dnSelection = { type: "stage", name: item.name };
  if (type === "task") dnSelection = { type: "task", index: Number(key) };
  renderDnView(project);
}

function startDnTaskMove(event, project, taskIndex) {
  if (event.target.closest("[data-dn-task-handle]")) return;
  if (event.target.closest("[data-delete-task]")) return;
  const track = event.currentTarget.closest(".dn-track");
  const task = project.tasks[taskIndex];
  if (!track || !task) return;

  event.preventDefault();
  let moved = false;
  const holdTimer = window.setTimeout(() => {
    showDatePopover(project, task, "task", taskIndex, event.clientX, event.clientY);
  }, 650);
  const startX = event.clientX;
  const rect = track.getBoundingClientRect();
  const originalStart = task.start;
  const originalEnd = task.end;
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);

  const moveTask = (clientX) => {
    if (!moved && Math.abs(clientX - startX) < 4) return;
    window.clearTimeout(holdTimer);
    moved = true;
    const dayDelta = dnDayDeltaFromPixels(project, clientX - startX, rect.width);
    task.start = dateString(nextWorkday(addDays(originalStart, dayDelta)));
    task.end = dateString(nextWorkday(addDays(originalEnd, dayDelta)));
    task.due = task.end;
    dnSelection = { type: "task", index: taskIndex };
    renderDnView(project);
  };

  const onMove = (moveEvent) => moveTask(moveEvent.clientX);
  const onUp = (upEvent) => {
    window.clearTimeout(holdTimer);
    if (Math.abs(upEvent.clientX - startX) >= 4) moveTask(upEvent.clientX);
    target.dataset.dragged = moved ? "true" : "false";
    if (moved) schedulePersist();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function startDnOrderMove(event, project, taskIndex, orderIndex) {
  const track = event.currentTarget.closest(".dn-track");
  const task = project.tasks[taskIndex];
  const order = task?.orders?.[orderIndex];
  if (!track || !order) return;

  event.preventDefault();
  let moved = false;
  const startX = event.clientX;
  const rect = track.getBoundingClientRect();
  const originalStart = order.start || order.due || task.start || task.due;
  const originalEnd = order.due || order.start || task.end || task.due;
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);

  const moveOrder = (clientX) => {
    if (!moved && Math.abs(clientX - startX) < 4) return;
    moved = true;
    const dayDelta = dnDayDeltaFromPixels(project, clientX - startX, rect.width);
    order.start = dateString(nextWorkday(addDays(originalStart, dayDelta)));
    order.due = dateString(nextWorkday(addDays(originalEnd, dayDelta)));
    if (parseDate(order.due) < parseDate(order.start)) order.due = order.start;
    dnSelection = { type: "task", index: taskIndex };
    activeOrderIndex = orderIndex;
    renderDnView(project);
  };

  const onMove = (moveEvent) => moveOrder(moveEvent.clientX);
  const onUp = (upEvent) => {
    if (Math.abs(upEvent.clientX - startX) >= 4) moveOrder(upEvent.clientX);
    target.dataset.dragged = moved ? "true" : "false";
    if (moved) schedulePersist();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function startDnStageMove(event, project, stageName) {
  if (event.target.closest("[data-dn-stage-handle]")) return;
  const track = event.currentTarget.closest(".dn-track");
  const stage = project.stages.find((item) => item.name === stageName);
  if (!track || !stage) return;

  event.preventDefault();
  let moved = false;
  const holdTimer = window.setTimeout(() => {
    showDatePopover(project, stage, "stage", stageName, event.clientX, event.clientY);
  }, 650);
  const startX = event.clientX;
  const rect = track.getBoundingClientRect();
  const originalStart = stage.start;
  const originalEnd = stage.end;
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);

  const moveStage = (clientX) => {
    if (!moved && Math.abs(clientX - startX) < 4) return;
    window.clearTimeout(holdTimer);
    moved = true;
    const dayDelta = dnDayDeltaFromPixels(project, clientX - startX, rect.width);
    stage.start = dateString(nextWorkday(addDays(originalStart, dayDelta)));
    stage.end = dateString(nextWorkday(addDays(originalEnd, dayDelta)));
    dnSelection = { type: "stage", name: stage.name };
    renderDnView(project);
  };

  const onMove = (moveEvent) => moveStage(moveEvent.clientX);
  const onUp = (upEvent) => {
    window.clearTimeout(holdTimer);
    if (Math.abs(upEvent.clientX - startX) >= 4) moveStage(upEvent.clientX);
    target.dataset.dragged = moved ? "true" : "false";
    if (moved) schedulePersist();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function startDnTaskResize(event, project, taskIndex, edge) {
  const task = project.tasks[taskIndex];
  if (!task) return;
  startDnRangeResize(event, project, task, edge, () => {
    task.due = task.end;
    dnSelection = { type: "task", index: taskIndex };
  });
}

function startDnOrderResize(event, project, taskIndex, orderIndex, edge) {
  const task = project.tasks[taskIndex];
  const order = task?.orders?.[orderIndex];
  if (!order) return;
  if (!order.start) order.start = order.due || task.start || task.due;
  if (!order.due) order.due = order.start || task.end || task.due;
  startDnRangeResize(event, project, order, edge, () => {
    dnSelection = { type: "task", index: taskIndex };
    activeOrderIndex = orderIndex;
  }, "start", "due");
}

function startDnStageResize(event, project, stageName, edge) {
  const stage = project.stages.find((item) => item.name === stageName);
  if (!stage) return;
  startDnRangeResize(event, project, stage, edge, () => {
    dnSelection = { type: "stage", name: stage.name };
  });
}

function startDnRangeResize(event, project, item, edge, afterChange, startField = "start", endField = "end") {
  const track = event.currentTarget.closest(".dn-track");
  if (!track) return;

  event.preventDefault();
  let moved = false;
  const startX = event.clientX;
  const target = event.currentTarget;
  target.setPointerCapture(event.pointerId);

  const rect = track.getBoundingClientRect();
  const originalStart = item[startField];
  const originalEnd = item[endField];
  const resize = (clientX) => {
    if (!moved && Math.abs(clientX - startX) < 4) return;
    moved = true;
    const dayDelta = dnDayDeltaFromPixels(project, clientX - startX, rect.width);
    if (edge === "start") {
      const nextStart = dateString(nextWorkday(addDays(originalStart, dayDelta)));
      item[startField] = parseDate(nextStart) > parseDate(item[endField]) ? item[endField] : nextStart;
    } else {
      const nextEnd = dateString(nextWorkday(addDays(originalEnd, dayDelta)));
      item[endField] = parseDate(nextEnd) < parseDate(item[startField]) ? item[startField] : nextEnd;
    }
    afterChange();
    renderDnView(project);
  };

  const onMove = (moveEvent) => resize(moveEvent.clientX);
  const onUp = (upEvent) => {
    if (Math.abs(upEvent.clientX - startX) >= 4) resize(upEvent.clientX);
    target.dataset.dragged = moved ? "true" : "false";
    if (moved) schedulePersist();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

function renderDnEmptyContent() {
  renderBreadcrumb(activeGanttProject());
  el.dnContentType.textContent = "Podglad";
  el.dnContentTitle.textContent = "Wybierz etap albo zadanie";
  el.dnContentProgress.classList.add("hidden");
  el.dnContentBody.innerHTML = '<div class="empty">Kliknij etap albo zadanie na Gantcie, zeby zobaczyc szczegoly.</div>';
}

function renderDnStageContent(project, stage) {
  if (!stage) return renderDnEmptyContent();
  renderBreadcrumb(project);
  const tasks = project.tasks.filter((task) => task.stage === stage.name);
  const stageTasks = project.tasks
    .map((task, index) => ({ task, index }))
    .filter((item) => item.task.stage === stage.name);

  el.dnContentType.textContent = "Etap";
  el.dnContentTitle.innerHTML = `
    <input class="inline-name-edit stage-name-edit" type="text" value="${escapeHtml(stage.name)}" data-stage-name-edit="${escapeHtml(stage.name)}" aria-label="Nazwa etapu" />
    <button class="delete-corner delete-stage-content" type="button" data-delete-stage-content="${escapeHtml(stage.name)}" title="Usun etap">x</button>
  `;
  el.dnContentProgress.classList.add("hidden");
  el.dnContentBody.innerHTML = `
    <div class="dn-content-grid">
      <div class="dn-field">
        <span>Termin</span>
        <div class="dn-date-pair">
          <input type="date" value="${stage.start}" data-stage-date="${stage.name}" data-stage-field="start" />
          <input type="date" value="${stage.end}" data-stage-date="${stage.name}" data-stage-field="end" />
        </div>
      </div>
      <div class="dn-field">
        <span>Daty przewidywane</span>
        <div class="dn-date-pair">
          <input type="date" value="${stage.expectedStart || ""}" data-forecast-date="${stage.name}" data-forecast-field="expectedStart" />
          <input type="date" value="${stage.expectedEnd || ""}" data-forecast-date="${stage.name}" data-forecast-field="expectedEnd" />
        </div>
      </div>
    </div>
    <h3>Zadania w etapie</h3>
    <div class="dn-content-list">
      ${
        stageTasks.length
          ? stageTasks.map(({ task, index }) => `
            <div class="dn-content-task editable">
              <input class="inline-name-edit stage-task-title-edit" type="text" value="${escapeHtml(task.title)}" data-stage-task-title="${index}" aria-label="Nazwa zadania" />
              <div class="dn-date-pair">
                <input type="date" value="${task.start || task.due}" data-stage-task-date="${index}" data-stage-task-field="start" />
                <input type="date" value="${task.end || task.due}" data-stage-task-date="${index}" data-stage-task-field="end" />
              </div>
              <span>${escapeHtml(task.assignee || "Zespol")}</span>
              <button type="button" data-dn-content-task="${index}">Otworz</button>
            </div>
          `).join("")
          : '<div class="empty">Brak zadan w tym etapie.</div>'
      }
    </div>
  `;

  el.dnContentTitle.querySelector("[data-stage-name-edit]")?.addEventListener("change", (event) => {
    renameStage(project, event.target.dataset.stageNameEdit, event.target.value);
  });

  el.dnContentTitle.querySelector("[data-delete-stage-content]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    deleteStage(project, event.currentTarget.dataset.deleteStageContent);
  });

  el.dnContentBody.querySelectorAll("[data-stage-date]").forEach((input) => {
    input.addEventListener("change", () => {
      const editedStage = project.stages.find((item) => item.name === input.dataset.stageDate);
      if (!editedStage) return;
      editedStage[input.dataset.stageField] = input.value;
      if (parseDate(editedStage.end) < parseDate(editedStage.start)) {
        editedStage.end = editedStage.start;
      }
      dnSelection = { type: "stage", name: editedStage.name };
      schedulePersist();
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-forecast-date]").forEach((input) => {
    input.addEventListener("change", () => {
      const editedStage = project.stages.find((item) => item.name === input.dataset.forecastDate);
      if (!editedStage) return;
      editedStage[input.dataset.forecastField] = input.value;
      dnSelection = { type: "stage", name: editedStage.name };
      schedulePersist();
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-dn-content-task]").forEach((item) => {
    item.addEventListener("click", () => {
      dnSelection = { type: "task", index: Number(item.dataset.dnContentTask) };
      activeOrderIndex = 0;
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-stage-task-title]").forEach((input) => {
    input.addEventListener("change", () => {
      const task = project.tasks[Number(input.dataset.stageTaskTitle)];
      if (!task) return;
      const title = input.value.trim();
      if (!title) {
        input.value = task.title;
        return;
      }
      task.title = title;
      dnSelection = { type: "stage", name: stage.name };
      schedulePersist();
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-stage-task-date]").forEach((input) => {
    input.addEventListener("change", () => {
      const task = project.tasks[Number(input.dataset.stageTaskDate)];
      if (!task) return;
      task[input.dataset.stageTaskField] = input.value;
      if (parseDate(task.end || task.due) < parseDate(task.start || task.due)) {
        task.end = task.start;
      }
      task.due = task.end || task.due;
      dnSelection = { type: "stage", name: stage.name };
      schedulePersist();
      renderDnView(project);
    });
  });
}

function renderDnTaskContent(project, task, taskIndex) {
  if (!task) return renderDnEmptyContent();
  ensureTaskOrders(task);
  if (!task.orders[activeOrderIndex]) activeOrderIndex = 0;
  const activeOrder = task.orders[activeOrderIndex] || null;
  const progress = checklistProgress(task);
  const hours = taskHours(task);
  renderBreadcrumb(project);

  el.dnContentType.textContent = "Zadanie";
  el.dnContentTitle.innerHTML = `
    <input class="inline-name-edit task-name-edit" type="text" value="${task.title}" data-task-title="${taskIndex}" aria-label="Nazwa zadania" />
    <label class="reminder-check">
      <input type="checkbox" ${task.outlookReminder ? "checked" : ""} data-task-reminder="${taskIndex}" />
      <span>Outlook</span>
    </label>
    <div class="dn-date-pair title-dates">
      <input type="date" value="${task.start}" data-task-date="${taskIndex}" data-task-field="start" />
      <input type="date" value="${task.end}" data-task-date="${taskIndex}" data-task-field="end" />
    </div>
    <input class="task-title-description" type="text" value="${task.description || ""}" placeholder="Opis..." data-task-description="${taskIndex}" />
  `;
  el.dnContentProgress.textContent = `${progress}% / ${formatHours(hours)}h`;
  el.dnContentProgress.classList.remove("hidden");
  el.dnContentBody.innerHTML = `
    <div class="dn-workspace">
      <section class="dn-task-pane">
        <div class="dn-task-tools">
          <h3>Zlecenia</h3>
          <button class="complete-task-btn" type="button" data-complete-task="${taskIndex}">Wykonane</button>
        </div>
        ${kanbanHtml(task)}
      </section>
      <section class="order-preview-pane">
        ${orderPreviewHtml(activeOrder, activeOrderIndex)}
      </section>
      <aside class="folder-explorer">
        ${explorerHtml(project, task)}
      </aside>
    </div>
  `;

  [el.dnContentTitle, el.dnContentBody].forEach((root) => {
    root.querySelectorAll("[data-task-date]").forEach((input) => {
      input.addEventListener("change", () => {
        const editedTask = project.tasks[Number(input.dataset.taskDate)];
        editedTask[input.dataset.taskField] = input.value;
        if (parseDate(editedTask.end) < parseDate(editedTask.start)) {
        editedTask.end = editedTask.start;
      }
      editedTask.due = editedTask.end;
      dnSelection = { type: "task", index: Number(input.dataset.taskDate) };
      schedulePersist();
      renderDnView(project);
    });
  });
  });

  el.dnContentTitle.querySelectorAll("[data-task-description]").forEach((input) => {
    input.addEventListener("input", () => {
      project.tasks[Number(input.dataset.taskDescription)].description = input.value;
    });
  });

  el.dnContentTitle.querySelectorAll("[data-task-title]").forEach((input) => {
    input.addEventListener("change", () => {
      const editedTask = project.tasks[Number(input.dataset.taskTitle)];
      const title = input.value.trim();
      if (!editedTask || !title) {
        input.value = editedTask?.title || "";
        return;
      }
      editedTask.title = title;
      dnSelection = { type: "task", index: Number(input.dataset.taskTitle) };
      schedulePersist();
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-complete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      task.orders.forEach((order) => {
        order.status = "Zrobione";
        order.checklist.forEach((item) => {
          item.done = true;
        });
      });
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-add-order]").forEach((button) => {
    button.addEventListener("click", async () => {
      const status = button.dataset.addOrder;
      const title = await zkPrompt("Podaj nazwę zlecenia", "", "Nowe zlecenie");
      if (!title) return;
      task.orders.push({ id: createStableId("order"), title, status, assignee: task.assignee, due: task.end, hours: 0, checklist: [] });
      activeOrderIndex = task.orders.length - 1;
      dnSelection = { type: "task", index: taskIndex };
      renderPeopleFilter();
      renderDnView(project);
    });
  });

  bindFileButtons(project, el.dnContentBody, task);

  el.dnContentBody.querySelectorAll("[data-order-card]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("select, input, button, label, .inline-file")) return;
      activeOrderIndex = Number(card.dataset.orderCard);
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
    card.addEventListener("dragstart", (event) => {
      if (event.target.closest("select, input, button, label, .inline-file")) {
        event.preventDefault();
        return;
      }
      draggedKanbanOrderIndex = Number(card.dataset.orderCard);
      event.dataTransfer.setData("text/plain", card.dataset.orderCard);
      event.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => {
      draggedKanbanOrderIndex = null;
      el.dnContentBody.querySelectorAll("[data-order-drop]").forEach(clearKanbanDropMarkers);
    });
  });

  el.dnContentBody.querySelectorAll(".kanban-order select, .kanban-order input, .kanban-order button, .kanban-order label, .kanban-order .inline-file").forEach((control) => {
    control.addEventListener("pointerdown", (event) => event.stopPropagation());
    control.addEventListener("click", (event) => event.stopPropagation());
  });

  el.dnContentBody.querySelectorAll("[data-delete-order]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.deleteOrder);
      const order = task.orders[orderIndex];
      if (!order || !await zkConfirm(`Usunąć zlecenie "${order.title}" razem z checklistami?`, { danger: true })) return;
      task.orders.splice(orderIndex, 1);
      activeOrderIndex = task.orders.length ? Math.min(orderIndex, task.orders.length - 1) : 0;
      dnSelection = { type: "task", index: taskIndex };
      renderPeopleFilter();
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll(".order-person-select .person-avatar").forEach((avatarButton) => {
    avatarButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      avatarButton.closest(".order-person-select")?.classList.toggle("open");
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-drop]").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
      const orderIndex = draggedKanbanOrderIndex ?? Number(event.dataTransfer.getData("text/plain"));
      markKanbanDropTarget(column, event.clientY, orderIndex);
      column.classList.add("drag-over");
    });
    column.addEventListener("dragleave", () => {
      column.classList.remove("drag-over");
      clearKanbanDropMarkers(column);
    });
    column.addEventListener("drop", (event) => {
      event.preventDefault();
      column.classList.remove("drag-over");
      const orderIndex = Number(event.dataTransfer.getData("text/plain"));
      if (!task.orders[orderIndex]) return;
      const previousStatus = task.orders[orderIndex].status;
      const beforeIndex = kanbanBeforeIndex(column, event.clientY, orderIndex);
      const movedOrder = moveOrderToKanbanPosition(task, orderIndex, column.dataset.orderDrop, beforeIndex);
      clearKanbanDropMarkers(column);
      draggedKanbanOrderIndex = null;
      if (!movedOrder) return;
      if (previousStatus !== column.dataset.orderDrop && column.dataset.orderDrop === "Zrobione") {
        movedOrder.checklist.forEach((item) => {
          item.done = true;
        });
      } else if (previousStatus !== column.dataset.orderDrop) {
        movedOrder.checklist.forEach((item) => {
          item.done = false;
        });
      }
      activeOrderIndex = task.orders.indexOf(movedOrder);
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  [el.dnContentTitle, el.dnContentBody].forEach((root) => {
    root.querySelectorAll("[data-task-reminder]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        task.outlookReminder = checkbox.checked && technicalReminderEnabled;
        if (checkbox.checked && !technicalReminderEnabled) {
          void zkAlert("Najpierw włącz przypomnienia Outlook w Ustawieniach.");
        }
        dnSelection = { type: "task", index: taskIndex };
        renderDnView(project);
      });
    });
  });

  el.dnContentBody.querySelectorAll("[data-add-check]").forEach((button) => {
    button.addEventListener("click", () => {
      const orderIndex = Number(button.dataset.addCheck);
      const order = task.orders[orderIndex];
      if (!order) return;
      order.checklist.push({ text: "Nowa pozycja", done: false, image: "" });
      const checkIndex = order.checklist.length - 1;
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
      requestAnimationFrame(() => {
        const input = el.dnContentBody.querySelector(`[data-check-title][data-order-index="${orderIndex}"][data-check-index="${checkIndex}"]`);
        input?.focus();
        input?.select();
      });
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-check]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const order = task.orders[Number(checkbox.dataset.orderIndex)];
      order.checklist[Number(checkbox.dataset.checkIndex)].done = checkbox.checked;
      activeOrderIndex = Number(checkbox.dataset.orderIndex);
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll(".inline-name-edit").forEach((input) => {
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
  });

  el.dnContentBody.querySelectorAll("[data-delete-check]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.orderIndex);
      const checkIndex = Number(button.dataset.checkIndex);
      const item = task.orders[orderIndex]?.checklist?.[checkIndex];
      if (!item || !await zkConfirm(`Usunąć pozycję checklisty "${item.text}"?`, { danger: true })) return;
      task.orders[orderIndex].checklist.splice(checkIndex, 1);
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-check-image]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const orderIndex = Number(input.dataset.orderIndex);
      const checkIndex = Number(input.dataset.checkIndex);
      readFileAsDataUrl(file).then((imageData) => {
        task.orders[orderIndex].checklist[checkIndex].image = imageData;
        activeOrderIndex = orderIndex;
        dnSelection = { type: "task", index: taskIndex };
        renderDnView(project);
      });
    });
  });

  el.dnContentBody.querySelectorAll("[data-check-clipboard]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.orderIndex);
      const checkIndex = Number(button.dataset.checkIndex);
      const imageData = await readClipboardImageData();
      if (!imageData) return;
      task.orders[orderIndex].checklist[checkIndex].image = imageData;
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-image]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return;
      const orderIndex = Number(input.dataset.orderImage);
      readFileAsDataUrl(file).then((imageData) => {
        task.orders[orderIndex].image = imageData;
        activeOrderIndex = orderIndex;
        dnSelection = { type: "task", index: taskIndex };
        renderDnView(project);
      });
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-clipboard]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.orderClipboard);
      const imageData = await readClipboardImageData();
      if (!imageData) return;
      task.orders[orderIndex].image = imageData;
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-remove-check-image]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.orderIndex);
      const checkIndex = Number(button.dataset.checkIndex);
      task.orders[orderIndex].checklist[checkIndex].image = "";
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-remove-order-image]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const orderIndex = Number(button.dataset.removeOrderImage);
      task.orders[orderIndex].image = "";
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-open-check-image], [data-open-order-image]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const image = link.querySelector("img");
      if (!image?.src) return;
      const imageWindow = window.open("", "_blank");
      if (!imageWindow) {
        void zkAlert("Przeglądarka zablokowała nowe okno. Zezwól na wyskakujące okna dla programu.");
        return;
      }
      imageWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Screenshot checklisty</title>
            <style>
              * { box-sizing: border-box; }
              body { margin: 0; height: 100vh; overflow: hidden; background: #111; color: #f4f7f8; font-family: Arial, sans-serif; }
              .toolbar {
                position: fixed;
                top: 10px;
                left: 50%;
                z-index: 2;
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px;
                border: 1px solid rgba(255,255,255,.22);
                border-radius: 8px;
                background: rgba(20, 24, 27, .88);
                transform: translateX(-50%);
                box-shadow: 0 10px 30px rgba(0,0,0,.25);
              }
              button {
                min-width: 34px;
                height: 30px;
                border: 1px solid rgba(255,255,255,.2);
                border-radius: 6px;
                background: #253139;
                color: #f4f7f8;
                font-weight: 800;
                cursor: pointer;
              }
              button:hover { background: #31414b; }
              input[type="color"] {
                width: 34px;
                height: 30px;
                border: 1px solid rgba(255,255,255,.2);
                border-radius: 6px;
                background: #253139;
                padding: 3px;
              }
              input[type="range"] { width: 86px; }
              #zoomLabel { min-width: 48px; text-align: center; font-size: 12px; font-weight: 800; }
              .stage {
                width: 100vw;
                height: 100vh;
                overflow: hidden;
                cursor: grab;
              }
              .stage.dragging { cursor: grabbing; }
              .stage.drawing { cursor: crosshair; }
              img,
              canvas {
                position: absolute;
                left: 50%;
                top: 50%;
                max-width: none;
                max-height: none;
                transform-origin: 0 0;
                user-select: none;
              }
              img {
                -webkit-user-drag: none;
              }
              canvas { pointer-events: none; }
              .active-tool { background: #2d7184; border-color: #5fb5ca; }
              .save { background: #2f7a57; }
              .save:hover { background: #368f66; }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <button type="button" data-zoom-out>-</button>
              <button type="button" data-fit>Dopasuj</button>
              <button type="button" data-real>100%</button>
              <button type="button" data-zoom-in>+</button>
              <button type="button" data-draw>Rysuj</button>
              <input type="color" value="#ff2d2d" data-color title="Kolor" />
              <input type="range" min="2" max="18" value="5" data-size title="Grubosc" />
              <button type="button" data-undo>Cofnij</button>
              <button type="button" data-clear>Wyczysc</button>
              <button class="save" type="button" data-save>Zapisz</button>
              <span id="zoomLabel">100%</span>
            </div>
            <div class="stage" id="stage"></div>
          </body>
        </html>
      `);
      imageWindow.document.close();
      const stage = imageWindow.document.querySelector("#stage");
      const label = imageWindow.document.querySelector("#zoomLabel");
      const preview = imageWindow.document.createElement("img");
      const canvas = imageWindow.document.createElement("canvas");
      const context = canvas.getContext("2d");
      preview.src = image.src;
      preview.alt = image.alt || "Screenshot checklisty";
      stage.append(preview);
      stage.append(canvas);
      let scale = 1;
      let x = 0;
      let y = 0;
      let dragging = false;
      let drawing = false;
      let drawMode = false;
      let lastX = 0;
      let lastY = 0;
      const strokes = [];
      let currentStroke = null;

      const applyTransform = () => {
        const transform = `translate(${x}px, ${y}px) scale(${scale}) translate(-50%, -50%)`;
        preview.style.transform = transform;
        canvas.style.transform = transform;
        label.textContent = `${Math.round(scale * 100)}%`;
      };
      const redrawDrawings = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        strokes.forEach((stroke) => {
          if (stroke.points.length < 2) return;
          context.beginPath();
          context.strokeStyle = stroke.color;
          context.lineWidth = stroke.size;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.moveTo(stroke.points[0].x, stroke.points[0].y);
          stroke.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
          context.stroke();
        });
      };
      const stagePoint = (viewerEvent) => {
        const width = canvas.width || preview.naturalWidth || 1;
        const height = canvas.height || preview.naturalHeight || 1;
        return {
          x: (viewerEvent.clientX - (imageWindow.innerWidth / 2 + x - (width * scale) / 2)) / scale,
          y: (viewerEvent.clientY - (imageWindow.innerHeight / 2 + y - (height * scale) / 2)) / scale
        };
      };
      const fitImage = () => {
        const width = preview.naturalWidth || image.naturalWidth || 1;
        const height = preview.naturalHeight || image.naturalHeight || 1;
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        scale = Math.min(imageWindow.innerWidth / width, imageWindow.innerHeight / height, 1);
        x = 0;
        y = 0;
        redrawDrawings();
        applyTransform();
      };
      const zoom = (factor) => {
        scale = Math.max(0.1, Math.min(6, scale * factor));
        applyTransform();
      };

      preview.addEventListener("load", fitImage, { once: true });
      if (preview.complete) fitImage();
      imageWindow.document.querySelector("[data-zoom-in]").addEventListener("click", () => zoom(1.2));
      imageWindow.document.querySelector("[data-zoom-out]").addEventListener("click", () => zoom(1 / 1.2));
      imageWindow.document.querySelector("[data-fit]").addEventListener("click", fitImage);
      imageWindow.document.querySelector("[data-draw]").addEventListener("click", (viewerEvent) => {
        drawMode = !drawMode;
        viewerEvent.currentTarget.classList.toggle("active-tool", drawMode);
        stage.classList.toggle("drawing", drawMode);
      });
      imageWindow.document.querySelector("[data-undo]").addEventListener("click", () => {
        strokes.pop();
        redrawDrawings();
      });
      imageWindow.document.querySelector("[data-clear]").addEventListener("click", async () => {
        if (!strokes.length || await zkConfirm("Wyczyścić wszystkie rysunki z tego podglądu?", { danger: true })) {
          strokes.length = 0;
          redrawDrawings();
        }
      });
      imageWindow.document.querySelector("[data-save]").addEventListener("click", () => {
        const output = imageWindow.document.createElement("canvas");
        output.width = canvas.width || preview.naturalWidth;
        output.height = canvas.height || preview.naturalHeight;
        const outputContext = output.getContext("2d");
        outputContext.drawImage(preview, 0, 0, output.width, output.height);
        outputContext.drawImage(canvas, 0, 0);
        const orderIndex = Number(link.dataset.orderIndex);
        const checkIndex = Number(link.dataset.checkIndex);
        if (Number.isFinite(checkIndex)) {
          task.orders[orderIndex].checklist[checkIndex].image = output.toDataURL("image/png");
        } else {
          task.orders[orderIndex].image = output.toDataURL("image/png");
        }
        activeOrderIndex = orderIndex;
        dnSelection = { type: "task", index: taskIndex };
        renderDnView(project);
        imageWindow.close();
      });
      imageWindow.document.querySelector("[data-real]").addEventListener("click", () => {
        scale = 1;
        x = 0;
        y = 0;
        applyTransform();
      });
      stage.addEventListener("wheel", (viewerEvent) => {
        viewerEvent.preventDefault();
        zoom(viewerEvent.deltaY < 0 ? 1.12 : 1 / 1.12);
      });
      stage.addEventListener("pointerdown", (viewerEvent) => {
        if (drawMode) {
          drawing = true;
          currentStroke = {
            color: imageWindow.document.querySelector("[data-color]").value,
            size: Number(imageWindow.document.querySelector("[data-size]").value),
            points: [stagePoint(viewerEvent)]
          };
          strokes.push(currentStroke);
          stage.setPointerCapture(viewerEvent.pointerId);
          return;
        }
        dragging = true;
        lastX = viewerEvent.clientX;
        lastY = viewerEvent.clientY;
        stage.classList.add("dragging");
        stage.setPointerCapture(viewerEvent.pointerId);
      });
      stage.addEventListener("pointermove", (viewerEvent) => {
        if (drawing && currentStroke) {
          const point = stagePoint(viewerEvent);
          const width = canvas.width || 1;
          const height = canvas.height || 1;
          if (point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height) {
            currentStroke.points.push(point);
            redrawDrawings();
          }
          return;
        }
        if (!dragging) return;
        x += viewerEvent.clientX - lastX;
        y += viewerEvent.clientY - lastY;
        lastX = viewerEvent.clientX;
        lastY = viewerEvent.clientY;
        applyTransform();
      });
      const stopDrag = () => {
        drawing = false;
        currentStroke = null;
        dragging = false;
        stage.classList.remove("dragging");
      };
      stage.addEventListener("pointerup", stopDrag);
      stage.addEventListener("pointercancel", stopDrag);
      imageWindow.addEventListener("resize", fitImage);
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-description]").forEach((input) => {
    input.addEventListener("input", () => {
      task.orders[Number(input.dataset.orderDescription)].description = input.value;
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-title]").forEach((input) => {
    input.addEventListener("change", () => {
      const orderIndex = Number(input.dataset.orderTitle);
      const title = input.value.trim();
      if (!task.orders[orderIndex] || !title) {
        input.value = task.orders[orderIndex]?.title || "";
        return;
      }
      task.orders[orderIndex].title = title;
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-check-title]").forEach((input) => {
    input.addEventListener("change", () => {
      const orderIndex = Number(input.dataset.orderIndex);
      const checkIndex = Number(input.dataset.checkIndex);
      const item = task.orders[orderIndex]?.checklist?.[checkIndex];
      const title = input.value.trim();
      if (!item || !title) {
        input.value = item?.text || "";
        return;
      }
      item.text = title;
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-assignee]").forEach((select) => {
    select.addEventListener("change", () => {
      task.orders[Number(select.dataset.orderAssignee)].assignee = select.value;
      select.closest(".order-person-select")?.classList.remove("open");
      activeOrderIndex = Number(select.dataset.orderAssignee);
      renderPeopleFilter();
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-due]").forEach((input) => {
    input.addEventListener("change", () => {
      task.orders[Number(input.dataset.orderDue)].due = input.value;
      activeOrderIndex = Number(input.dataset.orderDue);
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-order-hours]").forEach((input) => {
    input.addEventListener("change", () => {
      const orderIndex = Number(input.dataset.orderHours);
      const order = task.orders[orderIndex];
      if (!order) return;
      order.hours = normalizeHours(input.value);
      activeOrderIndex = orderIndex;
      dnSelection = { type: "task", index: taskIndex };
      schedulePersist();
      renderDnView(project);
    });
  });

  el.dnContentBody.querySelectorAll("[data-explorer-folder]").forEach((folder) => {
    folder.addEventListener("click", () => {
      const type = folder.dataset.explorerType;
      const value = folder.dataset.explorerFolder;
      if (type === "stage") {
        dnSelection = { type: "stage", name: value };
      }
      if (type === "task") {
        dnSelection = { type: "task", index: Number(value) };
        activeOrderIndex = 0;
      }
      renderDnView(project);
    });
  });
}

function checklistProgress(task) {
  if (task.orders?.length) {
    return Math.round(task.orders.reduce((sum, order) => sum + orderProgress(order), 0) / task.orders.length);
  }
  const checklist = task.checklist || [];
  if (!checklist.length) return 0;
  return Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);
}

function ensureTaskRanges(project) {
  project.tasks.forEach((task) => {
    task.start = task.start || task.due;
    task.end = task.end || task.due;
    task.due = task.end;
  });
}

function normalizeHours(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 4) / 4;
}

function formatHours(value) {
  const number = normalizeHours(value);
  return Number.isInteger(number) ? String(number) : String(number).replace(".", ",");
}

function formatHoursInput(value) {
  const number = normalizeHours(value);
  return Number.isInteger(number) ? String(number) : String(number);
}

function taskHours(task) {
  return (task.orders || []).reduce((sum, order) => sum + normalizeHours(order.hours), 0);
}

function ensureTaskOrders(task) {
  if (task.orders) {
    task.orders.forEach((order) => {
      order.assignee = order.assignee || task.assignee;
      order.start = order.start || order.due || task.start || task.due;
      order.due = order.due || task.end || task.due;
      order.hours = normalizeHours(order.hours);
      order.priority = order.priority || task.priority || "sredni";
      order.checklist = order.checklist || [];
    });
    return;
  }
  const sourceChecklist = task.checklist || [];
  task.orders = [
    {
      title: task.description ? task.description : `Zlecenie do: ${task.title}`,
      status: sourceChecklist.some((item) => item.done) ? "W trakcie" : "Do zrobienia",
      assignee: task.assignee,
      start: task.start || task.due,
      due: task.end || task.due,
      priority: task.priority || "sredni",
      checklist: sourceChecklist.map((item) => ({ ...item }))
    }
  ];
}

function kanbanBeforeIndex(column, pointerY, draggedIndex) {
  const cards = [...column.querySelectorAll("[data-order-card]")]
    .filter((card) => Number(card.dataset.orderCard) !== draggedIndex);
  for (const card of cards) {
    const box = card.getBoundingClientRect();
    if (pointerY < box.top + box.height / 2) return Number(card.dataset.orderCard);
  }
  return null;
}

function clearKanbanDropMarkers(root) {
  root.querySelectorAll?.(".drop-before").forEach((card) => card.classList.remove("drop-before"));
}

function markKanbanDropTarget(column, pointerY, draggedIndex) {
  clearKanbanDropMarkers(column);
  const beforeIndex = kanbanBeforeIndex(column, pointerY, draggedIndex);
  if (beforeIndex === null) return;
  column.querySelector(`[data-order-card="${beforeIndex}"]`)?.classList.add("drop-before");
}

function moveOrderToKanbanPosition(task, fromIndex, nextStatus, beforeIndex) {
  const movedOrder = task.orders[fromIndex];
  if (!movedOrder) return null;
  movedOrder.status = nextStatus;
  task.orders.splice(fromIndex, 1);

  let targetIndex = null;
  if (beforeIndex !== null && Number.isFinite(beforeIndex)) {
    targetIndex = beforeIndex > fromIndex ? beforeIndex - 1 : beforeIndex;
  } else {
    const lastInColumn = task.orders.reduce((lastIndex, order, index) => (
      order.status === nextStatus ? index : lastIndex
    ), -1);
    targetIndex = lastInColumn + 1;
  }

  targetIndex = Math.max(0, Math.min(targetIndex, task.orders.length));
  task.orders.splice(targetIndex, 0, movedOrder);
  return movedOrder;
}

function kanbanHtml(task) {
  const columns = ["Do zrobienia", "W trakcie", "Zrobione"];
  return `
    <div class="kanban-board">
      ${columns
        .map((column) => {
          const orders = task.orders.filter((order) => order.status === column);
          return `
            <section class="kanban-column ${columnClass(column)}">
              <header>
                <strong>${column}</strong>
                <button type="button" data-add-order="${column}" title="Dodaj zlecenie">+</button>
              </header>
              <div class="kanban-orders" data-order-drop="${column}">
                ${
                  orders.length
                    ? orders
                        .map((order) => {
                          const orderIndex = task.orders.indexOf(order);
                          return `
                            <article class="kanban-order ${activeOrderIndex === orderIndex ? "active" : ""}" draggable="true" data-order-card="${orderIndex}" style="${orderUrgencyStyle(order)}">
                              <button class="delete-corner delete-order" type="button" data-delete-order="${orderIndex}" title="Usun zlecenie">x</button>
                              <div class="kanban-order-head">
                                <strong>${order.title}</strong>
                              </div>
                              <div class="kanban-order-line">
                                <label class="order-due-row compact">
                                  <input type="date" value="${order.due || ""}" data-order-due="${orderIndex}" />
                                </label>
                                <label class="order-person-select" title="Osoba">
                                  ${avatar(order.assignee)}
                                  <select data-order-assignee="${orderIndex}" aria-label="Osoba zlecenia ${order.title}">
                                    ${peopleOptions(order.assignee)}
                                  </select>
                                </label>
                                <span class="order-percent">${orderProgress(order)}%</span>
                                <label class="order-hours-field" title="Zajetosc w godzinach">
                                  <span>h</span>
                                  <input type="number" min="0" step="0.25" value="${formatHoursInput(order.hours)}" data-order-hours="${orderIndex}" aria-label="Zajetosc zlecenia w godzinach" />
                                </label>
                                <span class="order-check-count">${(order.checklist || []).filter((item) => item.done).length}/${(order.checklist || []).length}</span>
                                ${fileButton("order", orderIndex, order.fileUrl)}
                              </div>
                            </article>
                          `;
                        })
                        .join("")
                    : '<div class="empty mini">Brak zlecen.</div>'
                }
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderOrderChecklistPanel(order, orderIndex) {
  const checklist = order?.checklist || [];
  return `
    <div class="order-preview-box">
      <h4>Checklista</h4>
      <div class="kanban-checks">
        ${
          checklist.length
            ? checklist
                .map(
                  (item, checkIndex) => `
                    <div class="dn-check compact check-with-image">
                      <button class="delete-corner delete-check" type="button" data-delete-check data-order-index="${orderIndex}" data-check-index="${checkIndex}" title="Usun pozycje checklisty">x</button>
                      <label class="check-main-line">
                        <input type="checkbox" ${item.done ? "checked" : ""} data-order-check data-order-index="${orderIndex}" data-check-index="${checkIndex}" />
                        <input class="inline-name-edit check-name-edit" type="text" value="${item.text}" data-check-title data-order-index="${orderIndex}" data-check-index="${checkIndex}" aria-label="Pozycja checklisty" />
                      </label>
                      <label class="check-image-btn" title="Dodaj screenshot do tej pozycji">
                        <span class="check-image-icon" aria-hidden="true"></span>
                        <input type="file" accept="image/*" data-check-image data-order-index="${orderIndex}" data-check-index="${checkIndex}" />
                      </label>
                      <button class="check-image-btn clipboard-image-btn" type="button" data-check-clipboard data-order-index="${orderIndex}" data-check-index="${checkIndex}" title="Wklej obecny screen ze schowka"></button>
                      ${
                        item.image
                          ? `<div class="check-image-preview">
                              <a href="${item.image}" target="_blank" rel="noreferrer" data-open-check-image data-order-index="${orderIndex}" data-check-index="${checkIndex}">
                                <img src="${item.image}" alt="Screenshot do pozycji: ${item.text}" />
                              </a>
                              <button type="button" data-remove-check-image data-order-index="${orderIndex}" data-check-index="${checkIndex}" title="Usun screenshot">x</button>
                            </div>`
                          : ""
                      }
                    </div>
                  `
                )
                .join("")
            : '<div class="empty mini">Brak checklisty.</div>'
        }
      </div>
      <button class="add-check-btn" type="button" data-add-check="${orderIndex}">+ checklista</button>
    </div>
  `;
}

function orderPreviewHtml(order, orderIndex) {
  if (!order) {
    return `
      <header><p>Podglad</p><h3>Wybierz zlecenie</h3></header>
      <div class="empty">Kliknij zlecenie po lewej, zeby pokazac checkliste.</div>
    `;
  }

  return `
    <header>
      <div>
        <p>Zlecenie</p>
        <input class="inline-name-edit order-name-edit" type="text" value="${order.title}" data-order-title="${orderIndex}" aria-label="Nazwa zlecenia" />
      </div>
      <div class="order-preview-actions">
        <label class="order-due-row preview">
          <input type="date" value="${order.due || ""}" data-order-due="${orderIndex}" />
        </label>
        <label class="order-person-select" title="Osoba">
          ${avatar(order.assignee)}
          <select data-order-assignee="${orderIndex}" aria-label="Osoba zlecenia ${order.title}">
            ${peopleOptions(order.assignee)}
          </select>
        </label>
        ${fileButton("order", orderIndex, order.fileUrl)}
        <label class="check-image-btn" title="Dodaj obraz do zlecenia z pliku">
          <span class="check-image-icon" aria-hidden="true"></span>
          <input type="file" accept="image/*" data-order-image="${orderIndex}" />
        </label>
        <button class="check-image-btn clipboard-image-btn" type="button" data-order-clipboard="${orderIndex}" title="Wklej obecny screen ze schowka"></button>
        <span class="content-progress small">${orderProgress(order)}%</span>
        <label class="order-hours-detail compact" title="Zajetosc w godzinach">
          <input type="number" min="0" step="0.25" value="${formatHoursInput(order.hours)}" data-order-hours="${orderIndex}" aria-label="Zajetosc zlecenia w godzinach" />
          <strong>h</strong>
        </label>
      </div>
    </header>
    <label class="order-short-description">
      <span>Opis</span>
      <input type="text" value="${order.description || ""}" placeholder="Krotki opis..." data-order-description="${orderIndex}" />
    </label>
    ${
      order.image
        ? `<div class="check-image-preview order-image-preview">
            <a href="${order.image}" target="_blank" rel="noreferrer" data-open-order-image="${orderIndex}" data-order-index="${orderIndex}">
              <img src="${order.image}" alt="Obraz do zlecenia: ${order.title}" />
            </a>
            <button type="button" data-remove-order-image="${orderIndex}" title="Usun obraz">x</button>
          </div>`
        : ""
    }
    <div class="check-progress">
      <div style="width: ${orderProgress(order)}%"></div>
      <span>${orderProgress(order)}%</span>
    </div>
    ${renderOrderChecklistPanel(order, orderIndex)}
  `;
}

function explorerHtml(project, task) {
  const stage = project.stages.find((item) => item.name === task.stage);
  const stageTasks = project.tasks.map((item, index) => ({ ...item, index })).filter((item) => item.stage === task.stage);

  return `
    <header>
      <p>Explorer</p>
      <strong>${project.name} / ${task.stage}</strong>
    </header>
    <div class="explorer-path">${task.title}</div>
    <div class="explorer-list">
      ${project.stages
        .map(
          (item) => `
            <button class="explorer-row ${item.name === task.stage ? "active" : ""}" type="button" data-explorer-type="stage" data-explorer-folder="${item.name}">
              <span class="folder-icon" aria-hidden="true"></span>
              <span>${item.name}</span>
              <span class="explorer-percent">${stageProgress(project, item.name)}%</span>
            </button>
          `
        )
        .join("")}
      <div class="explorer-group">${stage ? stage.name : "Zadania"}</div>
      ${stageTasks
        .map(
          (item) => `
            <button class="explorer-row task ${item.index === dnSelection?.index ? "active" : ""}" type="button" data-explorer-type="task" data-explorer-folder="${item.index}">
              <span class="folder-icon" aria-hidden="true"></span>
              <span>${item.title}</span>
              <span class="explorer-percent">${checklistProgress(project.tasks[item.index])}%</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function stageProgress(project, stageName) {
  const tasks = project.tasks.filter((item) => item.stage === stageName);
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((sum, item) => sum + checklistProgress(item), 0) / tasks.length);
}

function orderProgress(order) {
  const checklist = order.checklist || [];
  if (!checklist.length) return order.status === "Zrobione" ? 100 : 0;
  return Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);
}

function orderUrgencyStyle(order) {
  if (order.status === "Zrobione") {
    return "--order-bg: #e8f5ed; --order-bg-dark: #173626; --order-border: #62a77a;";
  }

  const days = order.due ? daysFromToday(order.due) : 30;
  let bg = "#f4f6f7";
  let bgDark = "#202a30";
  let border = "#cfd9de";

  if (days <= 0) {
    bg = "#ffd6d2";
    bgDark = "#4a1f1f";
    border = "#d8504a";
  } else if (days <= 3) {
    bg = "#ffe1d5";
    bgDark = "#43271f";
    border = "#df7548";
  } else if (days <= 7) {
    bg = "#fff0d1";
    bgDark = "#3d321d";
    border = "#d69a35";
  } else if (days <= 14) {
    bg = "#f4eee4";
    bgDark = "#30302a";
    border = "#b8a77e";
  }

  return `--order-bg: ${bg}; --order-bg-dark: ${bgDark}; --order-border: ${border};`;
}

function columnClass(column) {
  return {
    "Do zrobienia": "todo",
    "W trakcie": "doing",
    Zrobione: "done"
  }[column];
}

function renderBreadcrumb(project) {
  if (!el.detailBreadcrumb || !project) return;
  const selectionParts = [];

  if (dnSelection?.type === "stage") {
    selectionParts.push(dnSelection.name);
  }

  if (dnSelection?.type === "task") {
    const task = project.tasks[dnSelection.index];
    if (task) {
      selectionParts.push(task.stage, task.title);
    }
  }

  const parts = [projectPathLabel(project), projectModuleLabel("full"), ...selectionParts];
  el.detailBreadcrumb.innerHTML = parts.map((part, index) => `<span>${part}</span>${index < parts.length - 1 ? '<span class="crumb-sep">/</span>' : ""}`).join("");
  renderTopbarPath(parts);
}

function renderTopbarPath(parts = ["Pulpit"]) {
  if (!el.appTopbarContext) return;
  const normalized = parts.filter(Boolean);
  el.appTopbarContext.innerHTML = normalized
    .map((part, index) => `<span>${escapeHtml(part)}</span>${index < normalized.length - 1 ? '<span class="crumb-sep">/</span>' : ""}`)
    .join("");
}

function projectPathLabel(project) {
  if (!project) return "Projekt";
  return project.client && project.client !== project.name ? `${project.name} - ${project.client}` : project.name;
}

function projectModuleLabel(mode = sidebarModuleMode) {
  return {
    dashboard: "Pulpit",
    full: "Widok ogolny",
    manage: "Zarzadzanie",
    letters: "Pisma",
    technical: "Warunki techniczne",
    branches: "Branze",
    secret: "Eksplorator"
  }[mode] || "Widok ogolny";
}

function folderButton(type, key, value) {
  return `
    <span
      class="inline-folder"
      role="button"
      tabindex="0"
      title="Kliknij: otworz folder. Przytrzymaj: ustaw sciezke."
      aria-label="Folder"
      data-folder-type="${type}"
      data-folder-key="${key}"
    >
      <span class="folder-icon" aria-hidden="true"></span>
    </span>
  `;
}

function bindProjectFolderButton(button, project) {
  if (!button) return;
  let timer = null;
  let longPress = false;
  const clear = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    longPress = false;
    timer = window.setTimeout(() => {
      longPress = true;
      setFolderPath(project, project.folderUrl || topicFoldersRoot || desktopFolderUrl);
    }, 650);
  });
  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clear();
    if (!longPress) openFolderPath(project.folderUrl || desktopFolderUrl);
  });
  button.addEventListener("pointerleave", clear);
}

function bindFolderButtons(project, root) {
  root.querySelectorAll("[data-folder-type]").forEach((button) => {
    let timer = null;
    let longPress = false;

    const item = folderTarget(project, button.dataset.folderType, button.dataset.folderKey);
    if (!item) return;

    const clear = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      longPress = false;
      timer = window.setTimeout(() => {
        longPress = true;
        setFolderPath(item, item.folderUrl || topicFoldersRoot || desktopFolderUrl);
      }, 650);
    });

    button.addEventListener("pointerup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clear();
      if (!longPress) {
        openFolderPath(item.folderUrl || desktopFolderUrl);
      }
    });

    button.addEventListener("pointerleave", clear);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });
}

function folderTarget(project, type, key) {
  if (type === "stage") return project.stages.find((stage) => stage.name === key);
  if (type === "task") return project.tasks[Number(key)];
  return null;
}

function normalizeFolderUrl(value) {
  if (/^[a-z]+:\/\//i.test(value)) return value;
  return `file:///${value.replaceAll("\\", "/")}`;
}

async function setFolderPath(item, fallback) {
  const nextPath = await showAppPrompt({
    title: "Ustaw sciezke",
    message: "Wpisz albo wklej sciezke folderu dla tego elementu.",
    detail: "Klikniecie ikony otworzy pozniej ten folder.",
    value: folderUrlToPath(fallback) || "",
    placeholder: "np. Z:\\Projekty\\DK8",
    confirmText: "Zapisz"
  });
  if (!nextPath) return;
  item.folderUrl = normalizeFolderUrl(nextPath);
  item.folderUrlManual = true;
  schedulePersist();
}

async function openFolderPath(folderUrl) {
  try {
    const response = await fetch("/api/open-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: folderUrlToPath(folderUrl) })
    });
    if (response.ok) return;
  } catch {
    // Fall back below.
  }
  window.open(folderUrl || desktopFolderUrl, "_blank");
}

async function openHelpPdf() {
  try {
    const response = await fetch("/api/open-help", { method: "POST" });
    if (response.ok) return;
  } catch {
    // Fall back to opening the bundled PDF in the web view.
  }
  window.open("assets/ZK_Manager_Instrukcja.pdf", "_blank");
}

function folderUrlToPath(value = "") {
  if (!value) return "";
  if (value.startsWith("file:///")) return decodeURIComponent(value.slice("file:///".length)).replaceAll("/", "\\");
  return value;
}

function fileButton(type, key, value) {
  return `
    <span
      class="inline-file"
      role="button"
      tabindex="0"
      title="Kliknij: otworz plik. Przytrzymaj: przypisz plik."
      aria-label="Plik"
      data-file-type="${type}"
      data-file-key="${key}"
    ></span>
  `;
}

function bindFileButtons(project, root, selectedTask = null) {
  root.querySelectorAll("[data-file-type]").forEach((button) => {
    let timer = null;
    let longPress = false;
    const item = fileTarget(project, button.dataset.fileType, button.dataset.fileKey, selectedTask);
    if (!item) return;
    const clear = () => {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      longPress = false;
      timer = window.setTimeout(() => {
        longPress = true;
        showAppPrompt({
          title: "Przypisz plik",
          message: "Wpisz albo wklej sciezke pliku dla tego elementu.",
          detail: "Klikniecie ikony otworzy pozniej ten plik.",
          value: folderUrlToPath(item.fileUrl || "") || folderUrlToPath(desktopFolderUrl),
          placeholder: "np. Z:\\Projekty\\plik.pdf",
          confirmText: "Zapisz"
        }).then((nextPath) => {
          if (!nextPath) return;
          item.fileUrl = normalizeFolderUrl(nextPath);
          schedulePersist();
        });
      }, 650);
    });
    button.addEventListener("pointerup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clear();
      if (!longPress) window.open(item.fileUrl || desktopFolderUrl, "_blank");
    });
    button.addEventListener("pointerleave", clear);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  });
}

function fileTarget(project, type, key, selectedTask) {
  if (type === "task") return project.tasks[Number(key)];
  if (type === "order") return selectedTask?.orders?.[Number(key)] || null;
  return null;
}

function normalizeUserInitials(value, fallback = "U") {
  const cleaned = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return (cleaned || initialsFromName(fallback) || "U").slice(0, 2);
}

function normalizeAvatarColor(value, fallback = "#246b83") {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function currentUserIconSettings(fallbackName = "Uzytkownik") {
  const label = fallbackName || currentChatPersonName();
  const profile = currentUserProfile || {};
  const employee = employeeProfile(label);
  return {
    initials: normalizeUserInitials(userIconInitials || profile.initials || employee.initials, label),
    color: normalizeAvatarColor(userIconColor || profile.color || employee.color, colorFromName(label))
  };
}

function syncCurrentUserIconControls() {
  const icon = currentUserIconSettings(currentChatPersonName());
  userIconInitials = icon.initials;
  userIconColor = icon.color;
  if (el.userInitialsInput) el.userInitialsInput.value = icon.initials;
  if (el.userColorInput) el.userColorInput.value = icon.color;
}

function applyCurrentUserIconSettings({ persist = false } = {}) {
  const name = currentChatPersonName();
  const icon = currentUserIconSettings(name);
  userIconInitials = icon.initials;
  userIconColor = icon.color;
  if (currentUserProfile) {
    currentUserProfile.initials = icon.initials;
    currentUserProfile.color = icon.color;
  }
  upsertEmployee({
    name,
    displayName: currentUserProfile?.displayName || currentUserProfile?.fullName || name,
    assigneeName: currentUserProfile?.assigneeName || name,
    initials: icon.initials,
    color: icon.color,
    login: currentUserProfile?.login || currentUserProfile?.username || "",
    username: currentUserProfile?.username || currentUserProfile?.login || "",
    role: currentUserProfile?.role || "pracownik",
    lastSeenAt: new Date().toISOString()
  });
  syncCurrentUserIconControls();
  renderCurrentUserBadge();
  renderEmployeeBase();
  renderPeopleFilter();
  renderAssignmentMode();
  renderChatRecipients();
  renderTeamChat();
  renderCenter();
  if (persist) {
    schedulePersist();
    persistUserState();
  }
}

function avatar(name = "Zespol") {
  const profile = employeeProfile(name);
  const label = profile.displayName || profile.name || name;
  return `<span class="person-avatar" style="--avatar: ${profile.color || colorFromName(label)}" title="${escapeHtml(label)}">${escapeHtml(profile.initials || initialsFromName(label))}</span>`;
}

function initialsFromName(name = "U") {
  return String(name || "U")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function taskPosition(project, task) {
  const pseudoStage = { start: task.start, end: task.end };
  return ganttPosition(project, pseudoStage);
}

function taskCardHtml(task, showProject) {
  return `
    <strong>${task.title}</strong>
    <div class="meta">
      ${showProject ? `<span class="badge">${task.project}</span>` : ""}
      <span>${task.assignee}</span>
      <span>${formatDate(parseDate(task.due))}</span>
      <span class="badge ${task.priority === "wysoki" ? "high" : ""}">${task.priority}</span>
      <span>${task.stage}</span>
    </div>
  `;
}

function orderCardHtml(order, color = currentProjectColor(order.projectId, order.project)) {
  const projectColor = color;
  return `
    <strong>${order.title}</strong>
    <div class="meta">
      <span class="badge project-badge" style="--order-project-color:${projectColor};--order-project-color-soft:${hexToRgba(projectColor, 0.16)}">${order.project}</span>
      <span>${order.assignee || "Zespol"}</span>
      <span>${formatDate(parseDate(order.due))}</span>
      <span class="badge">${order.status}</span>
      <span>${order.taskTitle}</span>
      <span>${orderProgress(order)}%</span>
    </div>
  `;
}

function ganttRow(project, stage) {
  const position = ganttPosition(project, stage);
  const todayPosition = ganttTodayPosition(project);

  return `
    <button class="gantt-row" type="button" data-mini-stage="${stage.name}" title="${stage.name}: ${formatDate(parseDate(stage.start))} - ${formatDate(parseDate(stage.end))}">
      <span>${stage.name}</span>
      <div class="gantt-line">
        ${todayPosition == null ? "" : `<div class="today-marker mini" style="left: ${todayPosition}%"></div>`}
        <div class="gantt-bar ${stage.status}" style="left: ${position.left}%; width: ${position.width}%"></div>
      </div>
    </button>
  `;
}

function previewGanttHtml(project) {
  const expanded = new Set(previewExpandedStages[project.id] || []);
  const todayPosition = ganttTodayPosition(project);
  return `
    <div class="preview-gantt" aria-label="Podglad Gantta projektu ${escapeHtml(project.name)}">
      ${previewScale(project)}
      <div class="preview-gantt-body">
        ${todayPosition == null ? "" : `<div class="preview-today-marker" style="left:calc(74px + (100% - 74px) * ${todayPosition / 100})"></div>`}
        ${project.stages.map((stage) => previewStageRow(project, stage, expanded.has(stage.name))).join("")}
      </div>
    </div>
  `;
}

function previewScale(project) {
  const { min, max } = projectTimeBounds(project);
  const days = [];
  const cursor = new Date(min);
  while (cursor.getTime() <= max && days.length < 120) {
    const left = ((cursor.getTime() - min) / Math.max(1, max - min)) * 100;
    const width = (DAY / Math.max(1, max - min)) * 100;
    const weekend = !workWeekends && (cursor.getDay() === 0 || cursor.getDay() === 6);
    days.push(`
      <span class="preview-scale-day ${weekend ? "weekend" : ""}" style="left:${left}%;width:${width}%">
        <b>${String(cursor.getDate()).padStart(2, "0")}</b>
        <em>${["N", "P", "W", "S", "C", "P", "S"][cursor.getDay()]}</em>
      </span>
    `);
    cursor.setDate(cursor.getDate() + 1);
  }
  return `<div class="preview-scale">${days.join("")}</div>`;
}

function previewStageRow(project, stage, expanded) {
  const position = ganttPosition(project, stage);
  const tasks = project.tasks
    .map((task, index) => ({ ...task, index }))
    .filter((task) => task.stage === stage.name);
  return `
    <div class="preview-stage-group">
      <button class="preview-gantt-row" type="button" data-preview-stage="${escapeHtml(stage.name)}" title="Rozwin zadania etapu ${escapeHtml(stage.name)}">
        <span class="preview-row-name">
          <span class="preview-chevron">${expanded ? "v" : ">"}</span>
          <strong>${escapeHtml(stage.name)}</strong>
        </span>
        <span class="preview-row-track">
          ${weekendMarkers(project)}
          <span class="preview-stage-bar ${stage.status}" style="left:${position.left}%;width:${position.width}%"></span>
        </span>
      </button>
      ${expanded ? tasks.map((task) => previewTaskRow(project, task)).join("") : ""}
    </div>
  `;
}

function previewTaskRow(project, task) {
  const position = taskPosition(project, project.tasks[task.index]);
  const complete = checklistProgress(project.tasks[task.index]) >= 100;
  return `
    <button class="preview-gantt-row task" type="button" data-preview-task="${task.index}" title="${escapeHtml(task.title)}">
      <span class="preview-row-name">${escapeHtml(task.title)}</span>
      <span class="preview-row-track">
        ${weekendMarkers(project)}
        <span class="preview-task-bar ${complete ? "done" : ""}" style="left:${position.left}%;width:${position.width}%"></span>
      </span>
    </button>
  `;
}

function detailGanttRow(project, stage) {
  const position = ganttPosition(project, stage);
  const todayPosition = ganttTodayPosition(project);
  const duration = daysBetween(stage.start, stage.end) + 1;
  const stageTasks = project.id === "owb4" ? project.tasks.filter((task) => task.stage === stage.name) : [];

  return `
    <article class="detail-gantt-row">
      <div class="detail-gantt-name">
        <strong>${stage.name}</strong>
        <span>${duration} dni</span>
      </div>
      <div class="detail-gantt-track">
        ${todayPosition == null ? "" : `<div class="today-marker detail" style="left: ${todayPosition}%"></div>`}
        <div class="detail-gantt-bar ${stage.status}" style="left: ${position.left}%; width: ${position.width}%">
          <span>${formatDate(parseDate(stage.start))} - ${formatDate(parseDate(stage.end))}</span>
        </div>
        ${stageTasks.map((task, index) => detailTaskMarker(project, task, index)).join("")}
      </div>
    </article>
  `;
}

function detailTaskMarker(project, task, index) {
  const markerPosition = ganttDatePosition(project, task.due);
  const key = taskKey(project, task);

  if (markerPosition == null) return "";

  return `
    <button
      class="gantt-task-marker ${key === activeTaskKey ? "active" : ""}"
      type="button"
      data-task-key="${key}"
      style="left: ${markerPosition}%; top: ${4 + index * 22}px"
      title="${task.title} - ${formatDate(parseDate(task.due))}"
    >
      ${index + 1}
    </button>
  `;
}

function ganttPosition(project, stage) {
  const { min, max } = projectTimeBounds(project);
  const full = Math.max(1, max - min + DAY);
  const left = ((parseDate(stage.start).getTime() - min) / full) * 100;
  const width = ((parseDate(stage.end).getTime() - parseDate(stage.start).getTime() + DAY) / full) * 100;
  return { left, width };
}

function orderGanttPosition(project, order) {
  const start = order.start || order.due;
  const end = order.due || order.start;
  return ganttPosition(project, { start, end });
}

function ganttTodayPosition(project) {
  return ganttDatePosition(project, today);
}

function ganttDatePosition(project, value) {
  const { min, max } = projectTimeBounds(project);
  const dateTime = value instanceof Date ? value.getTime() : parseDate(value).getTime();

  if (dateTime < min || dateTime > max) return null;
  return ((dateTime - min) / Math.max(1, max - min + DAY)) * 100;
}

function weekendMarkers(project) {
  if (workWeekends) return "";
  const { min, max } = projectTimeBounds(project);
  const markers = [];
  const cursor = new Date(min);

  while (cursor.getTime() <= max) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) {
      const left = ((cursor.getTime() - min) / Math.max(1, max - min + DAY)) * 100;
      const width = (DAY / Math.max(1, max - min + DAY)) * 100;
      markers.push(`<span class="weekend-marker" style="left: ${left}%; width: ${width}%"></span>`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return markers.join("");
}

function forecastBar(project, stage) {
  if (!dnShowForecast || !stage.expectedStart || !stage.expectedEnd) return "";
  const position = ganttPosition(project, { start: stage.expectedStart, end: stage.expectedEnd });
  return `<span class="forecast-bar" style="left: ${position.left}%; width: ${position.width}%"></span>`;
}

function dateFromProjectRatio(project, ratio, bounds = projectTimeBounds(project)) {
  const { min, max } = bounds;
  const time = min + (max - min) * ratio;
  const date = new Date(time);
  return normalizeWorkday(date);
}

function dnDayDeltaFromPixels(project, pixelDelta, trackWidth) {
  const days = Math.max(1, daysBetween(project.viewStart, project.viewEnd) + 1);
  return Math.round((pixelDelta / Math.max(1, trackWidth)) * days);
}

function expandProjectWindowToRange(project, startValue, endValue) {
  ensureProjectWindow(project);
  const start = parseDate(startValue);
  const end = parseDate(endValue || startValue);
  if (start < parseDate(project.viewStart)) {
    project.viewStart = dateString(addDays(start, -3));
  }
  if (end > parseDate(project.viewEnd)) {
    project.viewEnd = dateString(addDays(end, 3));
  }
}

function projectTimeBounds(project) {
  ensureProjectWindow(project);
  return {
    min: parseDate(project.viewStart).getTime(),
    max: parseDate(project.viewEnd).getTime()
  };
}

function naturalProjectBounds(project) {
  const stageDates = project.stages.flatMap((stage) => [parseDate(stage.start).getTime(), parseDate(stage.end).getTime()]);
  const taskDates = project.tasks.flatMap((task) => [parseDate(task.start || task.due).getTime(), parseDate(task.end || task.due).getTime()]);
  return { min: Math.min(...stageDates, ...taskDates), max: Math.max(...stageDates, ...taskDates) };
}

function ensureProjectWindow(project) {
  if (!project.viewStart || !project.viewEnd) {
    resetProjectWindow(project);
    return;
  }
  const start = parseDate(project.viewStart);
  const end = parseDate(project.viewEnd);
  const natural = naturalProjectBounds(project);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start || end.getTime() < natural.min || start.getTime() > natural.max) {
    resetProjectWindow(project);
  }
}

function resetProjectWindow(project) {
  const { min, max } = naturalProjectBounds(project);
  project.viewStart = dateString(new Date(min));
  project.viewEnd = dateString(new Date(max));
}

function setProjectWindow(project, startValue, endValue = startValue) {
  const start = parseDate(startValue);
  const rawEnd = parseDate(endValue || startValue);
  if (!project || Number.isNaN(start.getTime()) || Number.isNaN(rawEnd.getTime())) return;
  const end = rawEnd < start ? new Date(start) : rawEnd;
  project.viewStart = dateString(start);
  project.viewEnd = dateString(end);
  schedulePersist();
  renderDnView(project);
  requestAnimationFrame(resetDnHorizontalScroll);
}

function shiftGanttWindow(project, direction) {
  ensureProjectWindow(project);
  const width = Math.max(7, daysBetween(project.viewStart, project.viewEnd));
  const shift = Math.max(7, Math.round(width * 0.25)) * direction;
  project.viewStart = addDays(project.viewStart, shift);
  project.viewEnd = addDays(project.viewEnd, shift);
  schedulePersist();
  renderDnView(project);
}

function zoomGanttWindow(project, factor) {
  ensureProjectWindow(project);
  const start = parseDate(project.viewStart);
  const end = parseDate(project.viewEnd);
  const center = new Date((start.getTime() + end.getTime()) / 2);
  const currentDays = Math.max(1, daysBetween(project.viewStart, project.viewEnd) + 1);
  const scaledDays = factor < 1 ? Math.floor(currentDays * factor) : Math.ceil(currentDays * factor);
  const nextDays = Math.max(1, Math.min(365, scaledDays));
  const nextStart = new Date(center);
  nextStart.setDate(center.getDate() - Math.floor(nextDays / 2));
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextStart.getDate() + nextDays - 1);
  setProjectWindow(project, nextStart, nextEnd);
}

function projectAxisWidth(visibleDays) {
  const viewportWidth = Math.floor(el.dnGanttViewport?.clientWidth || 0);
  const trackWidth = Math.max(1, viewportWidth - 2);
  if (visibleDays <= 31 && viewportWidth > 0) return trackWidth;
  return Math.max(trackWidth, visibleDays * assignmentDayPixelWidth(visibleDays));
}

function dnScale(project) {
  const { min, max } = projectTimeBounds(project);
  const span = Math.max(DAY, max - min + DAY);
  const months = [];
  const weeks = [];
  const days = [];
  const visibleDays = Math.max(1, Math.round((max - min) / DAY) + 1);
  const showDailyLabels = visibleDays <= 120;
  const showWeekLabels = visibleDays <= 210;
  const cursor = new Date(min);
  cursor.setDate(1);

  while (cursor.getTime() <= max) {
    const monthStart = new Date(cursor);
    const nextMonth = new Date(cursor);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const segmentStart = Math.max(monthStart.getTime(), min);
    const segmentEnd = Math.min(nextMonth.getTime(), max + DAY);
    const left = ((segmentStart - min) / span) * 100;
    const width = ((segmentEnd - segmentStart) / span) * 100;
    const monthEnd = new Date(nextMonth);
    monthEnd.setDate(monthEnd.getDate() - 1);
    months.push(`<button class="dn-scale-month" type="button" data-scale-month data-month-start="${dateString(monthStart)}" data-month-end="${dateString(monthEnd)}" style="left: ${left}%; width: ${width}%">${monthName(monthStart)} ${monthStart.getFullYear()}</button>`);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const weekCursor = startOfWeek(new Date(min));
  while (weekCursor.getTime() <= max) {
    const weekStart = new Date(weekCursor);
    const weekEnd = addDays(weekStart, 6);
    const segmentStart = Math.max(weekStart.getTime(), min);
    const segmentEnd = Math.min(parseDate(weekEnd).getTime() + DAY, max + DAY);
    const left = ((segmentStart - min) / span) * 100;
    const width = ((segmentEnd - segmentStart) / span) * 100;
    const label = `${String(weekStart.getDate()).padStart(2, "0")}-${String(parseDate(weekEnd).getDate()).padStart(2, "0")}`;
    weeks.push(`<button class="dn-scale-week" type="button" data-scale-week data-week-start="${dateString(weekStart)}" data-week-end="${dateString(weekEnd)}" style="left:${left}%;width:${width}%">${showWeekLabels ? label : ""}</button>`);
    weekCursor.setDate(weekCursor.getDate() + 7);
  }

  const dayCursor = new Date(min);
  const dayLabels = ["N", "P", "W", "S", "C", "P", "S"];
  while (dayCursor.getTime() < max + DAY) {
    const left = ((dayCursor.getTime() - min) / span) * 100;
    const width = (DAY / span) * 100;
    const weekend = !workWeekends && (dayCursor.getDay() === 0 || dayCursor.getDay() === 6);
      days.push(`<button class="dn-scale-day ${weekend ? "weekend" : ""} ${showDailyLabels ? "" : "compact"}" type="button" data-scale-day data-day="${dateString(dayCursor)}" style="left:${left}%;width:${width}%">${showDailyLabels ? `<b>${String(dayCursor.getDate()).padStart(2, "0")}</b><em>${dayLabels[dayCursor.getDay()]}</em>` : ""}</button>`);
    dayCursor.setDate(dayCursor.getDate() + 1);
  }

  const rangeLabel = `${monthName(new Date(min))} ${new Date(min).getFullYear()} - ${monthName(new Date(max))} ${new Date(max).getFullYear()}`;
  return `
    <div class="dn-scale assignment-scale">
      <button class="dn-scale-range" type="button" data-scale-reset>${rangeLabel}</button>
      <div class="dn-scale-months">${months.join("")}</div>
      <div class="dn-scale-weeks">${weeks.join("")}</div>
      <div class="dn-scale-days">${days.join("")}</div>
    </div>
  `;
}

function monthName(date) {
  return ["STYCZEN", "LUTY", "MARZEC", "KWIECIEN", "MAJ", "CZERWIEC", "LIPIEC", "SIERPIEN", "WRZESIEN", "PAZDZIERNIK", "LISTOPAD", "GRUDZIEN"][date.getMonth()];
}

function addDays(value, days) {
  const date = parseDate(value);
  date.setDate(date.getDate() + days);
  return dateString(date);
}

function bindTaskLinks(project) {
  document.querySelectorAll(`[data-task-key^="${project.id}-"]`).forEach((item) => {
    item.addEventListener("click", () => {
      activeTaskKey = item.dataset.taskKey;
      renderStageBoard(project);
      renderDetailGantt(project);
    });
  });
}

function taskKey(project, task) {
  return `${project.id}-${project.tasks.indexOf(task)}`;
}

function toggleAllProjects() {
  ensureSingleSelectedProject(visibleProjects().find((project) => project.id === "dk8")?.id || visibleProjects()[0]?.id);
  render();
}

function activeSidebarProject() {
  return visibleProjects().find((project) => project.id === planningProjectId) ||
    visibleProjects().find((project) => project.selected) ||
    visibleProjects()[0] ||
    null;
}

function hideOtherProjects() {
  const active = activeSidebarProject();
  if (!active) return;
  visibleProjects().forEach((project) => {
    project.selected = project.id === active.id;
  });
  planningProjectId = active.id;
  render();
}

async function deleteSelectedProject() {
  const project = activeSidebarProject();
  if (!project) return;
  if (!await zkConfirm(`Usunąć projekt ${project.name}?`, { danger: true })) return;
  if (!await zkConfirm(`To usunie projekt ${project.name} razem z etapami, zadaniami i zleceniami. Na pewno?`, { title: "Ostateczne potwierdzenie", danger: true })) return;
  const index = projects.findIndex((item) => item.id === project.id);
  if (index < 0) return;
  projects.splice(index, 1);
  if (activeProjectId === project.id) activeProjectId = null;
  if (Array.isArray(myProjectIds)) myProjectIds = myProjectIds.filter((id) => id !== project.id);
  if (planningProjectId === project.id) planningProjectId = visibleProjects()[0]?.id || null;
  ensureSingleSelectedProject(planningProjectId);
  render();
}

async function addProjectFromDk8Template() {
  const name = await zkPrompt("Nazwa projektu", "NOWY PROJEKT", "Nowy projekt");
  if (!name) return;
  const client = await zkPrompt("Opis / klient projektu", name, "Nowy projekt") || name;
  const template = projects.find((project) => project.id === "dk8") || projects[0];
  if (!template) return;
  const project = cloneForUndo(template);
  project.id = uniqueProjectId(name);
  project.name = name.trim().toUpperCase();
  project.client = client.trim();
  project.color = colorFromName(project.name);
  project.selected = true;
  project.folderUrl = "";
  project.folderUrlManual = false;
  project.viewStart = "";
  project.viewEnd = "";
  project.tasks = project.tasks.map((task) => ({
    ...task,
    orders: [],
    checklist: Array.isArray(task.checklist) ? task.checklist.map((item) => ({ ...item, done: false })) : []
  }));
  project.stages = project.stages.map((stage) => ({
    ...stage,
    status: "todo",
    folderUrl: "",
    folderUrlManual: false
  }));
  projects.forEach((item) => {
    item.selected = false;
  });
  projects.push(project);
  if (Array.isArray(myProjectIds)) myProjectIds.push(project.id);
  planningProjectId = project.id;
  render();
  renderMyProjectsSettings();
}

function uniqueProjectId(name) {
  const base = String(name || "projekt")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "projekt";
  let candidate = base;
  let index = 2;
  while (projects.some((project) => project.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

async function renameProject(project) {
  const nextName = await zkPrompt("Nazwa projektu", project.name, "Zmień nazwę projektu");
  if (!nextName) return;
  const nextClient = await zkPrompt("Opis / klient projektu", project.client, "Zmień nazwę projektu") || project.client;
  project.name = nextName.trim().toUpperCase();
  project.client = nextClient.trim();
  render();
}

function renameStage(project, currentName, nextName) {
  const stage = project.stages.find((item) => item.name === currentName);
  const cleanName = String(nextName || "").trim().toUpperCase();
  if (!stage || !cleanName || cleanName === stage.name) {
    renderDnView(project);
    return;
  }
  if (project.stages.some((item) => item !== stage && item.name === cleanName)) {
    void zkAlert("Etap o takiej nazwie już istnieje.");
    renderDnView(project);
    return;
  }
  const previousName = stage.name;
  stage.name = cleanName;
  project.tasks.forEach((task) => {
    if (task.stage === previousName) task.stage = cleanName;
  });
  if (dnExpandedStages.has(previousName)) {
    dnExpandedStages.delete(previousName);
    dnExpandedStages.add(cleanName);
  }
  if (dnSelection?.type === "stage" && dnSelection.name === previousName) {
    dnSelection = { type: "stage", name: cleanName };
  }
  rememberDnExpandedStages(project);
  renderDnView(project);
  renderPeopleFilter();
}

async function deleteStage(project, stageName) {
  const stage = project.stages.find((item) => item.name === stageName);
  if (!stage) return;
  if (project.stages.length <= 1) {
    void zkAlert("Projekt musi mieć przynajmniej jeden etap.");
    return;
  }
  const taskCount = project.tasks.filter((task) => task.stage === stage.name).length;
  if (!await zkConfirm(`Usunąć etap "${stage.name}"?`, { danger: true })) return;
  if (!await zkConfirm(`To usunie etap "${stage.name}" oraz ${taskCount} zadania/zadań z tego etapu. Na pewno?`, { title: "Ostateczne potwierdzenie", danger: true })) return;
  project.stages = project.stages.filter((item) => item !== stage);
  project.tasks = project.tasks.filter((task) => task.stage !== stage.name);
  dnExpandedStages.delete(stage.name);
  if (dnSelection?.type === "stage" && dnSelection.name === stage.name) dnSelection = null;
  if (dnSelection?.type === "task") dnSelection = null;
  activeOrderIndex = 0;
  resetProjectWindow(project);
  rememberDnExpandedStages(project);
  renderPeopleFilter();
  renderDnView(project);
}

function moveProject(sourceId, targetId) {
  if (!sourceId || sourceId === targetId) return;
  const sourceIndex = projects.findIndex((project) => project.id === sourceId);
  const targetIndex = projects.findIndex((project) => project.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [source] = projects.splice(sourceIndex, 1);
  projects.splice(targetIndex, 0, source);
  renderProjects();
  renderPreview();
}

function projectProgress(project) {
  if (project.tasks.length) {
    return Math.round(project.tasks.reduce((sum, task) => sum + checklistProgress(task), 0) / project.tasks.length);
  }
  const doneWeight = project.stages.filter((stage) => stage.status === "done").length;
  const activeWeight = project.stages.filter((stage) => stage.status === "now" || stage.status === "late").length * 0.5;
  return Math.round(((doneWeight + activeWeight) / project.stages.length) * 100);
}

function updateProjectProgress(project) {
  const progress = projectProgress(project);
  el.detailProgress.textContent = `${progress}%`;
  el.detailProgressBar.style.width = `${progress}%`;
}

function renderPeopleFilter() {
  const people = new Set(peopleList());
  el.personFilter.innerHTML = `<option value="all">Wszyscy</option>${[...people].sort().map((person) => `<option value="${person}">${person}</option>`).join("")}`;
  el.personFilter.value = personFilter;
}

function peopleList() {
  const people = new Set(assignmentPeople.filter(Boolean));
  const currentPerson = currentChatPersonName();
  if (currentPerson && currentPerson !== "Uzytkownik") people.add(currentPerson);
  return [...people].sort();
}

function peopleOptions(selected) {
  const people = new Set(employeeDirectory.map((employee) => employee.name || employee.displayName).filter(Boolean));
  peopleList().forEach((person) => people.add(person));
  people.add(selected || "Zespol");
  return [...people].sort().map((person) => `<option value="${person}" ${person === selected ? "selected" : ""}>${person}</option>`).join("");
}

function normalizeProjectData() {
  projects.forEach((project) => {
    project.tasks?.forEach((task) => {
      ensureTaskOrders(task);
      task.orders.forEach((order) => {
        if (!order.id) {
          order.id = createStableId("order");
        }
      });
    });
  });
  const dk8 = projects.find((project) => project.id === "dk8");
  if (!dk8) return;
  const rename = (value) => value.replace(/^\d+\s+/, "");
  dk8.stages.forEach((stage) => {
    stage.name = rename(stage.name);
  });
  dk8.tasks.forEach((task) => {
    task.stage = rename(task.stage);
  });
}

function dateRangeDays(start, end) {
  const days = [];
  const cursor = parseDate(start);
  const last = parseDate(end);
  while (cursor.getTime() <= last.getTime() && days.length < 31) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function stageLabel(status) {
  return {
    done: "zakonczony",
    now: "w toku",
    late: "opozniony",
    todo: "plan"
  }[status];
}

function parseDate(value) {
  if (value instanceof Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  const raw = String(value || "").trim();
  const polish = raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (polish) {
    return new Date(Number(polish[3]), Number(polish[2]) - 1, Number(polish[1]));
  }
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return new Date(today);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysBetween(start, end) {
  return Math.round((parseDate(end) - parseDate(start)) / DAY);
}

function daysFromToday(value) {
  return Math.round((parseDate(value) - today) / DAY);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isWeekend(value) {
  const day = parseDate(value).getDay();
  return day === 0 || day === 6;
}

function normalizeWorkday(value) {
  return dateString(nextWorkday(value));
}

function normalizeWorkdayInput(value) {
  return displayDateInput(nextWorkday(value));
}

function normalizeWorkdayDateInput(value) {
  return nativeDateInput(nextWorkday(value));
}

function displayDateInput(value) {
  return formatDate(parseDate(value));
}

function nativeDateInput(value) {
  return dateString(parseDate(value));
}

function openTextDatePicker(event) {
  const button = event.currentTarget;
  const target = document.getElementById(button?.dataset?.datePickerFor || "");
  if (!target) return;

  const picker = document.createElement("input");
  picker.type = "date";
  picker.value = dateString(parseDate(target.value || today));
  picker.className = "floating-date-picker";

  const rect = button.getBoundingClientRect();
  picker.style.left = `${Math.max(8, rect.right - 132)}px`;
  picker.style.top = `${Math.max(8, rect.bottom + 4)}px`;
  document.body.appendChild(picker);

  const closePicker = () => {
    if (picker.parentNode) picker.remove();
  };

  picker.addEventListener("change", () => {
    target.value = normalizeWorkdayInput(picker.value);
    target.dispatchEvent(new Event("change", { bubbles: true }));
    closePicker();
  });
  picker.addEventListener("blur", () => window.setTimeout(closePicker, 150), { once: true });

  picker.focus({ preventScroll: true });
  if (typeof picker.showPicker === "function") {
    picker.showPicker();
  }
}

function nextWorkday(value) {
  const date = parseDate(value);
  if (workWeekends) return date;
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function previousWorkday(value) {
  const date = parseDate(value);
  if (workWeekends) return date;
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}

function addBusinessDays(value, days) {
  const date = parseDate(value);
  if (workWeekends) return addDays(date, days);
  let added = 0;
  while (added < days) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) added += 1;
  }
  return date;
}

function setupQuickDateButtons() {
  const quickDates = el.assignmentForm.querySelector(".quick-dates");
  if (!quickDates) return;
  if (!quickDates.querySelector('[data-quick-due="2"]')) {
    const tomorrowButton = quickDates.querySelector('[data-quick-due="1"]');
    tomorrowButton?.closest(".quick-date-control")?.after(createQuickDateControl("2", "Pojutrze", "wysoki"));
  }
  if (!quickDates.querySelector('[data-quick-due="14"]')) {
    const weekButton = quickDates.querySelector('[data-quick-due="7"]');
    weekButton?.closest(".quick-date-control")?.after(createQuickDateControl("14", "Za dwa tygodnie", "sredni"));
  }
}

function createQuickDateControl(days, label, priority = "sredni") {
  const control = document.createElement("span");
  control.className = `quick-date-control priority-${priority}`;
  control.dataset.quickPriority = priority;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.quickDue = days;
  button.textContent = label;
  const select = document.createElement("select");
  select.className = "quick-priority-select";
  select.setAttribute("aria-label", `Priorytet dla ${label}`);
  const priorityOptions = [
    { value: "wysoki", text: "Wysoki" },
    { value: "sredni", text: "Średni" },
    { value: "niski", text: "Niski" }
  ];
  priorityOptions.forEach(({ value, text }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    option.selected = value === priority;
    select.append(option);
  });
  control.append(button, select);
  return control;
}

function setupQuickPrioritySelects() {
  el.assignmentForm.querySelectorAll(".quick-date-control").forEach((control) => {
    const select = control.querySelector(".quick-priority-select");
    if (!select) return;
    const initialPriority = control.dataset.quickPriority || select.value || "sredni";
    setQuickPriority(control, initialPriority);
    select.addEventListener("change", () => {
      setQuickPriority(control, select.value);
      const dueButton = control.querySelector("[data-quick-due]");
      const quickDue = dueButton ? nativeDateInput(quickAssignmentDue(Number(dueButton.dataset.quickDue))) : "";
      if (quickDue && el.assignmentDue.value === quickDue) {
        el.assignmentPriority.value = control.dataset.quickPriority || "sredni";
        renderPriorityRanges();
        renderAssignmentDraft();
      }
    });
  });
}

function setQuickPriority(control, priority) {
  const safePriority = ["wysoki", "sredni", "niski"].includes(priority) ? priority : "sredni";
  control.dataset.quickPriority = safePriority;
  control.classList.toggle("priority-wysoki", safePriority === "wysoki");
  control.classList.toggle("priority-sredni", safePriority === "sredni");
  control.classList.toggle("priority-niski", safePriority === "niski");
  const select = control.querySelector(".quick-priority-select");
  if (select && select.value !== safePriority) select.value = safePriority;
}

function quickAssignmentDue(days) {
  const businessMap = { 1: 1, 7: 5, 14: 10, 30: 22 };
  return dateString(addBusinessDays(today, workWeekends ? days : businessMap[days] || days));
}

function priorityFromQuickDue(days) {
  const businessMap = { 1: 1, 7: 5, 14: 10, 30: 22 };
  return priorityFromWorkdays(workWeekends ? days : businessMap[days] || days);
}

function priorityFromDueDate(value) {
  return priorityFromWorkdays(businessDaysUntil(value));
}

function priorityFromWorkdays(workdays) {
  const highLimit = priorityThresholdValue(el.priorityHighLimit, 5);
  const mediumLimit = priorityThresholdValue(el.priorityMediumLimit, 10);
  if (workdays <= highLimit) return "wysoki";
  if (workdays <= mediumLimit) return "sredni";
  return "niski";
}

function priorityThresholdValue(input, fallback) {
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function normalizePriorityThreshold(input) {
  const min = Number(input.min || 1);
  const max = Number(input.max || 30);
  const fallback = input === el.priorityHighLimit ? 5 : 10;
  const value = Number(input.value);
  if (!Number.isFinite(value)) {
    input.value = String(fallback);
    return;
  }
  input.value = String(Math.max(min, Math.min(max, value)));
}

function renderPriorityRanges() {
  el.assignmentPriorityButtons?.querySelectorAll("[data-priority-choice]").forEach((button) => {
    const active = button.dataset.priorityChoice === el.assignmentPriority.value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (!el.priorityRanges) return;
  const highLimit = priorityThresholdValue(el.priorityHighLimit, 5);
  const mediumLimit = priorityThresholdValue(el.priorityMediumLimit, 10);
  const max = Math.max(30, highLimit, mediumLimit);
  el.priorityRanges.style.setProperty("--priority-high", `${(highLimit / max) * 100}%`);
  el.priorityRanges.style.setProperty("--priority-medium", `${(mediumLimit / max) * 100}%`);
  el.priorityRanges.querySelectorAll("[data-priority-band]").forEach((band) => {
    band.classList.toggle("active", band.dataset.priorityBand === el.assignmentPriority.value);
  });
}

function businessDaysUntil(value) {
  const end = nextWorkday(value);
  const cursor = new Date(today);
  let days = 0;
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (workWeekends || (cursor.getDay() !== 0 && cursor.getDay() !== 6)) days += 1;
  }
  return days;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit" }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function dateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
