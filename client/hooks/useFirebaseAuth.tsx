import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User as FirebaseUser } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db, onAuthStateChange, signOutUser } from "../lib/firebase";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  userType: "buyer" | "seller" | "agent" | "admin" | "staff";
  role?: string;
  username?: string;
  permissions?: string[];
  roleInfo?: {
    displayName: string;
    permissions: string[];
  };
  isFirstLogin?: boolean;
  lastLogin?: string;
  firebaseUid?: string; // Add Firebase UID for integration
}

interface FirebaseAuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  loginWithFirebase: (
    firebaseUser: FirebaseUser,
    userType?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | undefined>(
  undefined,
);

export const FirebaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (storedToken.length > 10 && parsedUser.id) {
          setToken(storedToken);
          setUser(parsedUser);
        } else {
          throw new Error("Invalid token or user data");
        }
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log("Firebase auth state changed:", !!firebaseUser);
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // User is signed in with Firebase
        try {
          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();

          // Check if we have user data in Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            // User exists in Firestore, use that data
            const userData = userDoc.data() as User;
            setUser(userData);
            setToken(idToken);

            // Update localStorage
            localStorage.setItem("token", idToken);
            localStorage.setItem("user", JSON.stringify(userData));
          } else {
            // New Firebase user, we'll handle this in loginWithFirebase
            console.log("New Firebase user, waiting for profile completion");
          }
        } catch (error) {
          console.error("Error handling Firebase auth state:", error);
        }
      } else if (!storedToken) {
        // User is signed out and no stored token
        setUser(null);
        setToken(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Traditional login (for existing users)
  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  // Firebase login handler
  const loginWithFirebase = async (
    firebaseUser: FirebaseUser,
    userType: string = "buyer",
  ) => {
    try {
      setLoading(true);

      // Get Firebase ID token
      const idToken = await firebaseUser.getIdToken();

      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      let userData: User;

      if (userDoc.exists()) {
        // Existing user
        userData = userDoc.data() as User;
        console.log("Existing Firebase user found");
      } else {
        // New user - create profile
        userData = {
          id: firebaseUser.uid,
          firebaseUid: firebaseUser.uid,
          name:
            firebaseUser.displayName ||
            extractNameFromPhone(firebaseUser.phoneNumber) ||
            "User",
          email: firebaseUser.email || "",
          phone: firebaseUser.phoneNumber || "",
          userType: userType as
            | "buyer"
            | "seller"
            | "agent"
            | "admin"
            | "staff",
          isFirstLogin: true,
          lastLogin: new Date().toISOString(),
        };

        // Save to Firestore
        await setDoc(userDocRef, userData);
        console.log("New Firebase user profile created");
      }

      // Update last login
      userData.lastLogin = new Date().toISOString();
      await setDoc(userDocRef, userData, { merge: true });

      // Update local state
      setUser(userData);
      setToken(idToken);

      // Update localStorage
      localStorage.setItem("token", idToken);
      localStorage.setItem("user", JSON.stringify(userData));

      console.log("Firebase login completed successfully");
    } catch (error) {
      console.error("Error in Firebase login:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<User>) => {
    if (!user || !firebaseUser) {
      throw new Error("No user authenticated");
    }

    try {
      const updatedUser = { ...user, ...updates };

      // Update Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      await setDoc(userDocRef, updatedUser, { merge: true });

      // Update local state
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      console.log("User profile updated successfully");
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    try {
      // Sign out from Firebase if user is signed in
      if (firebaseUser) {
        await signOutUser();
      }

      // Clear local storage
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Clear state
      setToken(null);
      setUser(null);
      setFirebaseUser(null);

      console.log("Logout completed successfully");
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  const value = {
    user,
    firebaseUser,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    loginWithFirebase,
    logout,
    updateUserProfile,
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error(
      "useFirebaseAuth must be used within a FirebaseAuthProvider",
    );
  }
  return context;
};

// Utility function to extract name from phone number
const extractNameFromPhone = (phoneNumber: string | null): string => {
  if (!phoneNumber) return "User";
  // Return a generic name based on phone number
  return `User${phoneNumber.slice(-4)}`;
};

// Export for backward compatibility
export const useAuth = useFirebaseAuth;
