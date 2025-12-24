import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  ChevronRight,
  Home,
  Search,
  X,
  Filter,
  ChevronDown,
  Check,
} from 'lucide-react';
import { getAllProducts, getFilterOptions, getSizesForProductTypes, ProductFilters, FilterOptions, BrandOption } from '../../lib/productBrowserApi';
import { Product } from '../../lib/supabase';
import ClothingCard from './ClothingCard';
import MobileFilterBar from './MobileFilterBar';
import MobileRowCard from './MobileRowCard';
import MobileProductSheet from './MobileProductSheet';

// Product Type Groups - comprehensive mapping
const PRODUCT_TYPE_GROUPS = [
  {
    name: 'Tops',
    items: ['T-Shirts', 'Polos', 'Shirts', 'Blouses', 'Sweatshirts', 'Hoodies', 'Fleece', 'Cardigans', 'Knitted Jumpers', 'Sports Overtops', 'Baselayers', 'Rugby Shirts', 'Tunics', 'Vests (t-shirt)']
  },
  {
    name: 'Outerwear',
    items: ['Jackets', 'Gilets & Body Warmers', 'Softshells', 'Ponchos', 'Coveralls', 'Rain Suits', 'Waistcoats']
  },
  {
    name: 'Bottoms',
    items: ['Shorts', 'Trousers', 'Chinos', 'Jeans', 'Skirts', 'Skorts', 'Sweatpants', 'Leggings', 'Trackwear', 'Dungarees', 'Dresses', 'Unitards']
  },
  {
    name: 'Workwear',
    items: ['Aprons', 'Tabards', 'Bibs', 'Chef Jackets', 'Safety Vests', 'Coveralls', 'Kneepads', 'Helmets']
  },
  {
    name: 'Headwear',
    items: ['Caps', 'Beanies', 'Hats', 'Headbands', 'Snoods', 'Ear Muffs']
  },
  {
    name: 'Footwear',
    items: ['Boots', 'Shoes', 'Trainers', 'Slippers', 'Socks']
  },
  {
    name: 'Bags & Cases',
    items: ['Bags', 'Laptop Cases', 'Pencil Cases', 'Document Wallets', 'Wallets']
  },
  {
    name: 'Accessories',
    items: ['Accessories', 'Belts', 'Braces', 'Ties', 'Scarves', 'Gloves', 'Umbrellas']
  },
];

// Color mapping for swatches
const COLOR_MAP: Record<string, string> = {
  'Red': '#DC2626',
  'Blue': '#2563EB',
  'Green': '#16A34A',
  'Yellow': '#EAB308',
  'Orange': '#EA580C',
  'Purple': '#9333EA',
  'Pink': '#EC4899',
  'Black': '#000000',
  'White': '#FFFFFF',
  'Grey': '#6B7280',
  'Gray': '#6B7280',
  'Navy': '#1E3A5F',
  'Brown': '#92400E',
  'Beige': '#D4A574',
  'Cream': '#FFFDD0',
  'Burgundy': '#800020',
  'Maroon': '#800000',
  'Teal': '#0D9488',
  'Cyan': '#06B6D4',
  'Lime': '#84CC16',
  'Olive': '#84843C',
  'Coral': '#F97316',
  'Turquoise': '#40E0D0',
  'Gold': '#EAB308',
  'Silver': '#A8A29E',
  'Charcoal': '#374151',
  'Khaki': '#BDB76B',
};

const getColorHexValue = (colorName: string): string => {
  const normalizedName = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();
  return COLOR_MAP[normalizedName] || COLOR_MAP[colorName] || '#CCCCCC';
};

// Theme colors - Brand palette (matching ProductDetails)
const clothingColors = {
  accent: '#64a70b',      // Primary green
  text: '#333333',        // Body text (80%)
  dark: '#183028',        // Dark green (page background)
  darkLight: '#234a3a',   // Lighter dark green
  light: '#c1c6c8',       // Light gray
  secondary: '#1e3a2f',   // Card background (slightly lighter than dark)
  pageBg: '#183028',      // Page background (matching ProductDetails)
};

// Font families
const fonts = {
  heading: "'Hearns', serif",
  subheading: "'Embossing Tape 3', sans-serif",
  body: "'Neuzeit Grotesk', sans-serif",
};

export interface ProductGroup {
  style_code: string;
  style_name: string;
  brand: string;
  product_type: string;
  fabric?: string;
  product_feature_1?: string;
  product_feature_2?: string;
  product_feature_3?: string;
  variants: Product[];
  colors: Array<{
    code: string;
    name: string;
    rgb: string;
    image: string;
  }>;
  size_range: string;
  price_range: { min: number; max: number };
}

const PRODUCTS_PER_PAGE = 24;

const ClothingBrowser: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number | undefined>();
  const [priceMax, setPriceMax] = useState<number | undefined>();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerFilterOpen, setHeaderFilterOpen] = useState(false);

  // Mobile-specific state
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'row'>('grid');
  const [selectedMobileProduct, setSelectedMobileProduct] = useState<ProductGroup | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    materials: [],
    categories: [],
    priceRange: { min: 0, max: 1000 },
    productTypes: [],
    sizes: [],
    colors: [],
    colorShades: [],
    brands: [],
    brandOptions: [],
    genders: [],
    ageGroups: [],
    accreditations: []
  });

  // Collapsible sections state
  const [sectionsOpen, setSectionsOpen] = useState({
    type: true,
    brand: false,
    colour: false,
    gender: false,
    price: false,
  });

  // Track which type groups are expanded
  const [typeGroupsOpen, setTypeGroupsOpen] = useState<Record<string, boolean>>({});

  // Load filter options on mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await getFilterOptions();
        setFilterOptions(options);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    loadFilterOptions();
  }, []);

  // Read filters from URL params - runs on mount and when URL changes
  useEffect(() => {
    const typeParam = searchParams.get('type') || searchParams.get('productTypes');
    const brandParam = searchParams.get('brands');
    const colorParam = searchParams.get('colors');
    const searchParam = searchParams.get('search');

    // Set all filters from URL (or clear if not present)
    setSelectedTypes(typeParam ? typeParam.split(',').map(decodeURIComponent) : []);
    setSelectedBrands(brandParam ? brandParam.split(',').map(decodeURIComponent) : []);
    setSelectedColors(colorParam ? colorParam.split(',').map(decodeURIComponent) : []);
    setSearchQuery(searchParam ? decodeURIComponent(searchParam) : '');
    setDebouncedSearchQuery(searchParam ? decodeURIComponent(searchParam) : '');
  }, [searchParams]);

  // Debounce search query to avoid multiple API calls while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms debounce delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTypes, selectedBrands, selectedColors, selectedGenders, priceMin, priceMax, debouncedSearchQuery]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const filters: ProductFilters = {};
        if (selectedTypes.length > 0) filters.productTypes = selectedTypes;
        if (selectedBrands.length > 0) filters.brands = selectedBrands;
        if (selectedColors.length > 0) filters.colors = selectedColors;
        if (selectedGenders.length > 0) filters.genders = selectedGenders;
        if (priceMin !== undefined) filters.priceMin = priceMin;
        if (priceMax !== undefined) filters.priceMax = priceMax;
        if (debouncedSearchQuery.trim()) filters.searchQuery = debouncedSearchQuery;

        const response = await getAllProducts(filters, currentPage, PRODUCTS_PER_PAGE);
        const groups = groupProductsByStyle(response.products);
        setProductGroups(groups);
        setTotalCount(response.totalCount);
        setTotalPages(response.totalPages);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [selectedTypes, selectedBrands, selectedColors, selectedGenders, priceMin, priceMax, debouncedSearchQuery, currentPage]);

  // Convert RGB string "R G B" to CSS rgb() value
  const convertRgbToCSS = (rgbString: string): string => {
    if (!rgbString || rgbString === 'Not available') return '';
    try {
      const rgbParts = rgbString.split('|')[0].trim();
      const rgbNumbers = rgbParts.match(/\d+/g);
      if (rgbNumbers && rgbNumbers.length >= 3) {
        const r = parseInt(rgbNumbers[0]);
        const g = parseInt(rgbNumbers[1]);
        const b = parseInt(rgbNumbers[2]);
        if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
          return `rgb(${r}, ${g}, ${b})`;
        }
      }
    } catch (e) {
      // Fallback
    }
    return '';
  };

  // Group products by style - now uses color_variants from API
  const groupProductsByStyle = useCallback((products: Product[]): ProductGroup[] => {
    const grouped = products.reduce((groups: Record<string, Product[]>, product) => {
      const styleCode = product.style_code || 'unknown';
      if (!groups[styleCode]) {
        groups[styleCode] = [];
      }
      groups[styleCode].push(product);
      return groups;
    }, {});

    return Object.keys(grouped).sort().map(styleCode => {
      const variants = grouped[styleCode];
      const firstVariant = variants[0];

      // Use color_variants from API if available (fast path)
      let uniqueColors: Array<{code: string, name: string, rgb: string, image: string}> = [];

      const colorVariants = (firstVariant as any).color_variants;
      if (colorVariants && Array.isArray(colorVariants) && colorVariants.length > 0) {
        // Use pre-computed color variants from database
        // Note: Database uses colourCode, colourName, colourImage (camelCase with 'colour')
        uniqueColors = colorVariants.map((cv: any) => ({
          code: cv.colourCode || cv.code || '',
          name: cv.colourName || cv.name || cv.colourCode || cv.code || '',
          rgb: convertRgbToCSS(cv.rgb) || getColorHexValue(cv.colourName || cv.name || ''),
          image: cv.colourImage || cv.image || firstVariant.primary_product_image_url
        }));
      } else {
        // Fallback: extract from variant data (slower)
        uniqueColors = variants.reduce((colors: Array<{code: string, name: string, rgb: string, image: string}>, variant) => {
          const existingColor = colors.find(c => c.code === variant.colour_code);
          if (!existingColor && variant.colour_code) {
            let rgbValue = convertRgbToCSS(variant.rgb) || getColorHexValue(variant.colour_name || '');
            colors.push({
              code: variant.colour_code,
              name: variant.colour_name || variant.colour_code,
              rgb: rgbValue,
              image: variant.colour_image || variant.primary_product_image_url
            });
          }
          return colors;
        }, []);
      }

      // Calculate price range from final_price (includes margin)
      const prices = variants
        .filter(v => v.sku_status !== 'Discontinued')
        .map(v => parseFloat(v.final_price))
        .filter(p => !isNaN(p) && p > 0);
      const priceRange = prices.length > 0 ? {
        min: Math.min(...prices),
        max: Math.max(...prices)
      } : { min: 0, max: 0 };

      return {
        style_code: styleCode,
        style_name: firstVariant.style_name,
        brand: firstVariant.brand,
        product_type: firstVariant.product_type || '',
        fabric: firstVariant.fabric,
        product_feature_1: firstVariant.product_feature_1,
        product_feature_2: firstVariant.product_feature_2,
        product_feature_3: firstVariant.product_feature_3,
        variants,
        colors: uniqueColors,
        size_range: firstVariant.size_range || '',
        price_range: priceRange
      };
    });
  }, []);

  // Update URL when filters change (use debounced search to avoid URL spam while typing)
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedTypes.length > 0) params.set('productTypes', selectedTypes.join(','));
    if (selectedBrands.length > 0) params.set('brands', selectedBrands.join(','));
    if (selectedColors.length > 0) params.set('colors', selectedColors.join(','));
    if (debouncedSearchQuery.trim()) params.set('search', debouncedSearchQuery);
    setSearchParams(params, { replace: true });
  }, [selectedTypes, selectedBrands, selectedColors, debouncedSearchQuery, setSearchParams]);

  useEffect(() => {
    updateUrlParams();
  }, [selectedTypes, selectedBrands, selectedColors, debouncedSearchQuery]);

  // Callback ref to scroll expanded card into view - optimized for mobile
  const scrollToExpandedCard = useCallback((node: HTMLDivElement | null) => {
    if (node && expandedProduct) {
      setTimeout(() => {
        // Get card position
        const rect = node.getBoundingClientRect();
        const isMobile = window.innerWidth < 640;

        if (isMobile) {
          // Scroll so card is near top of viewport with header clearance
          const headerOffset = 120; // Account for header + filter bar
          const targetScrollTop = window.scrollY + rect.top - headerOffset;
          window.scrollTo({
            top: Math.max(0, targetScrollTop),
            behavior: 'smooth'
          });
        } else {
          // Desktop: center the card
          node.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 350);
    }
  }, [expandedProduct]);

  const toggleSection = useCallback((section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const toggleTypeGroup = useCallback((groupName: string) => {
    setTypeGroupsOpen(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  }, []);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(x => x !== type) : [...prev, type]
    );
  }, []);

  const selectAllInGroup = useCallback((items: string[]) => {
    setSelectedTypes(prev => {
      const newTypes = new Set(prev);
      items.forEach(item => newTypes.add(item));
      return Array.from(newTypes);
    });
  }, []);

  const deselectAllInGroup = useCallback((items: string[]) => {
    setSelectedTypes(prev => prev.filter(type => !items.includes(type)));
  }, []);

  const isGroupFullySelected = useCallback((items: string[]) => {
    return items.every(item => selectedTypes.includes(item));
  }, [selectedTypes]);

  const isGroupPartiallySelected = useCallback((items: string[]) => {
    return items.some(item => selectedTypes.includes(item)) && !isGroupFullySelected(items);
  }, [selectedTypes, isGroupFullySelected]);

  const toggleBrand = useCallback((brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(x => x !== brand) : [...prev, brand]
    );
  }, []);

  const toggleColor = useCallback((color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(x => x !== color) : [...prev, color]
    );
  }, []);

  const toggleGender = useCallback((gender: string) => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(x => x !== gender) : [...prev, gender]
    );
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedTypes([]);
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedGenders([]);
    setPriceMin(undefined);
    setPriceMax(undefined);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const hasActiveFilters = selectedTypes.length > 0 || selectedBrands.length > 0 || selectedColors.length > 0 || selectedGenders.length > 0 || priceMin !== undefined || priceMax !== undefined || searchQuery.trim().length > 0;

  // Filter available product types based on what exists in filter options
  const availableTypeGroups = PRODUCT_TYPE_GROUPS.map(group => ({
    ...group,
    availableItems: group.items.filter(item => filterOptions.productTypes.includes(item))
  })).filter(group => group.availableItems.length > 0);

  // Calculate filter count for the mobile filter bar
  const filterCount = selectedTypes.length + selectedBrands.length + selectedColors.length + selectedGenders.length;

  // Get brands list for filter display
  const brandsList = filterOptions.brandOptions?.length > 0
    ? filterOptions.brandOptions.map(b => b.name)
    : filterOptions.brands;

  const handleProductClick = (styleCode: string) => {
    if (expandedProduct === styleCode) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(styleCode);
    }
  };

  // Handler for mobile product selection - opens bottom sheet
  const handleMobileProductSelect = (productGroup: ProductGroup) => {
    setSelectedMobileProduct(productGroup);
  };

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: clothingColors.pageBg }}>
      {/* Background textures - matching ProductDetails */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'url(/BlackTextureBackground.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'url(/ConcreteTexture.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Header */}
      <header className="relative z-10 py-6 md:py-8 px-6 md:px-8 lg:px-12 border-b border-white/10">
        <div className="max-w-[1600px] mx-auto relative z-10">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-4" style={{ fontFamily: fonts.body }}>
            <Link to="/shop" className="hover:text-white transition-colors">
              Clothing
            </Link>
            <ChevronRight className="w-3 h-3" />
            {selectedTypes.length === 1 ? (
              <span className="text-white">{selectedTypes[0]}</span>
            ) : selectedTypes.length > 1 ? (
              <span className="text-white">{selectedTypes.length} Categories</span>
            ) : (
              <span className="text-white">All Clothing</span>
            )}
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl text-white mb-1" style={{ fontFamily: fonts.heading }}>
                Clothing
              </h1>
              <p className="text-white/70" style={{ fontFamily: fonts.body }}>
                Browse our complete range of customisable clothing
              </p>
            </div>

            {/* Search - hidden on mobile, shown on sm and up */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* New Mobile Sticky Filter Bar - shown on small screens only */}
      <MobileFilterBar
        viewMode={mobileViewMode}
        onViewModeChange={setMobileViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilterClick={() => setHeaderFilterOpen(!headerFilterOpen)}
        activeFilterCount={filterCount}
      />

      {/* Mobile Filter Dropdown Panel - appears when filter button clicked on small screens */}
      <AnimatePresence>
        {headerFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="block sm:hidden relative z-30 overflow-hidden"
            style={{ backgroundColor: clothingColors.dark }}
          >
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-white/10 overflow-hidden" style={{ backgroundColor: clothingColors.secondary }}>
                {/* Active Filters */}
                {hasActiveFilters && (
                  <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-white/50 uppercase tracking-wide">Active Filters</p>
                      <button
                        onClick={clearAllFilters}
                        className="text-xs font-medium px-2 py-1 rounded-md transition-all hover:opacity-80"
                        style={{ color: clothingColors.accent, backgroundColor: `${clothingColors.accent}20` }}
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTypes.map(type => (
                        <button
                          key={`small-mobile-filter-type-${type}`}
                          onClick={() => toggleType(type)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                          style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                        >
                          {type}
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                      {selectedBrands.map(brand => (
                        <button
                          key={`small-mobile-filter-brand-${brand}`}
                          onClick={() => toggleBrand(brand)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                          style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                        >
                          {brand}
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                      {selectedColors.map(color => (
                        <button
                          key={`small-mobile-filter-color-${color}`}
                          onClick={() => toggleColor(color)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                          style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                        >
                          {color}
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                      {selectedGenders.map(gender => (
                        <button
                          key={`small-mobile-filter-gender-${gender}`}
                          onClick={() => toggleGender(gender)}
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                          style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                        >
                          {gender}
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Type */}
                <div className="border-b border-white/10">
                  <button
                    onClick={() => toggleSection('type')}
                    className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-medium uppercase tracking-wide">Type</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.type ? 'rotate-180' : ''}`} />
                  </button>
                  {sectionsOpen.type && (
                    <div className="px-4 pb-4 space-y-2">
                      {availableTypeGroups.map(group => (
                        <div key={`small-mobile-type-group-${group.name}`}>
                          <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">{group.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {group.availableItems.map(type => (
                              <button
                                key={`small-mobile-type-${type}`}
                                onClick={() => toggleType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                  selectedTypes.includes(type)
                                    ? 'text-black'
                                    : 'text-white/80 bg-white/10 hover:bg-white/15'
                                }`}
                                style={selectedTypes.includes(type) ? { backgroundColor: clothingColors.accent } : {}}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Brand */}
                <div className="border-b border-white/10">
                  <button
                    onClick={() => toggleSection('brand')}
                    className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-medium uppercase tracking-wide">Brand</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.brand ? 'rotate-180' : ''}`} />
                  </button>
                  {sectionsOpen.brand && (
                    <div className="px-4 pb-4 max-h-48 overflow-y-auto space-y-1">
                      {brandsList.map(brand => (
                        <button
                          key={`small-mobile-brand-${brand}`}
                          onClick={() => toggleBrand(brand)}
                          className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-all ${
                            selectedBrands.includes(brand)
                              ? 'text-black'
                              : 'text-white/70 hover:text-white hover:bg-white/5'
                          }`}
                          style={selectedBrands.includes(brand) ? { backgroundColor: clothingColors.accent } : {}}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              selectedBrands.includes(brand)
                                ? 'border-transparent bg-white/20'
                                : 'border-white/30'
                            }`}
                          >
                            {selectedBrands.includes(brand) && <Check className="w-3 h-3" />}
                          </div>
                          {brand}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Colour */}
                <div className="border-b border-white/10">
                  <button
                    onClick={() => toggleSection('colour')}
                    className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-medium uppercase tracking-wide">Colour</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.colour ? 'rotate-180' : ''}`} />
                  </button>
                  {sectionsOpen.colour && (
                    <div className="px-4 pb-4">
                      <div className="flex flex-wrap gap-2">
                        {filterOptions.colors.map(color => {
                          const isSelected = selectedColors.includes(color);
                          const colorHex = getColorHexValue(color);
                          const isLight = colorHex === '#FFFFFF' || colorHex === '#FFFDD0';
                          return (
                            <button
                              key={`small-mobile-color-${color}`}
                              onClick={() => toggleColor(color)}
                              className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                                isSelected
                                  ? 'border-[#78BE20] scale-110'
                                  : isLight
                                  ? 'border-gray-400 hover:scale-110'
                                  : 'border-transparent hover:scale-110'
                              }`}
                              style={{ backgroundColor: colorHex }}
                              title={color}
                            >
                              {isSelected && (
                                <Check className={`absolute inset-0 m-auto w-4 h-4 ${isLight ? 'text-black' : 'text-white'}`} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <button
                    onClick={() => toggleSection('gender')}
                    className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                  >
                    <span className="text-sm font-medium uppercase tracking-wide">Gender</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.gender ? 'rotate-180' : ''}`} />
                  </button>
                  {sectionsOpen.gender && (
                    <div className="px-4 pb-4 space-y-1">
                      {filterOptions.genders.filter(gender => gender !== 'None').map(gender => (
                        <button
                          key={`small-mobile-gender-${gender}`}
                          onClick={() => toggleGender(gender)}
                          className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-all ${
                            selectedGenders.includes(gender)
                              ? 'text-black'
                              : 'text-white/70 hover:text-white hover:bg-white/5'
                          }`}
                          style={selectedGenders.includes(gender) ? { backgroundColor: clothingColors.accent } : {}}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              selectedGenders.includes(gender)
                                ? 'border-transparent bg-white/20'
                                : 'border-white/30'
                            }`}
                          >
                            {selectedGenders.includes(gender) && <Check className="w-3 h-3" />}
                          </div>
                          {gender}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Filter Panel - shown below header on tablet/mobile (hidden on small mobile where MobileFilterBar is used) */}
      <div className="hidden sm:block lg:hidden relative z-10 px-4 py-2 border-b border-white/10" style={{ backgroundColor: clothingColors.dark }}>
        <div className="max-w-[1600px] mx-auto">
          {/* Collapsible trigger */}
          <button
            onClick={() => setHeaderFilterOpen(!headerFilterOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-white/20 transition-all"
            style={{ backgroundColor: clothingColors.secondary }}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-white/70" />
              <span className="font-medium text-white text-sm">Filters</span>
              {filterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: clothingColors.accent, color: 'black' }}>
                  {filterCount}
                </span>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-white/70 transition-transform duration-200 ${headerFilterOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Filter panel */}
          <AnimatePresence>
            {headerFilterOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 rounded-xl border border-white/10 overflow-hidden" style={{ backgroundColor: clothingColors.secondary }}>
                  {/* Active Filters */}
                  {hasActiveFilters && (
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-white/50 uppercase tracking-wide">Active Filters</p>
                        <button
                          onClick={clearAllFilters}
                          className="text-xs font-medium px-2 py-1 rounded-md transition-all hover:opacity-80"
                          style={{ color: clothingColors.accent, backgroundColor: `${clothingColors.accent}20` }}
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTypes.map(type => (
                          <button
                            key={`mobile-filter-type-${type}`}
                            onClick={() => toggleType(type)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                          >
                            {type}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                        {selectedBrands.map(brand => (
                          <button
                            key={`mobile-filter-brand-${brand}`}
                            onClick={() => toggleBrand(brand)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                          >
                            {brand}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                        {selectedColors.map(color => (
                          <button
                            key={`mobile-filter-color-${color}`}
                            onClick={() => toggleColor(color)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                          >
                            {color}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                        {selectedGenders.map(gender => (
                          <button
                            key={`mobile-filter-gender-${gender}`}
                            onClick={() => toggleGender(gender)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                            style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                          >
                            {gender}
                            <X className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Type */}
                  <div className="border-b border-white/10">
                    <button
                      onClick={() => toggleSection('type')}
                      className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm font-medium uppercase tracking-wide">Type</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.type ? 'rotate-180' : ''}`} />
                    </button>
                    {sectionsOpen.type && (
                      <div className="px-4 pb-4 space-y-2">
                        {availableTypeGroups.map(group => (
                          <div key={`mobile-type-group-${group.name}`}>
                            <p className="text-xs text-white/40 uppercase tracking-wide mb-1.5">{group.name}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {group.availableItems.map(type => (
                                <button
                                  key={`mobile-type-${type}`}
                                  onClick={() => toggleType(type)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    selectedTypes.includes(type)
                                      ? 'text-black'
                                      : 'text-white/80 bg-white/10 hover:bg-white/15'
                                  }`}
                                  style={selectedTypes.includes(type) ? { backgroundColor: clothingColors.accent } : {}}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Brand */}
                  <div className="border-b border-white/10">
                    <button
                      onClick={() => toggleSection('brand')}
                      className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm font-medium uppercase tracking-wide">Brand</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.brand ? 'rotate-180' : ''}`} />
                    </button>
                    {sectionsOpen.brand && (
                      <div className="px-4 pb-4 max-h-48 overflow-y-auto space-y-1">
                        {brandsList.map(brand => (
                          <button
                            key={brand}
                            onClick={() => toggleBrand(brand)}
                            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-all ${
                              selectedBrands.includes(brand)
                                ? 'text-black'
                                : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                            style={selectedBrands.includes(brand) ? { backgroundColor: clothingColors.accent } : {}}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                selectedBrands.includes(brand)
                                  ? 'border-transparent bg-white/20'
                                  : 'border-white/30'
                              }`}
                            >
                              {selectedBrands.includes(brand) && <Check className="w-3 h-3" />}
                            </div>
                            {brand}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Colour */}
                  <div className="border-b border-white/10">
                    <button
                      onClick={() => toggleSection('colour')}
                      className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm font-medium uppercase tracking-wide">Colour</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.colour ? 'rotate-180' : ''}`} />
                    </button>
                    {sectionsOpen.colour && (
                      <div className="px-4 pb-4">
                        <div className="flex flex-wrap gap-2">
                          {filterOptions.colors.map(color => {
                            const isSelected = selectedColors.includes(color);
                            const colorHex = getColorHexValue(color);
                            const isLight = colorHex === '#FFFFFF' || colorHex === '#FFFDD0';
                            return (
                              <button
                                key={color}
                                onClick={() => toggleColor(color)}
                                className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                                  isSelected
                                    ? 'border-[#78BE20] scale-110'
                                    : isLight
                                    ? 'border-gray-400 hover:scale-110'
                                    : 'border-transparent hover:scale-110'
                                }`}
                                style={{ backgroundColor: colorHex }}
                                title={color}
                              >
                                {isSelected && (
                                  <Check className={`absolute inset-0 m-auto w-4 h-4 ${isLight ? 'text-black' : 'text-white'}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gender */}
                  <div>
                    <button
                      onClick={() => toggleSection('gender')}
                      className="w-full p-4 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                    >
                      <span className="text-sm font-medium uppercase tracking-wide">Gender</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.gender ? 'rotate-180' : ''}`} />
                    </button>
                    {sectionsOpen.gender && (
                      <div className="px-4 pb-4 space-y-1">
                        {filterOptions.genders.filter(gender => gender !== 'None').map(gender => (
                          <button
                            key={gender}
                            onClick={() => toggleGender(gender)}
                            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-all ${
                              selectedGenders.includes(gender)
                                ? 'text-black'
                                : 'text-white/70 hover:text-white hover:bg-white/5'
                            }`}
                            style={selectedGenders.includes(gender) ? { backgroundColor: clothingColors.accent } : {}}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                selectedGenders.includes(gender)
                                  ? 'border-transparent bg-white/20'
                                  : 'border-white/30'
                              }`}
                            >
                              {selectedGenders.includes(gender) && <Check className="w-3 h-3" />}
                            </div>
                            {gender}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-8 lg:px-12 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div
              className="sticky top-8 rounded-2xl overflow-hidden border border-white/10 flex flex-col"
              style={{ backgroundColor: clothingColors.secondary, maxHeight: 'calc(100vh - 4rem)' }}
            >
              <div className="p-5 border-b border-white/10 flex-shrink-0">
                <h2 className="font-semibold text-white">Filters</h2>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="px-4 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-white/50 uppercase tracking-wide">Active Filters</p>
                    <button
                      onClick={clearAllFilters}
                      className="text-xs font-medium px-2 py-1 rounded-md transition-all hover:opacity-80"
                      style={{ color: clothingColors.accent, backgroundColor: `${clothingColors.accent}20` }}
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTypes.map(type => (
                      <button
                        key={`filter-type-${type}`}
                        onClick={() => toggleType(type)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all hover:opacity-80"
                        style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                      >
                        {type}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    {selectedBrands.map(brand => (
                      <button
                        key={`filter-brand-${brand}`}
                        onClick={() => toggleBrand(brand)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500 text-white transition-all hover:opacity-80"
                      >
                        {brand}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    {selectedColors.map(color => (
                      <button
                        key={`filter-color-${color}`}
                        onClick={() => toggleColor(color)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500 text-white transition-all hover:opacity-80"
                      >
                        {color}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    {selectedGenders.map(gender => (
                      <button
                        key={`filter-gender-${gender}`}
                        onClick={() => toggleGender(gender)}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white transition-all hover:opacity-80"
                      >
                        {gender}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    {(priceMin !== undefined || priceMax !== undefined) && (
                      <button
                        onClick={() => { setPriceMin(undefined); setPriceMax(undefined); }}
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-teal-500 text-white transition-all hover:opacity-80"
                      >
                        £{priceMin ?? 0} - £{priceMax ?? '∞'}
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Scrollable filter content */}
              <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent hover:scrollbar-thumb-white/30">

              {/* Product Type */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleSection('type')}
                  className="w-full p-5 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm uppercase tracking-wide" style={{ fontFamily: fonts.subheading }}>Product Type</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.type ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sectionsOpen.type && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-2">
                        {availableTypeGroups.map(group => {
                          const isOpen = typeGroupsOpen[group.name] ?? false;
                          const isFullySelected = isGroupFullySelected(group.availableItems);
                          const isPartiallySelected = isGroupPartiallySelected(group.availableItems);
                          const selectedCount = group.availableItems.filter(item => selectedTypes.includes(item)).length;

                          return (
                            <div key={group.name} className="border-b border-white/5 last:border-b-0">
                              {/* Group Header */}
                              <div className="flex items-center">
                                <button
                                  onClick={() => toggleTypeGroup(group.name)}
                                  className="flex-1 flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-white" style={{ fontFamily: fonts.body }}>{group.name}</span>
                                    {selectedCount > 0 && (
                                      <span
                                        className="text-xs px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: clothingColors.accent, color: 'black' }}
                                      >
                                        {selectedCount}
                                      </span>
                                    )}
                                  </div>
                                  <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {/* Select All / Deselect All */}
                                <button
                                  onClick={() => isFullySelected ? deselectAllInGroup(group.availableItems) : selectAllInGroup(group.availableItems)}
                                  className="px-3 py-3 hover:bg-white/5 transition-colors"
                                  title={isFullySelected ? 'Deselect all' : 'Select all'}
                                >
                                  <div
                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                      isFullySelected
                                        ? 'border-transparent'
                                        : isPartiallySelected
                                        ? 'border-white/50'
                                        : 'border-white/30'
                                    }`}
                                    style={isFullySelected ? { backgroundColor: clothingColors.accent } : {}}
                                  >
                                    {isFullySelected && <Check className="w-3 h-3 text-black" />}
                                    {isPartiallySelected && <div className="w-2 h-0.5 bg-white/70 rounded" />}
                                  </div>
                                </button>
                              </div>

                              {/* Group Items */}
                              <AnimatePresence>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-5 pb-3 space-y-1">
                                      {group.availableItems.map(type => (
                                        <button
                                          key={type}
                                          onClick={() => toggleType(type)}
                                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                            selectedTypes.includes(type)
                                              ? 'text-white'
                                              : 'text-white/70 hover:text-white hover:bg-white/5'
                                          }`}
                                          style={selectedTypes.includes(type) ? { backgroundColor: clothingColors.accent, fontFamily: fonts.body } : { fontFamily: fonts.body }}
                                        >
                                          <div
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
                                              selectedTypes.includes(type)
                                                ? 'border-transparent bg-white/20'
                                                : 'border-white/30'
                                            }`}
                                          >
                                            {selectedTypes.includes(type) && <Check className="w-3 h-3" />}
                                          </div>
                                          {type}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Brand */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleSection('brand')}
                  className="w-full p-5 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm uppercase tracking-wide" style={{ fontFamily: fonts.subheading }}>Brand</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.brand ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sectionsOpen.brand && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-1 max-h-64 overflow-y-auto">
                        {(filterOptions.brandOptions?.length > 0
                          ? filterOptions.brandOptions.map(b => b.name)
                          : filterOptions.brands
                        ).map(brand => (
                          <button
                            key={brand}
                            onClick={() => toggleBrand(brand)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                            style={{ fontFamily: fonts.body }}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                selectedBrands.includes(brand)
                                  ? 'border-transparent'
                                  : 'border-white/30'
                              }`}
                              style={selectedBrands.includes(brand) ? { backgroundColor: clothingColors.accent } : {}}
                            >
                              {selectedBrands.includes(brand) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            {brand}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Colour */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleSection('colour')}
                  className="w-full p-5 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm uppercase tracking-wide" style={{ fontFamily: fonts.subheading }}>Colour</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.colour ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sectionsOpen.colour && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <div className="flex flex-wrap gap-2">
                          {filterOptions.colors.map(color => {
                            const isSelected = selectedColors.includes(color);
                            const colorHex = getColorHexValue(color);
                            const isLight = colorHex === '#FFFFFF' || colorHex === '#FFFDD0';
                            return (
                              <button
                                key={color}
                                onClick={() => toggleColor(color)}
                                className={`relative w-8 h-8 rounded-full border-2 transition-all ${
                                  isSelected
                                    ? 'border-[#78BE20] scale-110'
                                    : isLight
                                    ? 'border-gray-400 hover:scale-110'
                                    : 'border-transparent hover:scale-110'
                                }`}
                                style={{ backgroundColor: colorHex }}
                                title={color}
                              >
                                {isSelected && (
                                  <Check className={`absolute inset-0 m-auto w-4 h-4 ${isLight ? 'text-black' : 'text-white'}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Gender */}
              <div className="border-b border-white/10">
                <button
                  onClick={() => toggleSection('gender')}
                  className="w-full p-5 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm uppercase tracking-wide" style={{ fontFamily: fonts.subheading }}>Gender</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.gender ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sectionsOpen.gender && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-1">
                        {filterOptions.genders.filter(gender => gender !== 'None').map(gender => (
                          <button
                            key={gender}
                            onClick={() => toggleGender(gender)}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all"
                            style={{ fontFamily: fonts.body }}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                selectedGenders.includes(gender)
                                  ? 'border-transparent'
                                  : 'border-white/30'
                              }`}
                              style={selectedGenders.includes(gender) ? { backgroundColor: clothingColors.accent } : {}}
                            >
                              {selectedGenders.includes(gender) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            {gender}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Price Range */}
              <div>
                <button
                  onClick={() => toggleSection('price')}
                  className="w-full p-5 flex items-center justify-between text-white hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm uppercase tracking-wide" style={{ fontFamily: fonts.subheading }}>Price</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${sectionsOpen.price ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {sectionsOpen.price && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-white/50 mb-1 block" style={{ fontFamily: fonts.body }}>Min</label>
                            <input
                              type="number"
                              placeholder="£0"
                              value={priceMin || ''}
                              onChange={(e) => setPriceMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#78BE20]"
                              style={{ fontFamily: fonts.body }}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-white/50 mb-1 block" style={{ fontFamily: fonts.body }}>Max</label>
                            <input
                              type="number"
                              placeholder="Any"
                              value={priceMax || ''}
                              onChange={(e) => setPriceMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-[#78BE20]"
                              style={{ fontFamily: fonts.body }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div>{/* End scrollable filter content */}
            </div>
          </aside>

          {/* Product Grid */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-white/70">
                <span className="font-semibold text-white">{productGroups.length}</span> products
              </p>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                >
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: clothingColors.secondary }}>
                      <div className="aspect-[4/3] bg-white/5 animate-pulse" />
                      <div className="p-4 space-y-3">
                        <div className="h-3 bg-white/10 rounded animate-pulse w-1/3" />
                        <div className="h-4 bg-white/10 rounded animate-pulse w-2/3" />
                        <div className="h-6 bg-white/10 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : productGroups.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-20 rounded-2xl"
                  style={{ backgroundColor: clothingColors.secondary }}
                >
                  <p className="text-white/70 text-lg mb-4">
                    No products match your filters
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="text-sm font-medium px-5 py-2.5 rounded-xl"
                    style={{ color: clothingColors.accent, backgroundColor: `${clothingColors.accent}20` }}
                  >
                    Clear all filters
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Mobile Row View - only on small screens when row mode selected */}
                  <div className={`sm:hidden ${mobileViewMode === 'row' ? 'block' : 'hidden'}`}>
                    <div className="flex flex-col gap-3">
                      {productGroups.map((group, index) => (
                        <MobileRowCard
                          key={group.style_code}
                          productGroup={group}
                          index={index}
                          onClick={() => handleMobileProductSelect(group)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Mobile Grid View - on small screens when grid mode selected */}
                  <div className={`sm:hidden ${mobileViewMode === 'grid' ? 'block' : 'hidden'}`}>
                    <div className="grid grid-cols-2 gap-3">
                      {productGroups.map((group, index) => (
                        <ClothingCard
                          key={group.style_code}
                          productGroup={group}
                          index={index}
                          isExpanded={false}
                          hasExpandedCard={false}
                          onExpand={() => handleMobileProductSelect(group)}
                          onClose={() => {}}
                          expandedRef={undefined}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Desktop/Tablet Grid - hidden on small mobile screens */}
                  <LayoutGroup>
                    <motion.div layout className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {/* Reorder: move expanded card to start of its row */}
                      {(() => {
                        const expandedIndex = productGroups.findIndex(g => g.style_code === expandedProduct);

                        if (expandedIndex < 0) {
                          // No expanded card, render normally
                          return productGroups.map((group, index) => (
                            <ClothingCard
                              key={group.style_code}
                              productGroup={group}
                              index={index}
                              isExpanded={false}
                              hasExpandedCard={false}
                              onExpand={() => handleProductClick(group.style_code)}
                              onClose={() => setExpandedProduct(null)}
                              expandedRef={undefined}
                            />
                          ));
                        }

                        // Calculate columns based on screen size (we'll use 4 for lg)
                        // The grid is: 2 cols on sm, 3 on md, 4 on lg
                        // We need to determine row start for the expanded card
                        const cols = 4; // Use largest for calculation, CSS handles responsiveness
                        const rowStart = Math.floor(expandedIndex / cols) * cols;

                        // Reorder: items before the row, expanded card, rest of row, items after
                        const beforeRow = productGroups.slice(0, rowStart);
                        const expandedCard = productGroups[expandedIndex];
                        const rowItems = productGroups.slice(rowStart, rowStart + cols).filter((_, i) => rowStart + i !== expandedIndex);
                        const afterRow = productGroups.slice(rowStart + cols);

                        const reordered = [...beforeRow, expandedCard, ...rowItems, ...afterRow];

                        return reordered.map((group, index) => (
                          <ClothingCard
                            key={group.style_code}
                            productGroup={group}
                            index={index}
                            isExpanded={expandedProduct === group.style_code}
                            hasExpandedCard={expandedProduct !== null}
                            onExpand={() => handleProductClick(group.style_code)}
                            onClose={() => setExpandedProduct(null)}
                            expandedRef={expandedProduct === group.style_code ? scrollToExpandedCard : undefined}
                          />
                        ));
                      })()}
                    </motion.div>
                  </LayoutGroup>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex flex-col items-center gap-4">
                      <p className="text-white/60 text-sm">
                        Showing {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1} - {Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount)} of {totalCount} products
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentPage(1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === 1}
                          className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: currentPage === 1 ? 'transparent' : clothingColors.secondary,
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          First
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.max(1, p - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === 1}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: currentPage === 1 ? 'transparent' : clothingColors.secondary,
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          Previous
                        </button>

                        <div className="flex items-center gap-1 px-2">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <button
                                key={pageNum}
                                onClick={() => {
                                  setCurrentPage(pageNum);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
                                style={{
                                  backgroundColor: currentPage === pageNum ? clothingColors.accent : 'transparent',
                                  color: currentPage === pageNum ? 'black' : 'white',
                                  border: currentPage === pageNum ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            setCurrentPage(p => Math.min(totalPages, p + 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: currentPage === totalPages ? 'transparent' : clothingColors.secondary,
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          Next
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPage(totalPages);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: currentPage === totalPages ? 'transparent' : clothingColors.secondary,
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)'
                          }}
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Mobile Product Bottom Sheet */}
      {selectedMobileProduct && (
        <MobileProductSheet
          productGroup={selectedMobileProduct}
          isOpen={true}
          onClose={() => setSelectedMobileProduct(null)}
        />
      )}
    </div>
  );
};

export default ClothingBrowser;
