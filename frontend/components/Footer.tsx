import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <div>
                <h3 className="font-bold">Salma Behery</h3>
                <p className="text-xs text-gray-400 font-arabic">سلمى بحيري</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">
              Premium jewelry for every occasion. Handcrafted with love.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4 text-yellow-400">Collections</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/categories/jewelry" className="hover:text-white transition">Jewelry</Link></li>
              <li><Link href="/categories/rings" className="hover:text-white transition">Rings</Link></li>
              <li><Link href="/categories/bracelet" className="hover:text-white transition">Bracelets</Link></li>
              <li><Link href="/categories/necklace" className="hover:text-white transition">Necklaces</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold mb-4 text-yellow-400">Contact</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>📧 info@salmabehery.com</li>
              <li>📱 +20 123 456 7890</li>
              <li>📍 Cairo, Egypt</li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-bold mb-4 text-yellow-400">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-yellow-600 transition">
                <span className="text-sm">IG</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-yellow-600 transition">
                <span className="text-sm">FB</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-yellow-600 transition">
                <span className="text-sm">WA</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>© 2024 Salma Behery. All rights reserved. | سلمى بحيري</p>
        </div>
      </div>
    </footer>
  );
}