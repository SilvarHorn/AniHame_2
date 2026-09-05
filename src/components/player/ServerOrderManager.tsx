import React from 'react';
import { WatchServerType, DEFAULT_SERVER_ORDER } from '../../contexts/AuthContext';
import { ChevronUp, ChevronDown, RotateCcw, GripVertical } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ServerMeta {
  id: WatchServerType;
  name: string;
}

export const SERVER_METAS: Record<WatchServerType, ServerMeta> = {
  mal: {
    id: 'mal',
    name: 'Megaplay'
  },
  anime: {
    id: 'anime',
    name: 'Anime'
  },
  animepahe: {
    id: 'animepahe',
    name: 'AnimePahe'
  },
  tryembed: {
    id: 'tryembed',
    name: 'Try'
  },
  kozo: {
    id: 'kozo',
    name: 'Kozo'
  },
  vidsrc: {
    id: 'vidsrc',
    name: 'VidSrc'
  }
};

interface ServerOrderManagerProps {
  order: WatchServerType[];
  onChange: (newOrder: WatchServerType[]) => void;
  className?: string;
  compact?: boolean;
}

export const ServerOrderManager: React.FC<ServerOrderManagerProps> = ({
  order,
  onChange,
  className,
  compact = false
}) => {
  // Ensure all known servers are present in the list
  const sanitizedOrder: WatchServerType[] = React.useMemo(() => {
    const list = [...order];
    DEFAULT_SERVER_ORDER.forEach(srv => {
      if (!list.includes(srv)) {
        list.push(srv);
      }
    });
    return list;
  }, [order]);

  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...sanitizedOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    onChange(newOrder);
  };

  const moveDown = (index: number) => {
    if (index >= sanitizedOrder.length - 1) return;
    const newOrder = [...sanitizedOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    onChange(newOrder);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent, index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrder = [...sanitizedOrder];
    const [movedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, movedItem);
    onChange(newOrder);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleReset = () => {
    onChange([...DEFAULT_SERVER_ORDER]);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Playback Server Order
          </span>
          <p className="text-xs text-gray-500">
            Drag and drop or use the arrows to arrange your preferred server sequence
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-primary bg-gray-800/60 hover:bg-gray-800 rounded-md border border-white/5 transition-colors"
          title="Reset to default order"
        >
          <RotateCcw size={12} />
          <span>Reset Order</span>
        </button>
      </div>

      {/* Server List */}
      <div className="flex flex-col gap-1.5" onDragLeave={() => setDragOverIndex(null)}>
        {sanitizedOrder.map((srvKey, idx) => {
          const meta = SERVER_METAS[srvKey] || {
            id: srvKey,
            name: srvKey
          };

          const isBeingDragged = draggedIndex === idx;
          const isTargeted = dragOverIndex === idx && draggedIndex !== idx;

          return (
            <div
              key={srvKey}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={(e) => handleDragLeave(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={cn(
                "group flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/5 bg-[#12141A] transition-all cursor-grab active:cursor-grabbing select-none",
                idx === 0 && !isTargeted && !isBeingDragged && "border-primary/30 bg-primary/5",
                isBeingDragged && "opacity-35 scale-[0.98] border-dashed border-primary/50 shadow-inner",
                isTargeted && "border-primary bg-primary/15 ring-2 ring-primary/40 -translate-y-0.5 shadow-lg shadow-primary/10"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Drag Handle */}
                <div 
                  className="text-gray-500 group-hover:text-primary transition-colors cursor-grab active:cursor-grabbing shrink-0"
                  title="Drag to rearrange"
                >
                  <GripVertical size={16} />
                </div>

                <span className={cn(
                  "w-5 h-5 rounded flex items-center justify-center text-[11px] font-black shrink-0",
                  idx === 0 ? "bg-primary text-[#0B0C0F]" : "bg-gray-800 text-gray-400"
                )}>
                  {idx + 1}
                </span>

                <div className="flex items-center min-w-0">
                  <span className="text-sm font-bold text-[#EDF1F5] truncate">
                    {meta.name}
                  </span>
                </div>
              </div>

              <div 
                className="flex items-center gap-1 shrink-0 ml-2"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                  title="Move Up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === sanitizedOrder.length - 1}
                  className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                  title="Move Down"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Pill Bar */}
      <div className="mt-2 pt-2 border-t border-white/5">
        <span className="text-[11px] font-bold text-gray-400 block mb-1.5">
          Live Server Bar Preview:
        </span>
        <div className="flex items-center gap-1 p-1 bg-gray-900 rounded-lg overflow-x-auto">
          {sanitizedOrder.map((srvKey, idx) => {
            const meta = SERVER_METAS[srvKey];
            return (
              <span
                key={srvKey}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap",
                  idx === 0 ? "bg-primary text-[#0B0C0F]" : "bg-gray-800 text-gray-300"
                )}
              >
                {meta?.name || srvKey}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
