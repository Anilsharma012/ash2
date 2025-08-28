import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ObjectId } from "mongodb";

// Helper to slugify names consistently with categories-new implementation
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const seedSampleCategories: RequestHandler = async (_req, res) => {
  try {
    const db = getDatabase();

    // Ensure indexes
    await db.collection("categories").createIndex({ slug: 1 }, { unique: true, name: "uniq_category_slug" });
    await db
      .collection("subcategories")
      .createIndex({ categoryId: 1, slug: 1 }, { unique: true, name: "uniq_subcategory_per_category" });

    // Sample data
    const samples = [
      {
        name: "Residential",
        iconUrl: "/placeholder.svg",
        isActive: true,
        sub: [
          { name: "1 BHK", iconUrl: "/placeholder.svg" },
          { name: "2 BHK", iconUrl: "/placeholder.svg" },
          { name: "Independent House", iconUrl: "/placeholder.svg" },
        ],
      },
      {
        name: "Commercial",
        iconUrl: "/placeholder.svg",
        isActive: true,
        sub: [
          { name: "Shop", iconUrl: "/placeholder.svg" },
          { name: "Office", iconUrl: "/placeholder.svg" },
          { name: "Showroom", iconUrl: "/placeholder.svg" },
        ],
      },
      {
        name: "Plot",
        iconUrl: "/placeholder.svg",
        isActive: true,
        sub: [
          { name: "Residential Plot", iconUrl: "/placeholder.svg" },
          { name: "Commercial Plot", iconUrl: "/placeholder.svg" },
        ],
      },
    ];

    let sortOrder = 1;
    const results: Array<{ categoryId: string; category: string; created: number; updated: number }> = [];

    for (const cat of samples) {
      const slug = slugify(cat.name);
      const now = new Date();

      const existing = await db.collection("categories").findOne({ slug });
      let categoryId: string;

      if (existing) {
        await db.collection("categories").updateOne(
          { _id: new ObjectId(existing._id) },
          {
            $set: {
              name: cat.name.trim(),
              iconUrl: cat.iconUrl.trim(),
              sortOrder,
              isActive: !!cat.isActive,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now },
          },
        );
        categoryId = existing._id.toString();
      } else {
        const ins = await db.collection("categories").insertOne({
          name: cat.name.trim(),
          slug,
          iconUrl: cat.iconUrl.trim(),
          sortOrder,
          isActive: !!cat.isActive,
          createdAt: now,
          updatedAt: now,
        });
        categoryId = ins.insertedId.toString();
      }

      let created = 0;
      let updated = 0;

      // Upsert subcategories for this category
      let subSort = 1;
      for (const s of cat.sub) {
        const subSlug = slugify(s.name);
        const sub = await db.collection("subcategories").findOne({ categoryId, slug: subSlug });
        if (sub) {
          await db.collection("subcategories").updateOne(
            { _id: new ObjectId(sub._id) },
            {
              $set: {
                name: s.name.trim(),
                iconUrl: s.iconUrl.trim(),
                sortOrder: subSort,
                isActive: true,
                updatedAt: now,
              },
              $setOnInsert: { createdAt: now },
            },
          );
          updated++;
        } else {
          await db.collection("subcategories").insertOne({
            categoryId,
            name: s.name.trim(),
            slug: subSlug,
            iconUrl: s.iconUrl.trim(),
            sortOrder: subSort,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });
          created++;
        }
        subSort++;
      }

      results.push({ categoryId, category: cat.name, created, updated });
      sortOrder++;
    }

    res.json({
      success: true,
      data: {
        message: "Sample categories and subcategories seeded",
        results,
      },
      meta: {
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error seeding sample categories:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to seed sample data" });
  }
};
