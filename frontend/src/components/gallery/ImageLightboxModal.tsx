import React, { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw, Maximize } from 'lucide-react';

interface ImageItem {
  name: string;
  url: string;
}

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderTitle: string;
  autoImages: ImageItem[];
  manualImages: ImageItem[];
}

const ImagePanel: React.FC<{ label: string; images: ImageItem[] }> = ({ label, images }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imageFrame = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const selectedImage = images[selectedIndex];
  const sideways = rotation % 180 !== 0;

  useEffect(() => {
    setSelectedIndex(0);
    setZoom(1);
    setRotation(0);
  }, [images]);

  useEffect(() => {
    const frame = imageFrame.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      setFrameSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [selectedImage?.url]);

  return (
    <section aria-label={`Ảnh ${label}`} className="gallery-panel">
      <div className="gallery-panel-header">
        <h3>{label} ({images.length} ảnh)</h3>
        {selectedImage && (
          <div className="gallery-toolbar">
            <button onClick={() => setZoom((value) => Math.min(value + 0.25, 3))} title={`Phóng to ${label}`} aria-label={`Phóng to ${label}`}>
              <ZoomIn size={18} />
            </button>
            <button onClick={() => setZoom((value) => Math.max(value - 0.25, 0.5))} title={`Thu nhỏ ${label}`} aria-label={`Thu nhỏ ${label}`}>
              <ZoomOut size={18} />
            </button>
            <button onClick={() => setRotation(value => (value + 270) % 360)} title={`Xoay trái 90° ${label}`} aria-label={`Xoay trái 90° ${label}`}>
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setRotation(value => (value + 90) % 360)} title={`Xoay phải 90° ${label}`} aria-label={`Xoay phải 90° ${label}`}>
              <RotateCw size={18} />
            </button>
            <button onClick={() => { setZoom(1); setRotation(0); }} title={`Đặt lại góc xoay và thu phóng ${label}`} aria-label={`Đặt lại ${label}`}>
              <Maximize size={18} />
            </button>
            <span aria-live="polite">{Math.round(zoom * 100)}% · {rotation}°</span>
          </div>
        )}
      </div>

      <div className="gallery-preview">
        {selectedImage ? (
          <div ref={imageFrame} className="gallery-image-size" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            <img src={selectedImage.url} alt={selectedImage.name} style={{
              width: sideways ? frameSize.height : '100%',
              height: sideways ? frameSize.width : '100%',
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }} />
          </div>
        ) : (
          <div className="gallery-empty">Không có ảnh {label}</div>
        )}
      </div>

      {selectedImage && (
        <div className="gallery-filename" title={selectedImage.name}>
          {selectedIndex + 1}/{images.length} · {selectedImage.name}
        </div>
      )}

      {images.length > 0 && (
        <div className="gallery-thumbnails" aria-label={`Chọn ảnh ${label}`}>
          {images.map((img, index) => (
            <button
              key={img.url}
              title={img.name}
              aria-label={`${label}: ${img.name}`}
              aria-pressed={selectedIndex === index}
              className={`gallery-thumbnail${selectedIndex === index ? ' is-selected' : ''}`}
              onClick={() => { setSelectedIndex(index); setZoom(1); setRotation(0); }}
            >
              <img src={img.url} alt="" loading="lazy" />
              <span>{img.name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen, onClose, folderTitle, autoImages, manualImages,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-title">
      <div className="gallery-header">
        <h2 id="gallery-title">Ảnh kiểm tra Master Sample — {folderTitle}</h2>
        <button onClick={onClose} aria-label="Đóng cửa sổ xem ảnh" title="Đóng (Esc)"><X size={20} /></button>
      </div>
      <div className="gallery-comparison">
        <ImagePanel label="AUTO" images={autoImages} />
        <ImagePanel label="MANUAL" images={manualImages} />
      </div>
    </div>
  );
};
