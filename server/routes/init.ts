import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { User, AdPackage, ApiResponse } from "@shared/types";
import bcrypt from "bcrypt";

// Initialize system with default data
export const initializeSystem: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();

    console.log("🚀 Starting system initialization...");

    // 1. Initialize admin user if not exists
    const existingAdmin = await db.collection("users").findOne({ userType: "admin" });
    
    if (!existingAdmin) {
      console.log("📝 Creating default admin user...");
      const hashedPassword = await bcrypt.hash("admin123", 10);
      
      const adminUser = {
        name: "Administrator",
        email: "admin@aashishproperty.com",
        phone: "+91 9876543210",
        password: hashedPassword,
        userType: "admin",
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 10000000 },
          locations: [],
        },
        favorites: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.collection("users").insertOne(adminUser);
      console.log("✅ Admin user created");
    }

    // 2. Initialize test users if not exist
    const testUsers = [
      {
        name: "Test Seller",
        email: "seller@test.com",
        phone: "+91 9876543211",
        password: "password123",
        userType: "seller"
      },
      {
        name: "Test Buyer",
        email: "buyer@test.com", 
        phone: "+91 9876543212",
        password: "password123",
        userType: "buyer"
      },
      {
        name: "Test Agent",
        email: "agent@test.com",
        phone: "+91 9876543213", 
        password: "password123",
        userType: "agent"
      }
    ];

    for (const userData of testUsers) {
      const existingUser = await db.collection("users").findOne({ email: userData.email });
      
      if (!existingUser) {
        console.log(`📝 Creating test user: ${userData.email}`);
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const user: Omit<User, "_id"> = {
          ...userData,
          password: hashedPassword,
          preferences: {
            propertyTypes: [],
            priceRange: { min: 0, max: 10000000 },
            locations: [],
          },
          favorites: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Add agent profile if needed
        if (userData.userType === "agent") {
          (user as any).agentProfile = {
            experience: 5,
            specializations: ["residential", "commercial"],
            rating: 4.5,
            reviewCount: 20,
            aboutMe: "Experienced real estate agent in Rohtak",
            serviceAreas: ["Model Town", "Sector 1", "Sector 2"],
          };
          (user as any).properties = [];
        }

        await db.collection("users").insertOne(user);
        console.log(`✅ Test user created: ${userData.email}`);
      }
    }

    // 3. Initialize advertisement packages
    const existingPackages = await db.collection("ad_packages").countDocuments();
    
    if (existingPackages === 0) {
      console.log("📦 Creating default advertisement packages...");
      
      const defaultPackages: Omit<AdPackage, "_id">[] = [
        {
          name: "Basic Listing",
          description: "Standard property listing with basic visibility",
          price: 0,
          duration: 30,
          features: [
            "30 days listing",
            "Standard visibility",
            "Basic property details",
            "Contact information display",
          ],
          type: "basic",
          category: "property",
          location: "rohtak",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Featured Listing",
          description: "Enhanced visibility with featured badge",
          price: 299,
          duration: 30,
          features: [
            "30 days listing",
            "Featured badge",
            "Top of search results",
            "Homepage visibility",
            "Priority in category",
            "Enhanced property details",
            "Contact information display",
          ],
          type: "featured",
          category: "property",
          location: "rohtak",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: "Premium Listing",
          description: "Maximum visibility with premium features",
          price: 599,
          duration: 30,
          features: [
            "30 days listing",
            "Premium badge",
            "Top priority in all searches",
            "Homepage banner slot",
            "Featured in category top",
            "Enhanced property details",
            "Multiple image gallery",
            "Contact information display",
            "Analytics dashboard",
            "Priority customer support",
          ],
          type: "premium",
          category: "property",
          location: "rohtak",
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.collection("ad_packages").insertMany(defaultPackages);
      console.log("✅ Advertisement packages created");
    }

    // 4. Initialize categories if not exist
    const existingCategories = await db.collection("categories").countDocuments();
    
    if (existingCategories === 0) {
      console.log("🏷️ Creating default categories...");
      
      const defaultCategories = [
        {
          name: "Residential",
          slug: "residential",
          icon: "🏠",
          description: "Residential properties for living",
          subcategories: [
            { id: "1bhk", name: "1 BHK", slug: "1bhk", description: "1 Bedroom Hall Kitchen" },
            { id: "2bhk", name: "2 BHK", slug: "2bhk", description: "2 Bedroom Hall Kitchen" },
            { id: "3bhk", name: "3 BHK", slug: "3bhk", description: "3 Bedroom Hall Kitchen" },
            { id: "villa", name: "Villa", slug: "villa", description: "Independent villa" },
            { id: "plot", name: "Plot", slug: "plot", description: "Residential plot" },
          ],
          order: 1,
          active: true,
        },
        {
          name: "Commercial",
          slug: "commercial",
          icon: "🏢",
          description: "Commercial properties for business",
          subcategories: [
            { id: "shop", name: "Shop", slug: "shop", description: "Commercial shop" },
            { id: "office", name: "Office", slug: "office", description: "Office space" },
            { id: "warehouse", name: "Warehouse", slug: "warehouse", description: "Storage warehouse" },
            { id: "showroom", name: "Showroom", slug: "showroom", description: "Display showroom" },
          ],
          order: 2,
          active: true,
        },
      ];

      await db.collection("categories").insertMany(defaultCategories);
      console.log("✅ Categories created");
    }

    const response: ApiResponse<{
      message: string;
      initialized: {
        admin: boolean;
        testUsers: number;
        packages: number;
        categories: number;
      };
    }> = {
      success: true,
      data: {
        message: "System initialized successfully",
        initialized: {
          admin: !existingAdmin,
          testUsers: testUsers.length,
          packages: existingPackages === 0 ? 3 : 0,
          categories: existingCategories === 0 ? 2 : 0,
        },
      },
    };

    console.log("🎉 System initialization completed!");
    res.json(response);
  } catch (error) {
    console.error("❌ Error initializing system:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initialize system",
    });
  }
};
