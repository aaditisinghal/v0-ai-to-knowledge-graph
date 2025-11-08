"use client"

import { useRef, useState } from "react"
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import * as THREE from "three"

interface GraphNode {
  id: string
  label: string
  type: string
  position: [number, number, number]
  description?: string
}

interface GraphEdge {
  source: string
  target: string
  label: string
}

interface KnowledgeGraph3DProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeSelect?: (nodeId: string | null, relationships: { incoming: GraphEdge[]; outgoing: GraphEdge[] }) => void
}

const typeColors: Record<string, string> = {
  person: "#f59e0b", // amber
  place: "#10b981", // emerald
  concept: "#8b5cf6", // violet
  organization: "#3b82f6", // blue
  event: "#ec4899", // pink
  technology: "#06b6d4", // cyan
  date: "#f97316", // orange
  product: "#a855f7", // purple
  other: "#64748b", // slate
}

function Node({ node, isSelected, onClick }: { node: GraphNode; isSelected: boolean; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = typeColors[node.type] || typeColors.other
  const size = isSelected ? 0.5 : hovered ? 0.45 : 0.4

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003
      meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 0.5 + node.position[0]) * 0.001
    }
  })

  return (
    <group position={node.position}>
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = "pointer"
        }}
        onPointerOut={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation()
          setHovered(false)
          document.body.style.cursor = "default"
        }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.8 : hovered ? 0.6 : 0.4}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <Html distanceFactor={10} position={[0, size + 0.4, 0]} center>
        <div
          className={`bg-card/95 backdrop-blur-sm px-2.5 py-1.5 rounded-md text-xs text-foreground whitespace-nowrap border max-w-[140px] shadow-lg ${isSelected ? "border-primary ring-2 ring-primary/50" : "border-border/50"}`}
        >
          <div className="font-semibold truncate">{node.label}</div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-muted-foreground capitalize">{node.type}</span>
          </div>
          {node.description && (
            <div className="text-muted-foreground text-[10px] mt-0.5 max-w-[130px] truncate">{node.description}</div>
          )}
        </div>
      </Html>
    </group>
  )
}

function Edge({ edge, nodes }: { edge: GraphEdge; nodes: GraphNode[] }) {
  const lineRef = useRef<THREE.Line>(null)

  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)

  if (!sourceNode || !targetNode) return null

  const start = new THREE.Vector3(...sourceNode.position)
  const end = new THREE.Vector3(...targetNode.position)
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)

  const points = [start, end]
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <>
      <line ref={lineRef}>
        <bufferGeometry attach="geometry" {...lineGeometry} />
        <lineBasicMaterial attach="material" color="#60a5fa" transparent opacity={0.4} linewidth={2} />
      </line>
      <Html position={[midpoint.x, midpoint.y, midpoint.z]} center distanceFactor={12}>
        <div className="bg-secondary/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] text-secondary-foreground whitespace-nowrap border border-border/30">
          {edge.label}
        </div>
      </Html>
    </>
  )
}

function Scene({ nodes, edges, onNodeSelect }: KnowledgeGraph3DProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0008
    }
  })

  if (nodes.length === 0) return null

  const handleNodeClick = (nodeId: string) => {
    const newSelectedId = selectedNodeId === nodeId ? null : nodeId
    setSelectedNodeId(newSelectedId)

    if (newSelectedId && onNodeSelect) {
      const incoming = edges.filter((e) => e.target === newSelectedId)
      const outgoing = edges.filter((e) => e.source === newSelectedId)
      onNodeSelect(newSelectedId, { incoming, outgoing })
    } else if (onNodeSelect) {
      onNodeSelect(null, { incoming: [], outgoing: [] })
    }
  }

  return (
    <group ref={groupRef}>
      {edges.length > 0 &&
        edges.map((edge, i) => <Edge key={`edge-${i}-${edge.source}-${edge.target}`} edge={edge} nodes={nodes} />)}
      {nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          onClick={() => handleNodeClick(node.id)}
        />
      ))}
    </group>
  )
}

export default function KnowledgeGraph3D({ nodes, edges, onNodeSelect }: KnowledgeGraph3DProps) {
  return (
    <Canvas camera={{ position: [0, 5, 15], fov: 60 }} className="bg-transparent">
      <color attach="background" args={["#0a0a0a"]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, -10, -10]} intensity={0.6} color="#60a5fa" />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#a78bfa" />
      <Scene nodes={nodes} edges={edges} onNodeSelect={onNodeSelect} />
      <OrbitControls enableDamping dampingFactor={0.05} enableZoom enablePan minDistance={5} maxDistance={30} />
      <gridHelper args={[30, 30, "#1e293b", "#0f172a"]} />
    </Canvas>
  )
}

export { typeColors }
