// react-router framework 모드.
// ssr:false + prerender 없음 = 순수 SPA. 모든 페이지가 브라우저에서 데이터를
// 로드(clientLoader)하므로 admin 저장이 재배포 없이 즉시 반영된다.
// (이전에는 일부 페이지를 빌드 시점에 미리 렌더했으나, 콘텐츠 갱신마다
//  재배포가 필요해 B안(전면 CSR)으로 전환 — 2026-07-02)
export default {
  ssr: false,
  basename: process.env.VITE_BASE || '/',
}
