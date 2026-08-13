import React, { useState, useEffect } from 'react';
import { Upload, Link, Check, AlertCircle, RefreshCw, Trash2, Edit2, Play, Pause } from 'lucide-react';
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-2">Menu Intelligence</h2>
        <p className="text-stone-400 text-sm">
          Upload your menu to let AI generate personalized post strategies based on what you actually sell.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 text-red-400 rounded-xl flex items-center space-x-2 border border-red-900/50">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Ingestion Section */}
      {!draftMenu && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl glass-card border border-stone-800">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Upload className="w-5 h-5 text-amber-500" />
              <span>Upload Menu Photo</span>
            </h3>
            <p className="text-sm text-stone-400 mb-6">
              Take a photo of your physical menu. Gemini AI will automatically extract all items, categories, and prices.
            </p>
            <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-stone-700 hover:border-amber-500 rounded-xl cursor-pointer transition bg-stone-900/50 hover:bg-stone-900">
              <span className="font-medium text-stone-300">
                {isLoading ? 'Processing with AI...' : 'Select Menu Photo (JPG, PNG, WEBP)'}
              </span>
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileUpload} disabled={isLoading} />
            </label>

          </div>

          <div className="p-6 rounded-2xl glass-card border border-stone-800">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <Link className="w-5 h-5 text-amber-500" />
              <span>Paste Website URL</span>
            </h3>
            <p className="text-sm text-stone-400 mb-6">
              Paste the link to your online menu or delivery page. Gemini AI will crawl and extract the items.
            </p>
            <form onSubmit={handleUrlSubmit} className="flex space-x-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourcafe.com/menu"
                className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-4 py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !url}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-medium rounded-xl transition"
              >
                {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Parse'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Section */}
      {draftMenu && (
        <div className="p-6 rounded-2xl border-2 border-amber-500/30 bg-stone-900/50 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-amber-400 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Review Extracted Menu</span>
              </h3>
              <p className="text-sm text-stone-400 mt-1">
                Please review and correct any AI mistakes before saving. This will become your Active Menu.
              </p>
            </div>
            <button
              onClick={handleConfirmDraft}
              disabled={isLoading}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center space-x-2 transition disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              <span>Confirm & Activate Menu</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-950/50 text-stone-400 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-xl">Item Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {draftMenu.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/30 transition">
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateDraftItem(idx, 'name', e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 focus:border-amber-500 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.category || ''}
                        onChange={(e) => updateDraftItem(idx, 'category', e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 focus:border-amber-500 outline-none"
                      />
                    </td>
                    <td className="p-2 w-24">
                      <input
                        type="number"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => updateDraftItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 focus:border-amber-500 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateDraftItem(idx, 'description', e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 focus:border-amber-500 outline-none"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <button onClick={() => removeDraftItem(idx)} className="p-2 text-stone-500 hover:text-red-400 transition">
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
        <div className="p-6 rounded-2xl glass-card border border-stone-800 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold flex items-center space-x-2">
                <Check className="w-5 h-5 text-emerald-500" />
                <span>Active Menu (v{activeMenu.version_number})</span>
              </h3>
              <p className="text-sm text-stone-400 mt-1">
                The Strategy Engine is currently generating post ideas based on these items.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-950/50 text-stone-400 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium rounded-tl-xl">Status</th>
                  <th className="px-4 py-3 font-medium">Item Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium rounded-tr-xl">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {activeMenu.items.map((item, idx) => (
                  <tr key={item.id} className={`transition ${item.is_active ? 'hover:bg-stone-800/30' : 'opacity-50 grayscale'}`}>
                    <td className="p-4">
                      <button
                        onClick={() => toggleActiveItem(idx)}
                        disabled={isLoading}
                        className={`flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-bold transition ${
                          item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-400'
                        }`}
                      >
                        {item.is_active ? (
                          <><Play className="w-3 h-3 fill-current" /><span>ACTIVE</span></>
                        ) : (
                          <><Pause className="w-3 h-3 fill-current" /><span>INACTIVE</span></>
                        )}
                      </button>
                    </td>
                    <td className="p-4 font-medium">{item.name}</td>
                    <td className="p-4 text-stone-400">{item.category || '-'}</td>
                    <td className="p-4 text-emerald-400/90 font-medium">${item.price?.toFixed(2) || '-'}</td>
                    <td className="p-4 text-stone-400 truncate max-w-xs" title={item.description}>{item.description || '-'}</td>
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
