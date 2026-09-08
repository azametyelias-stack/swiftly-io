import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

/*
 * Le vrai `public/sw.js`, execute.
 *
 * `config.test.ts` verifie que le fichier DIT les bonnes choses (les constantes
 * sont en phase avec lib/pwa/config.ts). Ici on verifie qu'il FAIT les bonnes
 * choses : on le charge dans un faux ServiceWorkerGlobalScope, avec un faux
 * Cache Storage et un reseau qu'on peut couper, et on regarde ce qui sort.
 *
 * C'est le seul test qui puisse attraper les erreurs qui ne se voient que hors
 * ligne, c'est-a-dire au pire moment : un corps de reponse consomme deux fois,
 * une coquille rangee sous la mauvaise cle, /api/ qui finirait par passer.
 */

const ORIGIN = "https://swiftly.test";
const SW_SOURCE = readFileSync(
  fileURLToPath(new URL("../../public/sw.js", import.meta.url)),
  "utf8",
);

/** Une coquille d'ecran, calquee sur la sortie reelle de `next build`. */
function shell(route: string): string {
  return (
    `<!DOCTYPE html><html lang="fr"><head>` +
    `<link rel="stylesheet" href="/_next/static/css/app.css"/></head>` +
    `<body><div class="min-h-dvh bg-surface-page" aria-busy="true"></div>` +
    `<script src="/_next/static/chunks/boot-${route}.js"></script>` +
    // Next reference aussi ses fragments dans la charge RSC, sous forme echappee.
    `<script>self.__next_f.push([1,"3:I[85767,[\\"/_next/static/chunks/shared.js\\"]]"])</script>` +
    `</body></html>`
  );
}

const HTML = { "Content-Type": "text/html; charset=utf-8" };

const NETWORK: Record<string, { body: string; headers?: Record<string, string> }> = {
  "/": { body: shell("landing"), headers: HTML },
  "/dashboard": { body: shell("dashboard"), headers: HTML },
  "/historiques": { body: shell("historiques"), headers: HTML },
  "/comptes": { body: shell("comptes"), headers: HTML },
  "/offline": { body: "<!DOCTYPE html><html><body>Pas de connexion</body></html>", headers: HTML },
  "/manifest.webmanifest": { body: '{"name":"Swiftly.io"}', headers: { "Content-Type": "application/manifest+json" } },
  "/icons/icon-192x192.png": { body: "png", headers: { "Content-Type": "image/png" } },
  "/icons/icon-512x512.png": { body: "png", headers: { "Content-Type": "image/png" } },
  "/icons/icon-maskable-512x512.png": { body: "png", headers: { "Content-Type": "image/png" } },
  "/_next/static/css/app.css": { body: "body{}", headers: { "Content-Type": "text/css" } },
  "/_next/static/chunks/shared.js": { body: "//shared", headers: { "Content-Type": "text/javascript" } },
  "/api/dashboard": { body: '{"success":true,"data":{"balance":125000}}', headers: { "Content-Type": "application/json" } },
};

for (const route of ["landing", "dashboard", "historiques", "comptes"]) {
  NETWORK[`/_next/static/chunks/boot-${route}.js`] = {
    body: `//${route}`,
    headers: { "Content-Type": "text/javascript" },
  };
}

/* ── un faux Cache Storage ───────────────────────────────────────────────── */

type Stored = { status: number; headers: Record<string, string>; body: string };

class FakeCache {
  readonly entries = new Map<string, Stored>();
  readonly net: () => Harness;

  constructor(net: () => Harness) {
    this.net = net;
  }

  private key(request: { url: string } | string): string {
    return new URL(typeof request === "string" ? request : request.url, ORIGIN).toString();
  }

  async put(request: { url: string } | string, response: Response): Promise<void> {
    // Un corps ne se lit qu'une fois : si le worker a rendu cette meme reponse
    // a la page sans la cloner, ceci jette — et c'est tout l'interet.
    const body = await response.text();
    this.entries.set(this.key(request), {
      status: response.status,
      headers: Object.fromEntries(response.headers as unknown as Iterable<[string, string]>),
      body,
    });
  }

  async add(request: { url: string } | string): Promise<void> {
    const response = await this.net().fetch(request);
    if (!response.ok) throw new TypeError("bad response");
    await this.put(request, response);
  }

  async match(request: { url: string } | string): Promise<Response | undefined> {
    const stored = this.entries.get(this.key(request));
    if (!stored) return undefined;
    return new Response(stored.body, { status: stored.status, headers: stored.headers });
  }

  async keys(): Promise<{ url: string }[]> {
    return [...this.entries.keys()].map((url) => ({ url }));
  }

  async delete(request: { url: string } | string): Promise<boolean> {
    return this.entries.delete(this.key(request));
  }
}

class FakeCacheStorage {
  readonly caches = new Map<string, FakeCache>();
  readonly net: () => Harness;

  constructor(net: () => Harness) {
    this.net = net;
  }

  async open(name: string): Promise<FakeCache> {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new FakeCache(this.net);
      this.caches.set(name, cache);
    }
    return cache;
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }

  async match(
    request: { url: string } | string,
    options?: { cacheName?: string },
  ): Promise<Response | undefined> {
    const names = options?.cacheName ? [options.cacheName] : [...this.caches.keys()];
    for (const name of names) {
      const hit = await this.caches.get(name)?.match(request);
      if (hit) return hit;
    }
    return undefined;
  }
}

/* ── le worker, charge dans un contexte isole ────────────────────────────── */

type Listener = (event: Record<string, unknown>) => void;

class Harness {
  online = true;
  /** Chemins servis en 302 par le reseau — pieges a `response.redirected`. */
  readonly redirects = new Set<string>();
  readonly listeners: Record<string, Listener[]> = {};
  readonly storage = new FakeCacheStorage(() => this);
  readonly requested: string[] = [];

  fetch = async (input: { url: string } | string): Promise<Response> => {
    const url = new URL(typeof input === "string" ? input : input.url, ORIGIN);
    if (!this.online) throw new TypeError("Failed to fetch");
    this.requested.push(url.pathname);

    const route = NETWORK[url.pathname];
    if (!route) return new Response("not found", { status: 404 });

    const response = new Response(route.body, { status: 200, headers: route.headers });
    if (this.redirects.has(url.pathname)) {
      Object.defineProperty(response, "redirected", { value: true });
    }
    Object.defineProperty(response, "type", { value: "basic" });
    return response;
  };

  constructor() {
    // `new Request("/offline")` jette hors d'un navigateur : dans un worker les
    // URL relatives se resolvent contre `self.location`. On rend ce comportement.
    const origin = ORIGIN;
    class SwRequest {
      readonly url: string;
      readonly method = "GET";
      readonly headers = new Headers();
      constructor(input: string | { url: string }) {
        this.url = new URL(typeof input === "string" ? input : input.url, origin).toString();
      }
    }

    const self = {
      addEventListener: (type: string, fn: Listener) => {
        (this.listeners[type] ||= []).push(fn);
      },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
      registration: { navigationPreload: { enable: async () => {} } },
      location: new URL(`${ORIGIN}/sw.js`),
    };

    const context = vm.createContext({
      self,
      caches: this.storage,
      fetch: this.fetch,
      Request: SwRequest,
      Response,
      Headers,
      URL,
      console,
    });
    vm.runInContext(SW_SOURCE, context, { filename: "public/sw.js" });
  }

  async fire(type: string, event: Record<string, unknown>): Promise<void> {
    const waits: Promise<unknown>[] = [];
    const full = { ...event, waitUntil: (p: Promise<unknown>) => void waits.push(p) };
    for (const listener of this.listeners[type] ?? []) listener(full);
    await Promise.all(waits);
  }

  /**
   * Joue le gestionnaire `fetch`. `null` = le worker a laisse passer.
   *
   * Le drainage a la fin n'est pas un detail : `navigateOrFallback` appelle
   * `waitUntil` APRES son premier `await`, donc bien apres le retour du
   * gestionnaire. Un vrai navigateur l'accepte (l'evenement reste actif tant
   * que `respondWith` est en attente) ; sans cette boucle, le banc d'essai
   * regardait le cache avant que le rangement ait eu lieu.
   */
  async request(
    path: string,
    mode: "navigate" | "no-cors" = "navigate",
    method = "GET",
  ): Promise<Response | null> {
    const url = new URL(path, ORIGIN);
    const request = { method, url: url.toString(), mode, headers: new Headers() };
    const waits: Promise<unknown>[] = [];
    let answer: Promise<Response> | null = null;

    const event = {
      request,
      preloadResponse: Promise.resolve(undefined),
      respondWith: (p: Promise<Response>) => {
        answer = p;
      },
      waitUntil: (p: Promise<unknown>) => void waits.push(p),
    };
    for (const listener of this.listeners.fetch ?? []) listener(event);

    const response = answer === null ? null : await (answer as Promise<Response>);
    while (waits.length > 0) await Promise.all(waits.splice(0));
    return response;
  }

  pages(): FakeCache | undefined {
    return this.storage.caches.get("swiftly-pages-v3");
  }

  assets(): FakeCache | undefined {
    return this.storage.caches.get("swiftly-v3");
  }
}

async function installed(): Promise<Harness> {
  const worker = new Harness();
  await worker.fire("install", {});
  await worker.fire("activate", {});
  return worker;
}

/* ── installation ────────────────────────────────────────────────────────── */

test("l'installation precache les ressources, les coquilles ET leurs fragments", async () => {
  const worker = await installed();

  const assets = [...(worker.assets()?.entries.keys() ?? [])].map((u) => new URL(u).pathname);
  assert.ok(assets.includes("/offline"), "le repli ultime doit etre la");
  assert.ok(assets.includes("/manifest.webmanifest"));
  assert.ok(assets.includes("/icons/icon-192x192.png"));

  const pages = [...(worker.pages()?.entries.keys() ?? [])].map((u) => new URL(u).pathname);
  assert.deepEqual(pages.sort(), ["/", "/dashboard"]);

  // Le point qui decide entre « l'app s'ouvre » et « un squelette fige » : une
  // coquille sans ses fragments JS ne s'hydrate pas.
  assert.ok(assets.includes("/_next/static/chunks/boot-dashboard.js"), "fragment de <script src>");
  assert.ok(assets.includes("/_next/static/chunks/shared.js"), "fragment cite dans la charge RSC");
  assert.ok(assets.includes("/_next/static/css/app.css"), "feuille de style");
});

test("l'activation efface les caches d'avant, garde les deux du jour", async () => {
  const worker = new Harness();
  await worker.storage.open("swiftly-v2");
  await worker.storage.open("swiftly-v3");
  await worker.storage.open("swiftly-pages-v3");
  await worker.storage.open("autre-chose-v1");

  await worker.fire("activate", {});

  const names = await worker.storage.keys();
  assert.ok(!names.includes("swiftly-v2"), "la v2 doit partir");
  assert.ok(names.includes("swiftly-v3") && names.includes("swiftly-pages-v3"));
  assert.ok(names.includes("autre-chose-v1"), "on ne balaie que nos propres cles");
});

/* ── REGLE N°1 ───────────────────────────────────────────────────────────── */

test("/api/ n'est jamais intercepte, en ligne comme hors ligne", async () => {
  const worker = await installed();

  assert.equal(await worker.request("/api/dashboard", "no-cors"), null);
  assert.equal(await worker.request("/api/dashboard", "navigate"), null);

  worker.online = false;
  assert.equal(await worker.request("/api/dashboard", "no-cors"), null);

  worker.online = true;
  await worker.request("/api/transactions", "no-cors", "POST");

  for (const cache of worker.storage.caches.values()) {
    for (const key of cache.entries.keys()) {
      assert.ok(!new URL(key).pathname.startsWith("/api/"), `${key} n'a rien a faire en cache`);
    }
  }
});

/* ── en ligne ────────────────────────────────────────────────────────────── */

test("en ligne, la reponse reste lisible ET la coquille est rangee", async () => {
  const worker = await installed();

  const response = await worker.request("/historiques");
  assert.ok(response);
  // Si le worker avait range la reponse sans la cloner, ce `text()` jetterait :
  // le corps aurait deja ete consomme par `cache.put`. La page recevrait une
  // reponse vide — un ecran blanc, en ligne, sur toutes les navigations.
  const body = await response.text();
  assert.match(body, /aria-busy/);

  const cached = await worker.pages()?.match("/historiques");
  assert.ok(cached, "la visite en ligne doit alimenter le cache hors ligne");
  assert.match(await cached.text(), /boot-historiques/);
});

test("une query ne cree pas une coquille de plus", async () => {
  const worker = await installed();
  await worker.request("/historiques?period=month");
  await worker.request("/historiques?period=day");

  const pages = [...(worker.pages()?.entries.keys() ?? [])].map((u) => new URL(u).pathname);
  assert.deepEqual(pages.sort(), ["/", "/dashboard", "/historiques"]);
});

test("une reponse redirigee n'est pas rangee", async () => {
  // Le navigateur refuse qu'un worker reponde a une navigation avec une reponse
  // portant le drapeau `redirected` : l'erreur n'apparaitrait qu'une fois hors
  // ligne, quand il est trop tard pour s'en apercevoir.
  const worker = await installed();
  worker.redirects.add("/comptes");

  await worker.request("/comptes");
  assert.equal(await worker.pages()?.match("/comptes"), undefined);
});

/* ── hors ligne : le scenario d'Elias ────────────────────────────────────── */

test("hors ligne, l'app s'ouvre sur le dashboard, pas sur « Pas de connexion »", async () => {
  const worker = await installed();
  worker.online = false;

  const landing = await worker.request("/");
  assert.match(await landing!.text(), /boot-landing/, "start_url doit s'ouvrir");

  const dashboard = await worker.request("/dashboard");
  assert.match(
    await dashboard!.text(),
    /aria-busy/,
    "c'est ici que la v2 servait /offline — la capture d'Elias du 7 sept.",
  );
});

test("hors ligne, un ecran deja visite en ligne s'ouvre", async () => {
  const worker = await installed();
  await worker.request("/comptes"); // la visite d'aujourd'hui, en ligne

  worker.online = false;
  const offlineVisit = await worker.request("/comptes");
  assert.match(await offlineVisit!.text(), /boot-comptes/);
});

test("hors ligne, un ecran jamais charge dit « pas de connexion » plutot que de mentir", async () => {
  const worker = await installed();
  worker.online = false;

  const response = await worker.request("/historiques");
  assert.ok(response);
  assert.match(
    await response.text(),
    /Pas de connexion/,
    "mieux vaut la page hors ligne que la mise en page d'un autre ecran",
  );
});

test("hors ligne, les fragments deja caches sont servis", async () => {
  const worker = await installed();
  worker.online = false;

  const chunk = await worker.request("/_next/static/chunks/boot-dashboard.js", "no-cors");
  assert.ok(chunk);
  assert.equal(await chunk.text(), "//dashboard");
});

/* ── bornes ──────────────────────────────────────────────────────────────── */

test("le cache des coquilles est plafonne, sans jamais evincer le precache", async () => {
  const worker = await installed();

  // 30 visites distinctes, pour un plafond de 24.
  for (let i = 0; i < 30; i += 1) {
    const path = `/comptes/${i}`;
    NETWORK[path] = { body: shell(`compte-${i}`), headers: HTML };
    await worker.request(path);
  }

  const pages = [...(worker.pages()?.entries.keys() ?? [])].map((u) => new URL(u).pathname);
  assert.ok(pages.length <= 24, `24 coquilles au plus, ${pages.length} trouvees`);
  assert.ok(pages.includes("/dashboard"), "la coquille precachee ne s'evince pas");
  assert.ok(pages.includes("/"), "la landing non plus");
  assert.ok(pages.includes("/comptes/29"), "la visite la plus recente est gardee");
  assert.ok(!pages.includes("/comptes/0"), "la plus ancienne est partie");
});
