import { useState } from "react";
import { MapPin, Menu, Search, Heart, Bell, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  getRohtakSectors,
  getRohtakColonies,
  getRohtakLandmarks,
} from "../data/rohtakLocations";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchType, setSearchType] = useState("sectors");

  const getSearchOptions = () => {
    switch (searchType) {
      case "sectors":
        return getRohtakSectors();
      case "colonies":
        return getRohtakColonies();
      case "landmarks":
        return getRohtakLandmarks();
      default:
        return getRohtakSectors();
    }
  };

  return (
    <header className="bg-[#C70000] text-white sticky top-0 z-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded">
            <span className="text-[#C70000] font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold tracking-wide">
            AASHISH PROPERTY
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <button className="p-2">
            <MapPin className="h-5 w-5" />
          </button>
          <button
            className="p-2 md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center justify-between px-4 pb-2">
        <nav className="flex space-x-6">
          <a href="/" className="text-white hover:text-red-200 font-medium">
            Home
          </a>
          <a
            href="/categories"
            className="text-white hover:text-red-200 font-medium"
          >
            Categories
          </a>
          <a
            href="/post-property"
            className="text-white hover:text-red-200 font-medium"
          >
            Post Property
          </a>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#A60000] px-4 py-4">
          <nav className="flex flex-col space-y-3">
            <a
              href="/"
              className="text-white hover:text-red-200 font-medium py-2"
            >
              Home
            </a>
            <a
              href="/categories"
              className="text-white hover:text-red-200 font-medium py-2"
            >
              Categories
            </a>
            <a
              href="/post-property"
              className="text-white hover:text-red-200 font-medium py-2"
            >
              Post Property
            </a>
          </nav>
        </div>
      )}

      {/* Enhanced Search Bar */}
      <div className="px-4 pb-4">
        {/* Search Type Selector */}
        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => setSearchType("sectors")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              searchType === "sectors"
                ? "bg-white text-[#C70000]"
                : "bg-white bg-opacity-20 text-white"
            }`}
          >
            Sectors
          </button>
          <button
            onClick={() => setSearchType("colonies")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              searchType === "colonies"
                ? "bg-white text-[#C70000]"
                : "bg-white bg-opacity-20 text-white"
            }`}
          >
            Colonies
          </button>
          <button
            onClick={() => setSearchType("landmarks")}
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              searchType === "landmarks"
                ? "bg-white text-[#C70000]"
                : "bg-white bg-opacity-20 text-white"
            }`}
          >
            Landmarks
          </button>
        </div>

        {/* Search Bar with Dropdown */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <Select>
              <SelectTrigger className="h-12 bg-white border-0 text-gray-900">
                <SelectValue placeholder={`Select ${searchType}...`} />
              </SelectTrigger>
              <SelectContent>
                {getSearchOptions().map((option) => (
                  <SelectItem
                    key={option}
                    value={option.toLowerCase().replace(/\s+/g, "-")}
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="h-12 px-6 bg-white text-[#C70000] hover:bg-gray-100"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between px-4 pb-3">
        <div className="flex space-x-4">
          <button className="p-2 bg-white bg-opacity-20 rounded-lg">
            <Heart className="h-5 w-5" />
          </button>
          <button className="p-2 bg-white bg-opacity-20 rounded-lg">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
