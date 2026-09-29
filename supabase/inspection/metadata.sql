-- METADATA ONLY. Have an authorized operator run in a read-only session.
-- No user rows, auth records or credentials are selected. Review function/default
-- definitions privately for embedded secrets before sharing any output.
begin transaction read only;
select n.nspname as schema_name, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p','v','m') order by c.relname;

select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns where table_schema='public'
order by table_name, ordinal_position;

select c.relname as table_name, con.conname, con.contype, con.convalidated,
  pg_get_constraintdef(con.oid, true) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid
join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
order by c.relname, con.conname;

select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by tablename,indexname;
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies where schemaname='public' order by tablename,policyname;
select table_name, grantee, privilege_type from information_schema.table_privileges
where table_schema='public' order by table_name,grantee,privilege_type;
select n.nspname, c.relname, c.relacl from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p','v','m','S');
select nspname, nspacl from pg_namespace where nspname='public';
select defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, defaclacl from pg_default_acl;

select c.relname, pg_get_triggerdef(t.oid, true) as trigger_definition,
  p.oid::regprocedure as function_name
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and (n.nspname='public' or (n.nspname='auth' and c.relname='users'));

-- Include public routines and functions attached to relevant triggers, wherever located.
select n.nspname, p.oid::regprocedure as signature, p.prosecdef,
  pg_get_function_arguments(p.oid) as arguments,
  case p.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end as volatility,
  p.proowner::regrole as owner, p.proconfig, p.proacl,
  pg_get_function_result(p.oid) as result, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.prokind in ('f','p') and (n.nspname='public' or p.oid in (
  select t.tgfoid from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace ns on ns.oid=c.relnamespace
  where not t.tgisinternal and (ns.nspname='public' or (ns.nspname='auth' and c.relname='users'))
));
select c.relname, pg_get_viewdef(c.oid, true) as definition
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('v','m');
commit;
