-- ============================================================================
-- Les personnes appartiennent à un type — retour terrain d'Elias, 2026-09-08
-- ============================================================================
--
--   `people` n'a jamais eu de type. Le picker « Lié à » chargeait donc TOUTES
--   les personnes du compte, quel que soit le formulaire ouvert : les noms
--   saisis pendant un revenu (« qui m'a payé ») ressortaient dans la liste
--   d'une dépense (« à qui j'ai payé »). Deux carnets d'adresses différents
--   mélangés dans un seul champ.
--
--   `categories` avait déjà réglé ce problème avec une colonne `kind` et un
--   filtre `?kind=` — on applique exactement le même modèle ici.
--
-- ── la transition ──────────────────────────────────────────────────────────
--
--   Les lignes existantes n'ont pas d'origine enregistrée. On la déduit de
--   l'usage réel : une personne référencée par au moins un revenu est un
--   revenu. Le revenu l'emporte volontairement sur la dépense en cas de
--   double usage, parce que « Lié à » est OBLIGATOIRE en revenu et facultatif
--   en dépense : une personne présente des deux côtés est presque toujours
--   une source de revenu qu'on a aussi remboursée une fois.
--
--   Une personne jamais utilisée retombe sur 'expense' (le défaut). Aucune
--   ligne n'est supprimée et aucun `linked_to_id` ne bouge : une transaction
--   existante garde son lien et affiche toujours le bon nom. Le seul effet
--   possible est un nom absent d'une des deux listes — il se recrée en trois
--   secondes avec « + Créer une personne ».
--
--   Aucune vérification de `kind` n'est faite à l'écriture d'une transaction
--   (contrairement aux catégories, cf. lib/transactions/service.ts) : un lien
--   de mauvais type n'a aucune conséquence comptable ni sur le score, alors
--   qu'un contrôle serveur empêcherait de rouvrir et rééditer une ancienne
--   transaction dont la personne a été classée de l'autre côté.
-- ----------------------------------------------------------------------------

alter table public.people
  add column if not exists kind text not null default 'expense';

update public.people p
   set kind = 'income'
 where p.kind <> 'income'
   and exists (
     select 1
       from public.transactions t
      where t.linked_to_type = 'person'
        and t.linked_to_id = p.id
        and t.type = 'income'
   );

alter table public.people drop constraint if exists people_kind_check;
alter table public.people add constraint people_kind_check
  check (kind in ('expense', 'income'));

-- Le picker filtre toujours sur (user_id, kind), jamais sur user_id seul.
create index if not exists people_user_kind_idx on public.people (user_id, kind);
