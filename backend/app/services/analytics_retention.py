"""Retention at startup and Vietnam midnight while the API process is running.

No schema changes. Each cleanup uses its own connection and BEGIN IMMEDIATE.
If a scheduled cleanup fails, log it and retry in one minute.
"""
import asyncio
import logging
from contextlib import closing
from datetime import timedelta

from app.db.connection import connect
from app.services import analytics_service as svc

logger = logging.getLogger(__name__)


def seconds_until_midnight(now):
    local = now.astimezone(svc.VN_TZ)
    tomorrow = local.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    return (tomorrow - local).total_seconds()


def cleanup_database(database, now=None):
    with closing(connect(database)) as conn:
        result = svc.cleanup_expired(conn, now)
    logger.info("Analytics retention completed: %s", result)
    return result


async def retention_loop(database, *, sleep=asyncio.sleep, clock=svc.utcnow):
    # The startup cleanup has already succeeded before this loop is started.
    delay = seconds_until_midnight(clock())
    while True:
        await sleep(delay)
        try:
            await asyncio.to_thread(cleanup_database, database, clock())
        except Exception:
            logger.exception("Analytics retention failed; retrying in 60 seconds")
            delay = 60
        else:
            delay = seconds_until_midnight(clock())
