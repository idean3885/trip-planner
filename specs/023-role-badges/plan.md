# Implementation Plan: 동행자 목록 주인+호스트 복수 뱃지

**Branch**: `023-role-badges` | **Date**: 2026-04-23 | **Spec**: [spec.md](./spec.md)

## Summary

`MemberList.tsx`의 `roleBadge`/`roleLabel` 단일 뱃지 렌더링을 복수 뱃지 렌더로 교체. `role === 'OWNER'` 멤버는 "주인" + "호스트" 두 뱃지를 주인 먼저로 병렬 표시. HOST/GUEST는 단일 유지.

## Coverage Targets

- `MemberList.tsx`의 뱃지 렌더 함수를 배열 반환으로 교체 [why: badge-list]
- 주인 2뱃지 렌더 단위 테스트 [why: test-coverage]

## Technical Context

**Language**: TypeScript, React 19 (server component). **Storage 변경 없음**. **신규 의존성 없음**.

## Constitution Check

모든 원칙 PASS (순수 UI 렌더링).

## Project Structure

```
src/components/MemberList.tsx            # 렌더 로직 교체
tests/components/MemberList.test.tsx     # 신규 — 역할별 뱃지 수 검증
```

## Phase 0 — Research

**Decision**: 기존 `roleBadge`/`roleLabel` 쌍을 `rolesFor(role)` 배열 반환 함수로 바꾸고 JSX에서 `rolesFor(m.role).map(...)` 순회. 데이터 모델 변경 없음.

## Phase 1 — Design

- 신규 엔티티 없음.
- 계약 없음 (순수 UI).
- quickstart: 자동 테스트(`tests/components/MemberList.test.tsx`)가 정본.

## Migration Strategy

해당 없음.

## Release Plan

- v2.10.0 (spec 022와 공동 마일스톤).
- Changes 단편: `changes/403.feat.md`.
- 롤백: 단일 파일 revert.
