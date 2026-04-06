import { Router } from "express";
import { db, fridges, insertFridgeSchema } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/fridges", async (req, res) => {
  try {
    const { clientId } = req.query;
    const rows = await db
      .select()
      .from(fridges)
      .where(clientId ? eq(fridges.clientId, String(clientId)) : undefined)
      .orderBy(fridges.serialNo);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/fridges", async (req, res) => {
  const parsed = insertFridgeSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db.insert(fridges).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/fridges/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(fridges).where(eq(fridges.id, req.params.id));
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/fridges/:id", async (req, res) => {
  const parsed = insertFridgeSchema.partial().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db
      .update(fridges)
      .set({ ...parsed.data, serverUpdatedAt: new Date() })
      .where(eq(fridges.id, req.params.id))
      .returning();
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/fridges/:id", async (req, res) => {
  try {
    await db.delete(fridges).where(eq(fridges.id, req.params.id));
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
