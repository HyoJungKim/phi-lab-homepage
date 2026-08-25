import { useEffect, useState } from 'react'
import { fetchGallery } from '../lib/publicData'
import { usePageMeta } from '../lib/usePageMeta'
import Lightbox from '../components/Lightbox'

// Gallery — 연구실 문화·사람(Lab Life) 사진. 앨범별 묶음 + 클릭 확대(라이트박스).
// CSR: admin 업로드가 재배포 없이 즉시 반영되도록 공개 loader 대신 클라이언트 fetch.

// 앨범 헤딩에 표시할 대표날짜 = 앨범 내 '가장 빠른' 촬영일(정렬 기준과 동일).
function albumDate(items) {
  const dates = items.map((i) => i.takenOn).filter(Boolean).sort()
  if (!dates.length) return ''
  const d = new Date(dates[0])
  return `${d.getFullYear()}. ${d.getMonth() + 1}.`
}

export default function Gallery() {
  const [items, setItems] = useState(null) // null=로딩, []=없음
  const [error, setError] = useState(null)
  const [lightbox, setLightbox] = useState(null)
  usePageMeta({
    title: 'Gallery',
    description: 'Life in the PHI Lab — moments from our research journey, gatherings, and milestones.',
  })

  useEffect(() => {
    let alive = true
    fetchGallery()
      .then((data) => { if (alive) setItems(data) })
      .catch((e) => { if (alive) setError(e) })
    return () => { alive = false }
  }, [])

  // 앨범별 묶음. album 없으면 'Lab Life'.
  // 같은 앨범 이름이라도 촬영 '월'이 다르면 따로 묶는다 — 회식처럼 같은 이름으로
  // 반복되는 행사가 한 덩어리로 합쳐지지 않게.
  //   단, 한 앨범 안에 실제로 서로 다른 달이 있을 때만 나눈다. 촬영일이 비어 있는
  //   사진이 많은 앨범(GHMW 2026 등)을 무조건 월로 쪼개면 멀쩡한 앨범이 흩어지므로,
  //   날짜 없는 사진은 그 앨범의 대표 달에 붙인다.
  // 앨범 '간' 순서 = 대표날짜(그 묶음에서 가장 빠른 날짜) 역순 → 최신 행사가 위로.
  // 앨범 '안'의 사진은 fetch 순서(촬영일 과거→현재) 유지.
  const groups = (() => {
    if (!items) return []
    const monthOf = (it) => (it.takenOn ? String(it.takenOn).slice(0, 7) : null)
    const repDate = (arr) => arr.reduce((min, it) => {
      const d = it.takenOn || it.createdAt
      return min === '' || d < min ? d : min
    }, '')

    const byAlbum = new Map()
    for (const it of items) {
      const name = it.album || 'Lab Life'
      if (!byAlbum.has(name)) byAlbum.set(name, [])
      byAlbum.get(name).push(it)
    }

    const out = []
    for (const [name, arr] of byAlbum) {
      const months = [...new Set(arr.map(monthOf).filter(Boolean))]
      if (months.length <= 1) {
        out.push({ key: name, album: name, items: arr })
        continue
      }
      const primary = months.sort()[0]   // 날짜 없는 사진이 붙을 대표 달
      const sub = new Map()
      for (const it of arr) {
        const m = monthOf(it) ?? primary
        if (!sub.has(m)) sub.set(m, [])
        sub.get(m).push(it)
      }
      for (const [m, list] of sub) out.push({ key: `${name}::${m}`, album: name, items: list })
    }

    return out.sort((a, b) => {
      const ra = repDate(a.items), rb = repDate(b.items)
      return ra < rb ? 1 : ra > rb ? -1 : 0
    })
  })()

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <header className="mb-8 text-center">
        <h1 className="mb-1">Gallery</h1>
        <p className="my-0 text-muted">Life in the PHI Lab</p>
      </header>

      {error && <p className="text-muted">Failed to load gallery. Please try again later.</p>}
      {!error && items === null && <p className="text-muted">Loading…</p>}
      {!error && items?.length === 0 && <p className="text-muted">No photos yet.</p>}

      {groups.map(({ key, album, items: arr }, gi) => {
        const images = arr.map((it) => ({ src: it.imageUrl, caption: it.caption }))
        return (
          <section key={key} className={gi === 0 ? '' : 'mt-12'}>
            <h2 className="mb-4 flex items-center gap-3">
              <span className="inline-block h-[20px] w-[4px] rounded-full bg-gold-600" aria-hidden="true" />
              <span className="text-brand-900">{album}</span>
              {albumDate(arr) && (
                <span className="text-muted text-[15px] font-normal">· {albumDate(arr)}</span>
              )}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {arr.map((it, i) => (
                <figure key={it.id} className="m-0">
                  <button
                    type="button"
                    onClick={() => setLightbox({ images, index: i })}
                    aria-label={it.caption ? `Enlarge: ${it.caption}` : 'Enlarge photo'}
                    className="block w-full cursor-zoom-in p-0 focus:outline-none focus:ring-1 focus:ring-ink"
                  >
                    <img
                      src={it.imageUrl}
                      alt={it.caption || ''}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full rounded-lg border border-rule object-cover transition-opacity hover:opacity-90"
                    />
                  </button>
                  {it.caption && (
                    <figcaption className="mt-1.5 line-clamp-2 text-[13px] text-meta">{it.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )
      })}

      <Lightbox state={lightbox} setState={setLightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
