import Dexie, { Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import type { Client, Fridge, Visit, AppImage, Reminder } from "@/lib/schema";

export class FieldSalesDB extends Dexie {
  clients!: Table<Client, string>;
  fridges!: Table<Fridge, string>;
  visits!: Table<Visit, string>;
  images!: Table<AppImage, string>;
  reminders!: Table<Reminder, string>;

  constructor() {
    super("FieldSalesDB");
    this.version(1).stores({
      clients: "id, name, status, lastVisitAt",
      fridges: "id, clientId, condition, serialNo",
      visits: "id, clientId, status, startedAt",
    });
    this.version(2)
      .stores({
        clients: "id, name, status, lastVisitAt",
        fridges: "id, clientId, condition, serialNo, gccCode",
        visits: "id, clientId, status, startedAt",
        images: "id, entityType, entityId, createdAt",
      })
      .upgrade((tx) => {
        return tx.table("fridges").toCollection().modify((f) => {
          if (!f.gccCode) f.gccCode = "";
        });
      });
    this.version(3)
      .stores({
        clients: "id, name, status, lastVisitAt, isArchived",
        fridges: "id, clientId, condition, serialNo, gccCode",
        visits: "id, clientId, status, startedAt",
        images: "id, entityType, entityId, createdAt",
        reminders: "id, dueAt, clientId, isCompleted",
      })
      .upgrade((tx) => {
        return tx.table("clients").toCollection().modify((c) => {
          if (c.isArchived === undefined) c.isArchived = false;
        });
      });
  }
}

export const db = new FieldSalesDB();

export async function seedDatabase() {
  if (!import.meta.env.DEV) return;

  const clientCount = await db.clients.count();
  if (clientCount > 0) return;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const clients: Client[] = [
    {
      id: uuidv4(),
      name: "Sunrise Supermarket",
      phone: "+1 555-0101",
      email: "sunrise@shop.com",
      address: "123 Main St",
      pincode: "10001",
      shopType: "Supermarket",
      status: "High Value",
      tags: ["Volume", "Priority"],
      colorLabel: "green",
      isArchived: false,
      notes: "Key account. Pays on time. Prefers morning visits.",
      visitFrequency: 7,
      monthlyValueEstimate: 4500,
      createdAt: now - 30 * dayMs,
      updatedAt: now,
      lastVisitAt: now - 8 * dayMs,
    },
    {
      id: uuidv4(),
      name: "Downtown Deli",
      phone: "+1 555-0202",
      email: "deli@downtown.com",
      address: "456 Market Ave",
      pincode: "10002",
      shopType: "Convenience",
      status: "Active",
      tags: ["Corner Store"],
      colorLabel: "blue",
      isArchived: false,
      visitFrequency: 14,
      monthlyValueEstimate: 1200,
      createdAt: now - 20 * dayMs,
      updatedAt: now,
      lastVisitAt: now - 2 * dayMs,
    },
    {
      id: uuidv4(),
      name: "Oasis Cafe",
      phone: "+1 555-0303",
      address: "789 Ocean Blvd",
      pincode: "10003",
      shopType: "Cafe",
      status: "Lead",
      tags: ["New", "Prospect"],
      colorLabel: "amber",
      isArchived: false,
      notes: "Met owner at trade event. Interested in cold drinks shelf.",
      monthlyValueEstimate: 800,
      createdAt: now - 2 * dayMs,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "QuickStop Gas",
      phone: "+1 555-0404",
      address: "101 Highway 1",
      pincode: "10004",
      shopType: "Gas Station",
      status: "Active",
      tags: ["24/7"],
      colorLabel: "purple",
      isArchived: false,
      visitFrequency: 10,
      monthlyValueEstimate: 2000,
      createdAt: now - 60 * dayMs,
      updatedAt: now,
      lastVisitAt: now - 1 * dayMs,
    },
    {
      id: uuidv4(),
      name: "Metro Mart",
      address: "555 City Square",
      pincode: "10005",
      shopType: "Supermarket",
      status: "Inactive",
      tags: ["Pending Renewal"],
      isArchived: false,
      notes: "Contract lapsed. Follow up required.",
      createdAt: now - 100 * dayMs,
      updatedAt: now,
      lastVisitAt: now - 45 * dayMs,
    },
  ];

  await db.clients.bulkAdd(clients);

  const fridges: Fridge[] = [
    {
      id: uuidv4(),
      clientId: clients[0].id,
      serialNo: "CC-FR-9001",
      gccCode: "GCC-A123",
      qrCodeValue: "COCA-COLA-ASSET-9001",
      condition: "Good",
      createdAt: now - 30 * dayMs,
      updatedAt: now,
      lastCheckedAt: now - 8 * dayMs,
    },
    {
      id: uuidv4(),
      clientId: clients[0].id,
      serialNo: "CC-FR-9002",
      gccCode: "GCC-A124",
      condition: "Needs Repair",
      notes: "Light flickering inside. Needs technician visit.",
      createdAt: now - 30 * dayMs,
      updatedAt: now,
      lastCheckedAt: now - 8 * dayMs,
    },
    {
      id: uuidv4(),
      clientId: clients[1].id,
      serialNo: "CC-FR-8005",
      gccCode: "GCC-B210",
      qrCodeValue: "COCA-COLA-ASSET-8005",
      condition: "Critical",
      notes: "Not cooling properly. Temp is 12°C. Logged ticket #TKT-441.",
      createdAt: now - 20 * dayMs,
      updatedAt: now,
      lastCheckedAt: now - 2 * dayMs,
    },
    {
      id: uuidv4(),
      clientId: clients[3].id,
      serialNo: "CC-FR-7011",
      gccCode: "GCC-C305",
      qrCodeValue: "COCA-COLA-ASSET-7011",
      condition: "Good",
      createdAt: now - 60 * dayMs,
      updatedAt: now,
      lastCheckedAt: now - 1 * dayMs,
    },
  ];

  await db.fridges.bulkAdd(fridges);

  const visits: Visit[] = [
    {
      id: uuidv4(),
      clientId: clients[0].id,
      startedAt: now - 8 * dayMs - 1000 * 60 * 30,
      endedAt: now - 8 * dayMs,
      status: "completed",
      fridgesChecked: [fridges[0].id, fridges[1].id],
      notes: "Regular restock, checked both coolers. Owner mentioned potential order increase.",
      followUpOutcome: "Send updated price list by Thursday.",
      createdAt: now - 8 * dayMs,
      updatedAt: now - 8 * dayMs,
    },
    {
      id: uuidv4(),
      clientId: clients[1].id,
      startedAt: now - 2 * dayMs - 1000 * 60 * 15,
      endedAt: now - 2 * dayMs,
      status: "completed",
      fridgesChecked: [fridges[2].id],
      notes: "Fridge is failing. Logged ticket with maintenance team.",
      followUpOutcome: "Confirm technician ETA by tomorrow.",
      createdAt: now - 2 * dayMs,
      updatedAt: now - 2 * dayMs,
    },
    {
      id: uuidv4(),
      clientId: clients[2].id,
      startedAt: now - 1000 * 60 * 5,
      status: "active",
      fridgesChecked: [],
      createdAt: now - 1000 * 60 * 5,
      updatedAt: now - 1000 * 60 * 5,
    },
  ];

  await db.visits.bulkAdd(visits);
}
