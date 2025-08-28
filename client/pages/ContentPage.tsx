import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Button } from "../components/ui/button";
import Footer from "../components/Footer";

interface ContentPageData {
  _id: string;
  title: string;
  slug: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function ContentPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<ContentPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (slug) {
      fetchPage();
    }
  }, [slug]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/content/pages/slug/${slug}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPage(data.data);
          // Update page title and meta tags
          if (data.data.metaTitle) {
            document.title = data.data.metaTitle;
          } else {
            document.title = `${data.data.title} - Aashish Property`;
          }

          if (data.data.metaDescription) {
            const metaDesc = document.querySelector('meta[name="description"]');
            if (metaDesc) {
              metaDesc.setAttribute("content", data.data.metaDescription);
            }
          }
        } else {
          setError(data.error || "Page not found");
        }
      } else {
        setError("Page not found");
      }
    } catch (error) {
      console.error("Error fetching page:", error);
      setError("Failed to load page");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg shadow-sm p-8">
          {/* Page Header */}
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {page.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Updated {new Date(page.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>Aashish Property</span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />

          {/* Page Footer */}
          <footer className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-600">
                This page was last updated on{" "}
                {new Date(page.updatedAt).toLocaleDateString()}
              </div>
              <div className="flex space-x-4">
                <Button asChild variant="outline" size="sm">
                  <Link to="/contact-us">Contact Support</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="bg-[#C70000] hover:bg-[#A60000]"
                >
                  <Link to="/">Browse Properties</Link>
                </Button>
              </div>
            </div>
          </footer>
        </article>
      </div>

      <Footer />
    </div>
  );
}
