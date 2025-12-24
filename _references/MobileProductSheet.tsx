import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { ChevronLeft, ChevronDown, Check, ShoppingBag, Minus, Plus, Info, X } from 'lucide-react';
import { ProductGroup } from './ClothingBrowser';
import { ColorVariant, getRgbValues } from '../../lib/supabase';
import { useCart } from '../../contexts/CartContext';
import ClothingOrderWizard, { LogoPreviewData } from './ClothingOrderWizard';
import ClothingLogoUploader from './ClothingLogoUploader';
import ClothingHelpRequestForm from './ClothingHelpRequestForm';
import ClothingConsultationBooker from './ClothingConsultationBooker';
import { submitClothingEnquiry, SubmitEnquiryRequest } from '../../lib/enquiry-service';
import { sendEnquiryEmails } from '../../lib/email-service';

// Design system colors
const colors = {
  dark: '#183028',
  darkLight: '#234a3a',
  accent: '#64a70b',
  accentHover: '#578f09',
  neutral: '#c1c6c8',
  neutralLight: '#e8eaeb',
  white: '#ffffff',
  textDark: '#333333',
  textMuted: '#666666',
};

// Size ordering for proper display
const SIZE_ORDER: Record<string, number> = {
  'XXS': 1, '2XS': 1,
  'XS': 2,
  'S': 3, 'SM': 3, 'Small': 3,
  'M': 4, 'MD': 4, 'Medium': 4,
  'L': 5, 'LG': 5, 'Large': 5,
  'XL': 6,
  'XXL': 7, '2XL': 7,
  'XXXL': 8, '3XL': 8,
  '4XL': 9, 'XXXXL': 9,
  '5XL': 10, 'XXXXXL': 10,
  '6XL': 11,
  '7XL': 12,
  '8XL': 13,
  'One Size': 100, 'ONESIZE': 100, 'OS': 100, 'O/S': 100,
};

interface MobileProductSheetProps {
  productGroup: ProductGroup;
  isOpen: boolean;
  onClose: () => void;
}

const MobileProductSheet: React.FC<MobileProductSheetProps> = ({
  productGroup,
  isOpen,
  onClose,
}) => {
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [openAccordion, setOpenAccordion] = useState<'description' | 'specs' | null>(null);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [quoteStep, setQuoteStep] = useState<'logo-options' | 'upload' | 'help' | 'consult' | 'success' | 'submitting'>('logo-options');
  const [savedLogoData, setSavedLogoData] = useState<LogoPreviewData | null>(null);
  const [enquiryRef, setEnquiryRef] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hexLookup, setHexLookup] = useState<Map<string, string>>(new Map());
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { addToCart, clearCart, cart } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [cartItemPreviews, setCartItemPreviews] = useState<Array<{
    itemId: string;
    itemName: string;
    itemImage: string;
    logoX: number;
    logoY: number;
    logoSize: number;
    interacted: boolean;
  }>>([]);

  // Handle swipe down to close
  const handleDragEnd = (event: any, info: PanInfo) => {
    // If dragged down more than 100px or with velocity > 500, close the sheet
    if (info.offset.y > 100 || info.velocity.y > 500) {
      handleClose();
    }
  };

  // Close handler that resets state
  const handleClose = () => {
    setShowQuoteModal(false);
    setShowHowItWorksModal(false);
    setQuoteStep('logo-options');
    onClose();
  };

  // Load hex color lookup
  useEffect(() => {
    const loadHexLookup = async () => {
      const lookup = await getRgbValues();
      setHexLookup(lookup);
    };
    loadHexLookup();
  }, []);

  // Lock body scroll and hide chat widget when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Hide chat widget
      const chatWidget = document.querySelector('[data-chat-widget]') as HTMLElement;
      if (chatWidget) chatWidget.style.display = 'none';
    } else {
      document.body.style.overflow = '';
      // Show chat widget
      const chatWidget = document.querySelector('[data-chat-widget]') as HTMLElement;
      if (chatWidget) chatWidget.style.display = '';
    }
    return () => {
      document.body.style.overflow = '';
      const chatWidget = document.querySelector('[data-chat-widget]') as HTMLElement;
      if (chatWidget) chatWidget.style.display = '';
    };
  }, [isOpen]);

  // Reset state when product changes
  useEffect(() => {
    setSelectedColor(0);
    setSelectedSize('');
    setQuantity(1);
    setOpenAccordion(null);
    setColorDropdownOpen(false);
    setSizeDropdownOpen(false);
    setShowQuoteModal(false);
    setShowHowItWorksModal(false);
    setQuoteStep('logo-options');
  }, [productGroup.style_code]);

  // Build colors with proper hex values
  const buildColors = useCallback((): ColorVariant[] => {
    // Debug: log colors data
    console.log('Building colors from productGroup.colors:', productGroup.colors);

    // Fallback: if colors array is empty, try to extract from variants
    let colorsSource = productGroup.colors;
    if (!colorsSource || colorsSource.length === 0) {
      console.log('No colors in productGroup.colors, extracting from variants');
      // Extract unique colors from variants
      const uniqueColors = new Map<string, any>();
      productGroup.variants.forEach(v => {
        if (v.colour_code && !uniqueColors.has(v.colour_code)) {
          uniqueColors.set(v.colour_code, {
            code: v.colour_code,
            name: v.colour_name || v.colour_code,
            rgb: v.rgb,
            image: v.colour_image || v.primary_product_image_url,
          });
        }
      });
      colorsSource = Array.from(uniqueColors.values());
      console.log('Extracted colors from variants:', colorsSource);
    }

    return colorsSource.map(color => {
      const variant = productGroup.variants.find(v => v.colour_code === color.code);

      const getHexColor = (rgbString: string): string | null => {
        if (!rgbString || rgbString === 'Not available') return null;
        const firstColor = rgbString.split('|')[0].trim();
        const normalized = firstColor.replace(/\s+/g, ' ').trim();
        if (hexLookup.has(normalized)) return hexLookup.get(normalized)!;
        const parts = normalized.split(' ').map(n => parseInt(n, 10));
        if (parts.length >= 3 && parts.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
          return `#${parts[0].toString(16).padStart(2, '0')}${parts[1].toString(16).padStart(2, '0')}${parts[2].toString(16).padStart(2, '0')}`;
        }
        return null;
      };

      let displayColor = color.rgb || (variant ? getHexColor(variant.rgb) : null);
      if (!displayColor) {
        const colorName = color.name.toLowerCase();
        if (colorName.includes('black')) displayColor = '#000000';
        else if (colorName.includes('white')) displayColor = '#ffffff';
        else if (colorName.includes('navy')) displayColor = '#001f3f';
        else if (colorName.includes('grey') || colorName.includes('gray')) displayColor = '#6c757d';
        else displayColor = '#cccccc';
      }

      return {
        colour_code: color.code,
        colour_name: color.name || variant?.colour_name || color.code,
        colour_image: color.image,
        rgb: displayColor,
        colour_shade: variant?.colour_shade,
        back_image_url: variant?.back_image_url,
        side_image_url: variant?.side_image_url,
        additional_image_url: variant?.additional_image_url,
      };
    });
  }, [productGroup, hexLookup]);

  const colorVariants = buildColors();
  const currentColor = colorVariants[selectedColor];

  // Get current variant
  const currentVariant = selectedSize
    ? productGroup.variants.find(v => v.colour_code === currentColor?.colour_code && v.size_code === selectedSize)
      || productGroup.variants.find(v => v.colour_code === currentColor?.colour_code)
      || productGroup.variants[0]
    : productGroup.variants.find(v => v.colour_code === currentColor?.colour_code)
      || productGroup.variants[0];

  // Get available sizes - use available_sizes array from product (aggregated from product_styles)
  // The API returns product_styles which have available_sizes as an array, not individual size_code values
  const firstVariant = productGroup.variants[0] as any;
  const allAvailableSizes: string[] = firstVariant?.available_sizes || [];

  const availableSizes = Array.from(new Set(allAvailableSizes)).filter(s => s).sort((a, b) => {
    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();
    return (SIZE_ORDER[aUpper] ?? SIZE_ORDER[a] ?? 50) - (SIZE_ORDER[bUpper] ?? SIZE_ORDER[b] ?? 50);
  });

  // Get price
  const getCurrentPrice = (): { specific: number } | { min: number; max: number } | null => {
    if (selectedSize && currentVariant) {
      const price = parseFloat(currentVariant.final_price);
      if (!isNaN(price) && price > 0) return { specific: price };
    }
    const colorVariantPrices = productGroup.variants
      .filter(v => v.colour_code === currentColor?.colour_code)
      .map(v => parseFloat(v.final_price))
      .filter(p => !isNaN(p) && p > 0);
    if (colorVariantPrices.length === 0) return productGroup.price_range || null;
    const min = Math.min(...colorVariantPrices);
    const max = Math.max(...colorVariantPrices);
    return min === max ? { specific: min } : { min, max };
  };

  const currentPrice = getCurrentPrice();

  // Get the product image (changes with colour)
  const productImage = currentColor?.colour_image || currentVariant?.primary_product_image_url;

  // Handle add to cart
  const handleAddToCart = () => {
    const selectedVariant = selectedSize
      ? productGroup.variants.find(v =>
          v.colour_code === currentColor?.colour_code &&
          v.size_code === selectedSize
        ) || currentVariant
      : currentVariant;

    const price = selectedVariant ? parseFloat(selectedVariant.final_price) : (productGroup.price_range?.min || 0);

    const cartProduct = {
      style_code: productGroup.style_code,
      style_name: productGroup.style_name,
      brand: productGroup.brand,
      primary_product_image_url: currentColor?.colour_image || currentVariant?.primary_product_image_url || '',
      price_range: { min: price, max: price },
    };

    addToCart(
      cartProduct as any,
      quantity,
      currentColor?.colour_name,
      selectedSize || undefined
    );

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // Handle enquiry submission
  const handleEnquirySubmit = async (contactData: any, pathType: string) => {
    setQuoteStep('submitting');
    setSubmitError(null);

    try {
      const enquiryData: SubmitEnquiryRequest = {
        customerName: contactData.name,
        customerEmail: contactData.email,
        customerPhone: contactData.phone || '',
        productName: productGroup.style_name,
        productStyleCode: productGroup.style_code,
        productColor: currentColor?.colour_name || '',
        productColorCode: currentColor?.colour_code || '',
        productImageUrl: currentColor?.colour_image || '',
        logoData: savedLogoData?.logoSrc || undefined,
        logoAnalysis: savedLogoData?.analysis || undefined,
        logoPositionX: savedLogoData?.x,
        logoPositionY: savedLogoData?.y,
        logoSizePercent: savedLogoData?.size,
        estimatedQuantity: contactData.quantity || '',
        additionalNotes: contactData.message || '',
        enquiryType: pathType as 'upload' | 'design_help' | 'consultation',
        // Include cart items and their logo previews
        cartItems: cart.map(item => ({
          id: item.id,
          name: item.name,
          styleCode: item.styleCode,
          color: item.selectedColor,
          image: item.image,
          quantity: item.quantity,
        })),
        cartItemPreviews: cartItemPreviews.length > 0 ? cartItemPreviews : undefined,
      };

      const result = await submitClothingEnquiry(enquiryData);
      if (result.success && result.enquiryRef) {
        setEnquiryRef(result.enquiryRef);
        await sendEnquiryEmails({
          customerEmail: enquiryData.customerEmail,
          customerName: enquiryData.customerName,
          customerPhone: enquiryData.customerPhone,
          enquiryId: result.enquiryId || '',
          enquiryRef: result.enquiryRef,
          productName: enquiryData.productName,
          enquiryType: enquiryData.enquiryType,
          estimatedQuantity: enquiryData.estimatedQuantity,
          additionalNotes: enquiryData.additionalNotes,
          logoQuality: savedLogoData?.analysis?.qualityTier,
        });
        setQuoteStep('success');
        // Clear the cart after successful enquiry submission
        clearCart();
      } else {
        throw new Error('Failed to submit enquiry');
      }
    } catch (error) {
      setSubmitError('Failed to submit enquiry. Please try again.');
      setQuoteStep('logo-options');
    }
  };

  // Handle accordion toggle (only one open at a time)
  const handleAccordionToggle = (section: 'description' | 'specs') => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  // How It Works steps data
  const howItWorksSteps = [
    {
      number: 1,
      title: 'Choose your garments',
      description: 'Browse our catalogue online, pop into our shop to try on garments, or chat to our team who will advise on the best options for you.',
    },
    {
      number: 2,
      title: 'Get a FREE quote + mockup',
      description: 'Send us your logo and our design team will create a visual of how your clothing will look.',
    },
    {
      number: 3,
      title: 'Approve your order',
      description: 'Once you approve your order, we\'ll get it into production. This usually takes 5-10 working days.',
    },
    {
      number: 4,
      title: 'Order up!',
      description: 'We\'ll let you know when your order is ready to collect from our Kidderminster shop, or we can post it to you.',
    },
  ];

  // Render quote flow content
  const renderQuoteContent = () => {
    if (showHowItWorksModal) {
      return (
        <div className="px-4 py-2">
          <button
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowHowItWorksModal(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowHowItWorksModal(false);
            }}
            className="mb-4 text-white/70 flex items-center gap-1.5 text-sm select-none"
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {/* How It Works Content - inline version for mobile sheet */}
          <div className="text-center mb-6">
            <h2 className="hearns-font text-2xl text-white mb-2">How does it work?</h2>
            <p className="text-white/60 text-sm">Getting custom branded workwear is easy</p>
          </div>

          <div className="space-y-4 mb-6">
            {howItWorksSteps.map((step) => (
              <div
                key={step.number}
                className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                  style={{ backgroundColor: colors.accent }}
                >
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-white/70 text-xs leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowHowItWorksModal(false);
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowHowItWorksModal(false);
            }}
            className="w-full py-3 rounded-lg text-white font-bold text-base select-none"
            style={{ backgroundColor: colors.accent, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            Got it!
          </button>
        </div>
      );
    }

    switch (quoteStep) {
      case 'logo-options':
        return (
          <div className="px-3 py-2">
            <button
              onClick={() => setShowQuoteModal(false)}
              className="mb-3 text-white/70 flex items-center gap-1.5 text-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to product
            </button>
            <ClothingOrderWizard
              productName={productGroup.style_name}
              productImage={currentColor?.colour_image || productGroup.variants[0]?.primary_product_image_url}
              productColors={colorVariants.map(c => ({
                name: c.colour_name,
                rgb: c.rgb,
                image: c.colour_image,
                code: c.colour_code,
              }))}
              initialColorIndex={selectedColor}
              onSelectPath={(path, logoData, contactData, itemPreviews) => {
                // Store logo data and cart item previews for enquiry submission
                if (logoData) setSavedLogoData(logoData);
                if (itemPreviews) setCartItemPreviews(itemPreviews);
                if (path === 'upload') setQuoteStep('upload');
                else if (path === 'help') setQuoteStep('help');
                else if (path === 'consult') setQuoteStep('consult');
              }}
              isMobile={true}
              cartItems={cart.map(item => ({
                id: item.id,
                name: item.name,
                image: item.image,
                brand: item.brand,
                selectedColor: item.selectedColor,
              }))}
            />
          </div>
        );
      case 'upload':
        return (
          <div className="px-3 py-2">
            <ClothingLogoUploader
              productTitle={productGroup.style_name}
              productImage={currentColor?.colour_image || productGroup.variants[0]?.primary_product_image_url}
              onBack={() => setQuoteStep('logo-options')}
              onComplete={() => {
                setQuoteStep('success');
                clearCart();
              }}
              isMobile={true}
            />
          </div>
        );
      case 'help':
        return (
          <div className="px-3 py-2">
            <ClothingHelpRequestForm
              productTitle={productGroup.style_name}
              onBack={() => setQuoteStep('logo-options')}
              onComplete={() => {
                setQuoteStep('success');
                clearCart();
              }}
              isMobile={true}
            />
          </div>
        );
      case 'consult':
        return (
          <div className="px-3 py-2">
            <ClothingConsultationBooker
              productName={productGroup.style_name}
              onBack={() => setQuoteStep('logo-options')}
              onComplete={() => {
                setQuoteStep('success');
                clearCart();
              }}
              isMobile={true}
            />
          </div>
        );
      case 'submitting':
        return (
          <div className="flex flex-col items-center justify-center py-8 px-3">
            <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin mb-3" />
            <p className="text-white text-sm">Submitting your enquiry...</p>
          </div>
        );
      case 'success':
        return (
          <div className="text-center py-8 px-3">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Enquiry Submitted!</h3>
            <p className="text-white/70 text-sm mb-2">Reference: {enquiryRef}</p>
            <p className="text-white/60 text-xs mb-4">We'll be in touch within 24 hours.</p>
            <button
              onClick={() => {
                setShowQuoteModal(false);
                setQuoteStep('logo-options');
              }}
              className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm"
              style={{ backgroundColor: colors.accent }}
            >
              Continue Browsing
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 z-50"
            style={{ touchAction: 'none' }}
            onTouchMove={(e) => e.preventDefault()}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '100%' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-[10px] overflow-hidden flex flex-col"
            style={{
              height: '95%',
              backgroundColor: colors.dark,
            }}
          >
            {/* Drag Handle - tap to close */}
            <motion.div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
              onClick={handleClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleClose();
              }}
              style={{ touchAction: 'none' }}
            >
              <div
                className="w-12 h-1.5 rounded-full"
                style={{
                  backgroundColor: colors.accent,
                  boxShadow: `0 2px 8px ${colors.accent}40`,
                }}
              />
            </motion.div>

            {/* Scrollable Content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto overscroll-none"
              style={{ paddingBottom: '80px' }}
            >
              {(showQuoteModal || showHowItWorksModal) ? (
                renderQuoteContent()
              ) : (
                <div className="px-4">
                  {/* Product Image - changes with colour */}
                  <div className="relative mb-4">
                    <div className="aspect-square bg-white rounded-lg overflow-hidden">
                      <img
                        src={productImage}
                        alt={productGroup.style_name}
                        className="w-full h-full object-contain"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Product Info - Name, Brand, Price, SKU */}
                  <div className="mb-4">
                    <p className="text-white/60 text-xs mb-0.5">{productGroup.brand}</p>
                    <h2 className="text-xl font-bold text-white mb-1">{productGroup.style_name}</h2>
                    <p className="text-lg font-semibold mb-1" style={{ color: colors.accent }}>
                      {currentPrice && 'specific' in currentPrice
                        ? `£${currentPrice.specific.toFixed(2)}`
                        : currentPrice
                        ? `£${currentPrice.min.toFixed(2)} - £${currentPrice.max.toFixed(2)}`
                        : 'Price on request'}
                      <span className="text-white/50 text-xs ml-1">per unit</span>
                    </p>
                    <p className="text-white/50 text-xs">SKU: {productGroup.style_code}</p>
                  </div>

                  {/* Colour Dropdown */}
                  <div className="mb-4 relative">
                    <p className="text-white/70 text-xs mb-1.5">Colour</p>
                    <button
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setColorDropdownOpen(!colorDropdownOpen);
                        setSizeDropdownOpen(false);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setColorDropdownOpen(!colorDropdownOpen);
                        setSizeDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-lg bg-white/10 border border-white/20 select-none"
                      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white/40 flex-shrink-0"
                          style={{ backgroundColor: currentColor?.rgb || '#cccccc' }}
                        />
                        <span className="text-white text-sm font-medium truncate">
                          {currentColor?.colour_name || currentColor?.colour_code || 'Select colour'}
                        </span>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-white/60 transition-transform flex-shrink-0 ${colorDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {colorDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-30 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-[#1e3a2f] border border-white/20 shadow-xl"
                        >
                          {colorVariants.map((color, idx) => (
                            <button
                              key={color.colour_code || idx}
                              onTouchEnd={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedColor(idx);
                                setColorDropdownOpen(false);
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedColor(idx);
                                setColorDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/10 transition-colors select-none ${
                                selectedColor === idx ? 'bg-white/10' : ''
                              }`}
                              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                            >
                              <div
                                className="w-5 h-5 rounded-full border border-white/30 flex-shrink-0"
                                style={{ backgroundColor: color.rgb || '#cccccc' }}
                              />
                              <span className="text-white text-sm truncate flex-1">
                                {color.colour_name || color.colour_code || `Color ${idx + 1}`}
                              </span>
                              {selectedColor === idx && (
                                <Check className="w-4 h-4 flex-shrink-0" style={{ color: colors.accent }} />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Size Dropdown */}
                  {availableSizes.length > 0 && (
                    <div className="mb-4 relative">
                      <p className="text-white/70 text-xs mb-1.5">Size</p>
                      <button
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSizeDropdownOpen(!sizeDropdownOpen);
                          setColorDropdownOpen(false);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSizeDropdownOpen(!sizeDropdownOpen);
                          setColorDropdownOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 rounded-lg bg-white/10 border border-white/20 select-none"
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      >
                        <span className="text-white text-sm font-medium">
                          {selectedSize || 'Select size'}
                        </span>
                        <ChevronDown className={`w-5 h-5 text-white/60 transition-transform flex-shrink-0 ${sizeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {sizeDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-30 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-[#1e3a2f] border border-white/20 shadow-xl"
                          >
                            {availableSizes.map((size) => (
                              <button
                                key={size}
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedSize(size);
                                  setQuantity(1);
                                  setSizeDropdownOpen(false);
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedSize(size);
                                  setQuantity(1);
                                  setSizeDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-3 text-left hover:bg-white/10 transition-colors select-none ${
                                  selectedSize === size ? 'bg-white/10' : ''
                                }`}
                                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                              >
                                <span className="text-white text-sm">{size}</span>
                                {selectedSize === size && (
                                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: colors.accent }} />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Quantity Selector - only appears after size is selected */}
                  {(availableSizes.length === 0 || selectedSize) && (
                    <div className="mb-4">
                      <p className="text-white/70 text-xs mb-1.5">Quantity</p>
                      <div className="flex items-center justify-between p-1 rounded-lg bg-white/5 border border-white/10">
                        <button
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (quantity > 1) setQuantity(quantity - 1);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (quantity > 1) setQuantity(quantity - 1);
                          }}
                          disabled={quantity <= 1}
                          className="w-12 h-12 rounded-md flex items-center justify-center transition-all active:bg-white/10 disabled:opacity-30 select-none"
                          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        >
                          <Minus className="w-5 h-5 text-white/70" />
                        </button>
                        <span className="flex-1 text-center text-lg font-semibold text-white">
                          {quantity}
                        </span>
                        <button
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setQuantity(quantity + 1);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setQuantity(quantity + 1);
                          }}
                          className="w-12 h-12 rounded-md flex items-center justify-center transition-all select-none"
                          style={{ backgroundColor: `${colors.accent}30`, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                        >
                          <Plus className="w-5 h-5" style={{ color: colors.accent }} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* How Does It Work Button */}
                  <button
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowHowItWorksModal(true);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowHowItWorksModal(true);
                    }}
                    className="w-full py-3 mb-4 rounded-lg text-white/80 font-medium text-sm border border-white/20 flex items-center justify-center gap-2 select-none active:bg-white/10"
                    style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                  >
                    <Info className="w-4 h-4" />
                    How does it work?
                  </button>

                  {/* Accordions - Description and Specs */}
                  <div className="space-y-2 mb-4">
                    {/* Description Accordion */}
                    <div className="rounded-lg overflow-hidden bg-white/5">
                      <button
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAccordionToggle('description');
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAccordionToggle('description');
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left select-none"
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      >
                        <span className="text-white text-sm font-medium">Description</span>
                        <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${openAccordion === 'description' ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {openAccordion === 'description' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 text-white/80 text-sm space-y-2">
                              <p>{currentVariant?.retail_description || productGroup.variants[0]?.retail_description || 'No description available.'}</p>
                              {(currentVariant?.product_feature_1 || productGroup.product_feature_1) && (
                                <p>• {currentVariant?.product_feature_1 || productGroup.product_feature_1}</p>
                              )}
                              {(currentVariant?.product_feature_2 || productGroup.product_feature_2) && (
                                <p>• {currentVariant?.product_feature_2 || productGroup.product_feature_2}</p>
                              )}
                              {(currentVariant?.product_feature_3 || productGroup.product_feature_3) && (
                                <p>• {currentVariant?.product_feature_3 || productGroup.product_feature_3}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Specs Accordion */}
                    <div className="rounded-lg overflow-hidden bg-white/5">
                      <button
                        onTouchEnd={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAccordionToggle('specs');
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAccordionToggle('specs');
                        }}
                        className="w-full flex items-center justify-between px-4 py-3 text-left select-none"
                        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                      >
                        <span className="text-white text-sm font-medium">Specifications</span>
                        <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${openAccordion === 'specs' ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {openAccordion === 'specs' && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 text-white/80 text-sm space-y-1.5">
                              {(currentVariant?.fabric || productGroup.fabric) && (
                                <p><span className="text-white/50">Fabric:</span> {currentVariant?.fabric || productGroup.fabric}</p>
                              )}
                              {currentVariant?.weight_gsm && (
                                <p><span className="text-white/50">Weight:</span> {currentVariant.weight_gsm}</p>
                              )}
                              {currentVariant?.specification && (
                                <p><span className="text-white/50">Specification:</span> {currentVariant.specification}</p>
                              )}
                              <p><span className="text-white/50">Size Range:</span> {productGroup.size_range}</p>
                              {currentVariant?.sizing_to_fit && (
                                <p><span className="text-white/50">Sizing:</span> {currentVariant.sizing_to_fit}</p>
                              )}
                              {currentVariant?.washing_instructions && (
                                <p><span className="text-white/50">Care:</span> {currentVariant.washing_instructions}</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Add to Order Button at Bottom */}
            {!showQuoteModal && !showHowItWorksModal && (
              <div
                className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10"
                style={{ backgroundColor: colors.dark }}
              >
                <button
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (availableSizes.length === 0 || selectedSize) {
                      handleAddToCart();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (availableSizes.length === 0 || selectedSize) {
                      handleAddToCart();
                    }
                  }}
                  disabled={availableSizes.length > 0 && !selectedSize}
                  className="w-full py-3.5 rounded-lg text-white font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 select-none"
                  style={{
                    backgroundColor: addedToCart ? '#28a745' : colors.accent,
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  {addedToCart ? (
                    <>
                      <Check className="w-5 h-5" />
                      Added to Order
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      {availableSizes.length > 0 && !selectedSize
                        ? 'Select Size to Add'
                        : `Add ${quantity > 1 ? `${quantity} ` : ''}to Order`
                      }
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileProductSheet;
