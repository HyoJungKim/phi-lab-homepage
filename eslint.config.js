import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // 빌드 산출물(dist·build)은 minify 된 번들이라 린트 대상에서 제외.
  globalIgnores(['dist', 'build']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // react-router 라우트 모듈은 컴포넌트와 함께 loader/links/meta 등 데이터 API 를
      // 같은 파일에서 export 하는 게 정석이므로 Fast Refresh 예외로 허용.
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: [
            'links', 'meta', 'loader', 'action', 'headers', 'handle',
            'shouldRevalidate', 'ErrorBoundary', 'HydrateFallback',
            'clientLoader', 'clientAction',
          ],
        },
      ],
      // mount/deps 변경 시 로딩 상태 표시를 위한 의도된 setState(데이터 로더 패턴).
      // 16곳이 동일 패턴이고 동기 setState 제거 리팩터는 admin CRUD 회귀 위험이 커,
      // 에러 대신 경고로 두어 가시성만 유지(정식 리팩터는 별도 과제).
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  // Node 실행 설정 파일: process 등 node 전역 허용.
  {
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
