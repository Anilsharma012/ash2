import React from "react";
import { useQuery } from "@tanstack/react-query";

interface SubcategoryDoc {
  _id?: string;
  categoryId: string;
  name: string;
  slug: string;
  iconUrl: string;
  sortOrder: number;
  isActive: boolean;
}

interface CategoryDoc {
  _id?: string;
  name: string;
  slug: string;
  iconUrl: string;
  sortOrder: number;
  isActive: boolean;
  subcategories?: SubcategoryDoc[];
}


function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function HomeCategoriesStrip() {
  const { data, isLoading } = useQuery({
    queryKey: ["home-categories-strip"],
    queryFn: async () => {
      const res = await fetch("/api/public/categories", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load categories");
      const json = await res.json();
      return (json as any[]) || [];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const categories = React.useMemo(() => {
    return (data || []).map((c: any) => ({
      ...c,
      slug: c.slug || slugify(c.name),
      subcategories: (c.subcategories || []).slice(),
    }));
  }, [data]);

  if (isLoading) {
    return (
      <section className="bg-white py-4">
        <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 animate-pulse">
              <div className="h-6 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-24 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-28 bg-gray-200 rounded mb-1" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!categories.length) {
    return (
      <section className="bg-white py-4">
        <div className="px-4 text-center text-gray-600">No categories yet</div>
      </section>
    );
  }

  return (
    <section className="bg-white py-4">
      <div className="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.slice(0, 6).map((cat) => (
          <div key={cat._id || cat.slug} className="border rounded-lg p-4">
            <a
              href={`/categories/${cat.slug}`}
              className="block text-lg font-semibold text-gray-900 hover:text-[#C70000]"
            >
              {cat.name}
            </a>
            <div className="mt-2 flex flex-wrap gap-2">
              {(cat.subcategories || []).slice(0, 4).map((sub) => (
                <a
                  key={sub._id || sub.slug}
                  href={`/categories/${cat.slug}/${sub.slug}`}
                  className="text-sm text-[#C70000] hover:underline"
                >
                  {sub.name}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
