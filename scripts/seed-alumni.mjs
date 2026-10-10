// 졸업/수료 멤버를 Alumni(status='alumni')로 전환하는 데이터 시드.
// 멱등(여러 번 실행해도 동일). 스키마 변경 없음 — members.status 는 이미 current/alumni.
// 실행: node scripts/seed-alumni.mjs  (.env.local 의 service role 키 사용)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').map(l => l.trim())
    .filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// id 로 매칭 (data/members.json 과 같은 id).
const ALUMNI_IDS = ['smlim']   // 임상민

const { data, error } = await admin
  .from('members')
  .update({ status: 'alumni' })
  .in('id', ALUMNI_IDS)
  .select('id, name, name_ko, status')
if (error) { console.error('✗ alumni 전환 실패:', error.message); process.exit(1) }

const missing = ALUMNI_IDS.filter(id => !data.some(r => r.id === id))
if (missing.length) console.warn('⚠ DB 에 없는 id:', missing.join(', '))
console.log(`✓ Alumni 전환 ${data.length}명:`, data.map(r => r.name_ko || r.name).join(', '))
