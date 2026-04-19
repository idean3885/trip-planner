// TypeScript 6부터 임의 확장자(.css, .svg 등) side-effect import에 대한
// 모듈 선언을 명시적으로 요구. Next.js는 이를 webpack/turbopack에서
// 처리하지만 TS 6는 선언 없으면 TS2882로 차단한다.

declare module "*.css";
