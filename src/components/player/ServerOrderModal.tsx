import React from 'react';
import { WatchServerType } from '../../contexts/AuthContext';
import { ServerOrderManager } from './ServerOrderManager';
import { X, SlidersHorizontal, Check } from 'lucide-react';

interface ServerOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: WatchServerType[];
  onSave: (newOrder: WatchServerType[]) => void;
}

export const ServerOrderModal: React.FC<ServerOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSave
}) => {
  const [currentOrder, setCurrentOrder] = React.useState<WatchServerType[]>(order);

  React.useEffect(() => {
    setCurrentOrder(order);
  }, [order, isOpen]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSave(currentOrder);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#0D0F14] border border-white/10 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Arrange Server List</h3>
              <p className="text-xs text-gray-400">Reorder streaming servers to your preference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <ServerOrderManager
          order={currentOrder}
          onChange={setCurrentOrder}
          compact={false}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-primary text-[#0B0C0F] hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
          >
            <Check size={16} />
            <span>Apply Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
