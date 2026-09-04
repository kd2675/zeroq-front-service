# zeroq-front-service

ZeroQ 일반 사용자용 Next.js 앱입니다. 로그인 사용자가 지도와 목록에서 운영 확인 공간의 최신 센서 혼잡도를 탐색하고, 공간 상세·저장·리뷰·프로필·기기 설정을 이어서 사용할 수 있습니다.

## 현재 라우트

- `/`
- `/login`
- `/auth/callback`
- `/saved`
- `/profile`
- `/spaces/{spaceId}`

## 역할

- 일반 사용자 아이디 로그인/회원가입과 OAuth 진입점
- 세션 복구와 토큰 bootstrap
- Naver, Kakao OAuth 로그인 시작
- URL 토큰 없이 HttpOnly refresh cookie로 OAuth 로그인 완료
- 현재 위치 또는 등록 좌표를 기준으로 한 지도·목록 탐색
- 공간별 현재 혼잡도 조회(기본 60초 간격 갱신, 기기 설정에서 해제 가능)
- 혼잡도 검색·필터·정렬과 페이지 단위 추가 조회
- 사용자가 요청한 경우에만 현재 위치 기준 직선거리 정렬
- 서버 즐겨찾기 저장·해제와 저장 공간 현황 조회
- 공간 상세, 최신 리뷰 조회와 리뷰 작성
- 프로필 요약·최근 활동과 브라우저 단위 표시 설정
- 전체/공간별 API 실패, 부분 센서 보고, 측정 공백을 구분한 복구 UI
- 설치형 웹 앱 메타데이터(`app/manifest.ts`)

## 상태 및 통신 구조

- Redux Toolkit + React Redux: 검색어·필터·정렬·선택 공간·현재 위치와 기기 환경설정처럼 앱 내부에서 공유되는 변경 상태
- TanStack React Query: 공간, 스냅샷, 즐겨찾기, 프로필, 리뷰 등 서버 데이터의 캐시·재조회·mutation 무효화
- Axios: ZeroQ/Auth HTTP 전송, 15초 timeout, 공통 응답 envelope와 network 오류 정규화
- Motion: 지도/목록/카드의 의미 있는 진입·상태 전환. 운영체제의 `prefers-reduced-motion` 설정을 따름
- 네이버 지도 JavaScript API 직접 연동: 별도 지도 npm 패키지 없이 공간 좌표, 혼잡도 마커, 사용자가 요청한 현재 위치 표시

## UX 참고 기준

- [네이버지도](https://www.navercorp.com/service/map)의 장소 탐색·저장 흐름
- [카카오맵](https://www.kakaocorp.com/page/service/service/KakaoMap?lang=ko)의 주변 장소 중심 탐색
- [Google Maps Explore](https://support.google.com/maps/answer/10014587)의 현재 위치 기반 탐색과 [You 탭](https://support.google.com/maps/answer/9948049)의 저장 장소 분리
- [Apple Maps](https://www.apple.com/maps/)의 지도 위 장소 배지와 계정 영역의 즐겨찾기·설정 접근

상용 앱의 정보 구조를 참고하되 화면을 복제하지 않습니다. ZeroQ는 추천·길찾기 데이터가 없으므로 해당 기능을 가장하지 않고, 지도와 목록에서 센서 혼잡도의 신뢰 상태를 먼저 비교하는 데 집중합니다.

## 실행

```bash
npm ci
npm run dev
npm run build
npm run start
npm run lint
npm run verify:auth
npm run verify:space
npm run security:check
npm run security:audit
npm run security:signatures
```

Node.js 22.22.2 이상 또는 24.20.0 이상의 LTS 라인과 `package-lock.json`에 고정된 버전을 기준으로 실행합니다. 기본 개발 버전은 `.nvmrc`의 Node.js 22.22.2와 npm 10.9.7입니다. 일반 개발·CI 설치는 잠금 파일을 바꾸지 않는 `npm ci`를 사용하고, 의존성을 의도적으로 추가하거나 갱신할 때만 `npm install <package>@<version>`을 사용합니다. 프로젝트 `.npmrc`는 공급망 위험을 줄이기 위해 의존성 lifecycle script 실행을 기본 차단하며, 새 패키지는 정확한 버전으로 저장하고 peer dependency 충돌을 실패 처리합니다.

`security:check`는 직접 의존성 버전 고정, 잠금 파일의 registry 출처와 무결성 해시, lifecycle script 차단 설정, OSV의 알려진 취약점, npm registry 서명을 차례로 확인합니다. `security:audit`는 npm advisory endpoint를 별도로 확인하므로 네트워크 장애 시 실패할 수 있으며, 자동 수정이 필요해도 `npm audit fix --force`를 바로 실행하지 않고 변경 버전과 빌드를 검토합니다.

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

# 네이버 클라우드 Maps에서 Dynamic Map을 활성화하고 웹 서비스 URL을 등록합니다.
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=your_ncp_key_id
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
  - `/api/zeroq/v1/spaces/{spaceId}`
  - `/api/zeroq/v1/space-sensors/spaces/{spaceId}/snapshot`
- 사용자 기능:
  - `/api/zeroq/v1/favorites`
  - `/api/zeroq/v1/favorites/{spaceId}`
  - `/api/zeroq/v1/profile/summary`
  - `/api/zeroq/v1/reviews/spaces/{spaceId}`
  - `/api/zeroq/v1/reviews/profiles/{profileId}`
- 기본 실행 모드: `direct`
- ZeroQ API base: `NEXT_PUBLIC_ZEROQ_API_URL` 기본값 `http://localhost:20180`
- Auth/OAuth base: `NEXT_PUBLIC_AUTH_API_URL` 기본값 `http://localhost:9000`
- Gateway 모드: `NEXT_PUBLIC_API_MODE=gateway`, `NEXT_PUBLIC_API_URL=http://localhost:8080`
- 로컬 OAuth는 제공자에 등록된 origin과 동일한 `http://localhost:3001`로 접속합니다. `http://127.0.0.1:3001`은 별도 origin이므로 등록되지 않았다면 네이버 로그인에서 차단됩니다.

## 참고

- 홈 화면은 인증 상태일 때 공간별 센서 기반 혼잡도 마커와 목록을 함께 렌더링합니다. 공간 목록은 12개씩 추가 조회하며 검색은 현재 불러온 운영 확인 목록에 적용됩니다. 백엔드 `/spaces/search`가 아직 `verified=true`를 보장하지 않으므로 일반 사용자 검색에는 연결하지 않습니다.
- 기본 정렬은 신뢰 가능한 현재 점유율이 낮은 순입니다. 브라우저 위치 권한을 사용하면 API의 위·경도와 직선거리를 계산하며 위치는 서버로 전송하거나 저장하지 않습니다.
- `UNAVAILABLE`은 0%로 표시하지 않고, `PARTIAL`은 보고율과 함께 표시합니다. 스냅샷 실패는 다른 공간 결과를 유지한 채 해당 공간만 재시도할 수 있습니다.
- 보호 화면에서 로그인 또는 세션 만료로 이동할 때 검증된 `next` 내부 경로를 유지하고, 인증 완료 후 원래 화면으로 복귀합니다.
- `local-direct`는 로컬 개발 편의를 위한 모드입니다. ZeroQ 서버는 loopback에만 바인딩하고, 프론트가 access token claim에서 `X-User-*` 헤더를 구성하므로 외부에 노출하는 환경에서는 반드시 Gateway 모드를 사용합니다.
- `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`가 있으면 네이버 지도 JavaScript API를 직접 로드합니다. 네이버 클라우드 Maps 애플리케이션에서 Dynamic Map과 실제 웹 서비스 URL을 등록해야 하며, 키가 없거나 SDK 로드에 실패하면 좌표 목록과 외부 지도 열기 동선을 제공합니다.
- 위치는 사용자가 지도 버튼을 누를 때만 브라우저 Geolocation으로 요청하며 Redux 메모리에만 보관합니다. 서버 전송, 위치 이력, 경로 거리·이동시간 예측은 구현하지 않습니다.
- 프로필 수정 API는 현재 백엔드에 없으므로 이름·소개 편집 UI를 제공하지 않습니다. 자동 갱신과 모바일 첫 화면 설정만 현재 브라우저에 저장합니다.
