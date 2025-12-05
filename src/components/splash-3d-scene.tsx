"use client";

import React, { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, PerspectiveCamera, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// Floating particles that drift gently
function Particles({ count = 50 }: { count?: number }) {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            temp.push({
                position: [
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 10 - 5
                ],
                speed: 0.2 + Math.random() * 0.5,
                scale: 0.02 + Math.random() * 0.04,
                offset: Math.random() * Math.PI * 2
            });
        }
        return temp;
    }, [count]);

    useFrame((state) => {
        if (!mesh.current) return;
        const t = state.clock.getElapsedTime();

        particles.forEach((particle, i) => {
            const { position, speed, scale, offset } = particle;
            dummy.position.set(
                position[0] + Math.sin(t * speed + offset) * 0.5,
                position[1] + Math.cos(t * speed * 0.7 + offset) * 0.3,
                position[2]
            );
            dummy.scale.setScalar(scale * (1 + Math.sin(t * 2 + offset) * 0.2));
            dummy.updateMatrix();
            mesh.current!.setMatrixAt(i, dummy.matrix);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.6} />
        </instancedMesh>
    );
}

// Glowing orb with pulsing emissive light
function GlowingOrb({ position, color, size = 0.3, pulseSpeed = 1 }: any) {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current || !glowRef.current) return;
        const t = state.clock.getElapsedTime();
        const pulse = 0.8 + Math.sin(t * pulseSpeed) * 0.2;

        meshRef.current.scale.setScalar(size * pulse);
        glowRef.current.scale.setScalar(size * pulse * 2.5);

        // Update emissive intensity
        const material = meshRef.current.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 0.5 + Math.sin(t * pulseSpeed) * 0.3;
    });

    return (
        <group position={position}>
            {/* Core orb */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.5}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>
            {/* Outer glow */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={0.15}
                    side={THREE.BackSide}
                />
            </mesh>
        </group>
    );
}

// Mouse-reactive floating shape
function FloatingShape({ position, color, speed, rotationIntensity, floatIntensity, geometry = "icosahedron" }: any) {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const { pointer } = useThree();

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();

        // Base rotation
        meshRef.current.rotation.x = Math.cos(t / 4) * Math.PI / 8;
        meshRef.current.rotation.y = Math.sin(t / 4) * Math.PI / 8;
        meshRef.current.rotation.z = (1 + Math.sin(t / 1.5)) / 20;

        // Mouse reactivity - subtle movement towards cursor
        const mouseInfluence = 0.3;
        meshRef.current.position.x = position[0] + pointer.x * mouseInfluence;
        meshRef.current.position.y = position[1] + pointer.y * mouseInfluence;

        // Scale pulse on hover
        const targetScale = hovered ? 1.15 : 1;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    });

    const GeometryComponent = useMemo(() => {
        switch (geometry) {
            case "torus":
                return <torusGeometry args={[0.7, 0.3, 16, 32]} />;
            case "octahedron":
                return <octahedronGeometry args={[1, 0]} />;
            case "tetrahedron":
                return <tetrahedronGeometry args={[1, 0]} />;
            case "dodecahedron":
                return <dodecahedronGeometry args={[0.8, 0]} />;
            default:
                return <icosahedronGeometry args={[1, 0]} />;
        }
    }, [geometry]);

    return (
        <Float
            speed={speed}
            rotationIntensity={rotationIntensity}
            floatIntensity={floatIntensity}
        >
            <mesh
                ref={meshRef}
                position={position}
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
            >
                {GeometryComponent}
                <meshPhysicalMaterial
                    color={color}
                    roughness={0.1}
                    metalness={0.1}
                    transmission={0.6}
                    thickness={1.5}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    envMapIntensity={1.5}
                />
            </mesh>
        </Float>
    );
}

// Gradient background sphere
function BackgroundSphere() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.y = t * 0.02;
        meshRef.current.rotation.z = Math.sin(t * 0.1) * 0.1;
    });

    return (
        <mesh ref={meshRef} position={[0, 0, -15]} scale={30}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial
                color="#1a1a2e"
                side={THREE.BackSide}
                transparent
                opacity={0.4}
            />
        </mesh>
    );
}

function Scene() {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
            <ambientLight intensity={0.4} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.2} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.4} color="#a78bfa" />
            <pointLight position={[10, -5, 5]} intensity={0.3} color="#60a5fa" />

            {/* Background elements */}
            <BackgroundSphere />
            <Particles count={60} />

            {/* Glowing orbs */}
            <GlowingOrb position={[-4, 3, -3]} color="#f472b6" size={0.2} pulseSpeed={1.2} />
            <GlowingOrb position={[4, -2, -4]} color="#60a5fa" size={0.15} pulseSpeed={0.8} />
            <GlowingOrb position={[0, -3, -2]} color="#34d399" size={0.18} pulseSpeed={1.5} />

            {/* Floating shapes with varied geometries */}
            <group position={[0, 0, 0]}>
                <FloatingShape
                    position={[-2, 1, 0]}
                    color="#a78bfa"
                    speed={1.5}
                    rotationIntensity={1}
                    floatIntensity={2}
                    geometry="icosahedron"
                />
                <FloatingShape
                    position={[2.5, -1, -1]}
                    color="#60a5fa"
                    speed={2}
                    rotationIntensity={1.5}
                    floatIntensity={1.5}
                    geometry="torus"
                />
                <FloatingShape
                    position={[0, 2.5, -2]}
                    color="#f472b6"
                    speed={1}
                    rotationIntensity={0.5}
                    floatIntensity={2.5}
                    geometry="octahedron"
                />
                <FloatingShape
                    position={[-3.5, -2, -3]}
                    color="#34d399"
                    speed={1.2}
                    rotationIntensity={2}
                    floatIntensity={1}
                    geometry="dodecahedron"
                />
                <FloatingShape
                    position={[3.5, 2.5, -4]}
                    color="#fbbf24"
                    speed={1.8}
                    rotationIntensity={1}
                    floatIntensity={2}
                    geometry="tetrahedron"
                />
            </group>

            <ContactShadows position={[0, -4.5, 0]} opacity={0.3} scale={20} blur={2.5} far={4.5} />
            <Environment preset="city" />
        </>
    );
}

export function Splash3DScene() {
    return (
        <div className="absolute inset-0 -z-10">
            <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
                <Scene />
            </Canvas>
        </div>
    );
}
