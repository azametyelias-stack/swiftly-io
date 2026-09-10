-- ============================================================================
-- Filet de sécurité RLS — posé à la main en production par Elias, rapatrié
-- dans le dépôt le 2026-09-10 après l'avoir trouvé lors de la comparaison
-- dev/prod qui précède la migration 0007 en production.
-- ============================================================================
--
--   La convention du Point 4 (SECURITY MASTERPLAN) veut que toute table active
--   RLS dès sa création — mais c'est une discipline humaine, pas une garantie
--   du moteur. Un `CREATE TABLE` sans le `ENABLE ROW LEVEL SECURITY` qui va
--   avec (oubli de migration, script lancé à la main un jour de fatigue)
--   passerait sans qu'aucun test ne le voie avant le prochain audit.
--
--   Ce déclencheur d'événement ferme cette fenêtre au niveau du moteur : à la
--   fin de toute commande `CREATE TABLE`, `CREATE TABLE AS` ou `SELECT INTO`
--   dans `public`, il force RLS — qu'on l'ait demandé ou non. Un échec est
--   journalisé (`RAISE LOG`) et n'interrompt jamais la commande d'origine :
--   un filet, pas un verrou qui pourrait bloquer un déploiement légitime.
--
--   N'existait que sur la production jusqu'ici ; absent de la dev et donc
--   absent de tout futur environnement reconstruit depuis les migrations.
-- ----------------------------------------------------------------------------

create or replace function public.rls_auto_enable()
 returns event_trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
