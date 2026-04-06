import { Router } from "express";
import { db, visits, insertVisitSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/visits", async (req, res) => {
  try {
    const { clientId } = req.query;
    const rows = await db
      .select()
      .from(visits)
      .where(clientId ? eq(visits.clientId, String(clientId)) : undefined)
      .orderBy(visits.startedAt);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/visits", async (req, res) => {
  const parsed = insertVisitSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db.insert(visits).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/visits/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(visits).where(eq(visits.id, req.params.id));
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/visits/:id", async (req, res) => {
  const parsed = insertVisitSchema.partial().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db
      .update(visits)
      .set({ ...parsed.data, serverUpdatedAt: new Date() })
      .where(eq(visits.id, req.params.id))
      .returning();
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
