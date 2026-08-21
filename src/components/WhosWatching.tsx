import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Plus, X, Check, Lock, Shield, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ProfileAvatar, PRESET_AVATARS } from "./ProfileAvatar";
import { Profile } from "../types";

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
    loginProfile,
    deleteProfile,
  } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PIN Login modal state
  const [authenticatingProfile, setAuthenticatingProfile] = useState<Profile | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const handleProfileClick = async (profile: Profile) => {
    if (isManaging || deletingProfile) return;

    if (profile.hasPin) {
      setAuthenticatingProfile(profile);
      setEnteredPin("");
      setAuthError(null);
    } else {
      try {
        await loginProfile(profile);
      } catch (err: any) {
        console.error("Login failed:", err);
      }
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticatingProfile) return;
    if (!enteredPin.trim()) {
      setAuthError("Please enter your PIN");
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      await loginProfile(authenticatingProfile, enteredPin.trim());
      setAuthenticatingProfile(null);
      setEnteredPin("");
    } catch (err: any) {
      setAuthError(err.message || "Incorrect PIN. Please try again.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Profile name cannot be empty");
      return;
    }
    if (pin.trim() && !/^\d{4,6}$/.test(pin.trim())) {
      setErrorMsg("PIN must be 4 to 6 numeric digits");
      return;
    }
    try {
      await createProfile(name, selectedColor, selectedAvatar, pin.trim() || undefined, isAdmin);
      setName("");
      setPin("");
      setIsAdmin(false);
      setSelectedColor(PRESET_COLORS[0]);
      setSelectedAvatar(PRESET_AVATARS[0]);
      setIsAdding(false);
      setErrorMsg(null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create profile");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProfile) return;
    try {
      await deleteProfile(deletingProfile.id, deletePin.trim() || undefined);
      setDeletingProfile(null);
      setDeletePin("");
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete profile");
    }
  };

  return (
    <div className="min-h-screen bg-[#06060F] text-white flex flex-col justify-center items-center p-6 select-none font-sans relative" id="whos-watching-screen">
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
                  onClick={() => handleProfileClick(profile)}
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

                  {/* Lock Indicator if Profile has PIN */}
                  {profile.hasPin && !isManaging && (
                    <div 
                      className="absolute bottom-0 right-0 p-1.5 bg-black/80 border border-zinc-700 rounded-full text-cinema-amber shadow-md"
                      title="PIN Protected"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Admin Indicator */}
                  {profile.isAdmin && !isManaging && (
                    <div 
                      className="absolute top-0 left-0 p-1 bg-black/80 border border-zinc-700 rounded-full text-blue-400 shadow-md"
                      title="Admin Profile"
                    >
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Manage Mode Delete Trigger */}
                  {isManaging && (
                    <button
                      disabled={profiles.length <= 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingProfile(profile);
                        setDeletePin("");
                        setErrorMsg(null);
                      }}
                      className="absolute -top-1 -right-1 p-1.5 rounded-full bg-red-600 text-white shadow-md transition-all hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={profiles.length <= 1 ? "Cannot delete the only profile" : `Delete ${profile.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-base font-semibold text-zinc-300 group-hover:text-white transition-colors">
                    {profile.name}
                  </span>
                  {profile.hasPin && (
                    <Lock className="w-3 h-3 text-zinc-500" />
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Add Profile Card or Inline Form */}
          {profiles.length < 6 && (
            <div className="flex flex-col items-center gap-3">
              {!isAdding ? (
                <div 
                  onClick={() => {
                    setIsAdding(true);
                    setErrorMsg(null);
                  }}
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
                        setPin("");
                        setIsAdmin(false);
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
                      placeholder="e.g. Family"
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

                  {/* Optional Security PIN */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider flex items-center gap-1">
                        <Lock className="w-3 h-3 text-cinema-amber" /> Security PIN (Optional)
                      </label>
                      <span className="text-[10px] text-zinc-500">4-6 digits</span>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Leave blank for no PIN"
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPin(val);
                        setErrorMsg(null);
                      }}
                      className="w-full bg-[#070712] border border-cinema-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cinema-amber font-mono"
                    />
                  </div>

                  {/* Admin toggle if not first profile */}
                  {profiles.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="isAdminCheckbox"
                        checked={isAdmin}
                        onChange={(e) => setIsAdmin(e.target.checked)}
                        className="rounded bg-[#070712] border-cinema-border text-cinema-amber focus:ring-cinema-amber"
                      />
                      <label htmlFor="isAdminCheckbox" className="text-xs text-zinc-400 cursor-pointer flex items-center gap-1">
                        <Shield className="w-3 h-3 text-blue-400" /> Admin Privileges (Manage paths & rescan)
                      </label>
                    </div>
                  )}

                  {/* Avatar Selector */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase text-zinc-500 tracking-wider">Choose Avatar Icon</label>
                      <span className="text-[10px] font-mono text-cinema-amber bg-cinema-amber/10 px-1.5 py-0.5 rounded">{selectedAvatar}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2 max-h-36 overflow-y-auto p-2 bg-black/40 border border-cinema-border/50 rounded-xl">
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
                            <ProfileAvatar avatar={avatarName} className="w-7 h-7" />
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
                      Save Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setErrorMsg(null);
                        setName("");
                        setPin("");
                        setIsAdmin(false);
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
                setDeletingProfile(null);
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

      {/* PIN Authentication Modal */}
      <AnimatePresence>
        {authenticatingProfile && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121224] border border-cinema-border rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl space-y-5"
            >
              <div 
                style={{ backgroundColor: authenticatingProfile.color }}
                className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white shadow-lg relative"
              >
                <ProfileAvatar avatar={authenticatingProfile.avatar} className="w-10 h-10" />
                <div className="absolute -bottom-1 -right-1 p-1.5 bg-black/80 border border-zinc-700 rounded-full text-cinema-amber">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-white">{authenticatingProfile.name}</h3>
                <p className="text-xs text-zinc-400">Enter your 4-6 digit security PIN</p>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="flex justify-center">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={enteredPin}
                    onChange={(e) => {
                      setEnteredPin(e.target.value.replace(/\D/g, ""));
                      setAuthError(null);
                    }}
                    placeholder="••••"
                    autoFocus
                    className="w-48 text-center text-2xl tracking-[0.4em] py-2 px-3 bg-[#080814] border border-zinc-700 rounded-xl text-cinema-amber focus:outline-none focus:border-cinema-amber font-mono"
                  />
                </div>

                {authError && (
                  <p className="text-xs text-red-400 font-medium">{authError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthenticatingProfile(null);
                      setEnteredPin("");
                      setAuthError(null);
                    }}
                    className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAuth || !enteredPin}
                    className="flex-1 py-2 bg-cinema-amber hover:bg-cinema-amber-hover text-cinema-bg font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                  >
                    {isSubmittingAuth ? "Verifying..." : "Unlock"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Profile PIN Confirmation Modal */}
      <AnimatePresence>
        {deletingProfile && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121224] border border-cinema-border rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl space-y-4"
            >
              <h3 className="text-lg font-bold text-red-400">Delete Profile "{deletingProfile.name}"?</h3>
              <p className="text-xs text-zinc-400">
                This will delete watch history and personal settings for this profile.
              </p>

              {deletingProfile.hasPin && (
                <div className="space-y-1 text-left">
                  <label className="text-[11px] font-bold uppercase text-zinc-400 tracking-wider">
                    Enter Profile PIN to Confirm
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter PIN"
                    className="w-full text-center text-lg py-1.5 px-3 bg-[#080814] border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-red-500 font-mono"
                    autoFocus
                  />
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-red-400">{errorMsg}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingProfile(null);
                    setDeletePin("");
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
