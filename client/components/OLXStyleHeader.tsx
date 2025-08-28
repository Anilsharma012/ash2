import React, { useState } from "react";
import {
  Search,
  Heart,
  Menu,
  MapPin,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ROHTAK_AREAS } from "@shared/types";
import MenuDashboard from "./MenuDashboard";

export default function OLXStyleHeader() {
  const { user, isAuthenticated, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/properties?search=${encodeURIComponent(searchQuery)}`;
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    window.location.href = `/properties?search=${encodeURIComponent(suggestion)}`;
  };

  const filteredAreas = ROHTAK_AREAS.filter((area) =>
    area.toLowerCase().includes(searchQuery.toLowerCase()),
  ).slice(0, 5);

  const handleLocationClick = () => {
    // Location selector logic here
    console.log("Location selector clicked");
  };

  const handleFavoritesClick = () => {
    window.location.href = "/favorites";
  };

  const handleMenuClick = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-[#C70000] border-b border-red-800 sticky top-0 z-40">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Menu Button */}
          <button
            onClick={handleMenuClick}
            className="p-2 hover:bg-red-700 rounded-lg transition-colors"
          >
            <Menu className="h-6 w-6 text-white" />
          </button>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold">
              <span className="text-white">AASHISH</span>
              <span className="text-white"> PROPERTY</span>
            </div>
          </div>

          {/* Location */}
          <button
            onClick={handleLocationClick}
            className="flex items-center space-x-1 text-white hover:bg-red-700 px-2 py-1 rounded-lg transition-colors"
          >
            <MapPin className="h-4 w-4 text-white" />
            <span className="text-sm font-medium">India</span>
            <ChevronDown className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-3 relative">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties in Rohtak..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => setShowSuggestions(searchQuery.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-10 pr-12 py-3 border-2 border-white border-opacity-30 rounded-lg focus:border-white focus:outline-none text-white placeholder-white placeholder-opacity-70 bg-white bg-opacity-20 backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={handleFavoritesClick}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
              >
                <Heart className="h-5 w-5 text-white opacity-70" />
              </button>
            </div>

            {/* Search Suggestions */}
            {showSuggestions &&
              (searchQuery.length > 0 || filteredAreas.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-60 overflow-y-auto">
                  {searchQuery.length > 0 && (
                    <div className="p-2 border-b border-gray-100">
                      <div className="text-xs text-gray-500 mb-2 px-2">
                        Search for:
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSuggestionClick(searchQuery)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                      >
                        <Search className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">"{searchQuery}"</span>
                      </button>
                    </div>
                  )}

                  {filteredAreas.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs text-gray-500 mb-2 px-2">
                        Rohtak Areas:
                      </div>
                      {filteredAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => handleSuggestionClick(area)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                        >
                          <MapPin className="h-4 w-4 text-[#C70000]" />
                          <span className="text-gray-900">{area}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchQuery.length === 0 && (
                    <div className="p-2">
                      <div className="text-xs text-gray-500 mb-2 px-2">
                        Popular Areas:
                      </div>
                      {ROHTAK_AREAS.slice(0, 5).map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => handleSuggestionClick(area)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center space-x-2"
                        >
                          <MapPin className="h-4 w-4 text-[#C70000]" />
                          <span className="text-gray-900">{area}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
          </form>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="bg-white w-80 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {isAuthenticated ? "Dashboard" : "Menu"}
              </h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            {isAuthenticated ? (
              <MenuDashboard onClose={() => setIsMenuOpen(false)} />
            ) : (
              <div className="p-4">
                <nav className="space-y-2 mb-8">
                  <a
                    href="/"
                    className="block px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-700"
                  >
                    Home
                  </a>
                  <a
                    href="/categories"
                    className="block px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-700"
                  >
                    Categories
                  </a>
                  <a
                    href="/post-property"
                    className="block px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-700"
                  >
                    Sell
                  </a>
                  <a
                    href="/my-account"
                    className="block px-4 py-3 hover:bg-gray-100 rounded-lg text-gray-700"
                  >
                    My Account
                  </a>
                </nav>

                <div className="pt-6 border-t border-gray-200">
                  <a
                    href="/auth"
                    className="block px-4 py-3 text-[#C70000] font-semibold hover:bg-red-50 rounded-lg"
                  >
                    Login / Sign Up
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
