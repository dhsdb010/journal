import { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { X } from 'lucide-react';

// Textures from a stable public source (Wikimedia Commons / Solar System Scope mirrors)
const TEXTURES = {
    sun: "https://upload.wikimedia.org/wikipedia/commons/9/99/Map_of_the_full_sun.jpg",
    mercury: "https://upload.wikimedia.org/wikipedia/commons/3/30/Mercury_Coloris_Basin.jpg",
    venus: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Venus-real_color.jpg",
    earth: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Earth_Day_Map.jpg",
    mars: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg",
    jupiter: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg",
    saturn: "https://upload.wikimedia.org/wikipedia/commons/b/b4/Saturn_%28planet%29_large.jpg",
    uranus: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg",
    neptune: "https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg",
    moon: "https://upload.wikimedia.org/wikipedia/commons/d/db/Moon_map_Mercator_projection_JAXA_SELENE.jpg",
    saturnRing: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Saturn_rings_propeller_belts_%28PIA09860%29.jpg/1024px-Saturn_rings_propeller_belts_%28PIA09860%29.jpg"
};

// Fallback sphere geometry for reuse
const SphereGeo = new THREE.SphereGeometry(1, 64, 64);

interface PlanetProps {
    name: string;
    size: number;
    distance: number;
    speed: number;
    textureUrl: string;
    children?: React.ReactNode;
    orbitColor?: string;
    onPlanetClick?: () => void;
    hasRing?: boolean;
}

const Planet = ({ name, size, distance, speed, textureUrl, children, orbitColor = "#666", onPlanetClick, hasRing }: PlanetProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const orbitRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [ringTexture, setRingTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = "anonymous";

        if (textureUrl) {
            loader.load(
                textureUrl,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    setTexture(tex);
                },
                undefined,
                (err) => console.warn(`Failed to load texture for ${name}:`, err)
            );
        }

        if (hasRing) {
            loader.load(
                TEXTURES.saturnRing,
                (tex) => {
                    tex.colorSpace = THREE.SRGBColorSpace;
                    setRingTexture(tex);
                },
                undefined,
                (err) => console.warn(`Failed to load ring texture for ${name}`, err)
            );
        }
    }, [textureUrl, hasRing, name]);


    useFrame(({ clock }) => {
        if (orbitRef.current) {
            orbitRef.current.rotation.y = clock.getElapsedTime() * speed * 0.1;
        }
        if (meshRef.current) {
            meshRef.current.rotation.y += 0.005; // Self rotation
        }
    });

    // Calculate fallbacks
    const fallbackColor = name === "Sun" ? "#FDB813" :
        name === "Earth" ? "#4B70DD" :
            name === "Mars" ? "#E27B58" :
                "#888888";

    return (
        <group>
            {/* Orbit Path */}
            {distance > 0 && (
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[distance - 0.05, distance + 0.05, 128]} />
                    <meshBasicMaterial color={orbitColor} opacity={0.15} transparent side={THREE.DoubleSide} />
                </mesh>
            )}

            {/* Planet Group (Rotates around Sun) */}
            <group ref={orbitRef}>
                <group position={[distance, 0, 0]}>
                    {/* Planet Mesh */}
                    <mesh
                        ref={meshRef}
                        geometry={SphereGeo}
                        scale={[size, size, size]}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPlanetClick?.();
                        }}
                        onPointerOver={() => setHovered(true)}
                        onPointerOut={() => setHovered(false)}
                    >
                        <meshStandardMaterial
                            map={texture}
                            color={!texture ? fallbackColor : undefined}
                            emissive={name === "Sun" ? new THREE.Color(0xffaa00) : new THREE.Color(0x000000)}
                            emissiveIntensity={name === "Sun" ? 0.5 : 0}
                            metalness={0.1}
                            roughness={0.5}
                        />
                        {name !== "Sun" && hovered && (
                            <Html distanceFactor={15}>
                                <div className="bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap border border-white/20 backdrop-blur-md shadow-xl -translate-y-8">
                                    {name}
                                </div>
                            </Html>
                        )}
                    </mesh>

                    {/* Rings (Saturn) */}
                    {hasRing && ringTexture ? (
                        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
                            <ringGeometry args={[size * 1.4, size * 2.2, 64]} />
                            <meshStandardMaterial map={ringTexture} opacity={0.8} transparent side={THREE.DoubleSide} />
                        </mesh>
                    ) : hasRing && (
                        // Fallback Ring
                        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
                            <ringGeometry args={[size * 1.4, size * 2.2, 64]} />
                            <meshStandardMaterial color="#C5AB6E" opacity={0.5} transparent side={THREE.DoubleSide} />
                        </mesh>
                    )}

                    {children}
                </group>
            </group>
        </group>
    );
};

export function SolarSystem({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-700">
            <div className="absolute top-6 left-6 z-10 pointer-events-none">
                <h1 className="text-4xl font-bold tracking-[0.2em] text-white/90 drop-shadow-lg">SOLAR SYSTEM</h1>
                <p className="text-sm text-cyan-400 font-mono mt-1 tracking-wider uppercase">Interactive Orbit Map</p>
            </div>

            <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all hover:scale-110 backdrop-blur-md border border-white/10"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-white/40 text-xs font-mono tracking-widest pointer-events-none">
                SCROLL TO ZOOM • DRAG TO ROTATE
            </div>

            <Canvas camera={{ position: [0, 40, 50], fov: 45 }}>
                <color attach="background" args={['#000000']} />

                {/* Cinematic Lighting */}
                <ambientLight intensity={0.05} /> {/* Dark ambient for contrast */}
                <pointLight position={[0, 0, 0]} intensity={3} distance={500} decay={1} color="#xffaa00" /> {/* Sun Light */}

                <Stars radius={300} depth={100} count={7000} factor={6} saturation={0} fade speed={0.5} />

                {/* Sun */}
                <Planet name="Sun" size={6} distance={0} speed={0} textureUrl={TEXTURES.sun}>
                    {/* Mercury */}
                    <Planet name="Mercury" size={0.5} distance={8} speed={4} textureUrl={TEXTURES.mercury} />

                    {/* Venus */}
                    <Planet name="Venus" size={1.2} distance={13} speed={3} textureUrl={TEXTURES.venus} />

                    {/* Earth System */}
                    <Planet name="Earth" size={1.3} distance={20} speed={2} textureUrl={TEXTURES.earth}>
                        {/* Moon */}
                        <Planet name="Moon" size={0.35} distance={3} speed={8} orbitColor="#444" textureUrl={TEXTURES.moon} />
                    </Planet>

                    {/* Mars */}
                    <Planet name="Mars" size={0.7} distance={28} speed={1.5} textureUrl={TEXTURES.mars} />

                    {/* Jupiter */}
                    <Planet name="Jupiter" size={4} distance={42} speed={0.8} textureUrl={TEXTURES.jupiter} />

                    {/* Saturn */}
                    <Planet name="Saturn" size={3.5} distance={58} speed={0.5} textureUrl={TEXTURES.saturn} hasRing={true} />

                    {/* Uranus */}
                    <Planet name="Uranus" size={2} distance={72} speed={0.3} textureUrl={TEXTURES.uranus} />

                    {/* Neptune */}
                    <Planet name="Neptune" size={2} distance={85} speed={0.2} textureUrl={TEXTURES.neptune} />
                </Planet>

                <OrbitControls
                    enablePan={false}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={10}
                    maxDistance={200}
                />
            </Canvas>
        </div>
    );
}
