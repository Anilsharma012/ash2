import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ObjectId } from "mongodb";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export const devSeedCategories: RequestHandler = async (_req, res) => {
  try {
    const db = getDatabase();

    // Ensure indexes
    await db.collection("categories").createIndex({ slug: 1 }, { unique: true, name: "uniq_category_slug" });
    await db.collection("subcategories").createIndex({ categoryId: 1, slug: 1 }, { unique: true, name: "uniq_sub_slug_per_cat" });

    // Desired categories and subcategories in exact order
    const seed = [
      {
        name: "Buy Property",
        sub: ["Apartments", "Independent House", "Plots", "Farms"],
      },
      {
        name: "For Sale",
        sub: ["Commercial Shop", "Office", "Warehouse"],
      },
      {
        name: "Rent Property",
        sub: ["1 BHK", "2 BHK", "3 BHK", "Villa"],
      },
      {
        name: "Lease Property",
        sub: ["Industrial Land", "Cold Storage"],
      },
      {
        name: "PG & Hostels",
        sub: ["Boys PG", "Girls PG", "Hostel"],
      },
      {
        name: "Other Services",
        sub: ["Interior", "Packers & Movers", "Loan Assist"],
      },
    ];

    // Clear existing
    await db.collection("subcategories").deleteMany({});
    await db.collection("categories").deleteMany({});

    const now = new Date();

    // Insert categories and their subcategories
    let order = 1;
    const insertedCategories: Array<{ _id: ObjectId; name: string; slug: string }> = [];
    for (const cat of seed) {
      const slug = slugify(cat.name);
      const iconUrl = "/placeholder.svg";
      const catResult = await db.collection("categories").insertOne({
        name: cat.name,
        slug,
        iconUrl,
        sortOrder: order,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      const categoryId = catResult.insertedId.toString();
      insertedCategories.push({ _id: catResult.insertedId, name: cat.name, slug });

      let subOrder = 1;
      for (const sub of cat.sub) {
        const subSlug = slugify(sub);
        await db.collection("subcategories").insertOne({
          categoryId,
          name: sub,
          slug: subSlug,
          iconUrl,
          sortOrder: subOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        subOrder++;
      }

      order++;
    }

    res.json({
      success: true,
      data: {
        message: "Development categories seeded successfully",
        categories: insertedCategories.map((c) => ({ id: c._id.toString(), name: c.name, slug: c.slug })),
        count: insertedCategories.length,
      },
      meta: { updatedAt: new Date().toISOString() },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to seed data" });
  }
};
