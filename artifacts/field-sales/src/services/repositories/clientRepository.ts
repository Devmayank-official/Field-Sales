import { db } from '../db/dexieDb';
import type { Client, InsertClient } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const clientRepo = {
  getAll: async () => await db.clients.orderBy('name').toArray(),
  getById: async (id: string) => await db.clients.get(id),
  
  create: async (data: InsertClient) => {
    const newClient: Client = {
      id: uuidv4(),
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.clients.add(newClient);
    return newClient;
  },

  update: async (id: string, data: Partial<InsertClient>) => {
    await db.clients.update(id, { ...data, updatedAt: Date.now() });
    return await db.clients.get(id);
  },

  delete: async (id: string) => {
    await db.transaction('rw', db.clients, db.fridges, db.visits, async () => {
      await db.clients.delete(id);
      // Cascading delete for related entities
      await db.fridges.where('clientId').equals(id).delete();
      await db.visits.where('clientId').equals(id).delete();
    });
  }
};
