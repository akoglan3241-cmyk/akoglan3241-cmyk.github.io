// src/components/InventoryDrawer.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Search, Grid3X3, Shirt, Home, Sparkles, Heart, 
  Star, Zap, Filter, ArrowRight, Info, Package
} from 'lucide-react';

// --- Types & Constants ---

type Category = 'all' | 'furniture' | 'clothes' | 'effects' | 'pets' | 'specials';

interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  count?: number;
  description: string;
  isNew?: boolean;
}

const CATEGORIES: { id: Category; label: string; icon: any }[] = [
  { id: 'all', label: 'All', icon: Grid3X3 },
  { id: 'furniture', label: 'Furniture', icon: Home },
  { id: 'clothes', label: 'Clothes', icon: Shirt },
  { id: 'effects', label: 'Effects', icon: Sparkles },
  { id: 'pets', label: 'Pets', icon: Heart },
  { id: 'specials', label: 'Special', icon: Star },
];

const RARITY_COLORS = {
  common: 'border-slate-600 bg-slate-700/50 text-slate-400',
  rare: 'border-blue-500 bg-blue-900/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
  epic: 'border-purple-500 bg-purple-900/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
  legendary: 'border-amber-500 bg-amber-900/20 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse',
};

const MOCK_ITEMS: InventoryItem[] = [
  { id: '1', name: 'Neon Chair', category: 'furniture', rarity: 'rare', icon: '🪑', description: 'A glowing chair for modern rooms.' },
  { id: '2', name: 'Cyber Jacket', category: 'clothes', rarity: 'epic', icon: '🧥', description: 'High-tech fashion for the metaverse.', isNew: true },
  { id: '3', name: 'Magic Sparkles', category: 'effects', rarity: 'common', icon: '✨', description: 'Basic particle effect.' },
  { id: '4', name: 'Dragon Pet', category: 'pets', rarity: 'legendary', icon: '🐉', description: 'A mythical companion that breathes fire.' },
  { id: '5', name: 'Wooden Table', category: 'furniture', rarity: 'common', icon: '🪵', description: 'Sturdy and classic.' },
  { id: '6', name: 'Golden Crown', category: 'specials', rarity: 'legendary', icon: '👑', description: 'For royalty only.' },
  { id: '7', name: 'Disco Ball', category: 'furniture', rarity: 'rare', icon: '🪩', description: 'Party essential.' },
  { id: '8', name: 'Rainbow Trail', category: 'effects', rarity: 'epic', icon: '🌈', description: 'Leave a colorful path behind you.' },
];

// --- Sub-Components ---

const ItemCard: React.FC<{ 
  item: InventoryItem; 
  isSelected: boolean; 
  onClick: () => void 
}> = ({ item, isSelected, onClick }) => (
  <motion.div
    layoutId={`item-${item.id}`}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ y: -4, scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative group cursor-pointer rounded-xl border-2 transition-all duration-200 overflow-hidden ${
      isSelected 
        ? 'border-white bg-white/10 shadow-lg scale-[1.02]' 
        : `border-transparent bg-slate-800/50 hover:bg-slate-700/50 ${RARITY_COLORS[item.rarity]}`
    }`}
  >
    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br from-white to-transparent pointer-events-none" />
    
    <div className="aspect-square flex flex-col items-center justify-center p-2 relative z-10">
      <span className="text-4xl mb-1 filter drop-shadow-lg transform group-hover:scale-110 transition-transform duration-200">
        {item.icon}
      </span>
      {item.count && item.count > 1 && (
        <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
          x{item.count}
        </span>
      )}
      {item.isNew && (
        <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg animate-bounce">
          NEW
        </span>
      )}
    </div>
    
    <div className="px-2 pb-2 text-center">
      <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
        {item.name}
      </p>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{item.rarity}</p>
    </div>
  </motion.div>
);

const SkeletonLoader: React.FC = () => (
  <div className="grid grid-cols-4 gap-3">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="aspect-square rounded-xl bg-slate-800/50 animate-pulse border border-slate-700/50" />
    ))}
  </div>
);

const EmptyState: React.FC<{ searchQuery: string }> = ({ searchQuery }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center h-64 text-center p-6"
  >
    <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
      <Package size={32} className="text-slate-600" />
    </div>
    <h3 className="text-lg font-bold text-slate-300 mb-1">
      {searchQuery ? 'No items found' : 'Inventory Empty'}
    </h3>
    <p className="text-sm text-slate-500 max-w-xs">
      {searchQuery 
        ? `Try searching for something else or check your filters.` 
        : `You haven't collected any items yet. Visit the shop to get started!`}
    </p>
  </motion.div>
);

// --- Main Component ---

interface InventoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryDrawer: React.FC<InventoryDrawerProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    return MOCK_ITEMS.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const selectedItem = useMemo(() => 
    MOCK_ITEMS.find(i => i.id === selectedItemId), 
  [selectedItemId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-slate-900 z-50 shadow-2xl flex flex-col border-l border-white/10"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/5 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="text-indigo-400" size={20} />
                  Inventory
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filteredItems.length} items available
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search & Filters */}
            <div className="p-4 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
              
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <cat.icon size={14} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Grid List */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                {isLoading ? (
                  <SkeletonLoader />
                ) : filteredItems.length === 0 ? (
                  <EmptyState searchQuery={searchQuery} />
                ) : (
                  <motion.div 
                    layout
                    className="grid grid-cols-4 gap-3"
                  >
                    <AnimatePresence>
                      {filteredItems.map((item) => (
                        <ItemCard
                          key={item.id}
                          item={item}
                          isSelected={selectedItemId === item.id}
                          onClick={() => setSelectedItemId(item.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>

              {/* Preview Panel */}
              <AnimatePresence>
                {selectedItem && (
                  <motion.div
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 20, opacity: 0 }}
                    className="w-48 bg-slate-800/30 border-l border-white/5 p-4 flex flex-col shrink-0 hidden sm:flex"
                  >
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                      <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-6xl mb-4 ${RARITY_COLORS[selectedItem.rarity]}`}>
                        {selectedItem.icon}
                      </div>
                      <h3 className="font-bold text-white text-lg leading-tight mb-1">{selectedItem.name}</h3>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full mb-3 ${RARITY_COLORS[selectedItem.rarity]}`}>
                        {selectedItem.rarity}
                      </span>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {selectedItem.description}
                      </p>
                    </div>
                    
                    <div className="space-y-2 mt-4">
                      <button className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg transition-all">
                        Use Item
                      </button>
                      <button className="w-full py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-white border border-white/10 rounded-xl font-bold transition-all">
                        Details
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Mobile Action Bar */}
            <div className="sm:hidden p-4 border-t border-white/5 bg-slate-900/90 backdrop-blur-xl">
              {selectedItem ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0">
                    {selectedItem.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{selectedItem.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{selectedItem.rarity}</p>
                  </div>
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-colors">
                    Use
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-500">Select an item to view details</p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
