import { db } from "../db/dexieDb";
import type { Visit } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export const visitRepo = {
  getAll: async () => db.visits.reverse().sortBy("startedAt"),
  getByClientId: async (clientId: string) =>
    db.visits.where("clientId").equals(clientId).reverse().sortBy("startedAt"),
  getActiveVisits: async () => db.visits.where("status").equals("active").toArray(),
  getById: async (id: string) => db.visits.get(id),

  startVisit: async (clientId: string, lat?: number, lng?: number) => {
    const newVisit: Visit = {
      id: uuidv4(),
      clientId,
      startedAt: Date.now(),
      status: "active",
      fridgesChecked: [],
      locationLat: lat,
      locationLng: lng,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      _dirty: true,
    };
    await db.visits.add(newVisit);
    return newVisit;
  },

  updateVisit: async (id: string, data: Partial<Visit>) => {
    await db.visits.update(id, { ...data, updatedAt: Date.now(), _dirty: true });
    return db.visits.get(id);
  },

  endVisit: async (
    id: string,
    notes?: string,
    followUpOutcome?: string,
    locationNote?: string,
    fridgesChecked: string[] = []
  ) => {
    const now = Date.now();
    await db.transaction("rw", db.visits, db.clients, db.fridges, async () => {
      const visit = await db.visits.get(id);
      if (!visit) throw new Error("Visit not found");

      await db.visits.update(id, {
        status: "completed",
        endedAt: now,
        notes: notes ?? visit.notes,
        followUpOutcome: followUpOutcome ?? visit.followUpOutcome,
        locationNote: locationNote ?? visit.locationNote,
        fridgesChecked,
        updatedAt: now,
        _dirty: true,
      });

      await db.clients.update(visit.clientId, { lastVisitAt: now, updatedAt: now, _dirty: true });

      for (const fridgeId of fridgesChecked) {
        await db.fridges.update(fridgeId, { lastCheckedAt: now, updatedAt: now, _dirty: true });
      }
    });
    return db.visits.get(id);
  },
};
