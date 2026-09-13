"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { apiJson } from "@/lib/http/api";
import { DASHBOARD_STALE_EVENT } from "@/lib/dashboard/lastAccount";
import { resolvePeriod, type Period } from "@/lib/dashboard/period";
import type { TxListItem } from "@/lib/transactions/model";

/**
 * Les transactions de l'« Historique récent » du Dashboard (SCREEN-4 § 10).
 *
 * Il charge **toute la période sélectionnée**, pas les trois dernières lignes
 * toutes périodes confondues comme avant. Deux raisons, et elles sont liées :
 *
 *  - le doc § 3 le demande — « le sélecteur de compte et le sélecteur de période
 *    pilotent ENSEMBLE toutes les données affichées plus bas (graphique, résumé,
 *    historique filtré) » ; l'historique était le seul à l'ignorer ;
 *  - « Voir plus » déplie désormais sur place, et ce qu'il déplie c'est
 *    exactement la période affichée à l'écran.
 *
 * Et un tri par montant ou alphabétique n'a de sens que sur l'ensemble : prendre
 * les 5 premières lignes du serveur puis les trier donnerait « les 5 plus
 * récentes, rangées par montant », ce qui n'est pas ce qu'on demande.
 */

interface TxListPage {
  items: TxListItem[];
  nextCursor: string | null;
}

const PAGE = 100;

/**
 * Garde-fou : au-delà, c'est l'écran Historiques qui est l'outil adapté (il
 * pagine à la demande). Le Dashboard est une vue d'ensemble — charger cinq
 * mille lignes pour en afficher cinq serait payer le transfert pour rien.
 */
const MAX_PAGES = 5;

export type RecentStatus = "loading" | "ready" | "error";

export interface RecentHistoryState {
  items: TxListItem[];
  status: RecentStatus;
  /** Vrai quand la période dépasse le plafond de chargement ci-dessus. */
  truncated: boolean;
  reload: () => void;
  remove: (id: string) => Promise<boolean>;
}

/** Ce qu'on a chargé, et pour quelle question. */
interface Loaded {
  key: string;
  rows: TxListItem[];
  truncated: boolean;
}

export function useRecentHistory(
  accountId: string | null,
  period: Period,
): RecentHistoryState {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // `resolvePeriod` lit l'heure courante : sans mémo, chaque rendu produirait
  // une fenêtre neuve et relancerait la requête en boucle.
  const range = useMemo(() => resolvePeriod(period), [period]);

  /*
   * La question posée au serveur, réduite à une chaîne.
   *
   * C'est elle qui tient lieu d'état de chargement : le statut se DÉDUIT de la
   * comparaison entre ce qu'on a chargé et ce qu'on veut, au lieu d'être posé
   * par un `setStatus("loading")` en tête d'effet — que la règle
   * `react-hooks/set-state-in-effect` interdit ici, et pour une bonne raison :
   * ça coûte un rendu de plus à chaque changement de période.
   *
   * Effet de bord recherché : changer de période vide immédiatement la liste au
   * lieu de laisser les lignes de la période précédente une seconde de trop —
   * cinq lignes d'« Aujourd'hui » sous un graphique passé à « Année » se lisent
   * comme une erreur.
   */
  const key = `${accountId ?? ""}|${range.start}|${range.end}|${reloadKey}`;
  const fresh = loaded?.key === key;

  // Une transaction vient d'être enregistrée. Le Dashboard reste monté sous la
  // feuille du wizard : sans ça la liste garderait l'état d'avant jusqu'à un
  // rechargement à la main.
  useEffect(() => {
    window.addEventListener(DASHBOARD_STALE_EVENT, reload);
    return () => window.removeEventListener(DASHBOARD_STALE_EVENT, reload);
  }, [reload]);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const collected: TxListItem[] = [];
      let cursor: string | null = null;
      let pages = 0;

      do {
        const query = new URLSearchParams({
          from: range.start,
          to: range.end,
          limit: String(PAGE),
        });
        if (accountId) query.set("account", accountId);
        if (cursor) query.set("cursor", cursor);

        const page: TxListPage = await apiJson<TxListPage>(
          `/api/transactions?${query.toString()}`,
        );
        collected.push(...page.items);
        cursor = page.nextCursor;
        pages += 1;
      } while (cursor && pages < MAX_PAGES);

      return { rows: collected, cut: cursor !== null };
    };

    load()
      .then(({ rows, cut }) => {
        if (!alive) return;
        setLoaded({ key, rows, truncated: cut });
      })
      .catch(() => {
        if (!alive) return;
        setFailedKey(key);
      });

    return () => {
      alive = false;
    };
  }, [accountId, range.start, range.end, key]);

  /**
   * Suppression optimiste : la ligne part tout de suite et revient si le serveur
   * refuse. Le solde et la courbe, eux, sont rafraîchis par l'appelant — ce hook
   * ne connaît que sa liste.
   */
  const remove = useCallback(async (id: string) => {
    let snapshot: Loaded | null = null;
    setLoaded((prev) => {
      snapshot = prev;
      if (!prev) return prev;
      return { ...prev, rows: prev.rows.filter((x) => x.id !== id) };
    });
    try {
      await apiJson(`/api/transactions/${id}`, { method: "DELETE" });
      return true;
    } catch {
      setLoaded(snapshot);
      return false;
    }
  }, []);

  return {
    items: fresh ? loaded!.rows : [],
    status: fresh ? "ready" : failedKey === key ? "error" : "loading",
    truncated: fresh ? loaded!.truncated : false,
    reload,
    remove,
  };
}
