import React, { useState, useEffect } from "react";
import { BannerAd } from "@shared/types";

interface HomepageBannerProps {
  position: "homepage_top" | "homepage_middle" | "homepage_bottom";
  className?: string;
}

export default function HomepageBanner({
  position,
  className = "",
}: HomepageBannerProps) {
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, [position]);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000); // Auto-rotate every 5 seconds

      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      console.log(`🏷️ Fetching banners for position: ${position}`);

      // Add timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("⏰ Banners request timeout");
        controller.abort();
      }, 8000);

      const response = await fetch(`/api/banners/${position}`, {
        signal: controller.signal,
        cache: "no-cache",
      });

      clearTimeout(timeoutId);

      console.log("📡 Banners response:", {
        status: response.status,
        ok: response.ok,
        url: response.url,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Banners data:", data);

        if (data.success && Array.isArray(data.data)) {
          setBanners(data.data);
        } else {
          console.log("⚠️ No banner data or invalid format");
        }
      } else {
        console.log(`⚠️ Banners request failed: ${response.status}`);
      }
    } catch (error: any) {
      console.error("Error fetching banners:", {
        error: error.message || error,
        name: error.name,
        position: position,
      });

      // Provide appropriate logging based on error type
      if (error.name === "AbortError") {
        console.log("🔄 Banners request timed out");
      } else if (error.message?.includes("Failed to fetch")) {
        console.log("🌐 Network connectivity issue for banners");
      }

      // Set empty banners array - component will handle no banners gracefully
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = (banner: BannerAd) => {
    if (banner.link) {
      // Track banner click analytics if needed
      window.open(banner.link, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-lg h-24 md:h-32"></div>
      </div>
    );
  }

  if (!banners.length) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-lg shadow-sm">
        <div
          className="relative cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => handleBannerClick(currentBanner)}
        >
          {/* Banner Image */}
          <div className="relative">
            <img
              src={currentBanner.image}
              alt={currentBanner.title}
              className="w-full h-24 md:h-32 object-cover rounded-lg"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.src = `https://via.placeholder.com/800x200/f97316/ffffff?text=${encodeURIComponent(currentBanner.title)}`;
              }}
            />

            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent rounded-lg"></div>
          </div>

          {/* Banner Content */}
          <div className="absolute inset-0 flex items-center justify-between p-4">
            <div className="text-white">
              <h3 className="text-sm md:text-lg font-bold leading-tight">
                {currentBanner.title}
              </h3>
              <p className="text-xs md:text-sm opacity-90 mt-1 line-clamp-2">
                {currentBanner.description}
              </p>
            </div>

            {/* Call-to-action arrow */}
            {currentBanner.link && (
              <div className="text-white/80 hover:text-white transition-colors">
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Banner indicators (dots) if multiple banners */}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Banner label for admin identification */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-500 mt-1 text-center">
          Banner: {position}
        </div>
      )}
    </div>
  );
}
