// src/components/UltimateGameClient.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, Users, Settings, LogOut, Backpack, ShoppingBag, 
  Hammer, Smile, Zap, Home, Send, X, Crown, Star, MessageSquare, 
  Plus, Minus, Search, Bell, Menu
} from 'lucide-react';

// --- DESIGN TOKENS & CONFIG ---

const THEME = {
  colors: {
    primary: 0x6366f1, // Indigo 500
    primaryGlow: 0x818cf8,
    secondary: 0xec4899, // Pink 500
    accent: 0x8b5cf6, // Violet 500
    success: 0x10b981,
    warning: 0xf59e0b,
    danger: 0xef4444,
    bgDark: 0x0f172a, // Slate 900
    bgPanel: 0x1e293b, // Slate 800
    textLight: 0xf8fafc,
    textDim: 0x94a3b8,
    floorLight: 0xe2e8f0,
    floorDark: 0xcbd5e1,
    shadow: 0x000000,
  },
  ui: {
    glass: 'bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl',
    glassHover: 'hover:bg-slate-800/70 hover:border-white/20',
    button: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold shadow-lg shadow-indigo-500/20',
    input: 'bg-black/20 border border-white/10 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20',
  },
  anim: {
    fast: 0.2,
    normal: 0.4,
    slow: 0.6,
    bounce: { type: "spring", stiffness: 400, damping: 25 },
  }
};

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const GRID_SIZE = 12;

// --- TYPES ---

interface User {
  id: number;
  username: string;
  avatarColor: number;
  skinColor: number;
  gold: number;
  isOwner?: boolean;
}

interface Position {
  x: number;
  y: number;
  z: number;
}

interface ChatMessage {
  id: string;
  userId: number;
  username: string;
  message: string;
  timestamp: Date;
  type: 'chat' | 'emote';
}

interface Entity {
  id: string;
  type: 'user' | 'furniture';
  pos: Position;
  targetPos: Position | null;
  data: any;
  sprite?: PIXI.Container;
  sortKey: number;
}

// --- HELPERS ---

const gridToScreen = (x: number, y: number, z: number = 0) => ({
  x: (x - y) * (TILE_WIDTH / 2),
  y: (x + y) * (TILE_HEIGHT / 2) - (z * TILE_HEIGHT),
});

const screenToGrid = (screenX: number, screenY: number) => {
  const col = (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2;
  const row = (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2;
  return { x: Math.floor(col), y: Math.floor(row) };
};

// --- MAIN COMPONENT ---

const UltimateGameClient: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const worldRef = useRef<PIXI.Container | null>(new PIXI.Container());
  const tilesLayerRef = useRef<PIXI.Container | null>(new PIXI.Container());
  const entitiesLayerRef = useRef<PIXI.Container | null>(new PIXI.Container());
  const effectsLayerRef = useRef<PIXI.Container | null>(new PIXI.Container());
  
  const [users] = useState<User[]>([
    { id: 1, username: "You", avatarColor: THEME.colors.primary, skinColor: 0xffdbac, gold: 2450, isOwner: true },
    { id: 2, username: "Sarah", avatarColor: THEME.colors.secondary, skinColor: 0xe0ac69, gold: 3400 },
    { id: 3, username: "Mike", avatarColor: THEME.colors.success, skinColor: 0x8d5524, gold: 850 },
  ]);
  
  const [entities, setEntities] = useState<Map<string, Entity>>(new Map());
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hoveredTile, setHoveredTile] = useState<Position | null>(null);
  const [activeChatBubble, setActiveChatBubble] = useState<{id: string, text: string, x: number, y: number} | null>(null);
  const [fps, setFps] = useState(0);

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application({
      background: THEME.colors.bgDark,
      resizeTo: containerRef.current,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      backgroundColorAlpha: 1,
    });

    containerRef.current.appendChild(app.view as unknown as Node);
    appRef.current = app;

    const world = new PIXI.Container();
    const tilesLayer = new PIXI.Container();
    const entitiesLayer = new PIXI.Container();
    const effectsLayer = new PIXI.Container();

    world.addChild(tilesLayer);
    world.addChild(entitiesLayer);
    world.addChild(effectsLayer);
    app.stage.addChild(world);

    worldRef.current = world;
    tilesLayerRef.current = tilesLayer;
    entitiesLayerRef.current = entitiesLayer;
    effectsLayerRef.current = effectsLayer;

    // Center Camera with premium framing
    const updateCamera = () => {
      if (worldRef.current) {
        worldRef.current.x = app.screen.width / 2;
        worldRef.current.y = app.screen.height / 2.5;
      }
    };
    updateCamera();
    app.renderer.on('resize', updateCamera);

    // Generate Room with Lighting
    generateRoom(tilesLayer);
    addLightingOverlay(app);

    // Add Initial Entities
    users.forEach((u, i) => addEntity(u.id.toString(), 'user', { x: i*2+1, y: i*2+1, z: 0 }, u));
    addEntity('f1', 'furniture', { x: 5, y: 5, z: 0 }, { name: 'Plant', color: THEME.colors.success, height: 35, w:1, d:1 });
    addEntity('f2', 'furniture', { x: 6, y: 4, z: 0 }, { name: 'Table', color: THEME.colors.warning, height: 20, w:2, d:2 });

    // Interaction
    const onPointerMove = (e: PIXI.FederatedPointerEvent) => {
      if (!worldRef.current) return;
      const worldPos = world.toLocal(e.global);
      const grid = screenToGrid(worldPos.x, worldPos.y);
      
      if (grid.x >= 0 && grid.x < GRID_SIZE && grid.y >= 0 && grid.y < GRID_SIZE) {
        setHoveredTile(grid);
        drawHighlight(grid.x, grid.y);
        app.stage.cursor = 'pointer';
      } else {
        setHoveredTile(null);
        clearHighlight();
        app.stage.cursor = 'default';
      }
    };

    const onClick = (e: PIXI.FederatedPointerEvent) => {
      if (hoveredTile) {
        moveEntity(users[0].id.toString(), hoveredTile);
      }
    };

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointermove', onPointerMove);
    app.stage.on('pointerdown', onClick);

    // Animation Loop
    let frameCount = 0;
    let lastTime = performance.now();
    
    app.ticker.add((delta) => {
      updateEntities(delta);
      depthSort();
      
      // FPS Counter
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
    });

    return () => {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    };
  }, []);

  // Sync chat bubble position (simplified for demo)
  useEffect(() => {
    if (!activeChatBubble) return;
    const timer = setTimeout(() => setActiveChatBubble(null), 3000);
    return () => clearTimeout(timer);
  }, [activeChatBubble]);

  // --- Rendering Logic ---

  const generateRoom = (layer: PIXI.Container) => {
    const graphics = new PIXI.Graphics();
    
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const pos = gridToScreen(x, y);
        const isEven = (x + y) % 2 === 0;
        
        // Soft lighting gradient based on position
        const distanceFactor = 1 - ((x + y) / (GRID_SIZE * 2)) * 0.4;
        
        graphics.lineStyle(1, 0xffffff, 0.05);
        graphics.beginFill(isEven ? THEME.colors.floorLight : THEME.colors.floorDark);
        graphics.alpha = distanceFactor; // Fake ambient occlusion
        
        graphics.moveTo(pos.x, pos.y);
        graphics.lineTo(pos.x + TILE_WIDTH/2, pos.y + TILE_HEIGHT/2);
        graphics.lineTo(pos.x, pos.y + TILE_HEIGHT);
        graphics.lineTo(pos.x - TILE_WIDTH/2, pos.y + TILE_HEIGHT/2);
        graphics.closePath();
        graphics.endFill();
      }
    }
    layer.addChildAt(graphics, 0);
  };

  const addLightingOverlay = (app: PIXI.Application) => {
    const graphics = new PIXI.Graphics();
    app.stage.addChild(graphics);
    
    const update = () => {
      graphics.clear();
      // Vignette
      const width = app.screen.width;
      const height = app.screen.height;
      const gradientRadius = Math.max(width, height) * 0.8;
      
      graphics.beginFill(0x000000, 0.4);
      graphics.drawCircle(width/2, height/2, gradientRadius);
      graphics.endFill();
      
      // Set blend mode to multiply for darkening effect
      graphics.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    };
    
    update();
    app.renderer.on('resize', update);
  };

  const drawHighlight = (x: number, y: number) => {
    if (!effectsLayerRef.current) return;
    
    let highlight = effectsLayerRef.current.getChildByName('highlight') as PIXI.Graphics;
    if (!highlight) {
      highlight = new PIXI.Graphics();
      highlight.name = 'highlight';
      effectsLayerRef.current.addChild(highlight);
    }

    const pos = gridToScreen(x, y);
    highlight.clear();
    highlight.beginFill(THEME.colors.primary, 0.2);
    highlight.lineStyle(2, THEME.colors.primaryGlow, 0.8);
    highlight.moveTo(pos.x, pos.y);
    highlight.lineTo(pos.x + TILE_WIDTH/2, pos.y + TILE_HEIGHT/2);
    highlight.lineTo(pos.x, pos.y + TILE_HEIGHT);
    highlight.lineTo(pos.x - TILE_WIDTH/2, pos.y + TILE_HEIGHT/2);
    highlight.closePath();
    highlight.endFill();
  };

  const clearHighlight = () => {
    if (!effectsLayerRef.current) return;
    const highlight = effectsLayerRef.current.getChildByName('highlight') as PIXI.Graphics;
    if (highlight) highlight.clear();
  };

  const addEntity = (id: string, type: 'user' | 'furniture', pos: Position, data: any) => {
    if (!entitiesLayerRef.current) return;

    const container = new PIXI.Container();
    
    // Shadow (Soft & Dynamic)
    const shadow = new PIXI.Graphics();
    shadow.beginFill(THEME.colors.shadow, 0.3);
    shadow.drawEllipse(0, 10, 12, 5);
    shadow.blur = 2; // Requires blur filter plugin in v7, simulated here by alpha/shape
    shadow.endFill();
    container.addChild(shadow);

    // Body Group (For animation)
    const bodyGroup = new PIXI.Container();
    container.addChild(bodyGroup);

    if (type === 'user') {
      // Premium Avatar Rendering
      const body = new PIXI.Graphics();
      body.beginFill(data.avatarColor);
      body.drawRoundedRect(-10, -40, 20, 40, 6);
      body.endFill();
      
      const head = new PIXI.Graphics();
      head.beginFill(data.skinColor);
      head.drawCircle(0, -46, 11);
      head.endFill();
      
      const hair = new PIXI.Graphics();
      hair.beginFill(data.avatarColor);
      hair.drawArc(0, -48, 11, Math.PI, 0);
      hair.endFill();

      bodyGroup.addChild(body, head, hair);

      // Name Tag
      const nameText = new PIXI.Text(data.username, {
        fontFamily: 'Inter, sans-serif',
        fontSize: 11,
        fontWeight: 'bold',
        fill: THEME.colors.textLight,
        stroke: 0x000000,
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowDistance: 1,
      });
      nameText.anchor.set(0.5);
      nameText.y = -65;
      container.addChild(nameText);

    } else {
      // Furniture Rendering
      const gfx = new PIXI.Graphics();
      gfx.beginFill(data.color);
      gfx.lineStyle(1, 0xffffff, 0.2);
      const w = (data.w * TILE_WIDTH) / 2;
      const d = (data.d * TILE_HEIGHT) / 2;
      
      gfx.moveTo(-w/2, -data.height);
      gfx.lineTo(w/2, -data.height);
      gfx.lineTo(w, 0);
      gfx.lineTo(0, d);
      gfx.lineTo(-w, 0);
      gfx.closePath();
      gfx.endFill();
      bodyGroup.addChild(gfx);
    }

    entitiesLayerRef.current.addChild(container);
    
    const entity: Entity = { id, type, pos, targetPos: null, data, sprite: container, sortKey: 0 };
    setEntities(prev => {
      const next = new Map(prev).set(id, entity);
      return next;
    });
    
    updateEntitySprite(entity);
  };

  const updateEntitySprite = (entity: Entity) => {
    if (!entity.sprite) return;
    const screen = gridToScreen(entity.pos.x, entity.pos.y, entity.pos.z);
    entity.sprite.x = screen.x;
    entity.sprite.y = screen.y;
    entity.sortKey = screen.y + (entity.data.d ? entity.data.d * TILE_HEIGHT/2 : 0);
  };

  const moveEntity = (id: string, target: Position) => {
    const entity = entities.get(id);
    if (!entity || !entity.sprite) return;
    
    entity.targetPos = target;
    setEntities(prev => {
      const next = new Map(prev).set(id, entity);
      return next;
    });
  };

  const updateEntities = (delta: number) => {
    entities.forEach((entity) => {
      if (!entity.sprite || !entity.targetPos) {
        // Idle Animation
        if (entity.type === 'user' && entity.sprite) {
          const body = entity.sprite.children[1] as PIXI.Container;
          const time = Date.now() * 0.002;
          body.scale.y = 1 + Math.sin(time) * 0.02; // Breathing
          body.scale.x = 1 - Math.sin(time) * 0.02;
        }
        return;
      }

      const currentScreen = gridToScreen(entity.pos.x, entity.pos.y, entity.pos.z);
      const targetScreen = gridToScreen(entity.targetPos.x, entity.targetPos.y, entity.targetPos.z);
      
      const dx = targetScreen.x - currentScreen.x;
      const dy = targetScreen.y - currentScreen.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < 1) {
        entity.pos = { ...entity.targetPos };
        entity.targetPos = null;
        if (entity.sprite) {
          entity.sprite.y = targetScreen.y;
          (entity.sprite.children[1] as PIXI.Container).y = 0; // Reset bob
        }
      } else {
        const speed = 0.15 * delta;
        entity.pos.x += dx * speed;
        entity.pos.y += dy * speed;
        
        // Walking Bob & Squash/Stretch
        if (entity.sprite) {
          entity.sprite.x += dx * speed;
          entity.sprite.y += dy * speed;
          entity.sortKey = entity.sprite.y + (entity.data.d ? entity.data.d * TILE_HEIGHT/2 : 0);
          
          const body = entity.sprite.children[1] as PIXI.Container;
          const step = Date.now() * 0.015;
          body.y = Math.sin(step) * 3;
          body.scale.y = 1 + Math.sin(step * 2) * 0.05;
          body.scale.x = 1 - Math.sin(step * 2) * 0.05;
        }
      }
    });
  };

  const depthSort = () => {
    if (!entitiesLayerRef.current) return;
    const children = entitiesLayerRef.current.children;
    let swapped = true;
    while (swapped) {
      swapped = false;
      for (let i = 0; i < children.length - 1; i++) {
        const a = children[i] as any;
        const b = children[i+1] as any;
        if (a.sortKey > b.sortKey) {
          entitiesLayerRef.current.swapChildren(a, b);
          swapped = true;
        }
      }
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      userId: users[0].id,
      username: users[0].username,
      message: chatInput.trim(),
      timestamp: new Date(),
      type: 'chat'
    };
    
    setMessages(prev => [...prev.slice(-49), msg]);
    
    // Show Bubble (Simulated position for demo)
    const entity = entities.get(users[0].id.toString());
    if (entity && entity.sprite) {
      // In real app, project world coords to screen coords
      setActiveChatBubble({ id: entity.id, text: msg.message, x: 50, y: 40 }); // Center-ish for demo
    }
    
    setChatInput("");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 font-sans select-none">
      {/* Game Canvas */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Chat Bubble Overlay */}
      <AnimatePresence>
        {activeChatBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed z-50 px-4 py-2 bg-white text-slate-900 rounded-2xl font-bold text-sm shadow-xl pointer-events-none whitespace-nowrap"
            style={{ left: '50%', top: '40%', transform: 'translate(-50%, -100%)' }}
          >
            {activeChatBubble.text}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UI Layer */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between pointer-events-none">
        
        {/* Top Bar */}
        <header className="w-full p-4 flex justify-between items-start pointer-events-auto">
          <motion.div 
            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className={`${THEME.ui.glass} px-4 py-2 rounded-2xl flex items-center gap-3`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-inner ring-2 ring-white/20">
              {users[0].username.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight">{users[0].username}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                </span>
                <span>•</span>
                <span>Lounge</span>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`${THEME.ui.glass} px-4 py-2 rounded-2xl flex items-center gap-2 text-amber-400 font-bold border-amber-500/20`}
            >
              <Wallet size={18} className="fill-current" />
              <span>{users[0].gold.toLocaleString()}</span>
            </motion.div>
            
            {[Users, Bell, Settings].map((Icon, i) => (
              <motion.button 
                key={i}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                className={`${THEME.ui.glass} ${THEME.ui.glassHover} p-2.5 rounded-2xl text-slate-300 hover:text-white transition-colors`}
              >
                <Icon size={20} />
              </motion.button>
            ))}
          </div>
        </header>

        {/* Middle Area */}
        <div className="flex-1 flex justify-between items-start p-4">
          {/* Users Panel */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className={`${THEME.ui.glass} w-64 rounded-2xl overflow-hidden hidden md:block`}
          >
            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h2 className="font-bold text-slate-200 flex items-center gap-2">
                <Star size={16} className="text-amber-400 fill-current" />
                Room Users
              </h2>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-slate-300">{users.length}</span>
            </div>
            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto scrollbar-hide">
              {users.map(u => (
                <motion.div 
                  key={u.id} 
                  whileHover={{ scale: 1.02, x: 4 }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full ${u.id === 1 ? 'bg-indigo-500' : 'bg-slate-700'} flex items-center justify-center font-bold text-xs text-white shadow-md group-hover:scale-105 transition-transform`}>
                      {u.username.substring(0, 2).toUpperCase()}
                    </div>
                    {u.isOwner && (
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-slate-900 shadow-sm">
                        <Crown size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                    <p className="text-xs text-slate-500 truncate">{u.gold > 2000 ? 'VIP Member' : 'Explorer'}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Area */}
        <div className="p-4 pb-6 flex flex-col md:flex-row gap-4 items-end justify-center">
          
          {/* Chat Input */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            className={`w-full md:w-1/3 ${THEME.ui.glass} rounded-2xl overflow-hidden flex flex-col h-48`}
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide mask-linear">
              {messages.length === 0 && <div className="text-center text-slate-500 text-sm mt-10 italic">No messages yet. Say hi! 👋</div>}
              {messages.map(m => (
                <motion.div 
                  key={m.id} 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col"
                >
                  <span className="text-xs font-bold text-indigo-400 mr-2">{m.username}</span>
                  <span className="text-sm text-slate-200 drop-shadow-md">{m.message}</span>
                </motion.div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="p-2 bg-black/20 border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className={`flex-1 ${THEME.ui.input} bg-transparent border-none text-white text-sm focus:ring-0 placeholder-slate-500 px-2 rounded-lg`}
                maxLength={200}
              />
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="submit" 
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-500/25"
              >
                <Send size={16} />
              </motion.button>
            </form>
          </motion.div>

          {/* Action Dock */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
            className={`${THEME.ui.glass} p-2 rounded-2xl flex gap-2`}
          >
            {[
              { icon: Home, label: 'Room', color: 'text-emerald-400' },
              { icon: Backpack, label: 'Inv', color: 'text-amber-400' },
              { icon: ShoppingBag, label: 'Shop', color: 'text-pink-400' },
              { icon: Hammer, label: 'Build', color: 'text-blue-400' },
              { icon: Smile, label: 'Emote', color: 'text-purple-400' },
            ].map((action, idx) => (
              <motion.button
                key={idx}
                whileHover={{ y: -5, scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 group border border-white/5 hover:border-white/20"
              >
                <action.icon size={24} className={`${action.color} mb-1 group-hover:scale-110 transition-transform`} />
                <span className="text-[9px] font-medium text-slate-400 group-hover:text-slate-200">{action.label}</span>
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>
      
      {/* Debug/FPS Overlay */}
      <div className="absolute top-4 right-4 text-xs font-mono text-slate-600 pointer-events-none">
        FPS: {fps}
      </div>
    </div>
  );
};

export default UltimateGameClient;
