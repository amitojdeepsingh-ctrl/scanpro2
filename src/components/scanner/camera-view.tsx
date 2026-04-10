'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CameraOff, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'loading' | 'active' | 'error'>('loading');
  const [error, setError] = useState('');
  const cameraFacingRef = useRef<'user' | 'environment'>('environment');

  const {
    cameraFacing,
    setCameraFacing,
    setScanning,
    addDocument,
    setCurrentDocument,
    setCurrentPageIndex,
    resetEditor,
    setView,
  } = useAppStore();

  // Keep ref in sync with store
  useEffect(() => {
    cameraFacingRef.current = cameraFacing;
  }, [cameraFacing]);

  const acquireCamera = useCallback(async (facingMode: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, []);

  // Start camera on mount - using the video's onloadedmetadata to signal success
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await acquireCamera(cameraFacingRef.current);
        if (!cancelled) {
          setCameraState('active');
          setError('');
        }
      } catch {
        if (!cancelled) {
          setCameraState('error');
          setError('Camera access denied. Please allow camera permissions.');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [acquireCamera]);

  const toggleCamera = async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    cameraFacingRef.current = newFacing;

    try {
      await acquireCamera(newFacing);
    } catch {
      // ignore errors during toggle
    }
  };

  const handleRetry = async () => {
    setCameraState('loading');
    try {
      await acquireCamera(cameraFacingRef.current);
      setCameraState('active');
      setError('');
    } catch {
      setCameraState('error');
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Resize to max 1200px for mobile performance
    const maxDim = 1200;
    const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.92);

    const docName = `Scan_${new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).replace(/[/,:]/g, '-')}`;

    const docId = crypto.randomUUID();
    const pageId = crypto.randomUUID();

    addDocument({
      id: docId,
      name: docName,
      pages: [
        {
          id: pageId,
          originalImage: imageData,
          processedImage: imageData,
          filter: 'original',
          brightness: 100,
          contrast: 100,
          sharpness: 0,
          rotation: 0,
        },
      ],
      createdAt: new Date().toISOString(),
      thumbnail: imageData,
      fileSize: Math.round((imageData.length * 3) / 4),
    });

    resetEditor();
    setCurrentDocument(docId);
    setCurrentPageIndex(0);
    setScanning(false);
    setView('editor');
  }, [addDocument, setCurrentDocument, setCurrentPageIndex, resetEditor, setScanning, setView]);

  return (
    <div className="relative flex flex-col items-center gap-4">
      <AnimatePresence mode="wait">
        {cameraState === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center"
          >
            <CameraOff className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={handleRetry} variant="outline" className="rounded-xl">
              <Camera className="mr-2 h-4 w-4" />
              Retry Camera
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-black"
          >
            {/* Viewfinder */}
            <div className="viewfinder-overlay absolute inset-0 z-10 pointer-events-none">
              <div className="absolute inset-[15%] rounded-xl border-2 border-white/50" />
              <div className="absolute top-[15%] left-[15%] h-6 w-6 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
              <div className="absolute top-[15%] right-[15%] h-6 w-6 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
              <div className="absolute bottom-[15%] left-[15%] h-6 w-6 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
              <div className="absolute bottom-[15%] right-[15%] h-6 w-6 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
            </div>

            {cameraState === 'loading' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <p className="text-sm text-white/70">Starting camera...</p>
                </div>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-[3/4] w-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-t from-black/60 to-transparent">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCamera}
                className="h-10 w-10 rounded-full text-white hover:bg-white/20"
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>

              {/* Capture button */}
              <button
                onClick={capturePhoto}
                disabled={cameraState !== 'active'}
                className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95 disabled:opacity-50"
              >
                <div className="h-12 w-12 rounded-full bg-white transition-transform active:scale-90" />
              </button>

              <div className="w-10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
