-- =============================================================================
-- PHI Lab Homepage — Seed (local / dev only)
-- 첫 admin 시드. Supabase CLI `db reset` 시 자동 실행됨.
-- 프로덕션 환경에는 이 파일이 적용되지 않음 — 프로덕션엔 Supabase Dashboard SQL Editor 에서 수동 실행.
-- =============================================================================

insert into public.admin_users (email, role, display_name) values
  ('guboc11@gmail.com',          'admin',     '박태원'),
  ('hyojung.kim@catholic.ac.kr', 'professor', '김효정 교수')
on conflict (email) do nothing;
