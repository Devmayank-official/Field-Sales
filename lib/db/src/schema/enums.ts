import { pgEnum } from "drizzle-orm/pg-core";

export const clientStatusEnum = pgEnum("client_status", [
  "Lead",
  "Contacted",
  "Active",
  "High Value",
  "Inactive",
]);

export const fridgeConditionEnum = pgEnum("fridge_condition", [
  "Good",
  "Needs Repair",
  "Critical",
  "Dead",
]);

export const visitStatusEnum = pgEnum("visit_status", ["active", "completed"]);

export const colorLabelEnum = pgEnum("color_label", [
  "red",
  "orange",
  "amber",
  "green",
  "blue",
  "purple",
]);

export const imageEntityTypeEnum = pgEnum("image_entity_type", [
  "client",
  "fridge",
  "visit",
]);
