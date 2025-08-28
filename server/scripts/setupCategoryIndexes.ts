import { getDatabase, connectToDatabase } from "../db/mongodb";

export async function setupCategoryIndexes() {
  try {
    await connectToDatabase();
    const db = getDatabase();

    console.log("🔧 Setting up category and subcategory indexes...");

    // Categories collection indexes
    await db
      .collection("categories")
      .createIndex({ slug: 1 }, { unique: true });
    await db.collection("categories").createIndex({ sortOrder: 1 });
    await db.collection("categories").createIndex({ isActive: 1 });
    await db.collection("categories").createIndex({ createdAt: 1 });
    await db.collection("categories").createIndex({ updatedAt: 1 });

    // Subcategories collection indexes
    await db.collection("subcategories").createIndex(
      {
        categoryId: 1,
        slug: 1,
      },
      { unique: true },
    ); // Unique slug per category
    await db.collection("subcategories").createIndex({ categoryId: 1 });
    await db.collection("subcategories").createIndex({ sortOrder: 1 });
    await db.collection("subcategories").createIndex({ isActive: 1 });
    await db.collection("subcategories").createIndex({ createdAt: 1 });
    await db.collection("subcategories").createIndex({ updatedAt: 1 });

    // Compound indexes for common queries
    await db.collection("categories").createIndex({
      isActive: 1,
      sortOrder: 1,
    });
    await db.collection("subcategories").createIndex({
      categoryId: 1,
      isActive: 1,
      sortOrder: 1,
    });

    console.log("✅ Category and subcategory indexes created successfully");
  } catch (error) {
    console.error("❌ Error setting up indexes:", error);
    throw error;
  }
}

// Run if called directly (ESM-safe)
if (import.meta.url === `file://${process.argv[1]}`) {
  setupCategoryIndexes()
    .then(() => {
      console.log("✅ Index setup complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Index setup failed:", error);
      process.exit(1);
    });
}
