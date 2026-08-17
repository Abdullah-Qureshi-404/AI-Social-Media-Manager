import React, { useState, useEffect } from 'react';
import { Upload, Link, Check, AlertCircle, RefreshCw, Trash2, Play, Pause } from 'lucide-react';
import { menuApi } from '../api/menuApi';

export default function MenuManager() {
  const [activeMenu, setActiveMenu] = useState(null);
  const [draftMenu, setDraftMenu] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActiveMenu();
  }, []);

  const fetchActiveMenu = async () => {
    try {
      const menu = await menuApi.getActiveMenu();
      setActiveMenu(menu);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    setError('');
    try {
      const draft = await menuApi.ingestFromImage(file);
      setDraftMenu(draft);
    } catch (err) {
      setError('Failed to ingest menu from image.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    setIsLoading(true);
    setError('');
    try {
      const draft = await menuApi.ingestFromUrl(url);
      setDraftMenu(draft);
    } catch (err) {
      setError('Failed to ingest menu from URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDraft = async () => {
    setIsLoading(true);
    setError('');
    try {
      const confirmed = await menuApi.confirmMenu(draftMenu.id, draftMenu.items);
      setActiveMenu(confirmed);
      setDraftMenu(null);
    } catch (err) {
      setError('Failed to confirm menu.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDraftItem = (index, field, value) => {
    const newItems = [...draftMenu.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setDraftMenu({ ...draftMenu, items: newItems });
  };

  const removeDraftItem = (index) => {
    const newItems = draftMenu.items.filter((_, i) => i !== index);
    setDraftMenu({ ...draftMenu, items: newItems });
  };

  const toggleActiveItem = async (index) => {
    if (!activeMenu) return;
    setIsLoading(true);
    try {
      const item = activeMenu.items[index];
      const updatedItem = await menuApi.updateMenuItem(item.id, { is_active: !item.is_active });
      const newItems = [...activeMenu.items];
      newItems[index] = updatedItem;
      setActiveMenu({ ...activeMenu, items: newItems });
    } catch (err) {
      setError('Failed to update item status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Menu Intelligence</h2>
        <p className="text-zinc-400 text-xs mt-1">
          Upload your menu to generate personalized post strategies based on what you actually sell.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center space-x-2 border border-rose-500/20 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Ingestion Section (2 Cards) */}
      {!draftMenu && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Upload Menu Photo */}
          <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-4 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 rounded-xl bg-amber-500/30 blur-md opacity-60 group-hover:opacity-100 transition duration-300"></div>
                <div className="relative p-2.5 rounded-xl bg-[#0f0f0f] border border-amber-500/30 text-amber-400">
                  <Upload className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-base font-semibold text-white">Upload Menu Photo</h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Take a photo of your physical menu to automatically extract all items, categories, and prices.
            </p>

            <label className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-white/10 hover:border-amber-500/60 rounded-2xl cursor-pointer transition-all duration-300 bg-[#0f0f0f]/60 hover:bg-[#0f0f0f] group">
              <span className="font-semibold text-zinc-300 text-xs mb-3 group-hover:text-white transition">
                {isLoading ? 'Processing menu...' : 'Select Menu Photo (JPG, PNG, WEBP)'}
              </span>
              <span className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold rounded-xl text-xs shadow-lg shadow-amber-500/15 transition flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Browse Photo</span>
              </span>
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} disabled={isLoading} />
            </label>
          </div>

          {/* Card 2: Paste Website URL */}
          <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="relative group shrink-0">
                  <div className="absolute -inset-1 rounded-xl bg-amber-500/30 blur-md opacity-60 group-hover:opacity-100 transition duration-300"></div>
                  <div className="relative p-2.5 rounded-xl bg-[#0f0f0f] border border-amber-500/30 text-amber-400">
                    <Link className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-white">Paste Website URL</h3>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Paste the link to your online menu or delivery page to crawl and extract the items.
              </p>
            </div>

            <form onSubmit={handleUrlSubmit} className="flex space-x-2 pt-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourcafe.com/menu"
                className="flex-1 bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !url}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/15 transition flex items-center space-x-2 shrink-0"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Parse URL</span>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Section (Extracted Menu Table) */}
      {draftMenu && (
        <div className="p-6 rounded-2xl border border-amber-500/30 bg-[#1a1a1a]/80 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-base font-semibold text-amber-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4" />
                <span>Review Extracted Menu</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Please review and correct any details before saving. This will become your Active Menu.
              </p>
            </div>
            <button
              onClick={handleConfirmDraft}
              disabled={isLoading}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold text-xs rounded-xl flex items-center space-x-2 transition disabled:opacity-50 shadow-lg shadow-amber-500/15"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Confirm & Activate Menu</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f0f0f] text-amber-400 font-semibold text-[11px] uppercase tracking-wider border-b border-white/10">
                <tr>
                  <th className="px-4 py-3.5 rounded-tl-xl">Item Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#1a1a1a]/60">
                {draftMenu.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-amber-500/[0.04] transition-colors duration-150">
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateDraftItem(idx, 'name', e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-transparent hover:border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-1.5 outline-none text-xs font-semibold text-white transition"
                      />
                    </td>
                    <td className="p-2">
                      <div className="inline-flex items-center px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-full focus-within:ring-1 focus-within:ring-amber-500 focus-within:border-amber-500">
                        <input
                          type="text"
                          value={item.category || ''}
                          onChange={(e) => updateDraftItem(idx, 'category', e.target.value)}
                          placeholder="Category"
                          className="bg-transparent border-none outline-none text-amber-400 placeholder-amber-500/50 text-xs font-semibold w-24"
                        />
                      </div>
                    </td>
                    <td className="p-2 w-28">
                      <div className="flex items-center px-2.5 py-1 bg-[#0f0f0f] border border-transparent hover:border-white/10 rounded-lg focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 text-xs text-white">
                        <span className="text-amber-400 font-semibold mr-1">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.price || ''}
                          onChange={(e) => updateDraftItem(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-none outline-none text-xs text-white font-semibold"
                        />
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateDraftItem(idx, 'description', e.target.value)}
                        className="w-full bg-[#0f0f0f] border border-transparent hover:border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-lg px-3 py-1.5 outline-none text-xs text-zinc-300 transition"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => removeDraftItem(idx)}
                        className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Menu Section */}
      {activeMenu && !draftMenu && (
        <div className="p-6 rounded-2xl bg-[#1a1a1a]/80 backdrop-blur-md border border-white/[0.06] space-y-6 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Active Menu (v{activeMenu.version_number})</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                The Strategy Engine is currently generating post ideas based on these items.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0f0f0f] text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3.5 rounded-tl-xl">Status</th>
                  <th className="px-4 py-3.5">Item Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Price</th>
                  <th className="px-4 py-3.5 rounded-tr-xl">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeMenu.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition-colors odd:bg-transparent even:bg-white/[0.015] hover:bg-white/[0.03] ${
                      item.is_active ? '' : 'opacity-50 grayscale'
                    }`}
                  >
                    <td className="p-4">
                      <button
                        onClick={() => toggleActiveItem(idx)}
                        disabled={isLoading}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-200 ${
                          item.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : 'bg-zinc-800/80 text-zinc-400 border border-white/5'
                        }`}
                      >
                        {item.is_active ? (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3 fill-current" />
                            <span>INACTIVE</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4 font-semibold text-white">{item.name}</td>
                    <td className="p-4">
                      {item.category ? (
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-full inline-block">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </td>
                    <td className="p-4 text-amber-400 font-semibold text-sm">
                      ${item.price?.toFixed(2) || '0.00'}
                    </td>
                    <td className="p-4 text-zinc-400 truncate max-w-xs" title={item.description}>
                      {item.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
