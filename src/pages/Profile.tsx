import 'react-easy-crop/react-easy-crop.css';

import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, LogIn, Save, Mail, Key, Edit3, Camera, X, Check, Square, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Cropper from 'react-easy-crop';
import { useAuth, WatchServerType, DEFAULT_SERVER_ORDER, DEFAULT_CARD_BORDER } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AnimeCard from '../components/ui/AnimeCard';
import { MyListStatus, getMyList, MyListItem } from '../utils/myList';
import SingleSelect from '../components/ui/SingleSelect';
import { ServerOrderManager } from '../components/player/ServerOrderManager';
import { cn } from '../lib/utils';

const TABS: { label: string; value: MyListStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Watching', value: 'WATCHING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'On-Hold', value: 'ON_HOLD' },
  { label: 'Dropped', value: 'DROPPED' },
  { label: 'Plan to Watch', value: 'PLAN_TO_WATCH' }
];

export default function Profile() {
  const { profile, loading, updatePreferences, updateProfileData } = useAuth();
  const navigate = useNavigate();
    
  // Local profile state for guests & editing
  const [isEditing, setIsEditing] = useState(false);
  const [localDisplayName, setLocalDisplayName] = useState('User');
  const [localAvatar, setLocalAvatar] = useState('');
  
  // Preferences state
  const [defaultServer, setDefaultServer] = useState<'mal' | 'megaplayz' | 'anime' | 'animepahe' | 'tryembed' | 'kozo' | 'vidsrc'>('mal');
  const [defaultAudio, setDefaultAudio] = useState<'sub' | 'dub'>('sub');
  const [showEpisodeDate, setShowEpisodeDate] = useState<boolean>(true);
  const [serverOrder, setServerOrder] = useState<WatchServerType[]>(DEFAULT_SERVER_ORDER);
  const [cardBorderMode, setCardBorderMode] = useState<'default' | 'custom'>('default');
  const [cardBorderColor, setCardBorderColor] = useState('#35D5BF');
  const [cardBorderWidth, setCardBorderWidth] = useState(2);
  
  // Theme state
  const [themeColor, setThemeColor] = useState('#8AD7D0');
  const [gradType, setGradType] = useState('solid');
  const [gradDir, setGradDir] = useState('to right');
  const [gradColor1, setGradColor1] = useState('#0B0C0F');
  const [gradColor2, setGradColor2] = useState('#243b55');
  const [bgGradient, setBgGradient] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [bgOpacity, setBgOpacity] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // List states
  const [activeTab, setActiveTab] = useState<MyListStatus | 'ALL'>('ALL');
  const [myList, setMyList] = useState<MyListItem[]>([]);
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingOpacity, setIsEditingOpacity] = useState(false);
  const [opacityInput, setOpacityInput] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);


  // Sync with AuthContext or LocalStorage
  useEffect(() => {
    if (profile) {
      setLocalDisplayName(profile.displayName || 'User');
      setLocalAvatar(profile.photoURL || '');
      setDefaultServer(profile.preferences?.defaultServer || 'mal');
      setDefaultAudio(profile.preferences?.defaultAudio || 'sub');
      setShowEpisodeDate(profile.preferences?.showEpisodeDate ?? true);
      if (profile.preferences?.serverOrder) {
        setServerOrder(profile.preferences.serverOrder);
      }
      if (profile.preferences?.cardBorder) {
        setCardBorderMode(profile.preferences.cardBorder.mode || 'default');
        setCardBorderColor(profile.preferences.cardBorder.color || '#35D5BF');
        setCardBorderWidth(profile.preferences.cardBorder.width || 2);
      }
      setThemeColor(profile.themeColor || '#8AD7D0');
      setBgGradient(profile.bgGradient || '');
      setBgImage(profile.bgImage || '');
      setBgOpacity(profile.bgOpacity ?? 100);
    } else {
      // Load from local storage for guests
      try {
        const saved = localStorage.getItem('anime_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.username) setLocalDisplayName(parsed.username);
          if (parsed.avatar) setLocalAvatar(parsed.avatar);
          if (parsed.themeColor) setThemeColor(parsed.themeColor);
          if (parsed.bgGradient !== undefined) setBgGradient(parsed.bgGradient);
          if (parsed.bgImage !== undefined) setBgImage(parsed.bgImage);
          if (parsed.bgOpacity !== undefined) setBgOpacity(parsed.bgOpacity);
          if (parsed.serverOrder) setServerOrder(parsed.serverOrder);
          if (parsed.cardBorder) {
            setCardBorderMode(parsed.cardBorder.mode || 'default');
            setCardBorderColor(parsed.cardBorder.color || '#35D5BF');
            setCardBorderWidth(parsed.cardBorder.width || 2);
          }
        }
      } catch (e) {}
    }
  }, [profile]);

  useEffect(() => {
    setMyList(getMyList());
    const handleListUpdate = () => setMyList(getMyList());
    window.addEventListener('my-list-updated', handleListUpdate);
    return () => window.removeEventListener('my-list-updated', handleListUpdate);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

      const updateGradient = (t: string, d: string, c1: string, c2: string) => {
    setGradType(t);
    setGradDir(d);
    setGradColor1(c1);
    setGradColor2(c2);
    let str = '';
    if (t === 'solid') str = '';
    else if (t === 'linear') str = `linear-gradient(${d}, ${c1}, ${c2})`;
    else str = `radial-gradient(${d}, ${c1}, ${c2})`;
    setBgGradient(str);
  };

  const updateCustomGradient = (field: 'type' | 'dir' | 'c1' | 'c2', val: string) => {
    let t = gradType;
    let d = gradDir;
    let c1 = gradColor1;
    let c2 = gradColor2;
    if (field === 'type') t = val;
    if (field === 'dir') d = val;
    if (field === 'c1') c1 = val;
    if (field === 'c2') c2 = val;
    updateGradient(t, d, c1, c2);
    if (!isEditing) setIsEditing(true);
  };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1280;
          const MAX_HEIGHT = 720;

          if (width > MAX_WIDTH) {
            height = Math.floor(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
          if (height > MAX_HEIGHT) {
            width = Math.floor(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress aggressively to keep the Firestore doc under 1MB
            setBgImage(canvas.toDataURL('image/jpeg', 0.5));
            if (!isEditing) setIsEditing(true);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
      if (bgFileInputRef.current) {
        bgFileInputRef.current.value = '';
      }
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const saveCrop = () => {
    if (!cropImageSrc || !croppedAreaPixels) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const MAX_WIDTH = 150;
      const MAX_HEIGHT = 150;
      
      canvas.width = MAX_WIDTH;
      canvas.height = MAX_HEIGHT;
      
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        MAX_WIDTH,
        MAX_HEIGHT
      );
      
      setLocalAvatar(canvas.toDataURL('image/jpeg', 0.8));
      setCropImageSrc('');
      if (!isEditing) setIsEditing(true);
    };
    img.src = cropImageSrc;
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    
    const trimmedLower = localDisplayName.trim().toLowerCase();
    const COMIX_NAMES = ['manga', 'manwha', 'manhwa', 'mahua', 'manhua', 'comic', 'comix'];
    const NOVEL_NAMES = ['novel', 'ln', 'light novel', 'lightnovel'];

    const isComixRedirect = COMIX_NAMES.includes(trimmedLower);
    const isNovelRedirect = NOVEL_NAMES.includes(trimmedLower);

    if (isComixRedirect || isNovelRedirect) {
      const targetUrl = isComixRedirect ? 'https://comix.to' : 'https://novelarchive.cc/';
      const ALL_TRIGGER_NAMES = [...COMIX_NAMES, ...NOVEL_NAMES, 'hanime', 'nhentai'];

      // Revert username to previous display name or fallback to 'User'
      const revertedName = (profile?.displayName && !ALL_TRIGGER_NAMES.includes(profile.displayName.toLowerCase()))
        ? profile.displayName
        : (profile?.previousDisplayName && !ALL_TRIGGER_NAMES.includes(profile.previousDisplayName.toLowerCase()))
          ? profile.previousDisplayName
          : 'User';

      setLocalDisplayName(revertedName);

      if (profile) {
        await updateProfileData({
          displayName: revertedName,
          photoURL: localAvatar,
          themeColor,
          bgGradient,
          bgImage,
          bgOpacity
        });
        await updatePreferences({
          defaultServer,
          defaultAudio,
          showEpisodeDate,
          serverOrder,
          cardBorder: {
            mode: cardBorderMode,
            color: cardBorderColor,
            width: cardBorderWidth
          }
        });
      } else {
        try {
          const localData = {
            username: revertedName,
            avatar: localAvatar,
            themeColor,
            bgGradient,
            bgImage,
            bgOpacity,
            serverOrder,
            cardBorder: {
              mode: cardBorderMode,
              color: cardBorderColor,
              width: cardBorderWidth
            }
          };
          localStorage.setItem('anime_profile', JSON.stringify(localData));
          window.dispatchEvent(new Event('profile-updated'));
        } catch (e) {}
      }

      setIsSaving(false);
      setIsEditing(false);

      // Redirect user to the designated destination
      try {
        if (window.top && window.top !== window) {
          window.top.location.href = targetUrl;
        } else {
          window.location.href = targetUrl;
        }
      } catch {
        window.location.href = targetUrl;
      }
      return;
    }
    
    if (profile) {
      await updateProfileData({
        displayName: localDisplayName,
        photoURL: localAvatar,
        themeColor,
        bgGradient,
        bgImage,
        bgOpacity
      });
      await updatePreferences({
        defaultServer,
        defaultAudio,
        showEpisodeDate,
        serverOrder,
        cardBorder: {
          mode: cardBorderMode,
          color: cardBorderColor,
          width: cardBorderWidth
        }
      });
    } else {
      // Save to LocalStorage (Guests)
      try {
        const localData = {
          username: localDisplayName,
          avatar: localAvatar,
          themeColor,
          bgGradient,
          bgImage,
          bgOpacity,
          serverOrder,
          cardBorder: {
            mode: cardBorderMode,
            color: cardBorderColor,
            width: cardBorderWidth
          }
        };
        localStorage.setItem('anime_profile', JSON.stringify(localData));
        window.dispatchEvent(new Event('profile-updated'));
      } catch (e) {}
    }
    
    setIsSaving(false);
    setShowSuccess(true);
    
    setTimeout(() => {
      setShowSuccess(false);
      setIsEditing(false);
    }, 1500);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full min-h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  const filteredList = activeTab === 'ALL' ? myList : myList.filter(i => i.status === activeTab);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = filteredList.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      {/* Crop Modal */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#151F2E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-lg font-bold text-white">Crop Profile Picture</h3>
              <button onClick={() => setCropImageSrc('')} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="relative w-full h-80 bg-black">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="p-4 bg-gray-900/50">
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-400 mb-2 block">Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setCropImageSrc('')}
                  className="px-4 py-2 rounded-lg font-bold text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveCrop}
                  className="px-4 py-2 bg-primary text-[#0B0C0F] rounded-lg font-bold hover:bg-primary-hover transition-colors"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      
      {/* Profile Section */}
      <div className="bg-[#151F2E] rounded-2xl border border-white/5 p-6 md:p-8 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <div className="relative group">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            {localAvatar ? (
              <img 
                src={localAvatar} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full border-4 border-gray-800 object-cover bg-gray-900"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-gray-800 bg-gray-900 flex items-center justify-center">
                <User size={40} className="text-gray-500" />
              </div>
            )}
            {isEditing && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera size={24} className="text-white" />
              </button>
            )}
          </div>
          
          <div className="flex-1 text-center sm:text-left w-full">
            {isEditing ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <input
                  type="text"
                  value={localDisplayName}
                  onChange={(e) => setLocalDisplayName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveAll();
                    }
                  }}
                  className="text-3xl font-bold text-[#EDF1F5] bg-transparent border-b-2 border-primary focus:outline-none w-full max-w-xs"
                  placeholder="Username"
                />
                {(localDisplayName === 'hanime' || localDisplayName === 'nhentai') && profile?.previousDisplayName && (
                  <button
                    onClick={() => setLocalDisplayName(profile.previousDisplayName!)}
                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-colors"
                  >
                    Revert to {profile.previousDisplayName}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-[#EDF1F5]">{localDisplayName}</h1>
                {(localDisplayName === 'hanime' || localDisplayName === 'nhentai') && profile?.previousDisplayName && (
                  <button
                    onClick={() => {
                      setLocalDisplayName(profile.previousDisplayName!);
                      setIsEditing(true);
                    }}
                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/30 transition-colors"
                  >
                    Revert
                  </button>
                )}
              </div>
            )}
            <p className="text-gray-400 max-w-2xl">Guest User</p>
          </div>
          
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.button 
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold transition-colors border border-green-500/20"
                >
                  <Check size={18} />
                  Saved!
                </motion.button>
              ) : isEditing ? (
                <motion.button 
                  key="save"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-[#0B0C0F] px-5 py-2.5 rounded-xl font-bold transition-colors border border-white/5 disabled:opacity-50"
                >
                  {isSaving ? <div className="w-4 h-4 rounded-full border-2 border-[#0B0C0F] border-t-transparent animate-spin" /> : <Save size={18} />}
                  {isSaving ? 'Saving...' : 'Save'}
                </motion.button>
              ) : (
                <motion.button 
                  key="edit"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors border border-white/5"
                >
                  <Edit3 size={18} />
                  Edit Profile
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="border-t border-white/5 pt-8">
          <h2 className="text-xl font-bold text-[#EDF1F5] mb-6 flex items-center gap-3">
            <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
            Theme & Preferences
          </h2>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5">
              <label className="block text-sm font-medium text-gray-400 mb-3">Theme Color</label>
              <div className="flex flex-wrap gap-3">
                {['#8AD7D0', '#FF8A65', '#9575CD', '#4DB6AC', '#F06292', '#64B5F6'].map(color => (
                  <button
                    key={color}
                    onClick={() => {
                      setThemeColor(color);
                      if (!isEditing) setIsEditing(true);
                    }}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      themeColor === color ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-900" : "hover:scale-110"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}

                {/* Custom Color Picker */}
                <div 
                  className={cn(
                    "relative w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 transition-transform cursor-pointer flex items-center justify-center",
                    !['#8AD7D0', '#FF8A65', '#9575CD', '#4DB6AC', '#F06292', '#64B5F6'].includes(themeColor) 
                      ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-gray-900 border-transparent" 
                      : "border-dashed border-gray-500 hover:scale-110 hover:border-gray-400"
                  )}
                  style={{ backgroundColor: !['#8AD7D0', '#FF8A65', '#9575CD', '#4DB6AC', '#F06292', '#64B5F6'].includes(themeColor) ? themeColor : 'transparent' }}
                  title="Custom Color"
                >
                  {['#8AD7D0', '#FF8A65', '#9575CD', '#4DB6AC', '#F06292', '#64B5F6'].includes(themeColor) && (
                    <span className="text-gray-400 text-xs font-bold">+</span>
                  )}
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => {
                      setThemeColor(e.target.value);
                      if (!isEditing) setIsEditing(true);
                    }}
                    className="absolute -inset-4 w-16 h-16 cursor-pointer opacity-0"
                  />
                </div>


              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="block text-xs font-medium text-gray-400 mb-2">Build Custom Gradient</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Color 1</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={gradColor1} onChange={(e) => updateCustomGradient('c1', e.target.value)} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                        <span className="text-xs text-gray-400 uppercase">{gradColor1}</span>
                      </div>
                    </div>
                    {gradType !== 'solid' && (
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Color 2</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="color" value={gradColor2} onChange={(e) => updateCustomGradient('c2', e.target.value)} className="w-8 h-8 rounded bg-transparent cursor-pointer" />
                          <span className="text-xs text-gray-400 uppercase">{gradColor2}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-[140px]">
                      <SingleSelect
                        options={[
                          { label: 'Solid', value: 'solid' },
                          { label: 'Linear', value: 'linear' },
                          { label: 'Radial', value: 'radial' }
                        ]}
                        value={gradType}
                        onChange={(val) => updateCustomGradient('type', val as string)}
                      />
                    </div>
                    {gradType !== 'solid' && (
                      <input 
                        type="text" 
                        value={gradDir} 
                        onChange={(e) => updateCustomGradient('dir', e.target.value)} 
                        placeholder="e.g. to right, 45deg" 
                        className="bg-[#151F2E] text-sm text-[#EDF1F5] px-3 h-[42px] rounded-md outline-none flex-1 border border-gray-700 focus:border-primary transition-colors min-w-[140px]" 
                      />
                    )}
                  </div>
                </div>

              </div>
            </div>

            <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5">
              <label className="block text-sm font-medium text-gray-400 mb-3">Background Gradient</label>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => { updateGradient('solid', '', '', ''); if(!isEditing) setIsEditing(true); }}
                  className="w-8 h-8 rounded-full border-2 border-gray-700 hover:border-primary transition-colors bg-[#0B0C0F] flex items-center justify-center text-xs text-gray-500 font-bold"
                  title="Solid Black"
                >X</button>
                <button 
                  onClick={() => { updateGradient('linear', 'to right', '#0f2027', '#2c5364'); if(!isEditing) setIsEditing(true); }}
                  className="w-8 h-8 rounded-full border-2 border-gray-700 hover:border-primary transition-colors"
                  style={{ background: 'linear-gradient(to right, #0f2027, #203a43, #2c5364)' }}
                  title="Ocean Night"
                />
                <button 
                  onClick={() => { updateGradient('linear', 'to right', '#141e30', '#243b55'); if(!isEditing) setIsEditing(true); }}
                  className="w-8 h-8 rounded-full border-2 border-gray-700 hover:border-primary transition-colors"
                  style={{ background: 'linear-gradient(to right, #141e30, #243b55)' }}
                  title="Deep Blue"
                />
                <button 
                  onClick={() => { updateGradient('radial', 'circle at top right', '#1a1a2e', '#0f3460'); if(!isEditing) setIsEditing(true); }}
                  className="w-8 h-8 rounded-full border-2 border-gray-700 hover:border-primary transition-colors"
                  style={{ background: 'radial-gradient(circle at top right, #1a1a2e, #16213e, #0f3460)' }}
                  title="Cosmic Void"
                />
                <button 
                  onClick={() => { updateGradient('linear', '45deg', '#2b1055', '#7597de'); if(!isEditing) setIsEditing(true); }}
                  className="w-8 h-8 rounded-full border-2 border-gray-700 hover:border-primary transition-colors"
                  style={{ background: 'linear-gradient(45deg, #2b1055, #7597de)' }}
                  title="Purple Dusk"
                />
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5 md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-3">Custom Background Image</label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex flex-1 w-full gap-2">
                  <input 
                    type="text" 
                    value={bgImage} 
                    onChange={(e) => { setBgImage(e.target.value); if(!isEditing) setIsEditing(true); }}
                    placeholder="https://example.com/image.jpg"
                    className="bg-[#151F2E] text-[#EDF1F5] px-4 py-2.5 rounded-lg outline-none w-full border border-gray-700 focus:border-primary transition-colors text-sm flex-1"
                  />
                  <input 
                    type="file"
                    ref={bgFileInputRef}
                    onChange={handleBgImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    onClick={() => bgFileInputRef.current?.click()}
                    className="bg-[#151F2E] border border-gray-700 hover:border-primary hover:text-primary transition-colors text-sm font-bold px-4 rounded-lg shrink-0"
                  >
                    Upload
                  </button>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <span className="text-sm font-bold text-gray-400 shrink-0">Opacity</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={bgOpacity} 
                    onChange={(e) => { setBgOpacity(Number(e.target.value)); if(!isEditing) setIsEditing(true); }}
                    className="w-full sm:w-32 accent-primary h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  {isEditingOpacity ? (
                    <input 
                      type="number"
                      autoFocus
                      className="text-sm font-bold bg-[#151F2E] border border-primary outline-none rounded px-1 w-12 text-white"
                      value={opacityInput}
                      onChange={(e) => setOpacityInput(e.target.value)}
                      onBlur={() => {
                        let val = parseInt(opacityInput);
                        if (isNaN(val)) val = bgOpacity;
                        val = Math.max(10, Math.min(100, val));
                        setBgOpacity(val);
                        setIsEditingOpacity(false);
                        if(!isEditing) setIsEditing(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                    />
                  ) : (
                    <span 
                      className="text-sm font-bold text-white shrink-0 w-8 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => {
                        setOpacityInput(bgOpacity.toString());
                        setIsEditingOpacity(true);
                      }}
                      title="Click to edit opacity"
                    >
                      {bgOpacity}%
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">When an image URL or file is provided, it overrides the background gradient.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5">
              <label className="block text-sm font-medium text-gray-400 mb-3">Default Video Server</label>
              <SingleSelect
                options={[
                  { label: 'Megaplay', value: 'mal' },
                  { label: 'Anime', value: 'anime' },
                  { label: 'AnimePahe', value: 'animepahe' },
                  { label: 'Try', value: 'tryembed' },
                  { label: 'Kozo', value: 'kozo' },
                  { label: 'VidSrc', value: 'vidsrc' }
                ]}
                value={defaultServer}
                onChange={(val) => { setDefaultServer(val as 'mal' | 'megaplayz' | 'anime' | 'animepahe' | 'tryembed' | 'kozo' | 'vidsrc'); if(!isEditing) setIsEditing(true); }}
              />
            </div>

            <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5">
              <label className="block text-sm font-medium text-gray-400 mb-3">Default Audio Track</label>
              <SingleSelect
                options={[
                  { label: 'Subtitled (Japanese)', value: 'sub' },
                  { label: 'Dubbed (English)', value: 'dub' }
                ]}
                value={defaultAudio}
                onChange={(val) => { setDefaultAudio(val as 'sub' | 'dub'); if(!isEditing) setIsEditing(true); }}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-400">Show Episode Release Date</label>
                <p className="text-xs text-gray-500 mt-1">Display the aired date below episode titles</p>
              </div>
              <button
                onClick={() => { setShowEpisodeDate(!showEpisodeDate); if(!isEditing) setIsEditing(true); }}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  showEpisodeDate ? "bg-primary" : "bg-gray-700"
                )}
              >
                <div className={cn(
                  "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
                  showEpisodeDate ? "translate-x-7" : "translate-x-1"
                )} />
              </button>
            </div>
          </div>

          {/* Server List Arrangement Section */}
          <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5 mt-6">
            <ServerOrderManager
              order={serverOrder}
              onChange={(newOrder) => {
                setServerOrder(newOrder);
                if (!isEditing) setIsEditing(true);
              }}
            />
          </div>

          {/* Anime Card Border Customization Section */}
          <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5 mt-6 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div>
                <label className="block text-sm font-bold text-[#EDF1F5] flex items-center gap-2">
                  <Square size={16} className="text-primary" />
                  Anime Card Border Customization
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Customize the border color and thickness for all anime cards displayed across the entire website
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center bg-gray-800 p-1 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCardBorderMode('default');
                    if (!isEditing) setIsEditing(true);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
                    cardBorderMode === 'default'
                      ? "bg-primary text-[#0B0C0F] shadow-sm"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  Default Border
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCardBorderMode('custom');
                    if (!isEditing) setIsEditing(true);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
                    cardBorderMode === 'custom'
                      ? "bg-primary text-[#0B0C0F] shadow-sm"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  Custom Border
                </button>
              </div>
            </div>

            {/* Custom Settings (Color, Width, Reset) */}
            {cardBorderMode === 'custom' ? (
              <div className="grid md:grid-cols-2 gap-6 items-start">
                <div className="flex flex-col gap-4">
                  {/* Color Selector */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">Border Color</label>
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-sm cursor-pointer">
                        <input
                          type="color"
                          value={cardBorderColor}
                          onChange={(e) => {
                            setCardBorderColor(e.target.value);
                            if (!isEditing) setIsEditing(true);
                          }}
                          className="absolute -inset-4 w-16 h-16 cursor-pointer opacity-0"
                        />
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: cardBorderColor }}
                        />
                      </div>
                      <input
                        type="text"
                        value={cardBorderColor}
                        onChange={(e) => {
                          setCardBorderColor(e.target.value);
                          if (!isEditing) setIsEditing(true);
                        }}
                        placeholder="#35D5BF"
                        className="bg-[#151F2E] text-xs font-mono uppercase text-[#EDF1F5] px-3 py-2 rounded-lg outline-none border border-gray-700 focus:border-primary w-28 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCardBorderColor('#35D5BF');
                          setCardBorderWidth(2);
                          setCardBorderMode('default');
                          if (!isEditing) setIsEditing(true);
                        }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors ml-auto"
                        title="Reset to default border"
                      >
                        <RotateCcw size={12} />
                        <span>Reset to Default</span>
                      </button>
                    </div>

                    {/* Color Presets */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[
                        { color: '#35D5BF', name: 'Kozo' },
                        { color: '#8AD7D0', name: 'Mint' },
                        { color: '#EF4444', name: 'Crimson' },
                        { color: '#A855F7', name: 'Purple' },
                        { color: '#EAB308', name: 'Gold' },
                        { color: '#3B82F6', name: 'Blue' },
                        { color: '#10B981', name: 'Emerald' },
                        { color: '#F43F5E', name: 'Rose' },
                        { color: '#FFFFFF', name: 'White' },
                      ].map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => {
                            setCardBorderColor(item.color);
                            if (!isEditing) setIsEditing(true);
                          }}
                          className={cn(
                            "w-6 h-6 rounded-full border border-white/20 transition-transform",
                            cardBorderColor.toLowerCase() === item.color.toLowerCase()
                              ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                              : "hover:scale-110"
                          )}
                          style={{ backgroundColor: item.color }}
                          title={item.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Border Width Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-400">Border Width</label>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {cardBorderWidth}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      step="1"
                      value={cardBorderWidth}
                      onChange={(e) => {
                        setCardBorderWidth(Number(e.target.value));
                        if (!isEditing) setIsEditing(true);
                      }}
                      className="w-full accent-primary h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                      <span>1px</span>
                      <span>2px (Default)</span>
                      <span>4px</span>
                      <span>6px</span>
                      <span>8px</span>
                    </div>
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="bg-[#0B0C0F] p-4 rounded-xl border border-white/5 flex flex-col items-center">
                  <span className="text-xs font-bold text-gray-400 mb-3 self-start">
                    Live Anime Card Border Preview:
                  </span>
                  <div
                    className="w-36 bg-[#0F1115] rounded-2xl overflow-hidden shadow-lg transition-all"
                    style={{
                      borderColor: cardBorderColor,
                      borderWidth: `${cardBorderWidth}px`,
                      borderStyle: 'solid',
                      boxShadow: `0 10px 25px -5px ${cardBorderColor}30`
                    }}
                  >
                    <div className="aspect-[3/4] bg-gray-800 relative overflow-hidden flex items-center justify-center">
                      <img
                        src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-n2bBgLoFSSrH.jpg"
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] to-transparent opacity-90" />
                    </div>
                    <div className="p-2.5 pb-3">
                      <p className="text-[11px] font-bold text-white truncate">Frieren: Beyond Journey</p>
                      <p className="text-[10px] text-gray-400">TV • Ep 28</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-[#12141A] p-4 rounded-lg border border-white/5 text-sm text-gray-400">
                <span>Standard subtle border (`border-white/5`) is currently enabled for all anime cards.</span>
                <button
                  type="button"
                  onClick={() => {
                    setCardBorderMode('custom');
                    if (!isEditing) setIsEditing(true);
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Enable Custom Border
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* List Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl font-bold text-[#EDF1F5] flex items-center gap-3">
            <span className="w-1.5 h-6 bg-primary rounded-full inline-block"></span>
            My List
          </h2>
          <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm font-bold border border-white/5 whitespace-nowrap">
            {filteredList.length} Anime
          </span>
        </div>
        
        <div className="flex overflow-x-auto gap-2 pb-4 mb-4 custom-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors",
                activeTab === tab.value 
                  ? 'bg-primary text-[#0B0C0F]' 
                  : 'bg-[#151F2E] text-gray-400 hover:text-[#EDF1F5] border border-gray-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {paginatedList.length > 0 ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
              {paginatedList.map((item) => (
                <AnimeCard 
                  key={item.animeId} 
                  anime={item.anime as any} 
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-12">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 transition-colors font-bold text-sm"
                >
                  Previous
                </button>
                <span className="text-gray-400 font-medium">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-[#151F2E] text-white rounded-lg disabled:opacity-50 hover:bg-gray-800 transition-colors font-bold text-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-[#151F2E] rounded-2xl border border-gray-800 border-dashed">
            {localAvatar ? (
              <img src={localAvatar} alt="Profile" className="w-16 h-16 rounded-full object-cover mx-auto mb-4 border-2 border-gray-800" />
            ) : (
              <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <User size={24} className="text-gray-400" />
              </div>
            )}
            <h3 className="text-lg font-bold text-[#EDF1F5] mb-2">No anime found</h3>
            <p className="text-gray-400">Add anime to your "{TABS.find(t => t.value === activeTab)?.label}" list to see them here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
