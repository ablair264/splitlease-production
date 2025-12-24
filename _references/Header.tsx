import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Heart, Send, ChevronDown, Sparkles, ArrowRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useTheme } from '../contexts/ThemeContext';
import OrderDrawer from './OrderDrawer';
import WishlistDrawer from './WishlistDrawer';

interface MegaMenuLink {
  label: string;
  href: string;
  children?: MegaMenuLink[];
}

interface MegaMenuSection {
  title?: string;
  items: MegaMenuLink[];
}

interface NavigationItem {
  label: string;
  href?: string;
  megaSections?: MegaMenuSection[];
  customMegaMenu?: 'clothing' | 'signage' | 'printing' | 'vehicle';
}

// Clothing mega menu - Tops category
const clothingTops = [
  { label: 'T-Shirts', href: '/clothing?productTypes=T-Shirts' },
  { label: 'Polos', href: '/clothing?productTypes=Polos' },
  { label: 'Sweatshirts', href: '/clothing?productTypes=Sweatshirts' },
  { label: 'Hoodies', href: '/clothing?productTypes=Hoodies' },
  { label: 'Shirts', href: '/clothing?productTypes=Shirts' },
];

// Clothing mega menu - Outerwear & Workwear
const clothingOuterwear = [
  { label: 'Jackets', href: '/clothing?productTypes=Jackets' },
  { label: 'Gilets', href: '/clothing?productTypes=Gilets%20%26%20Body%20Warmers' },
  { label: 'Softshells', href: '/clothing?productTypes=Softshells' },
  { label: 'Aprons', href: '/clothing?productTypes=Aprons' },
  { label: 'Safety Vests', href: '/clothing?productTypes=Safety%20Vests' },
];

// Clothing mega menu - Other categories
const clothingOther = [
  { label: 'Caps & Hats', href: '/clothing?productTypes=Caps,Hats,Beanies' },
  { label: 'Bags', href: '/clothing?productTypes=Bags' },
  { label: 'Accessories', href: '/clothing?productTypes=Accessories' },
  { label: 'All Clothing', href: '/clothing' },
];

// Legacy - kept for any remaining references
const clothingCategories = [
  { label: 'Tops', href: '/clothing?productTypes=T-Shirts,Polos,Sweatshirts,Hoodies' },
  { label: 'Outerwear', href: '/clothing?productTypes=Jackets,Gilets%20%26%20Body%20Warmers,Softshells' },
  { label: 'Bottoms', href: '/clothing?productTypes=Trousers,Shorts,Jeans' },
  { label: 'Workwear', href: '/clothing?productTypes=Aprons,Safety%20Vests,Coveralls' },
  { label: 'Headwear', href: '/clothing?productTypes=Caps,Beanies,Hats' },
  { label: 'Bags & Accessories', href: '/clothing?productTypes=Bags,Accessories' },
];

// Signage mega menu data
const signageIndoor = [
  { label: 'Glass Manifestation', href: '/services/glass-manifestation' },
  { label: 'Window Privacy Film', href: '/services/window-privacy-film' }
];

const signageOutdoor = [
  { label: 'Signboards', href: '/services/signboards' },
  { label: 'Pavement Signs', href: '/services/pavement-signs' },
  { label: 'Projecting Signs', href: '/services/projecting-signs' }
];

const signageEvents = [
  { label: 'Gazebos', href: '/services/gazebos' },
  { label: 'Parasols', href: '/services/parasols' },
  { label: 'Tablecloths', href: '/services/tablecloths' }
];

// Printing mega menu data - organized by product type categories
const printingCards = [
  { label: 'Business Cards', href: '/printing/all?type=cards' },
  { label: 'Appointment Cards', href: '/printing/all?type=cards' },
  { label: 'Loyalty Cards', href: '/printing/all?type=cards' },
  { label: 'Gift Vouchers', href: '/printing/all?type=cards' },
  { label: 'All Cards', href: '/printing/all?type=cards' }
];

const printingMarketing = [
  { label: 'Flyers & Leaflets', href: '/printing/all?type=flyers' },
  { label: 'Posters & Prints', href: '/printing/all?type=posters' },
  { label: 'Booklets & Brochures', href: '/printing/all?type=booklets' },
  { label: 'Stickers & Labels', href: '/printing/all?type=stickers' },
  { label: 'Calendars', href: '/printing/all?type=calendars' }
];

const printingOther = [
  { label: 'Stationery', href: '/printing/all?type=stationery' },
  { label: 'Packaging & Tags', href: '/printing/all?type=packaging' },
  { label: 'Specialty Items', href: '/printing/all?type=specialty' },
  { label: 'All Products', href: '/printing/all' }
];

// Vehicle Graphics mega menu data
const vehicleServices = [
  { label: 'Vehicle Signwriting', href: '/services/vehicle-signwriting' },
  { label: 'Magnetic Signs', href: '/services/vehicle-signwriting' }
];

const navigationItems: NavigationItem[] = [
  { label: 'HOME', href: '/' },
  {
    label: 'CLOTHING',
    href: '/shop',
    customMegaMenu: 'clothing',
    megaSections: [
      {
        title: 'Shop Clothing',
        items: [
          { label: 'Custom Clothing', href: '/shop' },
          { label: 'Customisable Garments', href: '/categories' },
          { label: 'Collections', href: '/collections' }
        ]
      },
      {
        title: 'Guides',
        items: [
          {
            label: 'Guides',
            href: '/collections',
            children: [
              { label: 'Summer Uniforms', href: '/collections/Summer%20Uniforms' },
              { label: 'Hospitality Garments', href: '/collections/Hospitality%20Garments' }
            ]
          },
          { label: 'Browse All Clothing', href: '/clothing' }
        ]
      }
    ]
  },
  {
    label: 'SIGNAGE',
    href: '/services/all-signage',
    customMegaMenu: 'signage'
  },
  {
    label: 'VEHICLE GRAPHICS',
    href: '/services/vehicle-signwriting',
    customMegaMenu: 'vehicle'
  },
  {
    label: 'PRINTING',
    href: '/printing',
    customMegaMenu: 'printing'
  }
];

const getGridColsClass = (count: number) => {
  if (count >= 4) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
  return 'grid-cols-1';
};

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = '' }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileMenuState, setMobileMenuState] = useState<Record<string, boolean>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const { cart } = useCart();
  const { wishlist } = useWishlist();
  const { colorScheme, colors } = useTheme();
  // Removed filterData - filter bar now rendered directly in ClothingBrowser

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    document.body.style.paddingTop = headerHeight ? `${headerHeight}px` : '';
    return () => {
      document.body.style.paddingTop = '';
    };
  }, [headerHeight]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleMobileSubmenu = (key: string) => {
    setMobileMenuState((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderMegaMenu = (sections: MegaMenuSection[], parentLabel: string) => (
    <div className="absolute left-1/2 top-full z-50 w-screen max-w-[1100px] -translate-x-1/2 pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 ease-out">
      <div className="rounded-xl border border-[#333333]/20 bg-[#c1c6c8] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        <div className={`grid gap-8 ${getGridColsClass(sections.length)}`}>
          {sections.map((section, sectionIndex) => (
            <div key={`${parentLabel}-${section.title ?? sectionIndex}`} className="space-y-3">
              {section.title && (
                <p className="embossing-font text-[16px] uppercase tracking-[0.15em] text-[#183028]">
                  {section.title}
                </p>
              )}
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={`${parentLabel}-${item.label}`}>
                    <a
                      href={item.href}
                      className="group/link flex items-center justify-between rounded-lg px-3 py-2 grotesk-font text-sm text-[#333333] transition-colors hover:bg-[#183028]/10"
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-transparent group-hover/link:text-[#64a70b] group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                    </a>
                    {item.children && (
                      <ul className="mt-2 space-y-1 border-l border-[#333333]/20 pl-4">
                        {item.children.map((child) => (
                          <li key={`${parentLabel}-${item.label}-${child.label}`}>
                            <a
                              href={child.href}
                              className="grotesk-font block rounded px-2 py-1 text-sm text-[#333333]/70 transition-colors hover:text-[#64a70b]"
                            >
                              {child.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPrintingMegaMenu = () => (
    <div className="absolute left-1/2 top-full z-50 w-screen max-w-[820px] -translate-x-1/2 pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 ease-out">
      <div className="rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ backgroundColor: colors.megaMenuBg }}>

        <div className="grid grid-cols-[1fr_280px]">

          {/* Left - Navigation with sections */}
          <div className="p-5 border-r border-white/10">
            <div className="grid grid-cols-3 gap-6">
              {/* Cards */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>Cards</h3>
                <ul className="space-y-0.5">
                  {printingCards.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${index * 25}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" style={{ '--tw-text-opacity': 1 } as React.CSSProperties} strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Marketing & Print */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>Marketing</h3>
                <ul className="space-y-0.5">
                  {printingMarketing.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${125 + index * 25}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Other */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>More</h3>
                <ul className="space-y-0.5">
                  {printingOther.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${250 + index * 25}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-white/10 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]" style={{ animationDelay: '350ms' }}>
              <a href="/printing/all" className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 grotesk-font text-[11px] text-white/70 hover:text-white transition-all" style={{ backgroundColor: `${colors.secondary}4d` }}>
                Browse All Products
              </a>
            </div>
          </div>

          {/* Right - Feature Cards */}
          <div className="p-4">
            <div className="flex flex-col gap-3">
              {/* Featured Card - All Printing */}
              <a
                href="/printing/all"
                className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[130px]"
                style={{ animationDelay: '50ms' }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                  style={{ backgroundImage: 'url(/what-we-do/printing.webp)' }}
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <span className="embossing-font text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: colors.accent }}>Featured</span>
                  <h4 className="hearns-font text-lg text-white mb-0.5">Print Services</h4>
                  <p className="grotesk-font text-[11px] text-white/60">Quality printing for your business</p>
                </div>
              </a>

              {/* Blog Post Feature Card */}
              <a
                href="/printing"
                className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[130px]"
                style={{ animationDelay: '100ms' }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                  style={{ backgroundImage: 'url(/images/sticker.webp)' }}
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <span className="embossing-font text-[9px] uppercase tracking-[0.12em] text-[#c1c6c8] mb-1">Learn More</span>
                  <h4 className="hearns-font text-lg text-white mb-0.5">About Printing</h4>
                  <p className="grotesk-font text-[11px] text-white/60">Discover our print capabilities</p>
                </div>
              </a>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  const renderVehicleMegaMenu = () => (
    <div className="absolute left-1/2 top-full z-50 w-screen max-w-[620px] -translate-x-1/2 pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 ease-out">
      <div className="rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ backgroundColor: colors.megaMenuBg }}>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">

            {/* Card 1 - Vehicle Signwriting */}
            <a
              href="/services/vehicle-signwriting"
              className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[150px]"
              style={{ animationDelay: '0ms', backgroundColor: colors.megaMenuBg }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                style={{ backgroundImage: 'url(/vehicle-signwriting/vehicle1.jpg)' }}
              />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
              <div className="relative h-full p-4 flex flex-col justify-end">
                <span className="embossing-font text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: colors.accent }}>Featured</span>
                <h4 className="hearns-font text-lg text-white mb-1">Vehicle Signwriting</h4>
                <p className="grotesk-font text-xs text-white/60">Custom graphics for your fleet</p>
              </div>
            </a>

            {/* Card 2 - Blog Post */}
            <a
              href="/blog/vehicle-branding"
              className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[150px]"
              style={{ animationDelay: '80ms', backgroundColor: colors.megaMenuBg }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                style={{ backgroundImage: 'url(/vehicle-signwriting/vehicle5.jpg)' }}
              />
              <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
              <div className="relative h-full p-4 flex flex-col justify-end">
                <span className="embossing-font text-[9px] uppercase tracking-[0.12em] text-[#c1c6c8] mb-1">From the Blog</span>
                <h4 className="hearns-font text-lg text-white mb-1">Branding Guide</h4>
                <p className="grotesk-font text-xs text-white/60">Maximise your mobile advertising</p>
              </div>
            </a>

          </div>

          {/* Compact Actions */}
          <div className="flex gap-2 mt-3 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]" style={{ animationDelay: '150ms' }}>
            <a
              href="/services/vehicle-signwriting"
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 grotesk-font text-[11px] text-white/70 hover:text-white transition-all"
              style={{ backgroundColor: `${colors.secondary}4d` }}
            >
              Learn More
            </a>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  const renderSignageMegaMenu = () => (
    <div className="absolute left-1/2 top-full z-50 w-screen max-w-[820px] -translate-x-1/2 pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 ease-out">
      <div className="rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ backgroundColor: colors.megaMenuBg }}>

        <div className="grid grid-cols-[1fr_280px]">

          {/* Left - Navigation with sections */}
          <div className="p-5 border-r border-white/10">
            <div className="grid grid-cols-3 gap-6">
              {/* Indoor */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>Indoor</h3>
                <ul className="space-y-0.5">
                  {signageIndoor.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${index * 30}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outdoor */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>Outdoor</h3>
                <ul className="space-y-0.5">
                  {signageOutdoor.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${60 + index * 30}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Event */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>Event</h3>
                <ul className="space-y-0.5">
                  {signageEvents.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${150 + index * 30}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-white/10 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]" style={{ animationDelay: '250ms' }}>
              <a href="/services/all-signage" className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 grotesk-font text-[11px] text-white/70 hover:text-white transition-all" style={{ backgroundColor: `${colors.secondary}4d` }}>
                View All Signage
              </a>
            </div>
          </div>

          {/* Right - Feature Cards */}
          <div className="p-4">
            <div className="flex flex-col gap-3">
              {/* Featured Card - All Signage */}
              <a
                href="/services/all-signage"
                className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[130px]"
                style={{ animationDelay: '50ms' }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                  style={{ backgroundImage: 'url(/signboards/signboard1.jpg)' }}
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <span className="embossing-font text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: colors.accent }}>Featured</span>
                  <h4 className="hearns-font text-lg text-white mb-0.5">Business Signage</h4>
                  <p className="grotesk-font text-[11px] text-white/60">Premium signs for your premises</p>
                </div>
              </a>

              {/* Blog Post Feature Card */}
              <a
                href="/blog"
                className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[130px]"
                style={{ animationDelay: '100ms' }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                  style={{ backgroundImage: 'url(/projecting-signs/projecting1.jpg)' }}
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <span className="embossing-font text-[9px] uppercase tracking-[0.12em] text-[#c1c6c8] mb-1">From the Blog</span>
                  <h4 className="hearns-font text-lg text-white mb-0.5">Signage Guide</h4>
                  <p className="grotesk-font text-[11px] text-white/60">Choosing the right signs for you</p>
                </div>
              </a>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  const renderClothingMegaMenu = () => (
    <div className="absolute left-1/2 top-full z-50 w-screen max-w-[820px] -translate-x-1/2 pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-300 ease-out">
      <div className="rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ backgroundColor: colors.megaMenuBg }}>

        <div className="grid grid-cols-[1fr_280px]">

          {/* Left - Navigation with sections */}
          <div className="p-5 border-r border-white/10">
            <div className="grid grid-cols-3 gap-6">
              {/* Tops */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>Tops</h3>
                <ul className="space-y-0.5">
                  {clothingTops.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${index * 25}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" style={{ '--tw-text-opacity': 1 } as React.CSSProperties} strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Outerwear & Workwear */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>Outerwear</h3>
                <ul className="space-y-0.5">
                  {clothingOuterwear.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${125 + index * 25}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Other */}
              <div>
                <h3 className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2" style={{ color: colors.accent }}>More</h3>
                <ul className="space-y-0.5">
                  {clothingOther.map((item, index) => (
                    <li key={item.label} className="opacity-0 animate-[fadeSlideIn_0.25s_ease-out_forwards]" style={{ animationDelay: `${250 + index * 25}ms` }}>
                      <a href={item.href} className="group/link flex items-center gap-2 py-1.5 grotesk-font text-[13px] text-white/70 hover:text-white transition-colors">
                        <ArrowRight className="h-3 w-3 text-white/30 group-hover/link:translate-x-0.5 transition-all" strokeWidth={2} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t border-white/10 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]" style={{ animationDelay: '350ms' }}>
              <a href="/clothing" className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 grotesk-font text-[11px] text-white/70 hover:text-white transition-all" style={{ backgroundColor: `${colors.secondary}4d` }}>
                Browse All Clothing
              </a>
            </div>
          </div>

          {/* Right - Feature Cards */}
          <div className="p-4">
            <div className="flex flex-col gap-3">
              {/* Featured Card - Shop */}
              <a
                href="/clothing"
                className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[130px]"
                style={{ animationDelay: '50ms' }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                  style={{ backgroundImage: 'url(/what-we-do/beanie1.jpg)' }}
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <span className="embossing-font text-[9px] uppercase tracking-[0.12em] mb-1" style={{ color: colors.accent }}>Featured</span>
                  <h4 className="hearns-font text-lg text-white mb-0.5">Custom Clothing</h4>
                  <p className="grotesk-font text-[11px] text-white/60">Browse our full range</p>
                </div>
              </a>

              {/* Blog Post Feature Card - Placeholder */}
              <a
                href="/shop"
                className="group/card relative rounded-xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards] h-[130px]"
                style={{ animationDelay: '100ms' }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover/card:scale-110"
                  style={{ backgroundImage: 'url(/hero-images/hoodie1.jpg)' }}
                />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${colors.megaMenuBg}, ${colors.megaMenuBg}b3, transparent)` }} />
                <div className="relative h-full p-4 flex flex-col justify-end">
                  <span className="embossing-font text-[9px] uppercase tracking-[0.12em] text-[#c1c6c8] mb-1">Shop Page</span>
                  <h4 className="hearns-font text-lg text-white mb-0.5">Featured Products</h4>
                  <p className="grotesk-font text-[11px] text-white/60">Curated collections</p>
                </div>
              </a>
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  return (
    <>
      {/* Font declarations for mega menus */}
      <style>{`
        @font-face {
          font-family: 'Embossing Tape';
          src: url('/fonts/embossing_tape/embosst3.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Neuzeit Grotesk';
          src: url('/fonts/font/NeuzeitGro-Reg.ttf') format('truetype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Hearns';
          src: url('/fonts/Hearns/Hearns.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Aldivaro Stamp';
          src: url('/fonts/aldivaro/Aldivaro Stamp Demo.otf') format('opentype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        .embossing-font {
          font-family: 'Embossing Tape', monospace;
          letter-spacing: 0.12em;
        }
        .grotesk-font {
          font-family: 'Neuzeit Grotesk', 'Helvetica Neue', sans-serif;
        }
        .hearns-font {
          font-family: 'Hearns', Georgia, serif;
        }
        .aldivaro-font {
          font-family: 'Aldivaro Stamp', serif;
        }
      `}</style>

      <div
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] transition-all ${isScrolled ? 'backdrop-blur-md' : ''} ${className}`}
        style={{ backgroundColor: isScrolled ? `${colors.headerBg}f2` : colors.headerBg }}
      >
        {/* Compact Single-Line Header */}
        <header className="border-b border-white/10">
          <div className="max-w-[1600px] mx-auto px-4 lg:px-8">
            <div className="flex items-center justify-between h-14">

            {/* Left: Logo */}
            <a href="/" className="flex-shrink-0 relative group">
              <img
                src="/images/outpost-logo.png"
                alt="Outpost Custom"
                className="h-8 w-auto transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const textLogo = document.createElement('span');
                    textLogo.textContent = 'OUTPOST';
                    textLogo.className = 'text-xl font-bold tracking-tight';
                    textLogo.style.color = '#6da71d';
                    parent.appendChild(textLogo);
                  }
                }}
              />
            </a>

            {/* Center: Navigation */}
            <nav className="hidden lg:flex flex-1 justify-center">
              <ul className="flex items-center gap-5 text-[11px] font-semibold tracking-[0.12em] text-white/65">
                {navigationItems.map((item) => (
                  <li key={item.label} className="relative group">
                    <a
                      href={item.href || '#'}
                      className="flex items-center gap-1.5 border-b border-transparent pb-1 text-white/70 transition-colors hover:border-lime-400/70 hover:text-white"
                    >
                      <span>{item.label}</span>
                      {(item.megaSections || item.customMegaMenu) && (
                        <ChevronDown className="h-3 w-3 text-white/50 transition-transform duration-200 group-hover:rotate-180" strokeWidth={2.5} />
                      )}
                    </a>
                    {item.customMegaMenu === 'clothing'
                      ? renderClothingMegaMenu()
                      : item.customMegaMenu === 'signage'
                      ? renderSignageMegaMenu()
                      : item.customMegaMenu === 'printing'
                      ? renderPrintingMegaMenu()
                      : item.customMegaMenu === 'vehicle'
                      ? renderVehicleMegaMenu()
                      : item.megaSections && renderMegaMenu(item.megaSections, item.label)}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Right: Contact Info + Icons */}
            <div className="flex items-center gap-3">

              {/* Wishlist & Cart */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsWishlistOpen(true)}
                  className="relative p-2 hover:bg-white/5 rounded-lg transition-colors"
                  aria-label="Wishlist"
                >
                  <Heart
                    className="w-5 h-5 transition-colors"
                    style={{
                      color: wishlist.length > 0
                        ? (colorScheme === 'purple' ? colors.iconColor : '#6da71d')
                        : (colorScheme === 'purple' ? colors.iconColor : 'rgba(255,255,255,0.5)')
                    }}
                    fill={wishlist.length > 0 ? 'currentColor' : 'none'}
                  />
                  {wishlist.length > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colorScheme === 'purple' ? colors.secondary : '#6da71d' }}
                    >
                      {wishlist.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 hover:bg-white/5 rounded-lg transition-colors"
                  aria-label="Cart"
                >
                  <ShoppingCart
                    className="w-5 h-5 transition-colors"
                    style={{
                      color: cart.length > 0
                        ? (colorScheme === 'purple' ? colors.iconColor : '#6da71d')
                        : (colorScheme === 'purple' ? colors.iconColor : 'rgba(255,255,255,0.5)')
                    }}
                  />
                  {cart.length > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colorScheme === 'purple' ? colors.secondary : '#6da71d' }}
                    >
                      {cart.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Contact CTA */}
              <a
                href="/contact"
                className="hidden lg:inline-flex items-center gap-2 rounded-[5px] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[0_6px_16px_rgba(0,0,0,0.45)] transition-all hover:shadow-[0_10px_22px_rgba(0,0,0,0.55)] active:translate-y-[1px]"
                style={{
                  borderColor: colors.contactButtonGradient.border,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  background: `linear-gradient(to bottom, ${colors.contactButtonGradient.from}, ${colors.contactButtonGradient.via}, ${colors.contactButtonGradient.to})`
                }}
              >
                CONTACT
                <Send className="h-3.5 w-3.5" strokeWidth={2.5} />
              </a>

              {/* Mobile Menu Toggle */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Menu"
              >
                <div className="w-5 h-4 flex flex-col justify-between">
                  <span className={`block h-0.5 bg-white transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                  <span className={`block h-0.5 bg-white transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
                  <span className={`block h-0.5 bg-white transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

        {/* Filter bar slot removed - now rendered directly in ClothingBrowser */}
    </div>

      {/* Mobile Navigation */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-300 lg:hidden ${
          isMobileMenuOpen
            ? 'opacity-100 visible'
            : 'opacity-0 invisible pointer-events-none'
        }`}
        style={{ top: `${headerHeight}px`, backgroundColor: colors.headerBg }}
      >
        <div className="h-full overflow-y-auto pb-8">
          <div className="px-4 py-4">
            {/* Navigation Items */}
            <ul className="space-y-1">
              {navigationItems.map((item) => (
                <li key={`mobile-${item.label}`}>
                  {item.megaSections || item.customMegaMenu ? (
                    <div className="rounded-xl overflow-hidden">
                      {/* Accordion Header */}
                      <button
                        type="button"
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors`}
                        style={{
                          backgroundColor: mobileMenuState[item.label]
                            ? `${colors.secondary}66`
                            : `${colors.secondary}33`
                        }}
                        onClick={() => toggleMobileSubmenu(item.label)}
                      >
                        <span className="hearns-font text-lg uppercase tracking-[0.1em] text-white">
                          {item.label}
                        </span>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform duration-200 ${
                            mobileMenuState[item.label] ? 'rotate-180' : ''
                          }`}
                          style={{ color: colors.accent }}
                          strokeWidth={2}
                        />
                      </button>

                      {/* Accordion Content */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          mobileMenuState[item.label]
                            ? 'max-h-[2000px] opacity-100'
                            : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-2 py-3 space-y-4">
                          {/* Clothing Menu */}
                          {item.customMegaMenu === 'clothing' && (
                            <div className="space-y-4">
                              {/* Tops */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  Tops
                                </p>
                                <div className="space-y-1">
                                  {clothingTops.map((item) => (
                                    <a
                                      key={item.label}
                                      href={item.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{item.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* Outerwear */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  Outerwear
                                </p>
                                <div className="space-y-1">
                                  {clothingOuterwear.map((item) => (
                                    <a
                                      key={item.label}
                                      href={item.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{item.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* More */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  More
                                </p>
                                <div className="space-y-1">
                                  {clothingOther.map((item) => (
                                    <a
                                      key={item.label}
                                      href={item.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{item.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Signage Menu */}
                          {item.customMegaMenu === 'signage' && (
                            <div className="space-y-4">
                              {/* Indoor */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  Indoor
                                </p>
                                <div className="space-y-1">
                                  {signageIndoor.map((sign) => (
                                    <a
                                      key={sign.label}
                                      href={sign.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{sign.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* Outdoor */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  Outdoor
                                </p>
                                <div className="space-y-1">
                                  {signageOutdoor.map((sign) => (
                                    <a
                                      key={sign.label}
                                      href={sign.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{sign.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* Event */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  Event
                                </p>
                                <div className="space-y-1">
                                  {signageEvents.map((sign) => (
                                    <a
                                      key={sign.label}
                                      href={sign.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{sign.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Printing Menu */}
                          {item.customMegaMenu === 'printing' && (
                            <div className="space-y-4">
                              {/* Cards */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  Cards
                                </p>
                                <div className="space-y-1">
                                  {printingCards.map((print) => (
                                    <a
                                      key={print.label}
                                      href={print.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{print.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* Marketing */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  Marketing
                                </p>
                                <div className="space-y-1">
                                  {printingMarketing.map((print) => (
                                    <a
                                      key={print.label}
                                      href={print.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{print.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>

                              {/* More */}
                              <div>
                                <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                  More
                                </p>
                                <div className="space-y-1">
                                  {printingOther.map((print) => (
                                    <a
                                      key={print.label}
                                      href={print.href}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                      onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                      <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                      <span className="grotesk-font text-sm">{print.label}</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Vehicle Menu */}
                          {item.customMegaMenu === 'vehicle' && (
                            <div>
                              <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                Our Services
                              </p>
                              <div className="space-y-1">
                                {vehicleServices.map((service) => (
                                  <a
                                    key={service.label}
                                    href={service.href}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                  >
                                    <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                    <span className="grotesk-font text-sm">{service.label}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Standard mega sections */}
                          {item.megaSections && (
                            <div className="space-y-3">
                              {item.megaSections.map((section, index) => (
                                <div key={`${item.label}-section-${section.title ?? index}`}>
                                  {section.title && (
                                    <p className="embossing-font text-[10px] uppercase tracking-[0.15em] mb-2 px-2" style={{ color: colors.accent }}>
                                      {section.title}
                                    </p>
                                  )}
                                  <div className="space-y-1">
                                    {section.items.map((link) => (
                                      <a
                                        key={`${item.label}-${link.label}`}
                                        href={link.href}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                      >
                                        <ArrowRight className="h-3 w-3" style={{ color: colors.accent }} strokeWidth={2} />
                                        <span className="grotesk-font text-sm">{link.label}</span>
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={item.href || '#'}
                      className="flex items-center px-4 py-3 rounded-xl transition-colors"
                      style={{ backgroundColor: `${colors.secondary}33` }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="hearns-font text-lg uppercase tracking-[0.1em] text-white">
                        {item.label}
                      </span>
                    </a>
                  )}
                </li>
              ))}
            </ul>

            {/* Contact CTA */}
            <div className="mt-6 px-2">
              <a
                href="/contact"
                className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-4 hearns-font text-base uppercase tracking-[0.12em] text-white shadow-lg transition-all active:scale-[0.98]"
                style={{ backgroundColor: colors.buttonPrimary }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Get In Touch
                <Send className="h-4 w-4" strokeWidth={2} />
              </a>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex gap-2 px-2">
              <a
                href="/clothing"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 grotesk-font text-xs text-white/70 hover:text-white transition-all"
                style={{ backgroundColor: `${colors.secondary}4d` }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Sparkles className="h-4 w-4" style={{ color: colors.accent }} strokeWidth={2} />
                Browse Clothing
              </a>
              <a
                href="/services/all-signage"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 grotesk-font text-xs text-white/70 hover:text-white transition-all"
                style={{ backgroundColor: `${colors.secondary}4d` }}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                All Services
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Order Drawer */}
      <OrderDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Wishlist Drawer */}
      <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
    </>
  );
};

export default Header;
