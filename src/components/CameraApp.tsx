import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Settings, 
  Zap, 
  ZapOff, 
  RefreshCcw, 
  Video, 
  Image as ImageIcon, 
  Lock, 
  Unlock, 
  Plus, 
  Minus,
  Focus
} from 'lucide-react';

export default function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [isLocked, setIsLocked] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [zoom, setZoom] = useState(1);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          zoom: true // Request zoom capability if available
        } as any, // Type assertion for experimental zoom
        audio: mode === 'video'
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setStream(newStream);
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback if specific constraints fail
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
        setStream(fallbackStream);
      } catch (fallbackErr) {
        console.error("Fallback camera access failed:", fallbackErr);
      }
    }
  }, [facingMode, mode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const toggleFlash = () => {
    setFlash(prev => prev === 'off' ? 'on' : prev === 'on' ? 'auto' : 'off');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Handle mirroring for front camera
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setLastPhoto(dataUrl);
        
        // Visual feedback
        const flashOverlay = document.getElementById('flash-overlay');
        if (flashOverlay) {
          flashOverlay.style.opacity = '1';
          setTimeout(() => {
            flashOverlay.style.opacity = '0';
          }, 100);
        }
      }
    }
  };

  const handleZoom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    
    // Apply zoom to video track if supported
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities() as any;
      if (capabilities && capabilities.zoom) {
        videoTrack.applyConstraints({
          advanced: [{ zoom: newZoom }]
        } as any);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black text-white overflow-hidden flex flex-col md:flex-row font-sans select-none">
      {/* Viewfinder */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted={mode === 'photo'}
          className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          style={{ transform: `scale(${zoom}) ${facingMode === 'user' ? 'scaleX(-1)' : ''}` }}
        />
        
        {/* Flash Overlay */}
        <div 
          id="flash-overlay" 
          className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-100 ease-out z-50"
        />

        {/* Center Focus Reticle (Open Camera style) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
          <div className="w-24 h-24 border-2 border-green-500 rounded-sm flex items-center justify-center">
            <Focus className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>

        {/* Zoom Slider (Bottom in portrait, left in landscape) */}
        <div className="absolute bottom-24 left-4 right-4 md:bottom-8 md:left-24 md:right-auto md:w-64 md:-rotate-90 md:origin-left z-20 flex items-center gap-2 bg-black/30 p-2 rounded-full backdrop-blur-sm">
          <Minus className="w-4 h-4" />
          <input 
            type="range" 
            min="1" 
            max="5" 
            step="0.1" 
            value={zoom} 
            onChange={handleZoom}
            className="flex-1 accent-white h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
          <Plus className="w-4 h-4" />
        </div>
      </div>

      {/* Top/Left Controls Bar */}
      <div className="absolute top-0 left-0 right-0 md:right-auto md:bottom-0 md:w-16 p-2 md:py-4 flex md:flex-col justify-between items-center bg-gradient-to-b md:bg-gradient-to-r from-black/60 to-transparent z-20">
        <div className="flex md:flex-col gap-4 md:gap-6">
          <button className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
          <button onClick={toggleFlash} className="p-2 rounded-full hover:bg-white/20 transition-colors flex flex-col items-center">
            {flash === 'off' ? <ZapOff className="w-6 h-6" /> : <Zap className={`w-6 h-6 ${flash === 'auto' ? 'text-yellow-400' : 'text-white'}`} />}
            {flash === 'auto' && <span className="text-[10px] font-bold mt-1">AUTO</span>}
          </button>
          <button onClick={() => setIsLocked(!isLocked)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            {isLocked ? <Lock className="w-6 h-6 text-red-500" /> : <Unlock className="w-6 h-6" />}
          </button>
        </div>
        
        <div className="hidden md:flex flex-col gap-4">
          {/* Extra controls can go here */}
        </div>
      </div>

      {/* Bottom/Right Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 md:left-auto md:top-0 md:w-32 p-4 md:py-8 flex md:flex-col justify-around md:justify-center md:gap-12 items-center bg-gradient-to-t md:bg-gradient-to-l from-black/80 to-transparent z-20">
        
        {/* Gallery Thumbnail */}
        <button className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-600 overflow-hidden flex items-center justify-center hover:border-white transition-colors">
          {lastPhoto ? (
            <img src={lastPhoto} alt="Gallery" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-gray-400" />
          )}
        </button>

        {/* MAIN CAPTURE BUTTON - BLACK COLOR AS REQUESTED */}
        <div className="relative flex items-center justify-center">
          <button 
            onClick={takePhoto}
            className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-black border-4 border-gray-400 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-gray-900 hover:scale-95 active:scale-90 transition-all z-30"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-gray-700 flex items-center justify-center">
              <Camera className="w-8 h-8 md:w-10 md:h-10 text-gray-300" />
            </div>
          </button>
        </div>

        {/* Switch Camera & Mode Toggle */}
        <div className="flex md:flex-col gap-4 items-center">
          <button 
            onClick={() => setMode(prev => prev === 'photo' ? 'video' : 'photo')}
            className="p-3 rounded-full bg-black/50 hover:bg-white/20 transition-colors"
          >
            {mode === 'photo' ? <Camera className="w-6 h-6" /> : <Video className="w-6 h-6 text-red-500" />}
          </button>
          
          <button 
            onClick={toggleCamera}
            className="p-3 rounded-full bg-black/50 hover:bg-white/20 transition-colors"
          >
            <RefreshCcw className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Hidden Canvas for capturing photos */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
