'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const categories = [
    { name: 'Jewelry', nameAr: 'مجوهرات', slug: 'jewelry' },
    { name: 'Rings', nameAr: 'خواتم', slug: 'rings' },
    { name: 'Bracelet', nameAr: 'أساور', slug: 'bracelet' },
    { name: 'Necklace', nameAr: 'قلادات', slug: 'necklace' },
    { name: 'Hand Chains', nameAr: 'سلاسل اليد', slug: 'hand-chains' },
    { name: 'Extra Things', nameAr: 'إكسسوارات', slug: 'extra-things' },
    { name: 'New Collection', nameAr: 'تشكيلة جديدة', slug: 'new-collection' },
  ];

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Salma Behery</h1>
              <p className="text-xs text-gray-500 font-arabic">سلمى بحيري</p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-1">
            <Link 
              href="/" 
              className="px-3 py-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
            >
              Home
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="px-3 py-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition text-sm"
                title={cat.nameAr}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Cart & Mobile Button */}
          <div className="flex items-center gap-4">
            <Link 
              href="/cart" 
              className="relative p-2 text-gray-600 hover:text-yellow-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </Link>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t">
            <Link href="/" className="block py-3 text-gray-600 hover:text-yellow-600">Home</Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className="block py-3 text-gray-600 hover:text-yellow-600"
              >
                {cat.name} <span className="text-sm text-gray-400 font-arabic">({cat.nameAr})</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}