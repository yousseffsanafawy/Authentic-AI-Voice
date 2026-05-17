import asyncio
import sys
sys.path.insert(0, '.')

async def main():
    from app.database import engine
    from sqlalchemy import text
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT column_name FROM information_schema.columns WHERE table_name='writing_samples' ORDER BY ordinal_position")
        )
        cols = [r[0] for r in result.fetchall()]
        print("COLUMNS:", cols)
        has_updated_at = "updated_at" in cols
        print("updated_at present:", has_updated_at)
        # Also check indexes
        idx_result = await conn.execute(
            text("SELECT indexname FROM pg_indexes WHERE tablename='writing_samples'")
        )
        indexes = [r[0] for r in idx_result.fetchall()]
        print("INDEXES:", indexes)

asyncio.run(main())
