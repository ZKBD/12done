import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Search, Home, Key, Building2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary">
            12done
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/properties">
              <Button variant="ghost">Browse</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80')",
          }}
        />
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Find Your Perfect
            <span className="text-primary"> Home</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            Discover properties for sale, rent, and more. Connect directly with owners
            and make your next move.
          </p>

          {/* Search Bar */}
          <div className="bg-white rounded-full p-2 flex items-center max-w-2xl mx-auto shadow-2xl">
            <div className="flex-1 flex items-center px-4">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                placeholder="Search by city, address, or keyword..."
                className="w-full py-3 text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </div>
            <Button size="lg" className="rounded-full px-8">
              Search
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Everything you need in one place
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Home className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Buy a Home</h3>
              <p className="text-slate-600">
                Find your dream home from thousands of listings. Negotiate directly
                with owners and save on agent fees.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Key className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Rent a Property</h3>
              <p className="text-slate-600">
                Short-term or long-term rentals. Browse availability calendars and
                book inspections online.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">List Your Property</h3>
              <p className="text-slate-600">
                Reach thousands of potential buyers and renters. Manage your
                listings, pricing, and bookings easily.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to find your new home?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of happy homeowners and renters who found their perfect
            property through 12done.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/properties">
              <Button size="lg" variant="secondary" className="px-8">
                Browse Properties
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="px-8 border-white text-white hover:bg-white hover:text-primary"
              >
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-2xl font-bold text-white">12done</span>
              <p className="text-sm mt-1">Find your perfect property</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
            &copy; {new Date().getFullYear()} 12done. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
