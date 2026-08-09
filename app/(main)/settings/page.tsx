'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStats } from '../../lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type User = {
  id: number;
  username: string;
  email: string;
};

type Prefs = {
  twoStep: boolean;
  tripReminders: boolean;
  language: string;
  currency: string;
};

const LANGUAGES = ['English', '中文', 'Español', 'Français', 'Deutsch'];
const CURRENCIES = ['CNY / ¥', 'USD / $', 'EUR / €', 'GBP / £', 'JPY / ¥'];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-gray-800' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState({ total_trips: 0, favorites: 0 });

  const [prefs, setPrefs] = useState<Prefs>({
    twoStep: false,
    tripReminders: false,
    language: 'English',
    currency: 'CNY / ¥',
  });

  // Modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showCurrency, setShowCurrency] = useState(false);

  // Edit profile form
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [profileMsgOk, setProfileMsgOk] = useState(false);

  // Change password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordMsgOk, setPasswordMsgOk] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) {
      router.replace('/login');
      return;
    }
    try {
      const u: User = JSON.parse(raw);
      setUser(u);
      setEditUsername(u.username);
      setEditEmail(u.email);
      loadStats(u.id);
    } catch {
      router.replace('/login');
    }

    const savedPrefs = localStorage.getItem('prefs');
    if (savedPrefs) {
      try {
        setPrefs(JSON.parse(savedPrefs));
      } catch {}
    }
  }, [router]);

  const loadStats = async (uid: number) => {
    try {
      const data = await getStats(uid);
      setStats({
        total_trips: data.total_trips ?? 0,
        favorites: data.favorites ?? 0,
      });
    } catch {}
  };

  const savePrefs = (updated: Prefs) => {
    setPrefs(updated);
    localStorage.setItem('prefs', JSON.stringify(updated));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: editUsername, email: editEmail }),
      });
      const data = await res.json();
      if (data.message === 'Update successful.') {
        const updated = {
           ...user, 
           username: data.user?.username ?? editUsername,
           email: data.user?.email ?? editEmail,
          };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('userUpdated'));
        setProfileMsg('Profile updated!');
        setProfileMsgOk(true);
      } else {
        setProfileMsg(data.error || 'Update failed.');
        setProfileMsgOk(false);
      }
    } catch {
      setProfileMsg('Network error, please try again.');
      setProfileMsgOk(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.');
      setPasswordMsgOk(false);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters.');
      setPasswordMsgOk(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/user/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (data.message === 'Update successful.') {
        setPasswordMsg('Password changed!');
        setPasswordMsgOk(true);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg(data.error || 'Update failed.');
        setPasswordMsgOk(false);
      }
    } catch {
      setPasswordMsg('Network error, please try again.');
      setPasswordMsgOk(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.replace('/');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    try {
      await fetch(`${API_BASE_URL}/user/${user.id}`, { method: 'DELETE' });
    } catch {}
    localStorage.removeItem('user');
    router.replace('/');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">Loading...</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">User Account</h1>
          <p className="text-gray-500 mt-1">Manage profile details, favorites, security, and preferences.</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* ── Left panel ── */}
          <div className="w-72 flex-shrink-0 flex flex-col gap-4">
            {/* Profile card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-12 h-12 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-gray-900">{user.username}</p>
              <p className="text-sm text-gray-500 mt-1">{user.email}</p>
              <button
                onClick={() => {
                  setEditUsername(user.username);
                  setEditEmail(user.email);
                  setProfileMsg('');
                  setShowEditProfile(true);
                }}
                className="mt-5 w-full bg-gray-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
              >
                Edit Profile
              </button>
            </div>

            {/* Favorites stat */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-2">Favorites</p>
              <p className="text-4xl font-bold text-gray-900">{stats.favorites}</p>
            </div>

            {/* Trips stat */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-2">Trips</p>
              <p className="text-4xl font-bold text-gray-900">{stats.total_trips}</p>
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Account Security */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Security</h2>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {/* Change Password */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">Change Password</p>
                    <p className="text-sm text-gray-400">Update your login password regularly</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordMsg('');
                      setShowChangePassword(true);
                    }}
                    className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                </div>
                {/* Two-Step Verification */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">Two-Step Verification</p>
                    <p className="text-sm text-gray-400">Add extra protection to your account</p>
                  </div>
                  <Toggle
                    enabled={prefs.twoStep}
                    onChange={() => savePrefs({ ...prefs, twoStep: !prefs.twoStep })}
                  />
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferences</h2>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {/* Language */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">Language</p>
                    <p className="text-sm text-gray-400">{prefs.language}</p>
                  </div>
                  <button
                    onClick={() => setShowLanguage(true)}
                    className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition"
                  >
                    Change
                  </button>
                </div>
                {/* Currency */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">Currency</p>
                    <p className="text-sm text-gray-400">{prefs.currency}</p>
                  </div>
                  <button
                    onClick={() => setShowCurrency(true)}
                    className="border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition"
                  >
                    Change
                  </button>
                </div>
                {/* Trip Reminders */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="font-medium text-gray-900">Trip Reminders</p>
                    <p className="text-sm text-gray-400">Remind me 3 days before departure</p>
                  </div>
                  <Toggle
                    enabled={prefs.tripReminders}
                    onChange={() => savePrefs({ ...prefs, tripReminders: !prefs.tripReminders })}
                  />
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-3">
              <button
                onClick={handleLogout}
                className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Log Out
              </button>
              <button
                onClick={handleDeleteAccount}
                className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Profile Modal ── */}
      {showEditProfile && (
        <Modal title="Edit Profile" onClose={() => setShowEditProfile(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            {profileMsg && (
              <p className={`text-sm ${profileMsgOk ? 'text-green-600' : 'text-red-600'}`}>
                {profileMsg}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEditProfile(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Change Password Modal ── */}
      {showChangePassword && (
        <Modal title="Change Password" onClose={() => setShowChangePassword(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Repeat new password"
              />
            </div>
            {passwordMsg && (
              <p className={`text-sm ${passwordMsgOk ? 'text-green-600' : 'text-red-600'}`}>
                {passwordMsg}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowChangePassword(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800"
              >
                Update
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Language Modal ── */}
      {showLanguage && (
        <Modal title="Select Language" onClose={() => setShowLanguage(false)}>
          <div className="space-y-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  savePrefs({ ...prefs, language: lang });
                  setShowLanguage(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition ${
                  prefs.language === lang
                    ? 'border-gray-900 bg-gray-50 font-semibold'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Currency Modal ── */}
      {showCurrency && (
        <Modal title="Select Currency" onClose={() => setShowCurrency(false)}>
          <div className="space-y-2">
            {CURRENCIES.map((cur) => (
              <button
                key={cur}
                onClick={() => {
                  savePrefs({ ...prefs, currency: cur });
                  setShowCurrency(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm border transition ${
                  prefs.currency === cur
                    ? 'border-gray-900 bg-gray-50 font-semibold'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cur}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
