import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, X, Trash2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProfileAvatar, PRESET_AVATARS } from "./ProfileAvatar";

const PRESET_COLORS = [
  "#F5A623", // amber
  "#E74C3C", // red
  "#3498DB", // blue
  "#2ECC71", // green
  "#9B59B6", // purple
  "#1ABC9C"  // teal
];

export default function WhosWatching() {
  const {
    profiles,
    createProfile,
    deleteProfile,
    setCurrentProfile,
  } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Profile name cannot be empty");
      return;
    }
    try {
      await createProfile(name, selectedColor, selectedAvatar);
      setName("");
      setSelectedColor(PRESET_COLORS[0]);
      setSelectedAvatar(PRESET_AVATARS[0]);
      setIsAdding(false);
      setErrorMsg(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to create profile");
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await deleteProfile(id);
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#06060F] text-white flex flex-col justify-center items-center p-6 select-none font-sans" id="whos-watching-screen">
      <div className="max-w-4xl w-full text-center space-y-12">
        
        {/* Title Block */}
        <div className="space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-cinema-amber"
            id="whos-watching-title"
          >
            Who's Watching?
          </motion.h1>
          <p className="text-cinema-muted text-sm md:text-base">
            Select a profile to access your personal workspace and watch history.
          </p>
        </div>

        {/* Grid of Profile Cards */}
        <div className="flex flex-wrap justify-center gap-8 py-6">
          {profiles.map((profile) => {
            const isDeleting = deletingId === profile.id;
            return (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative flex flex-col items-center gap-3 group"
                id={`profile-item-${profile.id}`}
              >
                {/* Profile Avatar Circle */}
                <div 
                  onClick={() => {
                    if (!isManaging && !isDeleting) {
                      setCurrentProfile(profile);
                    }
                  }}
                  style={{ backgroundColor: profile.color }}
                  className={`w-[120px] h-[120px] rounded-full flex items-center justify-center text-white text-4xl font-extrabold relative shadow-lg cursor-pointer transition-all duration-300
                    ${isManaging ? 'ring-4 ring-white/10' : 'hover:scale-105 hover:shadow-2xl'}
                  `}
                  onMouseEnter={(e) => {
                    if (!isManaging) {
                      e.currentTarget.style.boxShadow = `0 10px 25px -5px ${profile.color}40, 0 8px 10px -6px ${profile.color}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <ProfileAvatar avatar={profile.avatar} className="w-14 h-14 text-white" />

                  {/* Custom Confirmation Overlay */}
                  <AnimatePresence>
                    {isDeleting && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 bg-black/90 rounded-full flex flex-col items-center justify-center p-2 text-center"
                      >
                        <p className="text-[10px] font-semibold text-red-500 mb-1 leading-tight">Delete?</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDeleteConfirm(profile.id)}
                            className="p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                            title="Confirm Delete"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setDeletingId(null)}
                            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Manage Mode X Trigger */}
                  {isManaging && !isDeleting && (
                    <button
                      disabled={profiles.length <= 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(profile.id);
                      }}
                      className="absolute -top-1 -right-1 p-1.5 rounded-full bg-red-600 text-white shadow-md transition-all hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={profiles.length <= 1 ? "Cannot delete the only profile" : `Delete ${profile.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <span className="text-base font-semibold text-zinc-300 group-hover:text-white transition-colors">
                  {profile.name}
                </span>
              </motion.div>
            );
          })}

          {/* Add Profile Card or Inline Form */}
          {profiles.length < 6 && (
            <div className="flex flex-col items-center gap-3">
              {!isAdding ? (
                <div 
                  onClick={() => setIsAdding(true)}
                  className="w-[120px] h-[120px] rounded-full border-2 border-dashed border-zinc-700 hover:border-cinema-amber text-zinc-500 hover:text-cinema-amber flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-white/[0.01] hover:bg-white/[0.03]"
                  id="btn-add-profile"
                >
                  <Plus className="w-10 h-10" />
                </div>
              ) : (
                <motion.form 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onSubmit={handleCreate}
                  className="bg-[#10101F] border border-cinema-border rounded-2xl p-5 w-80 md:w-96 text-left space-y-4 shadow-xl z-10"
                  id="add-profile-form"
                >
                  <div className="flex justify-between items-center border-b border-cinema-border pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cinema-amber">Add New Profile</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsAdding(false);
                        setName("");
                        setSelectedAvatar(PRESET_AVATARS[0]);
                        setSelectedColor(PRESET_COLORS[0]);
                      }} 
                      className="text-zinc-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">Profile Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Guest"
                      value={name}
                      maxLength={15}
                      onChange={(e) => {
                        setName(e.target.value);
                        setErrorMsg(null);
                      }}
                      className="w-full bg-[#070712] border border-cinema-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cinema-amber"
                      autoFocus
                    />
                  </div>

                  {/* Avatar Selector */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">Choose Avatar Icon</label>
                      <span className="text-[10px] font-mono text-cinema-amber bg-cinema-amber/10 px-1.5 py-0.5 rounded">{selectedAvatar}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 max-h-44 overflow-y-auto p-2 bg-black/40 border border-cinema-border/50 rounded-xl">
                      {PRESET_AVATARS.map((avatarName) => {
                        const isSelected = selectedAvatar === avatarName;
                        return (
                          <button
                            key={avatarName}
                            type="button"
                            onClick={() => setSelectedAvatar(avatarName)}
                            className={`aspect-square rounded-xl flex items-center justify-center p-1 transition-all outline-none
                              ${isSelected 
                                ? "bg-cinema-amber text-cinema-bg scale-105 shadow-md" 
                                : "bg-[#070712]/60 text-zinc-400 hover:text-white hover:bg-zinc-800"
                              }
                            `}
                            title={avatarName}
                          >
                            <ProfileAvatar avatar={avatarName} className="w-8 h-8" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">Choose Theme Color</label>
                    <div className="flex gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          style={{ backgroundColor: color }}
                          className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 relative"
                        >
                          {selectedColor === color && (
                            <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-500">{errorMsg}</p>
                  )}

                  {/* Form Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-cinema-amber hover:bg-cinema-amber-hover text-cinema-bg font-bold rounded-xl text-xs transition-all"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setErrorMsg(null);
                        setName("");
                        setSelectedAvatar(PRESET_AVATARS[0]);
                        setSelectedColor(PRESET_COLORS[0]);
                      }}
                      className="flex-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}
              {!isAdding && (
                <span className="text-base font-semibold text-zinc-500">
                  Add Profile
                </span>
              )}
            </div>
          )}
        </div>

        {/* Empty state prompt */}
        {profiles.length === 0 && !isAdding && (
          <p className="text-cinema-amber text-sm font-semibold animate-pulse">
            Add your first profile to get started
          </p>
        )}

        {/* Footer controls */}
        {profiles.length > 0 && !isAdding && (
          <div className="pt-6 border-t border-cinema-border/50 max-w-xs mx-auto flex flex-col items-center gap-3">
            <button
              onClick={() => {
                setIsManaging(!isManaging);
                setDeletingId(null);
              }}
              className="text-sm font-semibold transition-colors px-4 py-1.5 rounded-full border border-zinc-800 bg-[#101020] hover:bg-zinc-800 text-zinc-400 hover:text-white"
              id="btn-manage-profiles"
            >
              {isManaging ? "Done" : "Manage Profiles"}
            </button>
            <span className="text-xs text-zinc-500 font-mono">
              {profiles.length} of 6 Profiles
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
