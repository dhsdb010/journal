import { useMemo, useState, useEffect, useRef } from "react";
import { Folder, X, Plus, StickyNote, Type as TypeIcon, Sparkles, Book, Image as ImageIcon, PenTool, Eraser, Undo, Trash2 } from "lucide-react";
import type { CalendarEvent, EventType } from "./EventModal";
import type { ThemeColors } from "./ThemeSwitcher";
import { dbRequest } from "../../utils/db";
import { SolarSystem } from "./SolarSystemView";

interface DailyViewProps {
  date: string; // Format: YYYY-MM-DD
  events: CalendarEvent[];
  onDateClick: () => void;
  theme: ThemeColors;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
}

interface PlacedSticker {
  id: string;
  type: 'image' | 'video' | 'text' | 'postit';
  src?: string;
  content?: string;
  style?: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
  };
  x: number;
  y: number;
  scale: number;
  rotation: number;
  width: number;
  height: number;
}

/*const AVAILABLE_STICKERS = [
  "/stickers/stitch.png",
  "/stickers/github-cat.png",
  "/stickers/patrick.png",
];*/

export function DailyView({ date, events, onDateClick: _onDateClick, theme, onAddEvent, onEditEvent }: DailyViewProps) {
  const dateObj = useMemo(() => new Date(date + "T00:00:00"), [date]);
  const [stickers, setStickers] = useState<PlacedSticker[]>([]);
  const [customStickers, setCustomStickers] = useState<{ id: string; data: string; type: 'image' | 'video' }[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [editingStickerId, setEditingStickerId] = useState<string | null>(null);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isSolarSystemOpen, setIsSolarSystemOpen] = useState(false);
  const [generatorPrompt, setGeneratorPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; stickerId: string | null }>({ isOpen: false, stickerId: null });
  const [dontAskDelete, setDontAskDelete] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);

  // Drawing State
  const [isPenToolActive, setIsPenToolActive] = useState(false);
  const [toolMode, setToolMode] = useState<'pen' | 'eraser'>('pen');
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number, y: number } | null>(null);

  // Drawing History
  const [paths, setPaths] = useState<{ points: { x: number; y: number }[]; color: string; size: number; mode: 'pen' | 'eraser' }[]>([]);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const cursorRef = useRef<HTMLDivElement>(null);
  const pathsRef = useRef(paths); // Ref to keep track of paths without triggering effects

  // Update pathsRef whenever paths change
  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redrawCanvas(pathsRef.current);
    };

    // Initial resize
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redraw when paths change
  useEffect(() => {
    redrawCanvas(paths);
  }, [paths]);

  const redrawCanvas = (pathsToDraw: { points: { x: number; y: number }[]; color: string; size: number; mode: 'pen' | 'eraser' }[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pathsToDraw.forEach(path => {
      if (path.points.length === 0) return;

      ctx.globalCompositeOperation = path.mode === 'eraser' ? 'destination-out' : 'source-over';

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);

      if (path.points.length === 1) {
        // Draw a dot for single point
        ctx.lineTo(path.points[0].x, path.points[0].y);
      } else {
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
      }

      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    // Reset composite operation to default
    ctx.globalCompositeOperation = 'source-over';
  };

  // Drawing Functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPenToolActive) return;
    isDrawingRef.current = true;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    lastPosRef.current = { x, y };
    currentPathRef.current = [{ x, y }];

    // Draw initial dot immediately
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = toolMode === 'eraser' ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Update Custom Cursor
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
      cursorRef.current.style.width = `${brushSize}px`;
      cursorRef.current.style.height = `${brushSize}px`;
      cursorRef.current.style.opacity = (toolMode === 'eraser' && isPenToolActive) ? '1' : '0';
    }

    if (!isDrawingRef.current || !lastPosRef.current || !isPenToolActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    ctx.globalCompositeOperation = toolMode === 'eraser' ? 'destination-out' : 'source-over';

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPosRef.current = { x, y };
    currentPathRef.current.push({ x, y });
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;

    if (currentPathRef.current.length > 0) {
      // Clone points to ensure state immutability and persistence
      const pointsCopy = [...currentPathRef.current];

      setPaths(prev => {
        const newPaths = [...prev, {
          points: pointsCopy,
          color: brushColor,
          size: brushSize,
          mode: toolMode
        }];
        dbRequest.saveDailyContent(date, stickers, newPaths).catch(console.error);
        return newPaths;
      });
      currentPathRef.current = [];
    }
  };

  const undoDrawing = () => {
    setPaths(prev => {
      const newPaths = prev.slice(0, -1);
      dbRequest.saveDailyContent(date, stickers, newPaths).catch(console.error);
      return newPaths;
    });
  };

  // Load "Don't ask again" preference
  useEffect(() => {
    const savedPref = localStorage.getItem('dont-ask-delete-sticker');
    if (savedPref === 'true') {
      setDontAskDelete(true);
    }
  }, []);

  const getEventColor = (type: EventType) => {
    switch (type) {
      case "happiness": return "bg-orange-500";
      case "sadness": return "bg-sky-300";
      case "fear": return "bg-yellow-400";
      case "disgust": return "bg-green-300";
      case "anger": return "bg-purple-500";
      case "surprise": return "bg-pink-500";
      case "idk": return "bg-gray-400";
      case "so-so": return "bg-red-500";
    }
  };

  // Load stickers for current date
  // Load stickers for current date and custom library
  // Load stickers for current date and custom library
  useEffect(() => {
    // Reset state immediately to prevent ghosting
    setStickers([]);
    setPaths([]);

    const loadData = async () => {
      // Load placed stickers and drawings
      const { stickers: savedStickers, drawings: savedDrawings } = await dbRequest.getDailyContent(date);
      setStickers(savedStickers);
      setPaths(savedDrawings);

      // Load custom stickers library
      const savedLibrary = await dbRequest.getAllCustomStickers();
      setCustomStickers(savedLibrary);
    };
    loadData();
  }, [date]);

  // Save stickers
  const saveStickers = async (newStickers: PlacedSticker[]) => {
    setStickers(newStickers);
    await dbRequest.saveDailyContent(date, newStickers, paths);
  };

  const handleAddSticker = (type: string, src?: string) => {
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight / 2;

    if (type === "new" && src) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const BASE_SIZE = 120;
        let newWidth = BASE_SIZE;
        let newHeight = BASE_SIZE;
        if (aspectRatio > 1) newHeight = BASE_SIZE / aspectRatio;
        else newWidth = BASE_SIZE * aspectRatio;

        const newSticker: PlacedSticker = {
          id: Date.now().toString(),
          type: (src.startsWith('data:video') || src.endsWith('.mp4')) ? 'video' : 'image',
          src,
          x: startX - newWidth / 2,
          y: startY - newHeight / 2,
          scale: 1,
          rotation: 0,
          width: newWidth,
          height: newHeight,
        };
        saveStickers([...stickers, newSticker]);
      };
      img.src = src;
    } else if (type === "preset-text") {
      const newSticker: PlacedSticker = {
        id: Date.now().toString(),
        type: 'text',
        content: "Double tap to edit",
        x: startX - 100,
        y: startY - 25,
        scale: 1,
        rotation: 0,
        width: 200,
        height: 50,
        style: { color: '#000000', fontSize: 24, fontFamily: "'PP Neue Montreal', sans-serif" }
      };
      saveStickers([...stickers, newSticker]);
    } else if (type === "preset-postit") {
      const newSticker: PlacedSticker = {
        id: Date.now().toString(),
        type: 'postit',
        content: "Write something...",
        x: startX - 75,
        y: startY - 75,
        scale: 1,
        rotation: 0,
        width: 150,
        height: 150,
        style: { backgroundColor: '#fef3c7', color: '#000000', fontSize: 18 }
      };
      saveStickers([...stickers, newSticker]);
    }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, src: string, type: "new" | "move" | "preset-text" | "preset-postit", id?: string) => {
    e.dataTransfer.setData("type", type);
    e.dataTransfer.setData("src", src);
    if (id) e.dataTransfer.setData("id", id);

    // Calculate offset if moving existing sticker
    if (type === "move" && containerRef.current && id) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const sticker = stickers.find(s => s.id === id);

      if (sticker) {
        // Calculate offset based on raw x/y coordinates, NOT visual bounding box
        // This decouples the drag logic from rotation/scale transforms
        const mouseXInContainer = e.clientX - containerRect.left;
        const mouseYInContainer = e.clientY - containerRect.top;

        e.dataTransfer.setData("offsetX", (mouseXInContainer - sticker.x).toString());
        e.dataTransfer.setData("offsetY", (mouseYInContainer - sticker.y).toString());
      } else {
        // Fallback (shouldn't happen if id is valid)
        e.dataTransfer.setData("offsetX", "48");
        e.dataTransfer.setData("offsetY", "48");
      }
    }

    // Set custom drag image to remove the white card background if dragging from tray
    if (type === "new") {
      const target = e.currentTarget;
      const mediaEl = target.querySelector('img') || target.querySelector('video');
      if (mediaEl) {
        // Pass natural dimensions for aspect ratio calculation
        const naturalWidth = (mediaEl as HTMLImageElement).naturalWidth || (mediaEl as HTMLVideoElement).videoWidth || 100;
        const naturalHeight = (mediaEl as HTMLImageElement).naturalHeight || (mediaEl as HTMLVideoElement).videoHeight || 100;
        e.dataTransfer.setData("origWidth", naturalWidth.toString());
        e.dataTransfer.setData("origHeight", naturalHeight.toString());

        // Set drag ghost
        e.dataTransfer.setDragImage(mediaEl, 30, 30);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow dropping
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent opening modal

    if (!containerRef.current) return;

    const type = e.dataTransfer.getData("type");
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    if (type === "new") {
      const src = e.dataTransfer.getData("src");
      const origWidth = parseFloat(e.dataTransfer.getData("origWidth") || "100");
      const origHeight = parseFloat(e.dataTransfer.getData("origHeight") || "100");

      // Calculate new dimensions fitting within a base box (e.g. 150px) but maintaining aspect ratio
      const BASE_SIZE = 120;
      const aspectRatio = origWidth / origHeight;

      let newWidth = BASE_SIZE;
      let newHeight = BASE_SIZE;

      if (aspectRatio > 1) {
        // Wide image
        newHeight = BASE_SIZE / aspectRatio;
      } else {
        // Tall image
        newWidth = BASE_SIZE * aspectRatio;
      }

      const newSticker: PlacedSticker = {
        id: Date.now().toString(),
        type: (src.startsWith('data:video') || src.endsWith('.mp4')) ? 'video' : 'image',
        src,
        x: x - newWidth / 2,
        y: y - newHeight / 2,
        scale: 1,
        rotation: 0,
        width: newWidth,
        height: newHeight,
      };
      saveStickers([...stickers, newSticker]);
    } else if (type === "preset-text") {
      const newSticker: PlacedSticker = {
        id: Date.now().toString(),
        type: 'text',
        content: "Double tap to edit",
        x: x - 100,
        y: y - 25,
        scale: 1,
        rotation: 0,
        width: 200,
        height: 50,
        style: { color: '#000000', fontSize: 24, fontFamily: "'PP Neue Montreal', sans-serif" }
      };
      saveStickers([...stickers, newSticker]);
    } else if (type === "preset-postit") {
      const newSticker: PlacedSticker = {
        id: Date.now().toString(),
        type: 'postit',
        content: "Write something...",
        x: x - 75,
        y: y - 75,
        scale: 1,
        rotation: 0,
        width: 150,
        height: 150,
        style: { backgroundColor: '#fef3c7', color: '#000000', fontSize: 18 }
      };
      saveStickers([...stickers, newSticker]);
    } else if (type === "move") {
      const id = e.dataTransfer.getData("id");
      const offsetX = parseFloat(e.dataTransfer.getData("offsetX") || "40");
      const offsetY = parseFloat(e.dataTransfer.getData("offsetY") || "40");

      const updatedStickers = stickers.map(s =>
        s.id === id ? { ...s, x: x - offsetX, y: y - offsetY } : s
      );
      saveStickers(updatedStickers);
    }
  };

  const handleDeleteSticker = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent default context menu

    if (dontAskDelete) {
      deleteSticker(id);
    } else {
      setDeleteConfirmation({ isOpen: true, stickerId: id });
    }
  };

  const deleteSticker = (id: string) => {
    const updated = stickers.filter(s => s.id !== id);
    saveStickers(updated);
    if (selectedStickerId === id) {
      setSelectedStickerId(null);
    }
    setDeleteConfirmation({ isOpen: false, stickerId: null });
  };

  const confirmDelete = (dontAskAgain: boolean) => {
    if (dontAskAgain) {
      localStorage.setItem('dont-ask-delete-sticker', 'true');
      setDontAskDelete(true);
    }
    if (deleteConfirmation.stickerId) {
      deleteSticker(deleteConfirmation.stickerId);
    }
  };



  const handleResize = (e: React.MouseEvent, id: string, initialScale: number, startY: number) => {
    e.stopPropagation();
    let frameId: number;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (frameId) cancelAnimationFrame(frameId);

      frameId = requestAnimationFrame(() => {
        const delta = startY - moveEvent.clientY;
        const newScale = Math.max(0.2, Math.min(3, initialScale + delta * 0.01));

        setStickers(prev => prev.map(s =>
          s.id === id ? { ...s, scale: newScale } : s
        ));
      });
    };

    const handleMouseUp = () => {
      if (frameId) cancelAnimationFrame(frameId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Save final state
      setStickers(currentStickers => {
        dbRequest.saveDailyContent(date, currentStickers, paths).catch(console.error);
        return currentStickers;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleRotate = (e: React.MouseEvent, id: string, startX: number, startY: number, centerX: number, centerY: number) => {
    e.stopPropagation();
    let frameId: number;

    // Calculate initial angle based on mouse down position relative to center
    const startAngle = Math.atan2(startY - centerY, startX - centerX);
    const sticker = stickers.find(s => s.id === id);
    const initialRotation = sticker?.rotation || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (frameId) cancelAnimationFrame(frameId);

      frameId = requestAnimationFrame(() => {
        const currentAngle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX);
        const deltaAngle = currentAngle - startAngle;
        const deg = deltaAngle * (180 / Math.PI);

        setStickers(prev => prev.map(s =>
          s.id === id ? { ...s, rotation: initialRotation + deg } : s
        ));
      });
    };

    const handleMouseUp = () => {
      if (frameId) cancelAnimationFrame(frameId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Save final state
      setStickers(currentStickers => {
        dbRequest.saveDailyContent(date, currentStickers, paths).catch(console.error);
        return currentStickers;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMoveSticker = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();

    setSelectedStickerId(id);

    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialStickerX = sticker.x;
    const initialStickerY = sticker.y;

    let frameId: number;
    let hasMoved = false;
    let isDragging = false;
    const DRAG_THRESHOLD = 3;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const moveDistance = Math.sqrt(
        Math.pow(moveEvent.clientX - startX, 2) +
        Math.pow(moveEvent.clientY - startY, 2)
      );

      // Only consider it a drag if moved more than threshold
      if (!isDragging && moveDistance > DRAG_THRESHOLD) {
        isDragging = true;
      }

      if (isDragging) {
        hasMoved = true;
        if (frameId) cancelAnimationFrame(frameId);

        frameId = requestAnimationFrame(() => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          setStickers(prev => prev.map(s =>
            s.id === id ? { ...s, x: initialStickerX + deltaX, y: initialStickerY + deltaY } : s
          ));
        });
      }
    };

    const handleMouseUp = () => {
      if (frameId) cancelAnimationFrame(frameId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      if (hasMoved) {
        setStickers(currentStickers => {
          dbRequest.saveDailyContent(date, currentStickers, paths).catch(console.error);
          return currentStickers;
        });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleGenerateSticker = async () => {
    if (!generatorPrompt.trim()) return;

    setIsGenerating(true);

    const prompt = encodeURIComponent(generatorPrompt);

    // Strategy: Search Lexica first (High Quality, unlikely to fail)
    const searchUrl = `https://lexica.art/api/v1/search?q=${prompt}`;

    const finalizeSticker = async (source: string) => {
      try {
        await dbRequest.saveCustomSticker(source, 'image');
        const newLibrary = await dbRequest.getAllCustomStickers();
        setCustomStickers(newLibrary);

        const newSticker: PlacedSticker = {
          id: Date.now().toString(),
          type: 'image',
          src: source,
          x: window.innerWidth / 2 - 100,
          y: window.innerHeight / 2 - 100,
          scale: 1,
          rotation: 0,
          width: 200,
          height: 200,
        };
        setStickers(prev => [...prev, newSticker]);

        setIsGenerating(false);
        setIsGeneratorOpen(false);
        setGeneratorPrompt("");
      } catch (err) {
        console.error("Error saving sticker:", err);
        setIsGenerating(false);
        alert("Error saving sticker. Please try again.");
      }
    };

    // Stage 3: Robohash (Guaranteed to work)
    const tryRobohashFallback = () => {
      console.warn("Using Robohash fallback");

      let set = 'set1'; // Default to robots
      const p = generatorPrompt.toLowerCase();

      // Simple context awareness
      if (p.includes('monster') || p.includes('alien') || p.includes('creature')) {
        set = 'set2';
      } else if (p.includes('cat') || p.includes('kitten') || p.includes('meow')) {
        set = 'set4';
      } else if (p.includes('human') || p.includes('person') || p.includes('man') || p.includes('woman') || p.includes('girl') || p.includes('boy')) {
        set = 'set5';
      } else {
        // If undefined, randomize slightly to keep it fun
        const sets = ['set1', 'set2', 'set4', 'set5'];
        set = sets[Math.floor(Math.random() * sets.length)];
      }

      const roboUrl = `https://robohash.org/${prompt}.png?set=${set}&size=200x200`;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => finalizeSticker(roboUrl);
      img.onerror = () => {
        alert("Could not generate any image. Please check your connection.");
        setIsGenerating(false);
      };
      img.src = roboUrl;
    };

    // Stage 2: Pollinations
    const tryPollinationsFallback = () => {
      console.warn("Lexica failed, trying Pollinations...");
      const seed = Math.floor(Math.random() * 1000000);
      // Use the redirect endpoint which is often more stable for hotlinking
      const pollUrl = `https://pollinations.ai/p/${prompt}?width=512&height=512&seed=${seed}`;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => finalizeSticker(pollUrl);
      img.onerror = () => tryRobohashFallback();
      img.src = pollUrl;
    };

    // Helper to verify if an image URL actually works before saving it
    const verifyAndSave = (url: string) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // Important: Fail if CORS headers are missing
      img.onload = () => finalizeSticker(url);
      img.onerror = () => {
        console.warn("Image URL failed to load (or CORS error):", url);
        // If Lexica failed, try Pollinations fallback
        if (url.includes('lexica')) {
          tryPollinationsFallback();
        } else {
          // Already tried Pollinations, try Robohash
          tryRobohashFallback();
        }
      };
      img.src = url;
    };

    try {
      // 1. Search Lexica
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      if (!data.images || data.images.length === 0) {
        throw new Error("No images found");
      }

      // 2. verify and save the direct URL (No CORS fetch needed)
      // Use srcSmall for faster loading if available
      const lexicaUrl = data.images[0].srcSmall || data.images[0].src;
      verifyAndSave(lexicaUrl);

    } catch (error) {
      console.warn("Lexica search failed:", error);
      tryPollinationsFallback();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Helper to resize image
    const resizeImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Max dimensions (e.g., 1024px) to keep size reasonable for localStorage
          const MAX_SIZE = 1200;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
          URL.revokeObjectURL(img.src);
        };
        img.onerror = reject;
      });
    };

    try {
      let result: string;

      if (file.type.startsWith("image/")) {
        // Automatically resize/compress images
        result = await resizeImage(file);
      } else {
        // For videos, we still need a check because localStorage kills large files
        if (file.size > 10 * 1024 * 1024) {
          alert("Video is too large for local storage (Limit: ~10MB).");
          return;
        }

        result = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // const newLibrary = [...customStickers, { id: 'temp-' + Date.now(), data: result, type: file.type.startsWith('image/') ? 'image' : 'video' as 'image' | 'video' }];

      // Save to IndexedDB
      try {
        await dbRequest.saveCustomSticker(result, file.type.startsWith('image/') ? 'image' : 'video');
        // Update local state with real ID
        const finalLibrary = await dbRequest.getAllCustomStickers();
        setCustomStickers(finalLibrary);
      } catch (err) {
        console.error("Failed to save to DB", err);
        alert("Failed to save sticker.");
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Failed to process file.");
    }
  };

  const monthNumber = dateObj.getMonth() + 1;
  const dayNumber = dateObj.getDate();
  const year = dateObj.getFullYear();
  const isMonday = dateObj.getDay() === 1;

  const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const monthName = dateObj.toLocaleDateString("en-US", { month: "long" }).toUpperCase();

  // Calculate moon phase (0 = new moon, 0.5 = full moon, 1 = new moon)
  const getMoonPhase = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    let c = 0;
    let e = 0;
    let jd = 0;
    let b = 0;

    if (month < 3) {
      c = year - 1;
      e = month + 12;
    } else {
      c = year;
      e = month;
    }

    jd = Math.floor(365.25 * (c + 4716)) + Math.floor(30.6001 * (e + 1)) + day - 1524.5;
    b = (jd - 2451550.1) / 29.530588853;
    b = b - Math.floor(b);

    return b;
  };

  const moonPhase = getMoonPhase(dateObj);

  // Render detailed moon shape based on phase
  const renderMoon = () => {
    const phase = moonPhase; // 0..1
    const size = 80;
    const r = (size - 4) / 2;
    const cx = size / 2;
    const cy = size / 2;

    // Determine colors
    const darkColor = theme.background === "#000000" ? "#333333" : "#e5e5e5"; // Lighter dark for visibility
    const lightColor = theme.background === "#000000" ? "#ffffff" : "#1a1a1a"; // High contrast
    // High contrast border: Black on light bg, White on dark bg
    const strokeColor = theme.background === "#000000" ? "#ffffff" : "#000000";

    // SVG Path Generation
    const isWaxing = phase <= 0.5;

    const sweepOuter = isWaxing ? 1 : 0; // 1=Right side (Waxing), 0=Left side (Waning)

    const cosP = Math.cos(phase * 2 * Math.PI);
    const rx = r * Math.abs(cosP);

    const isGibbous = cosP < 0; // closer to Full
    const sweepInner = isWaxing === isGibbous ? 1 : 0;

    const d = [
      `M ${cx} ${cy - r}`, // Move to Top
      `A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r}`, // Outer Arc to Bottom
      rx < 0.5
        ? `L ${cx} ${cy - r}` // Straight line if near Quarter
        : `A ${rx} ${r} 0 0 ${sweepInner} ${cx} ${cy - r}`, // Inner Ellipse to Top
      "Z"
    ].join(" ");

    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          setIsSolarSystemOpen(true);
        }}
        className="cursor-pointer hover:scale-110 transition-transform duration-300"
        title="View Orbit"
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
          <circle cx={cx} cy={cy} r={r} fill={darkColor} stroke="none" />
          {phase > 0.02 && phase < 0.98 && (
            <path d={d} fill={lightColor} stroke="none" />
          )}
          {(phase >= 0.48 && phase <= 0.52) && (
            <circle cx={cx} cy={cy} r={r} fill={lightColor} stroke="none" />
          )}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={strokeColor} strokeWidth="2" />
        </svg>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={(e) => {
        // Only trigger date click if clicking the background, not UI elements
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.text-date-display')) {
          // User requested "wallpaper mode", so we disable the modal opening on click
          // onDateClick(); 
        }
        setSelectedStickerId(null);
      }}
      className="relative w-full h-screen cursor-pointer flex flex-col overflow-hidden"
      style={{
        fontFamily: "'PP Neue Montreal', sans-serif",
        backgroundColor: theme.background
      }}
    >
      {/* Canvas Layer for Drawing */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full z-[5] ${isPenToolActive ? (toolMode === 'eraser' ? 'pointer-events-auto cursor-none' : 'pointer-events-auto cursor-crosshair') : 'pointer-events-none'}`}
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseLeave={() => {
          stopDrawing();
          if (cursorRef.current) cursorRef.current.style.opacity = '0';
        }}
        onMouseEnter={() => {
          if (cursorRef.current && toolMode === 'eraser') cursorRef.current.style.opacity = '1';
        }}
      />

      {/* Eraser Cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 border-2 border-black/50 rounded-full pointer-events-none z-[100] transition-opacity duration-75 shadow-sm bg-white/10 backdrop-blur-[1px]"
        style={{
          width: brushSize,
          height: brushSize,
          opacity: 0,
        }}
      />

      {/* Placed Stickers */}
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className={`absolute group touch-none select-none ${selectedStickerId === sticker.id ? 'z-20' : 'z-10'}`}
          style={{
            left: sticker.x,
            top: sticker.y,
            width: sticker.width || 96,
            height: sticker.height || 96,
            transform: `scale(${sticker.scale || 1}) rotate(${sticker.rotation || 0}deg)`,
            transformOrigin: "center center",
            cursor: 'grab', // explicit grab cursor
          }}
          onMouseDown={(e) => handleMoveSticker(e, sticker.id)}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (sticker.type === 'text' || sticker.type === 'postit') {
              setEditingStickerId(sticker.id);
            }
          }}
        >
          {sticker.type === 'text' || sticker.type === 'postit' ? (
            <div className={`w-full h-full p-4 flex items-center justify-center transition-shadow
              ${sticker.type === 'postit' ? 'bg-yellow-100 shadow-md rotate-1' : ''}
              ${selectedStickerId === sticker.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
            `}
              style={{
                backgroundColor: sticker.style?.backgroundColor || 'transparent',
              }}
            >
              {editingStickerId === sticker.id ? (
                <textarea
                  autoFocus
                  className="w-full h-full bg-transparent resize-none outline-none text-center font-medium placeholder-black/30"
                  style={{
                    color: sticker.style?.color,
                    fontSize: sticker.style?.fontSize ? `${sticker.style.fontSize}px` : 'inherit',
                    fontFamily: sticker.style?.fontFamily
                  }}
                  value={sticker.content}
                  onChange={(e) => {
                    const newContent = e.target.value;
                    setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, content: newContent } : s));
                  }}
                  onBlur={() => {
                    setEditingStickerId(null);
                    // Trigger save
                    dbRequest.saveDailyContent(date, stickers, paths).catch(console.error);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-center whitespace-pre-wrap font-medium pointer-events-none select-none"
                  style={{
                    color: sticker.style?.color,
                    fontSize: sticker.style?.fontSize ? `${sticker.style.fontSize}px` : 'inherit',
                    fontFamily: sticker.style?.fontFamily
                  }}
                >
                  {sticker.content}
                </div>
              )}
            </div>
          ) : (sticker.src?.startsWith('data:video') || sticker.src?.endsWith('.mp4') ? (
            <video
              src={sticker.src}
              className={`w-full h-full object-contain transition-filter rounded-lg pointer-events-none
                ${selectedStickerId === sticker.id ? 'drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]' : 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]'}
              `}
              muted
              loop
              autoPlay
              playsInline
              onContextMenu={(e) => handleDeleteSticker(e, sticker.id)}
            />
          ) : (
            <img
              src={sticker.src}
              alt="sticker"
              onContextMenu={(e) => handleDeleteSticker(e, sticker.id)}
              className={`w-full h-full object-contain transition-filter pointer-events-none
                ${selectedStickerId === sticker.id ? 'drop-shadow-[0_0_8px_rgba(0,0,0,0.2)]' : 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]'}
              `}
            />
          ))}

          {selectedStickerId === sticker.id && (
            <>
              {/* Delete Handle (Top-Left) */}
              <div
                className="absolute -left-3 -top-3 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 cursor-pointer flex items-center justify-center z-30 hover:bg-red-50 transition-colors group/delete"
                style={{
                  transform: `scale(${1 / (sticker.scale || 1)})`,
                }}
                onClick={(e) => handleDeleteSticker(e, sticker.id)}
                title="Delete"
              >
                <X className="w-3.5 h-3.5 text-gray-500 group-hover/delete:text-red-500" />
              </div>

              {/* Resize Handle (Top-Right) */}
              <div
                className="absolute -right-3 -top-3 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 cursor-ns-resize flex items-center justify-center z-30 hover:bg-gray-50 transition-colors"
                style={{
                  transform: `scale(${1 / (sticker.scale || 1)})`,
                }}
                onMouseDown={(e) => handleResize(e, sticker.id, sticker.scale || 1, e.clientY)}
                onClick={(e) => e.stopPropagation()}
                title="Resize"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black/50" />
              </div>

              {/* Rotate Handle (Bottom-Right) */}
              <div
                className="absolute -right-3 -bottom-3 w-6 h-6 bg-white rounded-full shadow-md border border-gray-200 cursor-crosshair flex items-center justify-center z-30 hover:bg-gray-50 transition-colors"
                style={{
                  transform: `scale(${1 / (sticker.scale || 1)})`,
                }}
                onMouseDown={(e) => {
                  const rect = (e.currentTarget.parentNode as Element).getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;
                  handleRotate(e, sticker.id, e.clientX, e.clientY, centerX, centerY);
                }}
                onClick={(e) => e.stopPropagation()}
                title="Rotate"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              </div>
            </>
          )}
        </div>
      ))}


      {/* Drawing Controls */}
      {isPenToolActive && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center gap-4 z-40 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex gap-2 border-r border-gray-200 pr-4">
            {['#000000', '#FF3B30', '#007AFF', '#34C759', '#FFD60A', '#FFFFFF'].map((color) => (
              <button
                key={color}
                onClick={() => {
                  setBrushColor(color);
                  setToolMode('pen');
                }}
                className={`w-6 h-6 rounded-full border border-gray-200 transition-transform ${brushColor === color && toolMode === 'pen' ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <input
              type="range"
              min="2"
              max="40"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="w-4 h-4 rounded-full bg-gray-400" />
          </div>
          <div className="flex items-center border-l border-gray-200 pl-4 gap-1">
            <button
              onClick={() => setToolMode('eraser')}
              className={`p-2 transition-colors ${toolMode === 'eraser' ? 'text-black bg-gray-100 rounded-lg' : 'text-gray-400 hover:text-black'}`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>
            <button
              onClick={undoDrawing}
              disabled={paths.length === 0}
              className="p-2 text-gray-400 hover:text-black transition-colors disabled:opacity-30 disabled:hover:text-gray-400"
              title="Undo"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); // Reset entire canvas
                  setPaths([]);
                  dbRequest.saveDailyContent(date, stickers, []).catch(console.error);
                }
              }}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Clear All"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col relative px-12 md:px-20 pb-16 pointer-events-none">
        <div
          className="absolute top-8 left-12 md:left-20"
          style={{
            fontSize: '68px',
            fontWeight: '500',
            color: theme.background === "#000000" ? "#ffffff" : theme.background === "#ffffff" ? "#000000" : "rgba(0,0,0,0.3)"
          }}
        >
          {monthNumber}
        </div>

        {events.length > 0 && (
          <div className="absolute top-8 right-12 md:right-20 flex gap-2">
            {events.map((ev, i) => (
              <div key={i} className="w-5 h-5 rounded-full" style={{
                backgroundColor: (() => {
                  switch (ev.eventType) {
                    case "happiness": return "#f97316";
                    case "sadness": return "#7dd3fc";
                    case "fear": return "#facc15";
                    case "disgust": return "#86efac";
                    case "anger": return "#a855f7";
                    case "surprise": return "#ec4899";
                    case "idk": return "#9ca3af";
                    case "so-so": return "#ef4444";
                  }
                })()
              }} />
            ))}
          </div>
        )}

        <div className="flex-1 flex items-center justify-center text-date-display pointer-events-auto">
          <div className="text-center">
            <div
              className="font-bold leading-none mb-8"
              style={{
                fontSize: 'clamp(180px, 25vw, 320px)',
                color: isMonday && (theme.background === "#f5b547" || theme.background === "#e8724d")
                  ? "#ffffff"
                  : theme.text,
                letterSpacing: '-0.02em'
              }}
            >
              {dayNumber}
            </div>

            <div
              className="tracking-wider"
              style={{
                fontSize: 'clamp(20px, 2.5vw, 32px)',
                fontWeight: '500',
                color: isMonday && (theme.background === "#f5b547" || theme.background === "#e8724d")
                  ? "#ffffff"
                  : theme.background === "#000000" ? "#aaa" : theme.background === "#ffffff" ? "#666" : "rgba(0,0,0,0.7)"
              }}
            >
              {dayOfWeek}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div className="text-left pl-24">
            <div
              className="mb-1"
              style={{
                fontSize: 'clamp(24px, 3vw, 36px)',
                fontWeight: '600',
                color: isMonday && (theme.background === "#f5b547" || theme.background === "#e8724d")
                  ? "#ffffff"
                  : theme.text,
                letterSpacing: '0.02em'
              }}
            >
              {monthName}
            </div>
            <div
              style={{
                fontSize: 'clamp(18px, 2vw, 24px)',
                fontWeight: '500',
                color: isMonday && (theme.background === "#f5b547" || theme.background === "#e8724d")
                  ? "rgba(255,255,255,0.8)"
                  : theme.background === "#000000" ? "#ffffff" : theme.background === "#ffffff" ? "#000000" : "rgba(0,0,0,0.7)"
              }}
            >
              {year}
            </div>
          </div>

          <div className="flex flex-col items-end pointer-events-auto">
            {renderMoon()}
          </div>
        </div>
      </div>

      {/* Sticker Tray (Bottom Left) */}
      <div className="fixed bottom-8 left-8 z-50 flex flex-col items-start gap-4">
        {/* Tray Content */}
        <div
          className={`grid transition-all duration-300 ease-in-out ${isFolderOpen
            ? "grid-rows-[1fr] opacity-100 mb-4"
            : "grid-rows-[0fr] opacity-0 mb-0"
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-hidden min-h-0">
            <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/20 w-[320px]">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <button
                  onClick={() => handleAddSticker("preset-text")}
                  draggable
                  onDragStart={(e) => handleDragStart(e, "", "preset-text")}
                  className="aspect-square bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-gray-100 hover:scale-105 transition-all text-gray-500 cursor-grab active:cursor-grabbing border border-gray-100"
                >
                  <TypeIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Text</span>
                </button>
                <button
                  onClick={() => handleAddSticker("preset-postit")}
                  draggable
                  onDragStart={(e) => handleDragStart(e, "", "preset-postit")}
                  className="aspect-square bg-yellow-50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-yellow-100 hover:scale-105 transition-all text-yellow-600 cursor-grab active:cursor-grabbing border border-yellow-100"
                >
                  <StickyNote className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Post-it</span>
                </button>
                <button
                  onClick={() => setIsGeneratorOpen(true)}
                  className="aspect-square bg-purple-50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-purple-100 hover:scale-105 transition-all text-purple-600 border border-purple-100"
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[10px] font-medium">AI Gen</span>
                </button>
                <label className="aspect-square bg-blue-50 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-blue-100 hover:scale-105 transition-all text-blue-600 cursor-pointer border border-blue-100">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Upload</span>
                </label>
              </div>

              {customStickers.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Your Stickers & Media</h3>
                  <div className="grid grid-cols-4 gap-3 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                    {customStickers.map((sticker) => (
                      <div
                        key={sticker.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, sticker.data, "new")}
                        onClick={() => handleAddSticker("new", sticker.data)}
                        className="aspect-square bg-gray-50 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity border border-gray-100 relative group"
                      >
                        {sticker.type === 'video' ? (
                          <video src={sticker.data} className="w-full h-full object-cover" />
                        ) : (
                          <img src={sticker.data} alt="sticker" className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newLib = customStickers.filter(s => s.id !== sticker.id);
                            setCustomStickers(newLib);
                            dbRequest.deleteCustomSticker(sticker.id);
                          }}
                          className="absolute top-0.5 right-0.5 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticker/Journal Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => setIsPenToolActive(!isPenToolActive)}
            className={`w-12 h-12 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center group relative z-50 border border-gray-100
              ${isPenToolActive ? "bg-black text-white" : "bg-white text-gray-700 hover:bg-gray-50"}
            `}
            title="Toggle Pen"
          >
            <PenTool className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsFolderOpen(!isFolderOpen)}
            className={`w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 group relative z-50 border border-gray-100
              ${isFolderOpen ? "bg-gray-100" : ""}
            `}
            title="Stickers"
          >
            {isFolderOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Folder className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <button
            onClick={() => setIsJournalOpen(!isJournalOpen)}
            className={`w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 group relative z-50 border border-gray-100
              ${isJournalOpen ? "bg-gray-100" : ""}
            `}
            title="Journal"
          >
            {isJournalOpen ? (
              <X className="w-5 h-5 text-gray-600" />
            ) : (
              <Book className="w-5 h-5 text-blue-500" />
            )}
          </button>
        </div>
      </div>



      {/* Journal Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isJournalOpen ? "translate-x-0" : "translate-x-full"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full bg-white">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Book className="w-6 h-6 text-blue-500" />
              Journal
            </h2>
            <button onClick={() => setIsJournalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {events.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">
                <p>No entries yet.</p>
                <p className="text-sm">Write something about your day!</p>
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} onClick={() => onEditEvent(ev)} className="group relative p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all cursor-pointer flex gap-4 items-start">
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${getEventColor(ev.eventType)}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{ev.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{ev.blocks.find(b => b.type === "text")?.content}</p>
                    {ev.blocks.find(b => b.type === "image") && (
                      <img src={ev.blocks.find(b => b.type === "image")?.content} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-100" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-6 bg-gray-50 border-t border-gray-100">
            <button onClick={onAddEvent} className="w-full py-3 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          </div>
        </div>
      </div>

      {isGeneratorOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-purple-600">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-semibold">AI Sticker Generator</h3>
                </div>
                <button onClick={() => setIsGeneratorOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <textarea value={generatorPrompt} onChange={(e) => setGeneratorPrompt(e.target.value)} placeholder="e.g. A cute pixel art cat..." className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none h-32" />
                <button onClick={handleGenerateSticker} disabled={!generatorPrompt.trim() || isGenerating} className="w-full py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50">
                  {isGenerating ? "Generating..." : "Generate Sticker"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative z-10 animate-in zoom-in-95">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Delete Sticker?</h3>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setDeleteConfirmation({ isOpen: false, stickerId: null })} className="flex-1 py-2 bg-gray-100 rounded-xl">Cancel</button>
                <button onClick={() => confirmDelete(false)} className="flex-1 py-2 bg-red-600 text-white rounded-xl">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSolarSystemOpen && <SolarSystem onClose={() => setIsSolarSystemOpen(false)} />}
    </div>
  );
}
