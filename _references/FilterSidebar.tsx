import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, Search, X, Check } from 'lucide-react';
import { ProductFilters, FilterOptions } from '../lib/productBrowserApi';

interface FilterSidebarProps {
  filterOptions: FilterOptions;
  currentFilters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  totalResults: number;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filterOptions,
  currentFilters,
  onFiltersChange,
  totalResults
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['productTypes', 'brands', 'colors', 'price'])
  );
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleMultiSelectToggle = (key: keyof ProductFilters, value: string) => {
    const currentValues = (currentFilters[key] as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({
      ...currentFilters,
      [key]: newValues.length > 0 ? newValues : undefined
    });
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onFiltersChange({
      ...currentFilters,
      [type === 'min' ? 'priceMin' : 'priceMax']: numValue
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({});
    setSearchTerms({});
  };

  const removeFilter = (key: keyof ProductFilters, value?: string) => {
    if (value && Array.isArray(currentFilters[key])) {
      const newValues = (currentFilters[key] as string[]).filter(v => v !== value);
      onFiltersChange({
        ...currentFilters,
        [key]: newValues.length > 0 ? newValues : undefined
      });
    } else {
      const newFilters = { ...currentFilters };
      delete newFilters[key];
      onFiltersChange(newFilters);
    }
  };

  const getActiveFilters = useMemo(() => {
    const active: Array<{ key: keyof ProductFilters; value: string; label: string }> = [];
    
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (key === 'searchQuery' || key === 'priceMin' || key === 'priceMax') return;
      if (Array.isArray(value)) {
        value.forEach(v => {
          active.push({ key: key as keyof ProductFilters, value: v, label: v });
        });
      }
    });
    
    if (currentFilters.priceMin !== undefined || currentFilters.priceMax !== undefined) {
      const min = currentFilters.priceMin ?? 0;
      const max = currentFilters.priceMax ?? '∞';
      active.push({ 
        key: 'priceMin', 
        value: 'price', 
        label: `£${min} - £${max}` 
      });
    }
    
    return active;
  }, [currentFilters]);

  const filterOptionsBySearch = (options: string[], sectionKey: string): string[] => {
    const searchTerm = searchTerms[sectionKey]?.toLowerCase() || '';
    if (!searchTerm) return options;
    return options.filter(opt => opt.toLowerCase().includes(searchTerm));
  };

  const renderFilterSection = (
    title: string,
    key: keyof ProductFilters,
    options: string[],
    showSearch: boolean = false
  ) => {
    const isExpanded = expandedSections.has(key);
    const selectedValues = (currentFilters[key] as string[]) || [];
    const filteredOptions = filterOptionsBySearch(options, key);
    const visibleOptions = filteredOptions.slice(0, isExpanded ? undefined : 6);
    const hasMore = filteredOptions.length > 6;

    return (
      <div className="border-b border-white/[0.08] last:border-b-0">
        <button
          className="w-full flex items-center justify-between py-4 px-1 text-left group"
          onClick={() => toggleSection(key)}
        >
          <span className="text-sm font-semibold text-white group-hover:text-[#78BE20] transition-colors">
            {title}
          </span>
          <div className="flex items-center gap-2">
            {selectedValues.length > 0 && (
              <span className="bg-[#78BE20] text-black text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {selectedValues.length}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp size={16} className="text-[#666]" />
            ) : (
              <ChevronDown size={16} className="text-[#666]" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="pb-4 px-1">
            {/* Search within filter */}
            {showSearch && options.length > 8 && (
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input
                  type="text"
                  placeholder={`Search ${title.toLowerCase()}...`}
                  value={searchTerms[key] || ''}
                  onChange={(e) => setSearchTerms({ ...searchTerms, [key]: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#78BE20]/50 transition-colors"
                />
              </div>
            )}

            {/* Options */}
            <div className="space-y-1 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {visibleOptions.map((option) => {
                const isSelected = selectedValues.includes(option);
                return (
                  <label 
                    key={option} 
                    className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? 'bg-[#78BE20]/10' 
                        : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMultiSelectToggle(key, option)}
                      className="sr-only"
                    />
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                      isSelected 
                        ? 'bg-[#78BE20] border-[#78BE20]' 
                        : 'border-[#444] hover:border-[#666]'
                    }`}>
                      {isSelected && <Check size={10} className="text-black" strokeWidth={3} />}
                    </span>
                    <span className={`text-[13px] leading-tight ${
                      isSelected ? 'text-white font-medium' : 'text-[#999]'
                    }`}>
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Show more/less */}
            {hasMore && !searchTerms[key] && (
              <button
                onClick={() => toggleSection(key)}
                className="mt-2 text-xs font-medium text-[#78BE20] hover:text-[#8ed42e] transition-colors"
              >
                {isExpanded ? '' : `Show all ${filteredOptions.length}`}
              </button>
            )}

            {filteredOptions.length === 0 && (
              <p className="text-xs text-[#555] py-2">No matches found</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#141414] border border-white/[0.1] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] bg-[#181818]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-white">Filters</h3>
          {getActiveFilters.length > 0 && (
            <button 
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-xs font-medium text-[#888] hover:text-[#78BE20] transition-colors"
            >
              <RotateCcw size={12} />
              Clear all
            </button>
          )}
        </div>
        
        {/* Results count */}
        <div className="bg-[#78BE20]/10 rounded-lg px-3 py-2">
          <span className="text-[#78BE20] font-bold text-lg">
            {totalResults.toLocaleString()}
          </span>
          <span className="text-[#78BE20]/70 text-sm ml-1.5">
            products
          </span>
        </div>
      </div>

      {/* Active Filters */}
      {getActiveFilters.length > 0 && (
        <div className="p-4 border-b border-white/[0.08] bg-[#111]">
          <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">
            Active Filters
          </p>
          <div className="flex flex-wrap gap-2">
            {getActiveFilters.map((filter, index) => (
              <button
                key={`${filter.key}-${filter.value}-${index}`}
                onClick={() => {
                  if (filter.value === 'price') {
                    onFiltersChange({
                      ...currentFilters,
                      priceMin: undefined,
                      priceMax: undefined
                    });
                  } else {
                    removeFilter(filter.key, filter.value);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#78BE20] rounded-full text-xs text-white font-medium hover:bg-red-500 transition-all group"
              >
                <span className="truncate max-w-[120px]">{filter.label}</span>
                <X size={12} className="text-white group-hover:text-white flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Sections */}
      <div className="p-4">
        {/* Price Range - Custom */}
        <div className="border-b border-white/[0.08]">
          <button
            className="w-full flex items-center justify-between py-4 px-1 text-left group"
            onClick={() => toggleSection('price')}
          >
            <span className="text-sm font-semibold text-white group-hover:text-[#78BE20] transition-colors">
              Price Range
            </span>
            {expandedSections.has('price') ? (
              <ChevronUp size={16} className="text-[#666]" />
            ) : (
              <ChevronDown size={16} className="text-[#666]" />
            )}
          </button>

          {expandedSections.has('price') && (
            <div className="pb-4 px-1">
              <div className="flex gap-3 mb-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5 block">
                    Min
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">£</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={currentFilters.priceMin ?? ''}
                      onChange={(e) => handlePriceChange('min', e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#78BE20]/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5 block">
                    Max
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555] text-sm">£</span>
                    <input
                      type="number"
                      placeholder="Any"
                      value={currentFilters.priceMax ?? ''}
                      onChange={(e) => handlePriceChange('max', e.target.value)}
                      className="w-full pl-7 pr-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#78BE20]/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
              
              {/* Quick price buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Under £25', min: 0, max: 25 },
                  { label: '£25-£50', min: 25, max: 50 },
                  { label: '£50+', min: 50, max: undefined },
                ].map((preset) => {
                  const isActive = currentFilters.priceMin === preset.min && currentFilters.priceMax === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        onFiltersChange({
                          ...currentFilters,
                          priceMin: preset.min,
                          priceMax: preset.max
                        });
                      }}
                      className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#78BE20] text-black'
                          : 'bg-white/[0.03] text-[#888] border border-white/[0.08] hover:border-[#78BE20]/50 hover:text-white'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Filter Sections */}
        {filterOptions.productTypes && filterOptions.productTypes.length > 0 &&
          renderFilterSection('Product Type', 'productTypes', filterOptions.productTypes, true)
        }

        {filterOptions.brands && filterOptions.brands.length > 0 &&
          renderFilterSection('Brand', 'brands', filterOptions.brands, true)
        }

        {filterOptions.colors && filterOptions.colors.length > 0 &&
          renderFilterSection('Colour', 'colors', filterOptions.colors, true)
        }

        {filterOptions.materials && filterOptions.materials.length > 0 &&
          renderFilterSection('Material', 'materials', filterOptions.materials, true)
        }

        {filterOptions.sizes && filterOptions.sizes.length > 0 &&
          renderFilterSection('Size', 'sizes', filterOptions.sizes, false)
        }

        {filterOptions.genders && filterOptions.genders.length > 0 &&
          renderFilterSection('Gender', 'genders', filterOptions.genders, false)
        }

        {filterOptions.ageGroups && filterOptions.ageGroups.length > 0 &&
          renderFilterSection('Age Group', 'ageGroups', filterOptions.ageGroups, false)
        }

      </div>
    </div>
  );
};

export default FilterSidebar;