import { Router } from "express";
import { db, reminders, insertReminderSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/reminders", async (req, res) => {
  try {
    const { clientId } = req.query;
    const rows = await db
      .select()
      .from(reminders)
      .where(clientId ? eq(reminders.clientId, String(clientId)) : undefined)
      .orderBy(reminders.dueAt);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/reminders", async (req, res) => {
  const parsed = insertReminderSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db.insert(reminders).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/reminders/:id", async (req, res) => {
  const parsed = insertReminderSchema.partial().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db
      .update(reminders)
      .set({ ...parsed.data, serverUpdatedAt: new Date() })
      .where(eq(reminders.id, req.params.id))
      .returning();
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/reminders/:id", async (req, res) => {
  try {
    await db.delete(reminders).where(eq(reminders.id, req.params.id));
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
