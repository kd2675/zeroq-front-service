# zeroq-front-service

ZeroQ 일반 사용자용 Next.js 앱입니다. 로그인 사용자 기준으로 공간별 최신 센서 스냅샷을 홈에서 보여주며, 로그인/OAuth/세션 유지 흐름을 함께 제공합니다.

## 현재 라우트

- `/`
- `/login`
- `/auth/callback`

## 역할

- 일반 사용자 아이디 로그인/회원가입과 OAuth 진입점
- 세션 복구와 토큰 bootstrap
- Naver, Kakao OAuth 로그인 시작
- URL 토큰 없이 HttpOnly refresh cookie로 OAuth 로그인 완료
- 공간별 현재 혼잡도 조회(로그인 중 60초 간격 갱신)
- 혼잡도 검색·필터·정렬과 페이지 단위 추가 조회
- 사용자가 요청한 경우에만 현재 위치 기준 직선거리 정렬
- 전체/공간별 API 실패, 부분 센서 보고, 측정 공백을 구분한 복구 UI
- 설치형 웹 앱 메타데이터(`app/manifest.ts`)

## 실행

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
npm run verify:auth
npm run verify:space
```

## 포트

- dev: `3001`
- start: `3001`

## 환경 변수

`.env.local`

```bash
NEXT_PUBLIC_API_MODE=direct
NEXT_PUBLIC_ZEROQ_API_URL=http://localhost:20180
NEXT_PUBLIC_AUTH_API_URL=http://localhost:9000
NEXT_PUBLIC_CLIENT_ID=zeroq-front-service
```

Cloud Gateway/Eureka 경유로 실행할 때는 direct 전용 URL을 제거하고 다음처럼 전환합니다.

```bash
NEXT_PUBLIC_API_MODE=gateway
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 연동 포인트

- OAuth authorize:
  - `/oauth2/authorize/naver-zeroq-service`
  - `/oauth2/authorize/kakao-zeroq-service`
- Local auth:
  - `/auth/login`
  - `/api/users`
  - `/auth/refresh`
  - `/auth/logout`
- 공간/스냅샷 조회:
  - `/api/zeroq/v1/spaces`
  - `/api/zeroq/v1/space-sensors/spaces/{spaceId}/snapshot`
- 기본 실행 모드: `direct`
- ZeroQ API base: `NEXT_PUBLIC_ZEROQ_API_URL` 기본값 `http://localhost:20180`
- Auth/OAuth base: `NEXT_PUBLIC_AUTH_API_URL` 기본값 `http://localhost:9000`
- Gateway 모드: `NEXT_PUBLIC_API_MODE=gateway`, `NEXT_PUBLIC_API_URL=http://localhost:8080`

## 참고

- 홈 화면은 인증 상태일 때 공간별 센서 기반 혼잡도 정보를 카드로 렌더링합니다. 공간 목록은 12개씩 추가 조회하며 검색은 현재 불러온 목록에 적용됩니다.
- 기본 정렬은 신뢰 가능한 현재 점유율이 낮은 순입니다. 브라우저 위치 권한을 사용하면 API의 위·경도와 직선거리를 계산하며 위치는 서버로 전송하거나 저장하지 않습니다.
- `UNAVAILABLE`은 0%로 표시하지 않고, `PARTIAL`은 보고율과 함께 표시합니다. 스냅샷 실패는 다른 공간 결과를 유지한 채 해당 공간만 재시도할 수 있습니다.
- 보호 화면에서 로그인 또는 세션 만료로 이동할 때 검증된 `next` 내부 경로를 유지하고, 인증 완료 후 원래 화면으로 복귀합니다.
- `local-direct`는 로컬 개발 편의를 위한 모드입니다. ZeroQ 서버는 loopback에만 바인딩하고, 프론트가 access token claim에서 `X-User-*` 헤더를 구성하므로 외부에 노출하는 환경에서는 반드시 Gateway 모드를 사용합니다.
