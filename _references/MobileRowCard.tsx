import React from 'react';
import { motion } from 'motion/react';
import { ProductGroup } from './ClothingBrowser';

// Design system colors
const colors = {
  dark: '#183028',
  darkLight: '#234a3a',
  accent: '#64a70b',
  secondary: '#1e3a2f',
  white: '#ffffff',
};

interface MobileRowCardProps {
  productGroup: ProductGroup;
  index: number;
  onClick: () => void;
}

const MobileRowCard: React.FC<MobileRowCardProps> = ({
  productGroup,
  index,
  onClick,
}) => {
  const primaryImage = productGroup.colors[0]?.image || productGroup.variants[0]?.primary_product_image_url;
  const priceRange = productGroup.price_range;

  // Format price display
  const formatPrice = () => {
    if (!priceRange) return 'Price on request';
    if (priceRange.min === priceRange.max) {
      return `£${priceRange.min.toFixed(2)}`;
    }
    return `£${priceRange.min.toFixed(2)} - £${priceRange.max.toFixed(2)}`;
  };

  // Format size range
  const formatSizeRange = (sizeRange: string): string => {
    if (!sizeRange) return '';
    return sizeRange
      .replace(/to/gi, ' – ')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1$2')
      .trim();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="w-full rounded-xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
      style={{ backgroundColor: colors.secondary }}
    >
      <div className="flex gap-3 p-3">
        {/* Product Image */}
        <div className="w-24 h-24 flex-shrink-0 bg-white rounded-lg overflow-hidden">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={productGroup.style_name}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No image
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
          {/* Top: Brand & Name */}
          <div>
            <p className="text-white/50 text-xs mb-0.5 truncate">{productGroup.brand}</p>
            <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
              {productGroup.style_name}
            </h3>
          </div>

          {/* Bottom: Price & Colors */}
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm" style={{ color: colors.accent }}>
              {formatPrice()}
            </p>

            {/* Color Swatches */}
            <div className="flex items-center gap-1">
              {productGroup.colors.slice(0, 4).map((color, idx) => (
                <div
                  key={color.code}
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: color.rgb || '#ccc' }}
                  title={color.name}
                />
              ))}
              {productGroup.colors.length > 4 && (
                <span className="text-white/40 text-xs ml-1">
                  +{productGroup.colors.length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Features */}
      <div className="px-3 pb-3 flex items-center gap-4 text-xs text-white/50">
        {productGroup.size_range && (
          <span>Sizes: {formatSizeRange(productGroup.size_range)}</span>
        )}
        {productGroup.product_feature_1 && (
          <span className="truncate">• {productGroup.product_feature_1}</span>
        )}
      </div>
    </motion.div>
  );
};

export default MobileRowCard;
