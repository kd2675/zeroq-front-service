# ZeroQ Service Web

ZeroQ 사용자용 고객 서비스 웹앱입니다. 공간 탐색, 점유 정보 확인, 리뷰 및 즐겨찾기 기능을 제공합니다.

## 연결되는 백엔드
- API Gateway: `http://localhost:8080` (cloud-back-server)

## 포트
- 개발 서버: `http://localhost:3001`

## 시작하기
```bash
npm install
npm run dev -- -p 3001
```

## 스크립트
- `npm run dev -- -p 3001` 개발 서버 실행 (3001)
- `npm run build` 프로덕션 빌드
- `npm run start` 프로덕션 서버 실행
- `npm run lint` ESLint 실행

## 환경 변수
로컬 개발 시 `.env.local`을 생성합니다.

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 참고
- API 요청은 Gateway(8080)를 통해 백엔드로 라우팅됩니다.
