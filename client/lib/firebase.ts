// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  ConfirmationResult,
  AuthError,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAAB9dXWrymvyJSrE8Qg3Op4vXQMEtv2hw",
  authDomain: "aashish-properties.firebaseapp.com",
  projectId: "aashish-properties",
  storageBucket: "aashish-properties.firebasestorage.app",
  messagingSenderId: "1074799820866",
  appId: "1:1074799820866:web:60035a614911eb876faddb",
  measurementId: "G-WJS8TWNW00",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (only in browser environment)
let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
export { analytics };

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// Phone Auth helpers
export class PhoneAuthService {
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private confirmationResult: ConfirmationResult | null = null;

  // Initialize reCAPTCHA verifier
  initializeRecaptcha(containerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.recaptchaVerifier) {
          this.recaptchaVerifier.clear();
        }

        this.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
          size: "normal",
          callback: () => {
            console.log("reCAPTCHA solved");
            resolve();
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired");
            reject(new Error("reCAPTCHA expired"));
          },
          "error-callback": (error: any) => {
            console.error("reCAPTCHA error:", error);
            reject(error);
          },
        });

        this.recaptchaVerifier
          .render()
          .then(() => {
            console.log("reCAPTCHA rendered successfully");
            resolve();
          })
          .catch(reject);
      } catch (error) {
        console.error("Failed to initialize reCAPTCHA:", error);
        reject(error);
      }
    });
  }

  // Send OTP to phone number
  async sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
    if (!this.recaptchaVerifier) {
      throw new Error(
        "reCAPTCHA not initialized. Call initializeRecaptcha first.",
      );
    }

    try {
      // Format phone number to include country code
      const formattedPhoneNumber = phoneNumber.startsWith("+")
        ? phoneNumber
        : `+91${phoneNumber}`;

      console.log("Sending OTP to:", formattedPhoneNumber);

      this.confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhoneNumber,
        this.recaptchaVerifier,
      );

      console.log("OTP sent successfully");
      return this.confirmationResult;
    } catch (error) {
      console.error("Failed to send OTP:", error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Verify OTP code
  async verifyOTP(code: string): Promise<FirebaseUser> {
    if (!this.confirmationResult) {
      throw new Error("No confirmation result available. Send OTP first.");
    }

    try {
      const result = await this.confirmationResult.confirm(code);
      console.log("Phone authentication successful");
      return result.user;
    } catch (error) {
      console.error("OTP verification failed:", error);
      throw this.handleAuthError(error as AuthError);
    }
  }

  // Clear reCAPTCHA
  clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
      this.recaptchaVerifier = null;
    }
    this.confirmationResult = null;
  }

  // Handle auth errors with user-friendly messages
  private handleAuthError(error: AuthError): Error {
    let message = "Authentication failed";

    switch (error.code) {
      case "auth/invalid-phone-number":
        message = "Invalid phone number. Please check and try again.";
        break;
      case "auth/missing-phone-number":
        message = "Phone number is required.";
        break;
      case "auth/quota-exceeded":
        message = "SMS quota exceeded. Please try again later.";
        break;
      case "auth/invalid-verification-code":
        message = "Invalid verification code. Please check and try again.";
        break;
      case "auth/code-expired":
        message = "Verification code has expired. Please request a new one.";
        break;
      case "auth/too-many-requests":
        message = "Too many attempts. Please try again later.";
        break;
      case "auth/operation-not-allowed":
        message = "Phone authentication is not enabled.";
        break;
      case "auth/captcha-check-failed":
        message = "reCAPTCHA verification failed. Please try again.";
        break;
      default:
        message = error.message || "Authentication failed";
    }

    return new Error(message);
  }
}

// Google Auth helpers
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google authentication successful");
    return result.user;
  } catch (error) {
    console.error("Google authentication failed:", error);
    const authError = error as AuthError;

    let message = "Google authentication failed";
    switch (authError.code) {
      case "auth/popup-closed-by-user":
        message = "Authentication cancelled by user";
        break;
      case "auth/popup-blocked":
        message =
          "Popup blocked by browser. Please allow popups and try again.";
        break;
      case "auth/cancelled-popup-request":
        message = "Authentication cancelled";
        break;
      case "auth/operation-not-allowed":
        message = "Google authentication is not enabled";
        break;
      case "auth/unauthorized-domain":
        message = "This domain is not authorized for Google authentication";
        break;
      default:
        message = authError.message || "Google authentication failed";
    }

    throw new Error(message);
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Sign out failed:", error);
    throw error;
  }
};

// Auth state listener
export const onAuthStateChange = (
  callback: (user: FirebaseUser | null) => void,
) => {
  return onAuthStateChanged(auth, callback);
};

// Utility functions
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const isUserSignedIn = (): boolean => {
  return !!auth.currentUser;
};

export default app;
