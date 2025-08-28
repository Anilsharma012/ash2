import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Home,
  Bed,
  Bath,
} from "lucide-react";
import { safeFetch, NetworkError } from "../utils/network-utils";

interface Advertisement {
  _id: string;
  title: string;
  description: string;
  image: string;
  link?: string;
  position: string;
  active: boolean;
}

interface Property {
  _id: string;
  title: string;
  description: string;
  price: number;
  priceType: "sale" | "rent";
  propertyType: string;
  images: string[];
  location: {
    sector?: string;
    mohalla?: string;
    city?: string;
  };
  specifications: {
    bedrooms?: number;
    bathrooms?: number;
    area?: number;
  };
  featured: boolean;
}

const PropertyAdsSlider: React.FC = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Combine advertisements and properties into a single display list
  const slides = React.useMemo(() => {
    const items: Array<{
      type: "ad" | "property";
      data: Advertisement | Property;
    }> = [];

    // Add advertisements first
    ads.forEach((ad) => items.push({ type: "ad", data: ad }));

    // Add featured properties if no ads or as fallback
    properties.forEach((property) =>
      items.push({ type: "property", data: property }),
    );

    return items;
  }, [ads, properties]);

  // Fetch advertisements and properties
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Try to fetch advertisements first (using banners with home position)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const adsResponse = await fetch(
            "/api/banners?active=true",
            {
              signal: controller.signal,
              headers: {
                "Cache-Control": "no-cache",
              },
            },
          );

          clearTimeout(timeoutId);

          if (adsResponse.ok) {
            const adsData = await adsResponse.json();
            if (
              adsData.success &&
              adsData.data &&
              Array.isArray(adsData.data)
            ) {
              const mappedAds: Advertisement[] = adsData.data.map((b: any) => ({
                _id: b._id || Math.random().toString(36).slice(2),
                title: b.title,
                description: "",
                image: b.imageUrl,
                link: b.link,
                position: "homepage_middle",
                active: b.isActive !== false,
              }));
              setAds(mappedAds);
              console.log("✅ Loaded", mappedAds.length, "home advertisements");
            }
          }
        } catch (error: any) {
          if (error.name === "AbortError") {
            console.warn("⏰ Advertisement fetch timed out");
          } else if (error.message?.includes("Failed to fetch")) {
            console.warn("🌐 Network issue fetching advertisements");
          } else {
            console.warn("⚠️ Failed to fetch advertisements:", error);
          }
        }

        // Fetch featured properties as fallback
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const propertiesResponse = await fetch("/api/properties/featured", {
            signal: controller.signal,
            headers: {
              "Cache-Control": "no-cache",
            },
          });

          clearTimeout(timeoutId);
          if (propertiesResponse.ok) {
            const propertiesData = await propertiesResponse.json();
            if (
              propertiesData.success &&
              propertiesData.data &&
              Array.isArray(propertiesData.data)
            ) {
              setProperties(propertiesData.data);
              console.log(
                "✅ Loaded",
                propertiesData.data.length,
                "featured properties",
              );
            }
          }
        } catch (error: any) {
          if (error.name === "AbortError") {
            console.warn("⏰ Featured properties fetch timed out");
          } else if (error.message?.includes("Failed to fetch")) {
            console.warn("🌐 Network issue fetching featured properties");
          } else {
            console.warn("⚠️ Failed to fetch featured properties:", error);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [slides.length, isAutoPlaying]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleCardClick = (item: {
    type: "ad" | "property";
    data: Advertisement | Property;
  }) => {
    if (item.type === "ad") {
      const ad = item.data as Advertisement;
      if (ad.link) {
        window.location.href = ad.link;
      }
    } else {
      const property = item.data as Property;
      window.location.href = `/property/${property._id}`;
    }
  };

  const formatPrice = (price: number, priceType: string) => {
    const formatted = price.toLocaleString("en-IN");
    return priceType === "rent" ? `₹${formatted}/month` : `₹${formatted}`;
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="flex space-x-4 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-80 h-48 bg-gray-200 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-6 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Featured Properties & Ads
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`px-3 py-1 text-sm rounded ${
                isAutoPlaying
                  ? "bg-red-100 text-red-600"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {isAutoPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </div>

        <div className="relative">
          {/* Carousel Container */}
          <div className="overflow-hidden rounded-lg">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {slides.map((item, index) => {
                const isAd = item.type === "ad";
                const data = item.data;

                return (
                  <div
                    key={`${item.type}-${data._id}-${index}`}
                    className="w-full flex-shrink-0"
                    data-testid="home-ad-card"
                  >
                    <div
                      onClick={() => handleCardClick(item)}
                      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    >
                      {isAd ? (
                        // Advertisement Card
                        <div className="relative h-64">
                          <img
                            src={(data as Advertisement).image}
                            alt={(data as Advertisement).title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/placeholder.svg";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent">
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                              <h3 className="text-lg font-bold mb-2">
                                {(data as Advertisement).title}
                              </h3>
                              <p className="text-sm opacity-90 line-clamp-2">
                                {(data as Advertisement).description}
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-4 right-4">
                            <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                              Ad
                            </span>
                          </div>
                        </div>
                      ) : (
                        // Property Card
                        <div>
                          <div className="relative h-64">
                            <img
                              src={
                                (data as Property).images[0] ||
                                "/placeholder.svg"
                              }
                              alt={(data as Property).title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "/placeholder.svg";
                              }}
                            />
                            <div className="absolute top-4 left-4">
                              <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                                Featured
                              </span>
                            </div>
                            <div className="absolute top-4 right-4">
                              <span className="bg-white/90 text-gray-900 px-2 py-1 rounded text-sm font-semibold">
                                {formatPrice(
                                  (data as Property).price,
                                  (data as Property).priceType,
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                              {(data as Property).title}
                            </h3>
                            <div className="flex items-center text-gray-600 mb-2">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span className="text-sm">
                                {(data as Property).location.sector ||
                                  (data as Property).location.mohalla ||
                                  (data as Property).location.city}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Home className="w-4 h-4 mr-1" />
                                <span>{(data as Property).propertyType}</span>
                              </div>
                              {(data as Property).specifications.bedrooms && (
                                <div className="flex items-center">
                                  <Bed className="w-4 h-4 mr-1" />
                                  <span>
                                    {(data as Property).specifications.bedrooms}{" "}
                                    BD
                                  </span>
                                </div>
                              )}
                              {(data as Property).specifications.bathrooms && (
                                <div className="flex items-center">
                                  <Bath className="w-4 h-4 mr-1" />
                                  <span>
                                    {
                                      (data as Property).specifications
                                        .bathrooms
                                    }{" "}
                                    BA
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Arrows */}
          {slides.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Slide Indicators */}
          {slides.length > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? "bg-red-600 w-6"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyAdsSlider;
