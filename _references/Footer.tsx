import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();

  return (
    <footer className="relative w-full bg-black text-white">
      {/* Main Footer Content */}
      <div className="px-4 md:px-8 lg:px-16 xl:px-24 py-16 md:py-20">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <img
                  src="/images/outpost-logo.png"
                  alt="Outpost Custom"
                  className="h-12 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      const textLogo = document.createElement('h2');
                      textLogo.textContent = 'OUTPOST CUSTOM';
                      textLogo.className = 'text-2xl font-bold';
                      textLogo.style.color = '#6da71d';
                      parent.appendChild(textLogo);
                    }
                  }}
                />
              </div>
              <p className="text-gray-400 leading-relaxed mb-6 max-w-sm">
                Quality custom printed garments and merchandise. Independent UK printer based in Kidderminster.
              </p>

              {/* Contact Info */}
              <div className="space-y-3">
                <a
                  href="mailto:info@outpostcustom.com"
                  className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors duration-300"
                >
                  <Mail className="w-4 h-4" style={{ color: '#6da71d' }} />
                  <span className="text-sm">info@outpostcustom.com</span>
                </a>
                <a
                  href="tel:+441234567890"
                  className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors duration-300"
                >
                  <Phone className="w-4 h-4" style={{ color: '#6da71d' }} />
                  <span className="text-sm">+44 123 456 7890</span>
                </a>
                <div className="flex items-center gap-3 text-gray-400">
                  <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#6da71d' }} />
                  <span className="text-sm">Kidderminster, United Kingdom</span>
                </div>
              </div>
            </div>

            {/* Shop Column */}
            <div>
              <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-sm">
                Shop
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'All Clothing', path: '/clothing' },
                  { label: 'Collections', path: '/collections' },
                  { label: 'T-Shirts', path: '/clothing?productTypes=T-Shirts' },
                  { label: 'Hoodies', path: '/clothing?productTypes=Hoodies' },
                  { label: 'Bags', path: '/clothing?productTypes=Bags' },
                  { label: 'Caps', path: '/clothing?productTypes=Caps' },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.path)}
                      className="text-gray-400 hover:text-white transition-colors duration-300 text-sm text-left"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-sm">
                Company
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'About Us', path: '#' },
                  { label: 'Our Services', path: '#' },
                  { label: 'Blog', path: '/blog' },
                  { label: 'Printing', path: '/printing' },
                  { label: 'Sustainability', path: '#' },
                  { label: 'Contact Us', path: '#' },
                ].map((item) => (
                  <li key={item.label}>
                    <button
                      onClick={() => navigate(item.path)}
                      className="text-gray-400 hover:text-white transition-colors duration-300 text-sm text-left"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Column */}
            <div>
              <h3 className="font-semibold text-white mb-4 uppercase tracking-wider text-sm">
                Support
              </h3>
              <ul className="space-y-3">
                {[
                  'Help Center',
                  'Shipping Info',
                  'Returns & Refunds',
                  'Order Tracking',
                  'Size Guide',
                  'FAQs',
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Social Media & Bottom Bar */}
          <div className="pt-8 border-t border-white/10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              {/* Social Links */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 uppercase tracking-wider">
                  Follow Us
                </span>
                <div className="flex gap-3">
                  {[
                    { icon: Instagram, href: 'https://instagram.com' },
                    { icon: Facebook, href: 'https://facebook.com' },
                    { icon: Twitter, href: 'https://twitter.com' },
                    { icon: Youtube, href: 'https://youtube.com' },
                  ].map((social, index) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={index}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center transition-all duration-300 group"
                      >
                        <Icon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Legal Links */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                <a href="#" className="hover:text-white transition-colors duration-300">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  Cookie Policy
                </a>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-8 text-center text-sm text-gray-500">
              <p>© {currentYear} Outpost Custom. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
