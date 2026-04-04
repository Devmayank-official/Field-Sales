import { db } from '../db/dexieDb';
import type { Fridge, InsertFridge } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

export const fridgeRepo = {
  getAll: async () => await db.fridges.toArray(),
  getByClientId: async (clientId: string) => await db.fridges.where('clientId').equals(clientId).toArray(),
  getById: async (id: string) => await db.fridges.get(id),
  
  create: async (data: InsertFridge) => {
    const newFridge: Fridge = {
      id: uuidv4(),
      ...data,
      installationDate: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.fridges.add(newFridge);
    return newFridge;
  },

  update: async (id: string, data: Partial<InsertFridge>) => {
    await db.fridges.update(id, { ...data, updatedAt: Date.now() });
    return await db.fridges.get(id);
  },

  delete: async (id: string) => {
    await db.fridges.delete(id);
  }
};
