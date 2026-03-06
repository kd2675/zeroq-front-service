# zeroq-front-service

ZeroQ 일반 사용자용 Next.js 앱입니다. 현재 구현은 도메인 기능 화면보다 로그인과 세션 유지 흐름에 더 가깝습니다.

## 현재 라우트

- `/`
- `/login`

## 역할

- 일반 사용자 로그인 진입점
- 세션 복구와 토큰 bootstrap
- Naver, Kakao OAuth 로그인 시작

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
- API base 기본값: `http://localhost:8080`

## 참고

- 홈 화면은 아직 ZeroQ 제품 화면이라기보다 로그인 상태를 보여주는 경량 셸입니다.
- 토큰 만료 시 `/login?expired=1` 흐름을 사용합니다.
