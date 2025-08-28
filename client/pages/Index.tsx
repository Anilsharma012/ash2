import React from "react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import OLXStyleListings from "../components/OLXStyleListings";
import PackagesShowcase from "../components/PackagesShowcase";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
// import PWAInstallButton from "../components/PWAInstallButton"; // Removed as requested
import BottomNavigation from "../components/BottomNavigation";
import HomepageBanner from "../components/HomepageBanner";
import StaticFooter from "../components/StaticFooter";
import HeroImageSlider from "../components/HeroImageSlider";
import PropertyAdsSlider from "../components/PropertyAdsSlider";

export default function Index() {
  return (
    <div className="min-h-screen bg-white">
      <OLXStyleHeader />
      <main className="pb-16 bg-gradient-to-b from-red-50 to-white">
        {/* Hero Image Slider */}
        <HeroImageSlider />

        {/* Property Ads Slider */}
        <PropertyAdsSlider />

        <CategoryBar />

        {/* Mid-size banner below categories */}
        <div className="px-4 mb-6 bg-white py-6">
          <HomepageBanner position="homepage_middle" />
        </div>

        <div className="bg-white">
          <OLXStyleListings />
        </div>

        <div className="bg-red-50 py-8">
          <PackagesShowcase />
        </div>
      </main>
      <BottomNavigation />
      <PWAInstallPrompt />
      {/* <PWAInstallButton /> */}{" "}
      {/* Removed red Install App button as requested */}
      <StaticFooter />
    </div>
  );
}
