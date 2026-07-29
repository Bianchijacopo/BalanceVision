import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  BarChart3,
  Wallet,
  Target,
  Repeat,
  Lightbulb,
  FolderTree,
  Upload,
  LogOut,
  X,
} from 'lucide-react';

export default function CircularNavigation({ isOpen, onClose, onLogout }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState(null);

  const items = [
    { name: t('nav.analytics'), icon: BarChart3, path: '/analytics' },
    { name: t('nav.budgets'), icon: Wallet, path: '/budgets' },
    { name: t('nav.goals'), icon: Target, path: '/goals' },
    { name: t('nav.recurring'), icon: Repeat, path: '/recurring' },
    { name: t('nav.advice'), icon: Lightbulb, path: '/advice' },
    { name: t('nav.categories'), icon: FolderTree, path: '/categories' },
    { name: t('nav.import'), icon: Upload, path: '/import' },
    { name: t('nav.logout'), icon: LogOut, path: 'logout' },
  ];

  function handleClick(item) {
    onClose();
    if (item.path === 'logout') {
      onLogout?.();
      return;
    }
    navigate(item.path);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="circular-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="circular-ring"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="circular-close"
              aria-label="Close menu"
            >
              <X className="circular-close-icon" />
            </button>

            {items.map((item, index) => {
              const Icon = item.icon;
              const angle = (360 / items.length) * index;

              return (
                <div
                  key={item.name}
                  className="circular-item-wrap"
                  style={{
                    transform: `rotate(${angle}deg) translate(140px) rotate(-${angle}deg)`,
                  }}
                >
                  <button
                    onClick={() => handleClick(item)}
                    className={`circular-item-btn ${hoveredItem === item.name ? 'circular-item-btn--hover' : ''}`}
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Icon className="circular-item-icon" />
                    <span className="circular-item-label">{item.name}</span>
                  </button>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
