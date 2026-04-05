import { Router } from "express";
import { db, clients, insertClientSchema } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";

const router = Router();

router.get("/clients", async (req, res) => {
  try {
    const { status, isArchived, search } = req.query;
    const conditions: SQL[] = [];
    if (status) conditions.push(eq(clients.status, status as "Lead" | "Contacted" | "Active" | "High Value" | "Inactive"));
    if (isArchived !== undefined) conditions.push(eq(clients.isArchived, isArchived === "true"));
    if (search) conditions.push(ilike(clients.name, `%${search}%`));

    const rows = await db
      .select()
      .from(clients)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(clients.name);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/clients", async (req, res) => {
  const parsed = insertClientSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db.insert(clients).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/clients/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(clients).where(eq(clients.id, req.params.id));
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/clients/:id", async (req, res) => {
  const parsed = insertClientSchema.partial().safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.flatten() });
  try {
    const [row] = await db
      .update(clients)
      .set({ ...parsed.data, serverUpdatedAt: new Date() })
      .where(eq(clients.id, req.params.id))
      .returning();
    if (!row) return void res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/clients/:id", async (req, res) => {
  try {
    await db.delete(clients).where(eq(clients.id, req.params.id));
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
