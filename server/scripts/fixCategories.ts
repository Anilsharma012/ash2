import { getDatabase } from "../db/mongodb";
import { ObjectId, IndexSpecification } from "mongodb";

function slugify(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

async function ensureUniqueCategorySlug(db: any, base: string, excludeId?: string) {
  let baseSlug = slugify(base);
  let slug = baseSlug || "category";
  let counter = 2;
  // First try as-is, then append -2, -3 ... if clashes
  while (true) {
    const filter: any = { slug };
    if (excludeId) filter._id = { $ne: new ObjectId(excludeId) };
    const exists = await db.collection("categories").findOne(filter);
    if (!exists) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function ensureUniqueSubSlug(db: any, categoryId: string, base: string, excludeId?: string) {
  let baseSlug = slugify(base);
  let slug = baseSlug || "subcategory";
  let counter = 2;
  while (true) {
    const filter: any = { categoryId, slug };
    if (excludeId) filter._id = { $ne: new ObjectId(excludeId) };
    const exists = await db.collection("subcategories").findOne(filter);
    if (!exists) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function fixCategoryAndSubcategoryData() {
  const db = getDatabase();

  // Create required indexes (idempotent)
  await db.collection("categories").createIndex({ slug: 1 } as IndexSpecification, { unique: true, name: "uniq_category_slug" });
  await db.collection("categories").createIndex({ sortOrder: 1 } as IndexSpecification, { name: "idx_category_sort" });
  await db.collection("subcategories").createIndex({ categoryId: 1, slug: 1 } as IndexSpecification, { unique: true, name: "uniq_sub_slug_per_cat" });
  await db.collection("subcategories").createIndex({ sortOrder: 1 } as IndexSpecification, { name: "idx_sub_sort" });

  const now = new Date();

  // Fix categories
  const categories = await db.collection("categories").find({}).toArray();
  let categoriesUpdated = 0;

  for (const cat of categories) {
    let needsUpdate = false;
    const update: any = { updatedAt: now };

    // Normalize active flags
    const currentActive = typeof cat.isActive === "boolean" ? cat.isActive : typeof cat.active === "boolean" ? cat.active : true;
    if (cat.isActive !== currentActive) {
      update.isActive = currentActive;
      needsUpdate = true;
    }
    if (cat.active !== currentActive) {
      update.active = currentActive;
      needsUpdate = true;
    }

    // Ensure slug
    if (!cat.slug || typeof cat.slug !== "string" || !cat.slug.trim()) {
      update.slug = await ensureUniqueCategorySlug(db, cat.name || "category", cat._id?.toString());
      needsUpdate = true;
    } else {
      // Also handle duplicates by ensuring uniqueness when duplicates exist
      const duplicate = await db.collection("categories").findOne({ slug: cat.slug, _id: { $ne: new ObjectId(cat._id) } });
      if (duplicate) {
        update.slug = await ensureUniqueCategorySlug(db, cat.name || cat.slug, cat._id?.toString());
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection("categories").updateOne({ _id: new ObjectId(cat._id) }, { $set: update });
      categoriesUpdated++;
    }
  }

  // Fix subcategories
  const subcategories = await db.collection("subcategories").find({}).toArray();
  let subcategoriesUpdated = 0;

  for (const sub of subcategories) {
    let needsUpdate = false;
    const update: any = { updatedAt: now };

    const currentActive = typeof sub.isActive === "boolean" ? sub.isActive : typeof sub.active === "boolean" ? sub.active : true;
    if (sub.isActive !== currentActive) {
      update.isActive = currentActive;
      needsUpdate = true;
    }
    if (sub.active !== currentActive) {
      update.active = currentActive;
      needsUpdate = true;
    }

    const catId = (sub.categoryId || "").toString();

    if (!sub.slug || typeof sub.slug !== "string" || !sub.slug.trim()) {
      update.slug = await ensureUniqueSubSlug(db, catId, sub.name || "subcategory", sub._id?.toString());
      needsUpdate = true;
    } else {
      const duplicate = await db.collection("subcategories").findOne({ categoryId: catId, slug: sub.slug, _id: { $ne: new ObjectId(sub._id) } });
      if (duplicate) {
        update.slug = await ensureUniqueSubSlug(db, catId, sub.name || sub.slug, sub._id?.toString());
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await db.collection("subcategories").updateOne({ _id: new ObjectId(sub._id) }, { $set: update });
      subcategoriesUpdated++;
    }
  }

  return {
    categoriesProcessed: categories.length,
    subcategoriesProcessed: subcategories.length,
    categoriesUpdated,
    subcategoriesUpdated,
    timestamp: new Date().toISOString(),
  };
}

if (require.main === module) {
  fixCategoryAndSubcategoryData()
    .then((result) => {
      console.log("✅ Maintenance completed:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Maintenance failed:", err);
      process.exit(1);
    });
}
