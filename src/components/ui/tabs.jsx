import React, { createContext, useContext, useState } from 'react';
import { motion } from 'framer-motion';

// Tabs Context
const TabsContext = createContext();

// Tabs Root Component
export function Tabs({ value, onValueChange, children, className = '' }) {
  const [activeTab, setActiveTab] = useState(value);
  
  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
    onValueChange?.(newValue);
  };
  
  return (
    <TabsContext.Provider value={{ activeTab, handleTabChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// Tabs List Component
export function TabsList({ children, className = '' }) {
  return (
    <div className={`flex ${className}`}>
      {children}
    </div>
  );
}

// Tabs Trigger Component
export function TabsTrigger({ value, children, className = '' }) {
  const { activeTab, handleTabChange } = useContext(TabsContext);
  const isActive = activeTab === value;
  
  return (
    <motion.button
      onClick={() => handleTabChange(value)}
      className={`relative px-4 py-2 text-sm font-medium transition-colors ${className} ${
        isActive ? '' : 'text-gray-600 hover:text-gray-900'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 rounded-md"
          style={{ zIndex: -1 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}

// Tabs Content Component
export function TabsContent({ value, children, className = '' }) {
  const { activeTab } = useContext(TabsContext);
  
  if (activeTab !== value) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
