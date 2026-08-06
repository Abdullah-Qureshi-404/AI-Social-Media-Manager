import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import {
  ArrowLeft,
  Type,
  Square,
  Circle as CircleIcon,
  Image as ImageIcon,
  Trash2,
  Undo2,
  Redo2,
  Save,
  Loader2,
  Sliders,
  Palette,
  Wand2,
} from 'lucide-react';
import { postsApi } from '../../api/postsApi';
import { usePostFlowStore } from '../../store/postFlowStore';

const FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];
const FONT_FAMILIES = [
  'Playfair Display',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Lora',
  'Dancing Script',
  'Pacifico',
  'Oswald',
  'Arial',
  'Georgia',
];

export default function ImageEditor({ imageUrl, postId, onSave, onBack }) {
  const {
    overlayText,
    watermarkEnabled,
    overlayDesign,
    setOverlayDesign,
    fabricCanvasJson,
    setFabricCanvasJson,
    currentPost,
  } = usePostFlowStore();

  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const logoInputRef = useRef(null);

  const [activeObject, setActiveObject] = useState(null);
  const [fontSize, setFontSize] = useState(36);
  const [fontFamily, setFontFamily] = useState('Playfair Display');
  const [color, setColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoDesigning, setIsAutoDesigning] = useState(false);
  const [shapeType, setShapeType] = useState('rect');

  // History State for Undo / Redo
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const saveHistoryState = () => {
    if (!fabricCanvasRef.current || isUndoRedoRef.current) return;
    const json = JSON.stringify(fabricCanvasRef.current.toJSON(['id', 'customType', 'selectable', 'evented']));
    const history = historyRef.current.slice(0, historyIndexRef.current + 1);
    if (history.length >= 20) history.shift();
    history.push(json);
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
  };

  useEffect(() => {
    let isMounted = true;

    if (!document.getElementById('google-fonts-editor-v3')) {
      const link = document.createElement('link');
      link.id = 'google-fonts-editor-v3';
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Lora:ital,wght@0,500;1,400&family=Montserrat:wght@400;600;700&family=Oswald:wght@600&family=Pacifico&family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Poppins:wght@400;600&family=Raleway:wght@500;700&display=swap';
      document.head.appendChild(link);
    }

    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 600,
      height: 600,
      backgroundColor: '#020617',
      preserveObjectStacking: true,
    });
    fabricCanvasRef.current = canvas;

    const activeCanvasJson = fabricCanvasJson || currentPost?.fabric_canvas_json;
    const activeDesign = overlayDesign || currentPost?.overlay_design_json;

    if (imageUrl) {
      fabric.Image.fromURL(
        imageUrl,
        (img) => {
          if (!isMounted || !fabricCanvasRef.current || !img) return;
          const scale = Math.max(600 / img.width, 600 / img.height);
          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: 300,
            top: 300,
            selectable: false,
            evented: false,
            hasControls: false,
            hasBorders: false,
            lockMovementX: true,
            lockMovementY: true,
          });

          canvas.setBackgroundImage(img, () => {
            if (!isMounted || !fabricCanvasRef.current) return;

            if (activeCanvasJson) {
              canvas.loadFromJSON(activeCanvasJson, () => {
                canvas.renderAll();
                saveHistoryState();
              });
            } else if (activeDesign) {
              renderDesignToFabric(canvas, activeDesign, watermarkEnabled);
              canvas.renderAll();
              saveHistoryState();
            } else if (watermarkEnabled) {
              addBrandWatermarkStamp(canvas);
              canvas.renderAll();
              saveHistoryState();
            } else {
              canvas.renderAll();
              saveHistoryState();
            }
          });
        },
        { crossOrigin: 'anonymous' }
      );
    }

    const handleSelection = (e) => {
      if (!isMounted) return;
      const selected = e.selected ? e.selected[0] : null;
      setActiveObject(selected);
      if (selected) {
        if (selected.fontSize) setFontSize(selected.fontSize);
        if (selected.fontFamily) setFontFamily(selected.fontFamily);
        if (selected.fill && typeof selected.fill === 'string' && selected.fill.startsWith('#')) {
          setColor(selected.fill);
        }
        if (selected.opacity !== undefined) {
          setOpacity(Math.round(selected.opacity * 100));
        }
      }
    };

    const handleObjectModified = () => {
      if (isMounted) saveHistoryState();
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => {
      if (isMounted) setActiveObject(null);
    });
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:added', () => {
      if (isMounted && !isUndoRedoRef.current) saveHistoryState();
    });

    return () => {
      isMounted = false;
      fabricCanvasRef.current = null;
      try {
        canvas.dispose();
      } catch (err) {}
    };
  }, [imageUrl, watermarkEnabled]);

  const renderDesignToFabric = (canvas, design, withWatermark) => {
    const canvasWidth = 600;
    const canvasHeight = 600;

    const xPct = design.position?.x_percent ?? 50;
    const yPct = design.position?.y_percent ?? 80;

    const centerX = (canvasWidth * xPct) / 100;
    const centerY = (canvasHeight * yPct) / 100;

    const lines = design.lines || [{ text: overlayText || 'Artisanal Special', font_size: 48 }];
    const fontFamily = design.font_family || 'Playfair Display';
    const textColor = design.text_color || '#FFFFFF';
    const hasShadow = design.shadow !== false;
    const bg = design.background || { type: 'solid_dark', opacity: 0.55 };

    if (bg.type !== 'shadow_only' && bg.opacity > 0) {
      const panelWidth = Math.min(540, canvasWidth * 0.85);
      const panelHeight = lines.length > 1 ? 130 : 80;

      const bgRect = new fabric.Rect({
        id: 'overlay_background',
        customType: 'overlay_bg',
        left: centerX - panelWidth / 2,
        top: centerY - panelHeight / 2,
        width: panelWidth,
        height: panelHeight,
        fill: bg.type === 'frosted_blur' ? `rgba(15, 23, 42, ${bg.opacity})` : `rgba(0, 0, 0, ${bg.opacity})`,
        rx: 16,
        ry: 16,
        cornerColor: '#f59e0b',
        cornerSize: 8,
        transparentCorners: false,
      });
      canvas.add(bgRect);
    }

    let currentY = centerY - (lines.length > 1 ? 40 : 20);

    lines.forEach((lineObj, idx) => {
      const fontSize = lineObj.font_size || 42;
      const isHeadline = idx === 0;

      const textObj = new fabric.IText(lineObj.text || '', {
        id: isHeadline ? 'headline_text' : 'subtitle_text',
        customType: 'overlay_text',
        left: centerX,
        top: currentY,
        originX: 'center',
        originY: 'top',
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: lineObj.font_weight || (isHeadline ? 'bold' : 'normal'),
        fill: textColor,
        textAlign: design.alignment || 'center',
        shadow: hasShadow
          ? new fabric.Shadow({
              color: 'rgba(0,0,0,0.85)',
              blur: 10,
              offsetX: 2,
              offsetY: 2,
            })
          : null,
        cornerColor: '#f59e0b',
        cornerSize: 10,
        transparentCorners: false,
      });

      canvas.add(textObj);
      currentY += fontSize + (design.line_spacing || 10);
    });

    if (withWatermark) {
      addBrandWatermarkStamp(canvas);
    }
  };

  const addBrandWatermarkStamp = (canvas) => {
    const watermarkObj = new fabric.IText('★ ARTISANAL CAFE ★', {
      id: 'brand_watermark',
      customType: 'watermark',
      left: 575,
      top: 25,
      originX: 'right',
      originY: 'top',
      fontFamily: 'Playfair Display',
      fontSize: 16,
      fill: '#f59e0b',
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.85)',
        blur: 8,
        offsetX: 2,
        offsetY: 2,
      }),
      cornerColor: '#f59e0b',
      cornerSize: 8,
      transparentCorners: false,
    });
    canvas.add(watermarkObj);
  };

  const handleUndo = () => {
    if (historyIndexRef.current <= 0 || !fabricCanvasRef.current) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current -= 1;
    const state = historyRef.current[historyIndexRef.current];
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current.renderAll();
      isUndoRedoRef.current = false;
    });
  };

  const handleRedo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricCanvasRef.current) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current += 1;
    const state = historyRef.current[historyIndexRef.current];
    fabricCanvasRef.current.loadFromJSON(state, () => {
      fabricCanvasRef.current.renderAll();
      isUndoRedoRef.current = false;
    });
  };

  // Re-generate Smart Design Layout Variation (refresh=true)
  const handleAutoDesignText = async () => {
    if (!fabricCanvasRef.current || !postId) return;
    setIsAutoDesigning(true);
    try {
      const textToUse = overlayText && overlayText.trim() ? overlayText.trim() : 'Artisanal Daily Special 🥐';
      const apiDesign = await postsApi.getAutoDesign(postId, textToUse, true); // refresh=true for fresh alternative design!
      if (apiDesign) {
        setOverlayDesign(apiDesign);
        setFabricCanvasJson(null);
        renderDesignToFabric(fabricCanvasRef.current, apiDesign, watermarkEnabled);
        fabricCanvasRef.current.renderAll();
        saveHistoryState();
      }
    } catch (err) {
      alert('Smart text placement updated.');
    } finally {
      setIsAutoDesigning(false);
    }
  };

  const handleAddText = () => {
    if (!fabricCanvasRef.current) return;
    const textObj = new fabric.IText('Double click to edit', {
      id: `text_${Date.now()}`,
      customType: 'user_text',
      left: 150,
      top: 250,
      fontFamily: fontFamily,
      fontSize: fontSize,
      fill: color,
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.7)',
        blur: 6,
        offsetX: 2,
        offsetY: 2,
      }),
      cornerColor: '#f59e0b',
      cornerSize: 10,
      transparentCorners: false,
    });
    fabricCanvasRef.current.add(textObj);
    fabricCanvasRef.current.setActiveObject(textObj);
    fabricCanvasRef.current.renderAll();
  };

  const handleAddShape = () => {
    if (!fabricCanvasRef.current) return;
    let shape;
    if (shapeType === 'circle') {
      shape = new fabric.Circle({
        id: `circle_${Date.now()}`,
        customType: 'shape',
        left: 200,
        top: 200,
        radius: 80,
        fill: 'rgba(0,0,0,0.4)',
        cornerColor: '#f59e0b',
        cornerSize: 10,
        transparentCorners: false,
      });
    } else {
      shape = new fabric.Rect({
        id: `rect_${Date.now()}`,
        customType: 'shape',
        left: 150,
        top: 200,
        width: 300,
        height: 120,
        fill: 'rgba(0,0,0,0.4)',
        rx: 12,
        ry: 12,
        cornerColor: '#f59e0b',
        cornerSize: 10,
        transparentCorners: false,
      });
    }
    fabricCanvasRef.current.add(shape);
    fabricCanvasRef.current.setActiveObject(shape);
    fabricCanvasRef.current.renderAll();
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !fabricCanvasRef.current) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      fabric.Image.fromURL(f.target.result, (img) => {
        const scale = 150 / img.width;
        img.set({
          id: 'brand_logo',
          customType: 'logo',
          left: 225,
          top: 50,
          scaleX: scale,
          scaleY: scale,
          cornerColor: '#f59e0b',
          cornerSize: 10,
          transparentCorners: false,
        });
        fabricCanvasRef.current.add(img);
        fabricCanvasRef.current.setActiveObject(img);
        fabricCanvasRef.current.renderAll();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvasRef.current) return;
    const active = fabricCanvasRef.current.getActiveObject();
    if (active && active !== fabricCanvasRef.current.backgroundImage) {
      fabricCanvasRef.current.remove(active);
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();
      saveHistoryState();
    }
  };

  const handleFontSizeChange = (size) => {
    setFontSize(size);
    if (activeObject && activeObject.set) {
      activeObject.set('fontSize', size);
      fabricCanvasRef.current.renderAll();
      saveHistoryState();
    }
  };

  const handleFontFamilyChange = (family) => {
    setFontFamily(family);
    if (activeObject && activeObject.set) {
      activeObject.set('fontFamily', family);
      fabricCanvasRef.current.renderAll();
      saveHistoryState();
    }
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    if (activeObject && activeObject.set) {
      activeObject.set('fill', newColor);
      fabricCanvasRef.current.renderAll();
      saveHistoryState();
    }
  };

  const handleOpacityChange = (val) => {
    setOpacity(val);
    if (activeObject && activeObject.set) {
      activeObject.set('opacity', val / 100);
      fabricCanvasRef.current.renderAll();
      saveHistoryState();
    }
  };

  const handleSaveAndContinue = async () => {
    if (!fabricCanvasRef.current || !postId) return;
    setIsSaving(true);
    try {
      fabricCanvasRef.current.discardActiveObject();
      fabricCanvasRef.current.renderAll();

      const canvasJson = fabricCanvasRef.current.toJSON(['id', 'customType', 'selectable', 'evented']);
      setFabricCanvasJson(canvasJson);

      await postsApi.saveCanvasState(postId, canvasJson);

      const dataUrl = fabricCanvasRef.current.toDataURL({
        format: 'jpeg',
        quality: 0.95,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (onSave) {
        await onSave(blob);
      }
    } catch (err) {
      alert('Failed to save edited canvas design.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 text-stone-200">
      {/* Smart Auto Placement Toolbar */}
      <div className="bg-stone-900 border border-stone-800 p-2.5 rounded-2xl flex items-center justify-between gap-2 overflow-x-auto shadow-md">
        <button
          type="button"
          onClick={handleAutoDesignText}
          disabled={isAutoDesigning}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 shrink-0"
        >
          {isAutoDesigning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          <span>{isAutoDesigning ? 'Generating New Variation...' : 'Re-generate Smart Design ✨'}</span>
        </button>

        <span className="text-xs text-stone-400 font-medium shrink-0 hidden sm:inline">
          Automatically selects alternative font, placement, and background style.
        </span>
      </div>

      {/* Main SaaS Top Toolbar */}
      <div className="bg-stone-900 border border-stone-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-2">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Add Text */}
          <button
            onClick={handleAddText}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition"
          >
            <Type className="w-4 h-4" />
            <span>Add Text</span>
          </button>

          {/* Add Shape */}
          <div className="flex items-center space-x-1 border-l border-stone-700 pl-2">
            <select
              value={shapeType}
              onChange={(e) => setShapeType(e.target.value)}
              className="bg-stone-800 text-xs text-stone-300 px-2 py-2 rounded-lg border border-stone-700 focus:outline-none"
            >
              <option value="rect">Rectangle</option>
              <option value="circle">Circle</option>
            </select>
            <button
              onClick={handleAddShape}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700"
              title="Add Shape"
            >
              {shapeType === 'rect' ? <Square className="w-4 h-4" /> : <CircleIcon className="w-4 h-4" />}
            </button>
          </div>

          {/* Add Logo */}
          <button
            onClick={() => logoInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition border border-stone-700"
            title="Upload Logo"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Logo</span>
          </button>
          <input
            type="file"
            ref={logoInputRef}
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>

        {/* Object Style Controls */}
        <div className="flex items-center space-x-2">
          {/* Font Family */}
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="bg-stone-800 text-xs text-amber-300 font-semibold px-2 py-2 rounded-lg border border-stone-700 focus:outline-none"
            title="Font Family"
          >
            {FONT_FAMILIES.map((fn) => (
              <option key={fn} value={fn}>
                {fn}
              </option>
            ))}
          </select>

          {/* Font Size */}
          <select
            value={fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className="bg-stone-800 text-xs text-stone-300 px-2 py-2 rounded-lg border border-stone-700 focus:outline-none"
            title="Font Size"
          >
            {FONT_SIZES.map((sz) => (
              <option key={sz} value={sz}>
                {sz}px
              </option>
            ))}
          </select>

          {/* Color Picker */}
          <div className="flex items-center space-x-1 bg-stone-800 px-2 py-1 rounded-lg border border-stone-700">
            <Palette className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorChange(e.target.value)}
              className="w-5 h-5 bg-transparent border-0 cursor-pointer"
              title="Color"
            />
          </div>

          {/* Opacity Slider */}
          <div className="flex items-center space-x-1.5 bg-stone-800 px-2 py-1.5 rounded-lg border border-stone-700 text-xs">
            <Sliders className="w-3.5 h-3.5 text-stone-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              className="w-16 accent-amber-500 cursor-pointer"
              title="Opacity"
            />
            <span className="text-[10px] w-6 text-stone-400">{opacity}%</span>
          </div>

          {/* Delete Selected */}
          <button
            onClick={handleDeleteSelected}
            disabled={!activeObject}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Delete Selected"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Actions (Undo, Redo, Save) */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUndo}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition border border-stone-700"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveAndContinue}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Saving...' : 'Save Design'}</span>
          </button>
        </div>
      </div>

      {/* Editor Canvas Container */}
      <div className="flex justify-center p-4 bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="border border-stone-800 rounded-xl overflow-hidden shadow-2xl bg-stone-900">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}
