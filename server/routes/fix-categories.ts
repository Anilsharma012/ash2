import { RequestHandler } from "express";
import { fixCategoryAndSubcategoryData } from "../scripts/fixCategories";

export const runCategoryMaintenance: RequestHandler = async (_req, res) => {
  try {
    const result = await fixCategoryAndSubcategoryData();
    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to run maintenance" });
  }
};
