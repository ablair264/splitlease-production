import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, Search, X, Grid3X3, List } from 'lucide-react';

// Design system colors
const colors = {
  dark: '#183028',
  darkLight: '#234a3a',
  accent: '#64a70b',
  white: '#ffffff',
};

interface MobileFilterBarProps {
  viewMode: 'grid' | 'row';
  onViewModeChange: (mode: 'grid' | 'row') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onFilterClick: () => void;
  activeFilterCount?: number;
}

const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onFilterClick,
  activeFilterCount = 0,
}) => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  // Focus input when search expands
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSearchExpanded &&
        barRef.current &&
        !barRef.current.contains(event.target as Node)
      ) {
        if (!searchQuery) {
          setIsSearchExpanded(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchExpanded, searchQuery]);

  const handleSearchClose = () => {
    onSearchChange('');
    setIsSearchExpanded(false);
  };

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-40 px-4 py-3 block sm:hidden"
      style={{ backgroundColor: colors.dark }}
    >
      <div className="flex items-center gap-3 relative">
        <AnimatePresence mode="wait">
          {isSearchExpanded ? (
            /* Expanded Search Input */
            <motion.div
              key="search-expanded"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 w-full"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-white/10 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  onClick={handleSearchClose}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* Collapsed View - Filter, Toggle, Search Icon */
            <motion.div
              key="controls"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 w-full"
            >
              {/* Filter Button */}
              <button
                onClick={onFilterClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium"
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: colors.accent }}
                  >
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* View Toggle */}
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => onViewModeChange('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                  style={viewMode === 'grid' ? { backgroundColor: colors.accent } : {}}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onViewModeChange('row')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'row'
                      ? 'text-white'
                      : 'text-white/50 hover:text-white/70'
                  }`}
                  style={viewMode === 'row' ? { backgroundColor: colors.accent } : {}}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Search Icon */}
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="p-2.5 rounded-lg bg-white/10 text-white"
              >
                <Search className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobileFilterBar;
