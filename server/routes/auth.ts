import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { User, ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendWelcomeNotification } from "./notifications";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SALT_ROUNDS = 10;

// Register new user (seller, agent, or buyer)
export const registerUser: RequestHandler = async (req, res) => {
  try {
    console.log("🔍 Registration request received:", {
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url
    });

    const db = getDatabase();
    const {
      name,
      email,
      phone,
      password,
      userType,
      experience,
      specializations,
      serviceAreas,
    } = req.body;

    // Validate required fields
    console.log("📋 Validating required fields...");
    if (!name || !email || !phone || !password || !userType) {
      console.log("❌ Missing required fields:", {
        name: !!name,
        email: !!email,
        phone: !!phone,
        password: !!password,
        userType: !!userType
      });
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, email, phone, password, and userType are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format:", email);
      return res.status(400).json({
        success: false,
        error: "Invalid email format",
      });
    }

    // Validate phone format (basic check)
    if (phone.length < 10) {
      console.log("❌ Invalid phone number:", phone);
      return res.status(400).json({
        success: false,
        error: "Phone number must be at least 10 digits",
      });
    }

    // Validate userType
    if (!["seller", "buyer", "agent"].includes(userType)) {
      console.log("❌ Invalid user type:", userType);
      return res.status(400).json({
        success: false,
        error: "Invalid user type. Must be seller, buyer, or agent",
      });
    }

    console.log("✅ All validations passed");

    // Check if user already exists
    console.log("🔍 Checking for existing user...");
    const existingUser = await db
      .collection("users")
      .findOne({ $or: [{ email }, { phone }] });

    if (existingUser) {
      console.log("❌ User already exists:", {
        email: existingUser.email,
        phone: existingUser.phone
      });
      return res.status(400).json({
        success: false,
        error: "User with this email or phone already exists",
      });
    }

    console.log("✅ No existing user found");

    // Hash password
    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    console.log("✅ Password hashed successfully");

    // Create user object
    // Generate email verification token
    console.log("🎫 Generating email verification token...");
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    console.log("✅ Email verification token generated");

    const newUser: Omit<User, "_id"> = {
      name,
      email,
      phone,
      password: hashedPassword,
      userType,
      emailVerified: false,
      emailVerificationToken,
      emailVerificationExpiry,
      preferences: {
        propertyTypes: [],
        priceRange: { min: 0, max: 10000000 },
        locations: [],
      },
      favorites: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add agent-specific fields if userType is agent
    if (userType === "agent") {
      (newUser as any).agentProfile = {
        experience: parseInt(experience) || 0,
        specializations: specializations || [],
        rating: 0,
        reviewCount: 0,
        aboutMe: "",
        serviceAreas: serviceAreas || [],
      };
      (newUser as any).properties = [];
    }

    console.log("💾 Inserting user into database...");
    console.log("📝 User object to insert:", JSON.stringify(newUser, null, 2));

    const result = await db.collection("users").insertOne(newUser);
    console.log("✅ User inserted successfully:", result.insertedId);

    // Send welcome notification to new user
    try {
      await sendWelcomeNotification(result.insertedId.toString(), name, userType);
    } catch (notificationError) {
      console.warn("⚠️ Failed to send welcome notification:", notificationError);
      // Don't fail registration if notification fails
    }

    // Generate JWT token
    console.log("🎟️ Generating JWT token...");
    const token = jwt.sign(
      {
        userId: result.insertedId.toString(),
        userType,
        email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    console.log("✅ JWT token generated");

    // For demo purposes, log the verification link
    const verificationLink = `${process.env.BASE_URL || 'http://localhost:8080'}/api/auth/verify-email?token=${emailVerificationToken}`;
    console.log(`Email verification link for ${email}: ${verificationLink}`);

    const response: ApiResponse<{ token: string; user: any; verificationLink?: string }> = {
      success: true,
      data: {
        token,
        user: {
          id: result.insertedId.toString(),
          name,
          email,
          phone,
          userType,
          emailVerified: false,
        },
        verificationLink, // Include in response for demo
      },
      message: "User registered successfully. Please check your email to verify your account.",
    };

    console.log("📤 Sending successful registration response");
    res.status(201).json(response);
  } catch (error: any) {
    console.error("❌ Registration error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error
    });

    // Check for specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: `Validation error: ${error.message}`,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: "User with this email or phone already exists",
      });
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      return res.status(500).json({
        success: false,
        error: `Database error: ${error.message}`,
      });
    }

    res.status(500).json({
      success: false,
      error: `Failed to register user: ${error.message}`,
    });
  }
};

// Login user
export const loginUser: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { email, phone, password, userType } = req.body;

    // Build query based on provided fields
    let query: any = {};

    // Check if login is by username (for staff) or email/phone
    const { username } = req.body;

    if (username) {
      // Staff login by username
      query = { username };
    } else if (email && phone) {
      query = { $or: [{ email }, { phone }] };
    } else if (email) {
      query = { email };
    } else if (phone) {
      query = { phone };
    } else {
      return res.status(400).json({
        success: false,
        error: "Email, phone number, or username is required",
      });
    }

    // Support unified login - don't filter by userType for login
    // Users can login with any userType using the same credentialsialsng the same credentials

    // Find user by email, phone, or username
    const user = await db.collection("users").findOne(query);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Update last login time
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date()
        },
        $unset: user.isFirstLogin ? { isFirstLogin: 1 } : {}
      }
    );

    // Generate JWT token with role information
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType: user.userType,
        email: user.email,
        role: user.role || user.userType, // Include role for staff members
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    // Prepare user response with role information
    const userResponse: any = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
    };

    // Add role information for staff members
    if (user.userType === "staff" || user.role) {
      userResponse.role = user.role;
      userResponse.permissions = user.permissions || [];
      userResponse.isFirstLogin = user.isFirstLogin || false;
      userResponse.username = user.username;

      // Add role display information
      const roleInfo = {
        super_admin: { displayName: "Super Admin", color: "purple" },
        content_manager: { displayName: "Content Manager", color: "blue" },
        sales_manager: { displayName: "Sales Manager", color: "green" },
        support_executive: { displayName: "Support Executive", color: "orange" },
        admin: { displayName: "Admin", color: "gray" },
      };

      userResponse.roleInfo = roleInfo[user.role] || { displayName: user.role, color: "gray" };
    }

    const response: ApiResponse<{ token: string; user: any }> = {
      success: true,
      data: {
        token,
        user: userResponse,
      },
      message: user.isFirstLogin ? "First login successful - please change your password" : "Login successful",
    };

    res.json(response);
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to login",
    });
  }
};

// Send OTP (placeholder - integrate with SMS service)
export const sendOTP: RequestHandler = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    // Generate 6-digit OTP (for demo, always use 123456)
    const otp = "123456"; // Fixed OTP for demo purposes

    // Store OTP in database (with expiry)
    const db = getDatabase();

    // Remove any existing OTPs for this phone
    await db.collection("otps").deleteMany({ phone });

    await db.collection("otps").insertOne({
      phone,
      otp,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    console.log(`OTP for ${phone}: ${otp}`);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "OTP sent successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send OTP",
    });
  }
};

// Verify OTP
export const verifyOTP: RequestHandler = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: "Phone number and OTP are required",
      });
    }

    const db = getDatabase();

    // Find valid OTP
    const otpRecord = await db.collection("otps").findOne({
      phone,
      otp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired OTP",
      });
    }

    // Delete used OTP
    await db.collection("otps").deleteOne({ _id: otpRecord._id });

    // Check if user exists
    let user = await db.collection("users").findOne({ phone });

    if (!user) {
      // Create new user for OTP login
      const newUser: Omit<User, "_id"> = {
        name: phone, // Use phone as name initially
        email: "",
        phone,
        password: "", // No password for OTP users
        userType: "seller",
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 10000000 },
          locations: [],
        },
        favorites: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("users").insertOne(newUser);
      user = {
        _id: result.insertedId,
        ...newUser,
      };

      // Send welcome notification to new user
      try {
        await sendWelcomeNotification(result.insertedId.toString(), newUser.name, "seller");
      } catch (notificationError) {
        console.warn("⚠️ Failed to send welcome notification:", notificationError);
        // Don't fail registration if notification fails
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType: user.userType,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response: ApiResponse<{
      token: string;
      user: any;
    }> = {
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
        },
      },
      message: "OTP verified successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify OTP",
    });
  }
};

// Get user profile
export const getUserProfile: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId; // From auth middleware

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    const response: ApiResponse<any> = {
      success: true,
      data: userWithoutPassword,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user profile",
    });
  }
};

// Update user profile
export const updateUserProfile: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId; // From auth middleware
    const updateData = req.body;

    // Remove sensitive fields
    delete updateData.password;
    delete updateData._id;

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Profile updated successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update profile",
    });
  }
};

// Google authentication
export const googleAuth: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { googleUser, userType = 'seller' } = req.body;

    if (!googleUser || !googleUser.email) {
      return res.status(400).json({
        success: false,
        error: "Invalid Google user data",
      });
    }

    // Check if user already exists
    let user = await db
      .collection("users")
      .findOne({ email: googleUser.email });

    if (!user) {
      // Create new user from Google data
      const newUser: Omit<User, "_id"> = {
        name: googleUser.name || `${googleUser.given_name} ${googleUser.family_name}`.trim(),
        email: googleUser.email,
        phone: "", // Google doesn't provide phone by default
        password: "", // No password for Google users
        userType: userType,
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 10000000 },
          locations: [],
        },
        favorites: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add agent-specific fields if userType is agent
      if (userType === "agent") {
        (newUser as any).agentProfile = {
          experience: 0,
          specializations: [],
          rating: 0,
          reviewCount: 0,
          aboutMe: "",
          serviceAreas: [],
        };
        (newUser as any).properties = [];
      }

      const result = await db.collection("users").insertOne(newUser);
      user = {
        _id: result.insertedId,
        ...newUser,
      };

      // Send welcome notification to new user
      try {
        await sendWelcomeNotification(result.insertedId.toString(), user.name, user.userType);
      } catch (notificationError) {
        console.warn("⚠️ Failed to send welcome notification:", notificationError);
        // Don't fail registration if notification fails
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        userType: user.userType,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response: ApiResponse<{ token: string; user: any }> = {
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          emailVerified: true, // Google users are always email verified
        },
      },
      message: "Google authentication successful",
    };

    res.json(response);
  } catch (error) {
    console.error("Error with Google authentication:", error);
    res.status(500).json({
      success: false,
      error: "Failed to authenticate with Google",
    });
  }
};
