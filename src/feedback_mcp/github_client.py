import logging
import os
import platform
import subprocess
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("feedback-mcp-server")

KEYCHAIN_SERVICE = "trip-planner"
KEYCHAIN_ACCOUNT = "github-pat"
GRAPHQL_ENDPOINT = "https://api.github.com/graphql"
DEFAULT_OWNER = "idean3885"
DEFAULT_REPO = "trip-planner"


def _read_keychain() -> Optional[str]:
    """macOS 키체인에서 GitHub PAT를 읽는다. 실패 시 None 반환."""
    if platform.system() != "Darwin":
        return None
    try:
        result = subprocess.run(
            ["/usr/bin/security", "find-generic-password",
             "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


# 키체인 → 환경변수 순서로 토큰 로드
GITHUB_TOKEN = _read_keychain() or os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")


def _get_token() -> Optional[str]:
    """런타임에 토큰을 재확인한다 (Claude Desktop env 블록 지원)."""
    return GITHUB_TOKEN or os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")


async def _graphql(query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """GitHub GraphQL API 호출."""
    token = _get_token()
    if not token:
        return {"error": "GitHub 토큰이 설정되지 않았습니다. install.sh를 다시 실행하여 GitHub PAT를 입력하세요."}

    headers = {
        "Authorization": f"bearer {token}",
        "Content-Type": "application/json",
    }
    payload: Dict[str, Any] = {"query": query}
    if variables:
        payload["variables"] = variables

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                GRAPHQL_ENDPOINT, json=payload, headers=headers, timeout=30.0,
            )
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                error_msg = "; ".join(e.get("message", "") for e in data["errors"])
                logger.error(f"GraphQL error: {error_msg}")
                return {"error": error_msg}
            return data
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                return {"error": "GitHub 토큰이 만료되었거나 유효하지 않습니다. install.sh를 다시 실행하여 새 토큰을 입력하세요."}
            logger.error(f"GitHub API error: {e}")
            return {"error": str(e)}
        except Exception as e:
            logger.error(f"GitHub API request failed: {e}")
            return {"error": str(e)}


async def get_repo_id(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> Optional[str]:
    """레포지토리의 GraphQL Node ID를 가져온다."""
    query = """
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
      }
    }
    """
    result = await _graphql(query, {"owner": owner, "repo": repo})
    if "error" in result:
        return None
    return result.get("data", {}).get("repository", {}).get("id")


async def list_discussion_categories(
    owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO,
) -> List[Dict[str, str]]:
    """디스커션 카테고리 목록을 가져온다."""
    query = """
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        discussionCategories(first: 25) {
          nodes {
            id
            name
            emoji
            description
          }
        }
      }
    }
    """
    result = await _graphql(query, {"owner": owner, "repo": repo})
    if "error" in result:
        return [{"error": result["error"]}]
    nodes = (result.get("data", {}).get("repository", {})
             .get("discussionCategories", {}).get("nodes", []))
    return nodes


async def create_discussion(
    title: str,
    body: str,
    category_id: str,
    owner: str = DEFAULT_OWNER,
    repo: str = DEFAULT_REPO,
) -> Dict[str, Any]:
    """새 디스커션을 생성한다."""
    repo_id = await get_repo_id(owner, repo)
    if not repo_id:
        return {"error": "레포지토리를 찾을 수 없거나 접근 권한이 없습니다."}

    mutation = """
    mutation($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {
        repositoryId: $repoId,
        categoryId: $categoryId,
        title: $title,
        body: $body
      }) {
        discussion {
          number
          title
          url
        }
      }
    }
    """
    result = await _graphql(mutation, {
        "repoId": repo_id,
        "categoryId": category_id,
        "title": title,
        "body": body,
    })
    if "error" in result:
        return result
    discussion = (result.get("data", {}).get("createDiscussion", {})
                  .get("discussion", {}))
    return discussion


async def list_discussions(
    owner: str = DEFAULT_OWNER,
    repo: str = DEFAULT_REPO,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    """최근 디스커션 목록을 가져온다."""
    query = """
    query($owner: String!, $repo: String!, $limit: Int!) {
      repository(owner: $owner, name: $repo) {
        discussions(first: $limit, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            number
            title
            url
            createdAt
            author { login }
            category { name }
          }
        }
      }
    }
    """
    result = await _graphql(query, {"owner": owner, "repo": repo, "limit": limit})
    if "error" in result:
        return [{"error": result["error"]}]
    nodes = (result.get("data", {}).get("repository", {})
             .get("discussions", {}).get("nodes", []))
    return nodes
