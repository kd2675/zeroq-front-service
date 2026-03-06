# zeroq-front-service

ZeroQ 일반 사용자용 Next.js 앱입니다. 로그인 사용자 기준으로 공간별 센서 스냅샷(실시간 혼잡도)을 홈에서 보여주며, 로그인/OAuth/세션 유지 흐름을 함께 제공합니다.

## 현재 라우트

- `/`
- `/login`

## 역할

- 일반 사용자 로그인 진입점
- 세션 복구와 토큰 bootstrap
- Naver, Kakao OAuth 로그인 시작
- 공간별 실시간 혼잡도 카드 조회

## 실행

```bash
npm install
npm run dev
npm run build
npm run start
npm run lint
```

## 포트

- dev: `3001`
- start: `3001`

## 환경 변수

`.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 연동 포인트

- OAuth authorize:
  - `/oauth2/authorize/naver-zeroq-service`
  - `/oauth2/authorize/kakao-zeroq-service`
- 공간/스냅샷 조회:
  - `/api/zeroq/v1/spaces`
  - `/api/zeroq/v1/space-sensors/spaces/{spaceId}/snapshot`
- API base 기본값: `http://localhost:8080`

## 참고

- 홈 화면은 인증 상태일 때 공간별 센서 기반 혼잡도 정보를 카드로 렌더링합니다.
- 토큰 만료 시 `/login?expired=1` 흐름을 사용합니다.
