import { Router } from "express";
import { db, clients, fridges, visits, reminders } from "@workspace/db";
import {
  insertClientSchema,
  insertFridgeSchema,
  insertVisitSchema,
  insertReminderSchema,
} from "@workspace/db";
import { gt, sql } from "drizzle-orm";

const router = Router();

router.post("/sync/push", async (req, res) => {
  const {
    clients: clientRecords = [],
    fridges: fridgeRecords = [],
    visits: visitRecords = [],
    reminders: reminderRecords = [],
  } = req.body as {
    clients?: unknown[];
    fridges?: unknown[];
    visits?: unknown[];
    reminders?: unknown[];
  };

  let synced = 0;
  const errors: string[] = [];

  const upsert = async <T extends { id: string }>(
    table: typeof clients | typeof fridges | typeof visits | typeof reminders,
    schema: typeof insertClientSchema | typeof insertFridgeSchema | typeof insertVisitSchema | typeof insertReminderSchema,
    records: unknown[],
  ) => {
    for (const raw of records) {
      const stripped = stripLocalFields(raw);
      const parsed = schema.safeParse(stripped);
      if (!parsed.success) {
        errors.push(`Validation failed for id=${(raw as any)?.id}: ${JSON.stringify(parsed.error.flatten())}`);
        continue;
      }
      try {
        await (db as any)
          .insert(table)
          .values(parsed.data)
          .onConflictDoUpdate({
            target: (table as any).id,
            set: { ...parsed.data, serverUpdatedAt: sql`now()` },
          });
        synced++;
      } catch (e) {
        errors.push(String(e));
      }
    }
  };

  await upsert(clients, insertClientSchema, clientRecords);
  await upsert(fridges, insertFridgeSchema, fridgeRecords);
  await upsert(visits, insertVisitSchema, visitRecords);
  await upsert(reminders, insertReminderSchema, reminderRecords);

  res.json({ ok: true, synced, errors });
});

router.get("/sync/pull", async (req, res) => {
  try {
    const sinceMs = req.query.since ? Number(req.query.since) : 0;
    const since = new Date(sinceMs);

    const [clientRows, fridgeRows, visitRows, reminderRows] = await Promise.all([
      db.select().from(clients).where(gt(clients.serverUpdatedAt, since)),
      db.select().from(fridges).where(gt(fridges.serverUpdatedAt, since)),
      db.select().from(visits).where(gt(visits.serverUpdatedAt, since)),
      db.select().from(reminders).where(gt(reminders.serverUpdatedAt, since)),
    ]);

    res.json({
      clients: clientRows,
      fridges: fridgeRows,
      visits: visitRows,
      reminders: reminderRows,
      pulledAt: Date.now(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

function stripLocalFields(record: unknown): unknown {
  if (!record || typeof record !== "object") return record;
  const { _dirty, serverUpdatedAt, ...rest } = record as Record<string, unknown>;
  void _dirty;
  void serverUpdatedAt;
  return rest;
}

export default router;
