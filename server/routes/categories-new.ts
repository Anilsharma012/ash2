import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { Category, Subcategory, ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import multer from "multer";

// Configure multer for icon upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB limit for icons
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Helper function to generate unique slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove multiple hyphens
    .trim();
}

// Helper function to ensure unique slug
async function ensureUniqueSlug(
  db: any,
  name: string,
  excludeId?: string,
): Promise<string> {
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const filter: any = { slug };
    if (excludeId) {
      filter._id = { $ne: new ObjectId(excludeId) };
    }

    const existing = await db.collection("categories").findOne(filter);
    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// PUBLIC: Get active categories with optional subcategories
export const getCategories: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { active, withSub } = req.query;

    // Build filter
    const filter: any = {};
    if (active === "true") {
      filter.isActive = true;
    }

    // Get categories sorted by sortOrder
    const categories = await db
      .collection("categories")
      .find(filter)
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    let result = categories;

    // Include subcategories if requested
    if (withSub === "true") {
      result = await Promise.all(
        categories.map(async (category: any) => {
          const subcategories = await db
            .collection("subcategories")
            .find({
              categoryId: category._id.toString(),
              ...(active === "true" ? { isActive: true } : {}),
            })
            .sort({ sortOrder: 1, createdAt: 1 })
            .toArray();

          return {
            ...category,
            subcategories,
          };
        }),
      );
    }

    // Add ETag for caching
    const etag = `"${Date.now()}"`;
    res.set("ETag", etag);
    res.set("Cache-Control", "public, max-age=300"); // 5 minutes

    const response: ApiResponse<any[]> = {
      success: true,
      data: result,
      meta: {
        updatedAt: new Date().toISOString(),
        etag,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch categories",
    });
  }
};

// PUBLIC: Get category by slug with subcategories
export const getCategoryBySlug: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { slug } = req.params;

    const category = await db
      .collection("categories")
      .findOne({ slug, isActive: true });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      });
    }

    // Get subcategories
    const subcategories = await db
      .collection("subcategories")
      .find({ categoryId: category._id.toString(), isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    const response: ApiResponse<any> = {
      success: true,
      data: {
        ...category,
        subcategories,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch category",
    });
  }
};

// PUBLIC: Get subcategories by category slug
export const getSubcategoriesByCategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { categorySlug } = req.params;

    // Find category first
    const category = await db
      .collection("categories")
      .findOne({ slug: categorySlug, isActive: true });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      });
    }

    // Get subcategories
    const subcategories = await db
      .collection("subcategories")
      .find({ categoryId: category._id.toString(), isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    const response: ApiResponse<Subcategory[]> = {
      success: true,
      data: subcategories as Subcategory[],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch subcategories",
    });
  }
};

// ADMIN: Get all categories with search and pagination
export const getAllCategories: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { search = "", page = "1", limit = "10" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build search filter
    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const [categories, total] = await Promise.all([
      db
        .collection("categories")
        .find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection("categories").countDocuments(filter),
    ]);

    // Add subcategory counts
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category: any) => {
        const subcategoryCount = await db
          .collection("subcategories")
          .countDocuments({ categoryId: category._id.toString() });

        return {
          ...category,
          subcategoryCount,
        };
      }),
    );

    const response: ApiResponse<{
      categories: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        categories: categoriesWithCounts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch categories",
    });
  }
};

// ADMIN: Create category
export const createCategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { name, iconUrl, sortOrder, isActive = true } = req.body;

    // Validate required fields
    if (!name || !iconUrl || typeof sortOrder !== "number") {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, iconUrl, sortOrder",
      });
    }

    // Generate unique slug
    const slug = await ensureUniqueSlug(db, name);

    const categoryData: Omit<Category, "_id"> = {
      name: name.trim(),
      slug,
      iconUrl: iconUrl.trim(),
      sortOrder,
      isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("categories").insertOne(categoryData);

    const response: ApiResponse<{ _id: string; category: Category }> = {
      success: true,
      data: {
        _id: result.insertedId.toString(),
        category: {
          ...categoryData,
          _id: result.insertedId.toString(),
        } as Category,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create category",
    });
  }
};

// ADMIN: Update category
export const updateCategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { name, iconUrl, sortOrder, isActive } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid category ID",
      });
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
      // Regenerate slug if name changed
      updateData.slug = await ensureUniqueSlug(db, name, id);
    }
    if (iconUrl !== undefined) updateData.iconUrl = iconUrl.trim();
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await db
      .collection("categories")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      });
    }

    // Get updated category
    const updatedCategory = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(id) });

    const response: ApiResponse<{ category: Category }> = {
      success: true,
      data: { category: updatedCategory as Category },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update category",
    });
  }
};

// ADMIN: Delete category
export const deleteCategory: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid category ID",
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await db
      .collection("subcategories")
      .countDocuments({ categoryId: id });

    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${subcategoryCount} subcategories. Delete subcategories first.`,
      });
    }

    // Check if category is linked to items (properties, etc.) - you can add this check based on your needs
    // For now, we'll allow deletion if no subcategories

    const result = await db
      .collection("categories")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      });
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Category deleted successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete category",
    });
  }
};

// ADMIN: Toggle category active status
export const toggleCategoryActive: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid category ID",
      });
    }

    // Get current category
    const category = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(id) });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: "Category not found",
      });
    }

    // Toggle active status
    const result = await db.collection("categories").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive: !category.isActive,
          updatedAt: new Date(),
        },
      },
    );

    const updatedCategory = await db
      .collection("categories")
      .findOne({ _id: new ObjectId(id) });

    const response: ApiResponse<{ category: Category }> = {
      success: true,
      data: { category: updatedCategory as Category },
    };

    res.json(response);
  } catch (error) {
    console.error("Error toggling category:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle category",
    });
  }
};

// ADMIN: Update category sort order (for drag-and-drop)
export const updateCategorySortOrder: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { updates } = req.body; // Array of {id, sortOrder}

    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: "Updates must be an array",
      });
    }

    // Update all categories in batch
    const bulkOps = updates.map((update: any) => ({
      updateOne: {
        filter: { _id: new ObjectId(update.id) },
        update: {
          $set: {
            sortOrder: update.sortOrder,
            updatedAt: new Date(),
          },
        },
      },
    }));

    await db.collection("categories").bulkWrite(bulkOps);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Sort order updated successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating sort order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update sort order",
    });
  }
};

// Icon upload handlers
export const uploadCategoryIcon = upload.single("icon");

export const handleIconUpload: RequestHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // In a real implementation, upload to cloud storage
    // For now, simulate with a placeholder URL
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = req.file.originalname.split(".").pop();
    const iconUrl = `/uploads/category-icons/${timestamp}-${random}.${extension}`;

    const response: ApiResponse<{ iconUrl: string }> = {
      success: true,
      data: { iconUrl },
    };

    res.json(response);
  } catch (error) {
    console.error("Error uploading icon:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload icon",
    });
  }
};
