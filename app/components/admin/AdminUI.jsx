/* eslint-disable react-refresh/only-export-components -- 공유 admin UI 모듈(컴포넌트+훅 혼합), Fast Refresh 대상 아님 */
import { useState } from 'react'

// 공통 admin 페이지 헤더
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>{title}</h1>
        {subtitle && <div style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.25rem' }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '0.5rem' }}>{actions}</div>}
    </div>
  )
}

export function Button({ children, primary, danger, ...rest }) {
  const bg = danger ? '#c33' : primary ? '#222' : '#fff'
  const color = danger || primary ? '#fff' : '#222'
  const border = danger ? '#a22' : primary ? '#000' : '#ccc'
  return (
    <button
      {...rest}
      style={{
        padding: '0.4rem 0.8rem',
        background: bg, color, border: `1px solid ${border}`,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        opacity: rest.disabled ? 0.45 : 1,
        fontSize: '0.85rem',
        ...rest.style,
      }}
    >
      {children}
    </button>
  )
}

// 행 단위 삭제/회수 같은 파괴적 액션을 '삭제 모드' 토글 뒤에 가두기 위한 훅.
// 반환: [deleteMode 불리언, 헤더에 끼워넣을 토글 UI]
export function useDeleteMode() {
  const [deleteMode, setDeleteMode] = useState(false)
  const toggle = (
    <Button
      danger={deleteMode}
      onClick={() => setDeleteMode(v => !v)}
      title={deleteMode ? '삭제 버튼이 활성화된 상태입니다. 다시 누르면 잠금.' : '삭제 버튼을 활성화하려면 클릭'}
    >
      {deleteMode ? '삭제 모드 OFF' : '삭제 모드 ON'}
    </Button>
  )
  return [deleteMode, toggle]
}

// onRowClick 을 주면 행 전체가 클릭 영역이 된다. 행 안의 버튼/링크/입력 클릭은
// 행 클릭으로 번지지 않게 무시한다(편집·삭제 버튼과 충돌 방지).
export function Table({ columns, rows, empty = '데이터 없음', onRowClick }) {
  if (!rows?.length) return <div style={{ color: '#777', padding: '1rem 0' }}>{empty}</div>
  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            {columns.map(c => (
              <th key={c.key} style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid #ccc', fontWeight: 600 }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id ?? r.email ?? r.token ?? i}
              style={{ borderBottom: '1px solid #eee', background: i % 2 ? '#fafafa' : '#fff', cursor: onRowClick ? 'pointer' : undefined }}
              onClick={onRowClick ? (e) => {
                if (e.target.closest('button, a, input, select, textarea, label')) return
                onRowClick(r)
              } : undefined}
            >
              {columns.map(c => (
                <td key={c.key} style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                  {c.render ? c.render(r) : r[c.key] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// width: 모달 본문 너비(px). 글쓰기처럼 넓어야 편한 모달은 크게 지정 —
// 화면이 좁으면 94vw 로 자동 축소된다.
// headerActions: 헤더 우측에 둘 버튼들. 주면 × 닫기 대신 이게 들어가고,
//   헤더가 sticky 라 본문이 길어도 항상 보인다(미리보기의 편집/닫기 용).
// fixedHeight: true 면 본문 길이와 무관하게 항상 86vh 고정(News/Posts 모달
//   처럼 보기/편집 전환·짧은 글에서도 크기가 일관되게).
export function Modal({ open, onClose, title, children, footer, width, headerActions, fixedHeight }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, paddingTop: '3rem' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: width ? `min(${width}px, 94vw)` : undefined, minWidth: 480, maxWidth: '94vw', height: fixedHeight ? '86vh' : undefined, maxHeight: '86vh', overflow: 'auto', padding: '1.25rem', borderRadius: 4 }}>
        <div style={{ position: 'sticky', top: '-1.25rem', background: '#fff', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', borderBottom: '1px solid #eee', margin: '-1.25rem -1.25rem 0.75rem', padding: '1.1rem 1.25rem 0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h2>
          {headerActions
            ? <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>{headerActions}</div>
            : <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#666' }}>×</button>}
        </div>
        <div>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #eee' }}>{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, hint, children, required }) {
  return (
    <label style={{ display: 'block', marginBottom: '0.6rem' }}>
      <span style={{ display: 'block', fontSize: '0.8rem', color: '#444', marginBottom: '0.2rem' }}>
        {label}{required && <span style={{ color: '#c33', marginLeft: 2 }} title="필수 입력">*</span>}
      </span>
      {children}
      {hint && <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.2rem' }}>{hint}</div>}
    </label>
  )
}

export function TextInput(props) {
  return (
    <input
      {...props}
      style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1px solid #ccc', fontSize: '0.875rem', ...(props.style || {}) }}
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1px solid #ccc', fontSize: '0.875rem', fontFamily: 'inherit', minHeight: 80, ...(props.style || {}) }}
    />
  )
}

export function Select({ options, ...rest }) {
  return (
    <select
      {...rest}
      style={{ width: '100%', padding: '0.4rem 0.5rem', border: '1px solid #ccc', fontSize: '0.875rem', background: '#fff', ...(rest.style || {}) }}
    >
      {options.map(o =>
        typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  )
}

export function ErrorBanner({ error }) {
  if (!error) return null
  return (
    <div style={{ background: '#fee', border: '1px solid #fcc', color: '#900', padding: '0.5rem 0.75rem', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
      {typeof error === 'string' ? error : error.message || JSON.stringify(error)}
    </div>
  )
}

// "yes/no" 컨펌 모달용 hook
export function useConfirm() {
  const [state, setState] = useState(null)
  const ask = (message) => new Promise((resolve) => setState({ message, resolve }))
  const ui = state ? (
    <Modal
      open
      onClose={() => { state.resolve(false); setState(null) }}
      title="확인"
      footer={
        <>
          <Button onClick={() => { state.resolve(false); setState(null) }}>취소</Button>
          <Button danger onClick={() => { state.resolve(true); setState(null) }}>확인</Button>
        </>
      }
    >
      <div>{state.message}</div>
    </Modal>
  ) : null
  return [ask, ui]
}
