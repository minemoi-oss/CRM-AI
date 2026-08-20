from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import RLock
from time import monotonic
from typing import Any

from app.core.config import settings


class CopilotProposalNotFoundError(RuntimeError):
    pass


@dataclass
class _MemoryMessage:
    role: str
    content: str
    page: str
    entity_type: str | None
    entity_id: int | None
    created_at: datetime


@dataclass
class _StoredProposal:
    payload: dict[str, Any]
    confirmed_at: datetime | None = None


@dataclass
class _SessionMemory:
    messages: list[_MemoryMessage] = field(default_factory=list)
    proposals: OrderedDict[str, _StoredProposal] = field(default_factory=OrderedDict)
    last_access: float = field(default_factory=monotonic)


class CopilotMemoryStore:
    """Process-local, bounded memory tied to a revocable auth session id."""

    def __init__(self):
        self._sessions: OrderedDict[str, _SessionMemory] = OrderedDict()
        self._lock = RLock()

    @property
    def _ttl_seconds(self) -> int:
        return settings.AI_COPILOT_MEMORY_TTL_MINUTES * 60

    def _purge_locked(self, now: float) -> None:
        expired = [
            session_id
            for session_id, memory in self._sessions.items()
            if now - memory.last_access >= self._ttl_seconds
        ]
        for session_id in expired:
            self._sessions.pop(session_id, None)
        while len(self._sessions) > settings.AI_COPILOT_MAX_SESSIONS:
            self._sessions.popitem(last=False)

    def _get_locked(self, session_id: str, *, create: bool) -> _SessionMemory | None:
        now = monotonic()
        self._purge_locked(now)
        memory = self._sessions.get(session_id)
        if memory is None and create:
            while len(self._sessions) >= settings.AI_COPILOT_MAX_SESSIONS:
                self._sessions.popitem(last=False)
            memory = _SessionMemory(last_access=now)
            self._sessions[session_id] = memory
        if memory is not None:
            memory.last_access = now
            self._sessions.move_to_end(session_id)
        return memory

    def append_turn(
        self,
        session_id: str,
        *,
        page: str,
        user_content: str,
        assistant_content: str,
        active_entity: dict[str, Any] | None,
    ) -> None:
        maximum_chars = settings.AI_COPILOT_MEMORY_MESSAGE_CHARS
        created_at = datetime.now(timezone.utc)
        entity_type = str(active_entity["type"]) if active_entity else None
        entity_id = int(active_entity["id"]) if active_entity else None
        with self._lock:
            memory = self._get_locked(session_id, create=True)
            assert memory is not None
            memory.messages.extend(
                [
                    _MemoryMessage(
                        role="user",
                        content=user_content[:maximum_chars],
                        page=page,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        created_at=created_at,
                    ),
                    _MemoryMessage(
                        role="assistant",
                        content=assistant_content[:maximum_chars],
                        page=page,
                        entity_type=entity_type,
                        entity_id=entity_id,
                        created_at=created_at,
                    ),
                ]
            )
            maximum_messages = settings.AI_COPILOT_MAX_TURNS * 2
            if len(memory.messages) > maximum_messages:
                memory.messages = memory.messages[-maximum_messages:]

    def history(self, session_id: str) -> list[dict[str, Any]]:
        with self._lock:
            memory = self._get_locked(session_id, create=False)
            if memory is None:
                return []
            return [
                {
                    "role": item.role,
                    "content": item.content,
                    "page": item.page,
                    "entity_type": item.entity_type,
                    "entity_id": item.entity_id,
                    "created_at": item.created_at,
                }
                for item in memory.messages
            ]

    def context_messages(
        self,
        session_id: str,
        *,
        page: str,
        active_entity: dict[str, Any] | None,
    ) -> list[dict[str, str]]:
        entity_type = str(active_entity["type"]) if active_entity else None
        entity_id = int(active_entity["id"]) if active_entity else None
        return [
            {
                "role": item["role"],
                "content": item["content"],
                "page": item["page"],
            }
            for item in self.history(session_id)
            if item["page"] == page
            and item["entity_type"] == entity_type
            and item["entity_id"] == entity_id
        ]

    def remember_proposals(
        self,
        session_id: str,
        proposals: list[dict[str, Any]],
    ) -> None:
        if not proposals:
            return
        with self._lock:
            memory = self._get_locked(session_id, create=True)
            assert memory is not None
            for proposal in proposals:
                proposal_id = str(proposal["proposal_id"])
                memory.proposals[proposal_id] = _StoredProposal(payload=dict(proposal))
                memory.proposals.move_to_end(proposal_id)
            while len(memory.proposals) > 20:
                memory.proposals.popitem(last=False)

    def confirm_proposal(self, session_id: str, proposal_id: str) -> dict[str, Any]:
        with self._lock:
            memory = self._get_locked(session_id, create=False)
            stored = memory.proposals.get(proposal_id) if memory is not None else None
            if stored is None:
                raise CopilotProposalNotFoundError("Proposition introuvable ou expirée.")
            stored.confirmed_at = datetime.now(timezone.utc)
            return dict(stored.payload)

    def info(self, session_id: str) -> dict[str, int]:
        with self._lock:
            memory = self._get_locked(session_id, create=False)
            if memory is None:
                return {
                    "turns": 0,
                    "max_turns": settings.AI_COPILOT_MAX_TURNS,
                    "expires_in_seconds": self._ttl_seconds,
                }
            elapsed = max(0, int(monotonic() - memory.last_access))
            return {
                "turns": len(memory.messages) // 2,
                "max_turns": settings.AI_COPILOT_MAX_TURNS,
                "expires_in_seconds": max(0, self._ttl_seconds - elapsed),
            }

    def clear_session(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)

    def clear_all_for_tests(self) -> None:
        with self._lock:
            self._sessions.clear()


copilot_memory = CopilotMemoryStore()
