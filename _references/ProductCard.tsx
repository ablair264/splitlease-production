import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Heart, ShoppingCart, Sparkles, TrendingUp } from 'lucide-react';
import { Product } from '../lib/supabase';

interface ProductGroup {
  style_code: string;
  style_name: string;
  brand: string;
  variants: Product[];
  colors: Array<{
    code: string;
    name: string;
    rgb: string;
    image: string;
  }>;
  size_range: string;
  price_range?: { min: number; max: number };
}

interface ProductCardProps {
  productGroup: ProductGroup;
  viewMode?: 'grid' | 'list';
  featured?: boolean;
}

const formatSizeRange = (sizeRange: string): string => {
  if (!sizeRange) return '';
  return sizeRange
    .replace(/to/gi, ' – ')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1$2')
    .trim();
};

const ProductCard: React.FC<ProductCardProps> = ({ productGroup, viewMode = 'grid', featured = false }) => {
  const [selectedColor, setSelectedColor] = useState(0);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const currentVariant = productGroup.variants.find(v =>
    v.colour_code === productGroup.colors[selectedColor]?.code
  ) || productGroup.variants[0];

  const currentImage = productGroup.colors[selectedColor]?.image ||
    currentVariant?.colour_image ||
    currentVariant?.primary_product_image_url;

  const isSustainable = currentVariant?.sustainable_organic === 'Yes';
  const hasMultipleColors = productGroup.colors.length > 1;

  // Random "trending" for demo - in real app, this would come from data
  const isTrending = Math.random() > 0.7;

  if (viewMode === 'list') {
    return (
      <div
        className="group bg-[#0a0a0a] rounded-2xl overflow-hidden transition-all duration-500 hover:bg-[#0f0f0f] relative border border-white/[0.06]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-[#78BE20]/10 via-transparent to-[#78BE20]/10" />
        </div>

        <div className="flex relative z-10">
          {/* Image */}
          <div className="relative w-64 h-64 flex-shrink-0 bg-white rounded-l-2xl overflow-hidden">
            <img
              className="w-full h-full object-contain p-6 transition-transform duration-700 group-hover:scale-110"
              src={currentImage !== 'Not available'
                ? currentImage
                : `https://via.placeholder.com/400x400/ffffff/78BE20?text=${encodeURIComponent(productGroup.style_name?.slice(0, 2) || 'P')}`
              }
              alt={productGroup.style_name}
              onError={(e) => {
                e.currentTarget.src = `https://via.placeholder.com/400x400/ffffff/78BE20?text=${encodeURIComponent(productGroup.style_name?.slice(0, 2) || 'P')}`;
              }}
              loading="lazy"
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {isTrending && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg">
                  <TrendingUp size={11} />
                  Trending
                </span>
              )}
              {isSustainable && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#78BE20] text-black shadow-lg">
                  <Sparkles size={11} />
                  Eco
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#78BE20] mb-2">
                  {productGroup.brand}
                </p>
                <h3 className="text-xl font-bold text-white leading-tight mb-3" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                  {productGroup.style_name}
                </h3>
              </div>

              <button
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isFavorite
                    ? 'bg-[#78BE20] text-black scale-110'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white hover:scale-110'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFavorite(!isFavorite);
                }}
              >
                <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2.5} />
              </button>
            </div>

            {currentVariant?.specification && (
              <p className="text-sm text-white/60 leading-relaxed mb-4 line-clamp-2">
                {currentVariant.specification}
              </p>
            )}

            <div className="mt-auto flex items-center justify-between gap-4">
              <div className="flex-1">
                {productGroup.price_range && (
                  <div className="mb-2">
                    <span className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                      £{productGroup.price_range.min.toFixed(2)}
                    </span>
                    {productGroup.price_range.min !== productGroup.price_range.max && (
                      <span className="text-sm font-medium text-white/50 ml-2">starting</span>
                    )}
                  </div>
                )}
                {productGroup.size_range && (
                  <span className="inline-block text-xs font-semibold text-white/50 px-3 py-1.5 bg-white/5 rounded-full">
                    {formatSizeRange(productGroup.size_range)}
                  </span>
                )}
              </div>

              <button
                className="px-8 py-4 bg-[#78BE20] hover:bg-[#6aa51b] text-black font-bold text-sm rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#78BE20]/30 flex items-center gap-2"
                onClick={() => navigate(`/products/${productGroup.style_code}`)}
              >
                <ShoppingCart size={18} strokeWidth={2.5} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group bg-[#0a0a0a] rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-2 relative border border-white/[0.06] flex flex-col h-full ${
        isHovered ? 'shadow-2xl shadow-[#78BE20]/20' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#78BE20]/10 via-transparent to-purple-500/10" />
      </div>

      {/* Image Container - White background for product images */}
      <div className="relative aspect-square bg-white overflow-hidden">
        <img
          className="w-full h-full object-contain p-8 transition-all duration-700 group-hover:scale-110 group-hover:rotate-2"
          src={currentImage !== 'Not available'
            ? currentImage
            : `https://via.placeholder.com/400x400/ffffff/78BE20?text=${encodeURIComponent(productGroup.style_name?.slice(0, 2) || 'P')}`
          }
          alt={productGroup.style_name}
          onError={(e) => {
            e.currentTarget.src = `https://via.placeholder.com/400x400/ffffff/78BE20?text=${encodeURIComponent(productGroup.style_name?.slice(0, 2) || 'P')}`;
          }}
          loading="lazy"
        />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isTrending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-xl animate-pulse">
              <TrendingUp size={11} />
              Hot
            </span>
          )}
          {isSustainable && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#78BE20] text-black shadow-xl">
              <Sparkles size={11} />
              Eco
            </span>
          )}
        </div>

        {/* Quick action - Favorite */}
        <div className="absolute top-3 right-3 z-10">
          <button
            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 ${
              isFavorite
                ? 'bg-[#78BE20] text-black scale-110 shadow-xl shadow-[#78BE20]/50'
                : 'bg-black/40 text-white hover:bg-black/60 hover:scale-110'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
          >
            <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2.5} />
          </button>
        </div>

        {/* Quick Add to Cart - appears on hover */}
        <div className={`absolute inset-x-0 bottom-0 p-4 transition-all duration-300 ${
          isHovered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <button
            className="w-full py-3 bg-black/90 backdrop-blur-md text-white font-bold text-sm rounded-xl transition-all duration-300 hover:bg-[#78BE20] hover:text-black flex items-center justify-center gap-2 shadow-xl"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/products/${productGroup.style_code}`);
            }}
          >
            <ShoppingCart size={18} strokeWidth={2.5} />
            Quick Add
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 relative z-10">
        {/* Brand & Name */}
        <div className="mb-4">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#78BE20] mb-2">
            {productGroup.brand}
          </p>
          <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 min-h-[56px]" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
            {productGroup.style_name}
          </h3>
        </div>

        {/* Price - Make it prominent */}
        {productGroup.price_range && (
          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}>
                £{productGroup.price_range.min.toFixed(2)}
              </span>
              {productGroup.price_range.min !== productGroup.price_range.max && (
                <span className="text-sm font-semibold text-white/50">+</span>
              )}
            </div>
            {productGroup.size_range && (
              <span className="inline-block mt-2 text-xs font-semibold text-white/50 px-3 py-1 bg-white/5 rounded-full">
                {formatSizeRange(productGroup.size_range)}
              </span>
            )}
          </div>
        )}

        {/* Color Selector */}
        <div className="relative mb-4 min-h-[48px]">
          {hasMultipleColors ? (
            <>
              {showColorDropdown && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a1a1a] border border-white/10 rounded-2xl p-3 max-h-56 overflow-y-auto z-50 shadow-2xl">
                  <div className="grid grid-cols-2 gap-2">
                    {productGroup.colors.map((color, index) => (
                      <button
                        key={color.code}
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-xl transition-all duration-200 text-left ${
                          selectedColor === index
                            ? 'bg-[#78BE20]/20 ring-2 ring-[#78BE20]'
                            : 'hover:bg-white/5'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedColor(index);
                          setShowColorDropdown(false);
                        }}
                      >
                        <span
                          className="w-6 h-6 rounded-full border-2 border-white/20 flex-shrink-0 shadow-lg"
                          style={{ backgroundColor: color.rgb }}
                        />
                        <span className="text-sm font-semibold text-white truncate">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                className={`flex items-center justify-between w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06] group/color ${
                  showColorDropdown ? 'border-[#78BE20]/50 bg-white/[0.06]' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorDropdown(!showColorDropdown);
                }}
                onBlur={() => setTimeout(() => setShowColorDropdown(false), 200)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="w-6 h-6 rounded-full border-2 border-white/30 flex-shrink-0 shadow-lg transition-transform duration-300 group-hover/color:scale-110"
                    style={{ backgroundColor: productGroup.colors[selectedColor]?.rgb }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">
                      {productGroup.colors[selectedColor]?.name}
                    </span>
                    <span className="text-[11px] text-white/50 font-medium">
                      {productGroup.colors.length} colors
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-white/60 transition-transform duration-300 flex-shrink-0 ${showColorDropdown ? 'rotate-180' : ''}`}
                  strokeWidth={2.5}
                />
              </button>
            </>
          ) : productGroup.colors.length === 1 ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl">
              <span
                className="w-6 h-6 rounded-full border-2 border-white/30 flex-shrink-0 shadow-lg"
                style={{ backgroundColor: productGroup.colors[0]?.rgb }}
              />
              <span className="text-sm font-semibold text-white">
                {productGroup.colors[0]?.name}
              </span>
            </div>
          ) : null}
        </div>

        {/* View Details Button */}
        <button
          className="mt-auto w-full py-3.5 bg-transparent border-2 border-white/20 rounded-xl text-white font-bold text-sm tracking-wide uppercase transition-all duration-300 hover:border-[#78BE20] hover:bg-[#78BE20] hover:text-black hover:shadow-lg hover:shadow-[#78BE20]/30"
          onClick={() => navigate(`/products/${productGroup.style_code}`)}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
