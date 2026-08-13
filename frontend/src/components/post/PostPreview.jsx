import React, { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Edit3, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { usePostFlowStore } from '../../store/postFlowStore';
import { useTenantStore } from '../../store/tenantStore';
import { postsApi } from '../../api/postsApi';

export default function PostPreview({ onProceedToSchedule, onOpenEditModal }) {
  const { tenantProfile } = useTenantStore();
  const {
    currentPost,
    setCurrentPost,
    selectedCaption,
    selectedHashtags,
    overlayDesign,
    fabricCanvasJson,
    watermarkEnabled,
    captionSkipped,
  } = usePostFlowStore();

  const [isExporting, setIsExporting] = useState(false);
  const previewCanvasRef = useRef(null);
  const fabricPreviewRef = useRef(null);
  const hiddenCanvasRef = useRef(null);

  const displayImage =
    currentPost?.current_edited_image_url ||
    currentPost?.temp_image_url ||
    currentPost?.original_image_url ||
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a';

  const captionText = selectedCaption || (captionSkipped ? '' : currentPost?.caption || 'Delicious artisanal food, prepared fresh daily!');
  const hashtagsText = selectedHashtags.length > 0 ? selectedHashtags.join(' ') : '';

  const activeDesign = overlayDesign || currentPost?.overlay_design_json;
  const activeCanvasJson = fabricCanvasJson || currentPost?.fabric_canvas_json;

  // Render Fabric.js Canvas inside the Instagram Post Card UI
  useEffect(() => {
    let isMounted = true;
    if (!previewCanvasRef.current) return;

    if (fabricPreviewRef.current) {
      try {
        fabricPreviewRef.current.dispose();
      } catch (e) {}
    }

    const canvas = new fabric.Canvas(previewCanvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: '#020617',
      selection: false,
    });
    fabricPreviewRef.current = canvas;

    if (displayImage) {
      fabric.Image.fromURL(
        displayImage,
        (img) => {
          if (!isMounted || !fabricPreviewRef.current || !img) return;
          const scale = Math.max(500 / img.width, 500 / img.height);
          img.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: 250,
            top: 250,
            selectable: false,
            evented: false,
          });

          canvas.setBackgroundImage(img, () => {
            if (!isMounted || !fabricPreviewRef.current) return;

            if (activeCanvasJson) {
              canvas.loadFromJSON(activeCanvasJson, () => {
                canvas.renderAll();
              });
            } else if (activeDesign) {
              renderDesignToCanvas(canvas, activeDesign, watermarkEnabled);
            } else {
              canvas.renderAll();
            }
          });
        },
        { crossOrigin: 'anonymous' }
      );
    }

    return () => {
      isMounted = false;
      if (fabricPreviewRef.current) {
        try {
          fabricPreviewRef.current.dispose();
          fabricPreviewRef.current = null;
        } catch (e) {}
      }
    };
  }, [displayImage, activeDesign, activeCanvasJson, watermarkEnabled]);

  const renderDesignToCanvas = (canvas, design, withWatermark) => {
    const canvasWidth = 500;
    const canvasHeight = 500;

    const xPct = design.position?.x_percent ?? 50;
    const yPct = design.position?.y_percent ?? 80;

    const centerX = (canvasWidth * xPct) / 100;
    const centerY = (canvasHeight * yPct) / 100;

    const lines = design.lines || [{ text: 'Artisanal Special', font_size: 44 }];
    const fontFamily = design.font_family || 'Playfair Display';
    const textColor = design.text_color || '#FFFFFF';
    const hasShadow = design.shadow !== false;
    const bg = design.background || { type: 'solid_dark', opacity: 0.55 };

    // 1. Add Background Panel
    if (bg.type !== 'shadow_only' && bg.opacity > 0) {
      const panelWidth = Math.min(440, canvasWidth * 0.85);
      const panelHeight = lines.length > 1 ? 110 : 65;

      const bgRect = new fabric.Rect({
        id: 'overlay_background',
        customType: 'overlay_bg',
        left: centerX - panelWidth / 2,
        top: centerY - panelHeight / 2,
        width: panelWidth,
        height: panelHeight,
        fill: bg.type === 'frosted_blur' ? `rgba(15, 23, 42, ${bg.opacity})` : `rgba(0, 0, 0, ${bg.opacity})`,
        rx: 14,
        ry: 14,
        selectable: false,
        evented: false,
      });
      canvas.add(bgRect);
    }

    // 2. Add Text Objects
    let currentY = centerY - (lines.length > 1 ? 32 : 16);

    lines.forEach((lineObj, idx) => {
      const scaledFontSize = Math.round((lineObj.font_size || 40) * (canvasWidth / 600));
      const isHeadline = idx === 0;

      const textObj = new fabric.IText(lineObj.text || '', {
        id: isHeadline ? 'headline_text' : 'subtitle_text',
        customType: 'overlay_text',
        left: centerX,
        top: currentY,
        originX: 'center',
        originY: 'top',
        fontFamily: fontFamily,
        fontSize: scaledFontSize,
        fontWeight: lineObj.font_weight || (isHeadline ? 'bold' : 'normal'),
        fill: textColor,
        textAlign: design.alignment || 'center',
        shadow: hasShadow
          ? new fabric.Shadow({
              color: 'rgba(0,0,0,0.85)',
              blur: 8,
              offsetX: 2,
              offsetY: 2,
            })
          : null,
        selectable: false,
        evented: false,
      });

      canvas.add(textObj);
      currentY += scaledFontSize + (design.line_spacing || 8);
    });

    // 3. Add Watermark Badge
    if (withWatermark) {
      const watermarkText = `★ ${tenantProfile?.restaurant_name?.toUpperCase() || 'MY RESTAURANT'} ★`;
      const watermarkObj = new fabric.IText(watermarkText, {
        id: 'brand_watermark',
        customType: 'watermark',
        left: canvasWidth - 20,
        top: 20,
        originX: 'right',
        originY: 'top',
        fontFamily: 'Playfair Display',
        fontSize: 13,
        fill: '#f59e0b',
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.9)',
          blur: 6,
          offsetX: 1,
          offsetY: 1,
        }),
        selectable: false,
        evented: false,
      });
      canvas.add(watermarkObj);
    }

    canvas.renderAll();
  };

  // Hidden Off-Screen Fabric.js Export Logic when scheduling
  const handleScheduleClick = async () => {
    if ((activeDesign || activeCanvasJson) && currentPost && hiddenCanvasRef.current) {
      setIsExporting(true);
      try {
        const sourceUrl = currentPost.current_edited_image_url || currentPost.temp_image_url || currentPost.original_image_url;

        const exportCanvas = new fabric.Canvas(hiddenCanvasRef.current, {
          width: 1080,
          height: 1080,
          backgroundColor: '#020617',
          preserveObjectStacking: true,
        });

        await new Promise((resolve) => {
          fabric.Image.fromURL(
            sourceUrl,
            (img) => {
              if (!img) return resolve();
              const scale = Math.max(1080 / img.width, 1080 / img.height);
              img.set({
                scaleX: scale,
                scaleY: scale,
                originX: 'center',
                originY: 'center',
                left: 540,
                top: 540,
                selectable: false,
                evented: false,
              });

              exportCanvas.setBackgroundImage(img, () => {
                if (activeCanvasJson) {
                  exportCanvas.loadFromJSON(activeCanvasJson, () => {
                    exportCanvas.renderAll();
                    resolve();
                  });
                } else if (activeDesign) {
                  renderDesignToExportCanvas(exportCanvas, activeDesign, watermarkEnabled);
                  resolve();
                } else {
                  resolve();
                }
              });
            },
            { crossOrigin: 'anonymous' }
          );
        });

        const dataUrl = exportCanvas.toDataURL({
          format: 'jpeg',
          quality: 0.95,
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const updatedPost = await postsApi.uploadEditedImage(currentPost.id, blob);
        if (updatedPost) setCurrentPost(updatedPost);

        exportCanvas.dispose();
      } catch (err) {
        console.error('Silent overlay export failed:', err);
      } finally {
        setIsExporting(false);
      }
    }

    onProceedToSchedule();
  };

  const renderDesignToExportCanvas = (canvas, design, withWatermark) => {
    const canvasWidth = 1080;
    const canvasHeight = 1080;

    const xPct = design.position?.x_percent ?? 50;
    const yPct = design.position?.y_percent ?? 80;

    const centerX = (canvasWidth * xPct) / 100;
    const centerY = (canvasHeight * yPct) / 100;

    const lines = design.lines || [{ text: 'Artisanal Special', font_size: 48 }];
    const fontFamily = design.font_family || 'Playfair Display';
    const textColor = design.text_color || '#FFFFFF';
    const hasShadow = design.shadow !== false;
    const bg = design.background || { type: 'solid_dark', opacity: 0.55 };

    if (bg.type !== 'shadow_only' && bg.opacity > 0) {
      const panelWidth = Math.min(960, canvasWidth * 0.85);
      const panelHeight = lines.length > 1 ? 240 : 140;

      const bgRect = new fabric.Rect({
        id: 'overlay_background',
        customType: 'overlay_bg',
        left: centerX - panelWidth / 2,
        top: centerY - panelHeight / 2,
        width: panelWidth,
        height: panelHeight,
        fill: bg.type === 'frosted_blur' ? `rgba(15, 23, 42, ${bg.opacity})` : `rgba(0, 0, 0, ${bg.opacity})`,
        rx: 28,
        ry: 28,
        selectable: false,
        evented: false,
      });
      canvas.add(bgRect);
    }

    let currentY = centerY - (lines.length > 1 ? 65 : 30);

    lines.forEach((lineObj, idx) => {
      const fontSize = lineObj.font_size || 48;
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
              blur: 16,
              offsetX: 3,
              offsetY: 3,
            })
          : null,
        selectable: false,
        evented: false,
      });

      canvas.add(textObj);
      currentY += fontSize + (design.line_spacing || 14);
    });

    if (withWatermark) {
      const watermarkText = `★ ${tenantProfile?.restaurant_name?.toUpperCase() || 'MY RESTAURANT'} ★`;
      const watermarkObj = new fabric.IText(watermarkText, {
        id: 'brand_watermark',
        customType: 'watermark',
        left: canvasWidth - 40,
        top: 40,
        originX: 'right',
        originY: 'top',
        fontFamily: 'Playfair Display',
        fontSize: 28,
        fill: '#f59e0b',
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.9)',
          blur: 12,
          offsetX: 2,
          offsetY: 2,
        }),
        selectable: false,
        evented: false,
      });
      canvas.add(watermarkObj);
    }

    canvas.renderAll();
  };

  const igUsername = tenantProfile?.instagram?.username || (tenantProfile?.restaurant_name ? tenantProfile.restaurant_name.toLowerCase().replace(/\s+/g, '_') : 'my_restaurant');
  const restaurantTitle = tenantProfile?.restaurant_name || 'My Restaurant';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-xl font-extrabold text-white">Instagram Post Preview</h3>
        <p className="text-xs text-stone-400">
          This is how your post will appear to your Instagram followers.
        </p>
      </div>

      {/* Instagram Post Card UI */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Post Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-stone-800/80 bg-stone-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow">
              <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center font-bold text-amber-400 text-xs">
                🥐
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-bold text-sm text-white">{igUsername}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              </div>
              <span className="text-[11px] text-stone-400 block">{restaurantTitle}</span>
            </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-stone-400 cursor-pointer" />
        </div>

        {/* Post Square Image Canvas (Renders food photo + overlay text + watermark) */}
        <div className="relative aspect-square w-full bg-stone-950 overflow-hidden flex justify-center items-center">
          <div className="w-full h-full flex justify-center items-center">
            <canvas ref={previewCanvasRef} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Instagram Action Icons */}
        <div className="p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20 cursor-pointer hover:scale-110 transition" />
              <MessageCircle className="w-6 h-6 text-stone-300 cursor-pointer hover:scale-110 transition" />
              <Send className="w-6 h-6 text-stone-300 cursor-pointer hover:scale-110 transition" />
            </div>
            <Bookmark className="w-6 h-6 text-stone-300 cursor-pointer hover:scale-110 transition" />
          </div>

          {/* Caption Body */}
          <div className="text-xs text-stone-200 leading-relaxed space-y-1.5">
            {captionText && (
              <p>
                <span className="font-bold text-white mr-2">{igUsername}</span>
                {captionText}
              </p>
            )}
            {hashtagsText && (
              <p className="text-amber-400 font-medium tracking-tight break-words">
                {hashtagsText}
              </p>
            )}
          </div>

          <div className="text-[10px] text-stone-500 uppercase tracking-wider font-medium">
            JUST NOW
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onOpenEditModal}
          disabled={isExporting}
          className="py-3.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold rounded-xl border border-stone-700 transition flex items-center justify-center space-x-2 text-sm shadow-lg disabled:opacity-50"
        >
          <Edit3 className="w-4 h-4 text-amber-400" />
          <span>✏️ Edit & Refine</span>
        </button>

        <button
          onClick={handleScheduleClick}
          disabled={isExporting}
          className="py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
          <span>{isExporting ? 'Preparing Image...' : 'Proceed to Schedule ➔'}</span>
        </button>
      </div>

      {/* Hidden Off-Screen Fabric.js Export Canvas */}
      <div className="hidden" aria-hidden="true">
        <canvas ref={hiddenCanvasRef} />
      </div>
    </div>
  );
}
