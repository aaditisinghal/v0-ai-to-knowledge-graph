"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import KnowledgeGraph3D, { typeColors } from "@/components/knowledge-graph-3d"
import { Sparkles, Network, RotateCcw, Loader2 } from "lucide-react"
import { generateKnowledgeGraph, type Entity, type Relationship } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"

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

export default function KnowledgeGraphDashboard() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [graphKey, setGraphKey] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedNode, setSelectedNode] = useState<{
    node: GraphNode
    relationships: { incoming: GraphEdge[]; outgoing: GraphEdge[] }
  } | null>(null)
  const { toast } = useToast()

  const handleGenerateGraph = async () => {
    if (!question.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question first",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const graphData = await generateKnowledgeGraph(question)
      setAnswer(graphData.answer)

      const newNodes: GraphNode[] = graphData.entities.map((entity: Entity, index: number) => {
        const totalEntities = graphData.entities.length
        const angle = (index / totalEntities) * Math.PI * 2
        const radius = 4 + Math.random() * 2
        const height = (Math.random() - 0.5) * 3

        return {
          id: entity.id,
          label: entity.name,
          type: entity.type,
          position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
          description: entity.description,
        }
      })

      const newEdges: GraphEdge[] = graphData.relationships.map((rel: Relationship) => ({
        source: rel.source,
        target: rel.target,
        label: rel.label,
      }))

      setNodes(newNodes)
      setEdges(newEdges)

      toast({
        title: "Knowledge graph generated",
        description: `Extracted ${newNodes.length} entities and ${newEdges.length} relationships`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate knowledge graph",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNodeSelect = (nodeId: string | null, relationships: { incoming: GraphEdge[]; outgoing: GraphEdge[] }) => {
    if (nodeId) {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) {
        setSelectedNode({ node, relationships })
      }
    } else {
      setSelectedNode(null)
    }
  }

  const resetGraph = () => {
    setNodes([])
    setEdges([])
    setGraphKey((prev) => prev + 1)
    setQuestion("")
    setAnswer("")
    setSelectedNode(null)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-balance flex items-center gap-2">
              <Network className="h-8 w-8 text-primary" />
              Neural Knowledge Graph
            </h1>
            <p className="text-muted-foreground">Transform AI conversations into 3D knowledge networks</p>
          </div>
          <Badge variant="outline" className="gap-1.5 px-3 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            {nodes.length} Entities
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input Panel */}
          <Card className="p-6 space-y-4 border-border/50 bg-card/50 backdrop-blur">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Question</label>
              <Textarea
                placeholder="What is the relationship between Einstein and quantum mechanics?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[120px] resize-none bg-background/50"
                disabled={isLoading}
              />
            </div>

            <Button onClick={handleGenerateGraph} className="w-full gap-2" disabled={!question.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Knowledge Graph
                </>
              )}
            </Button>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">AI Response</label>
              <Textarea
                placeholder="AI response and extracted knowledge will appear here..."
                value={answer}
                readOnly
                className="min-h-[200px] resize-none bg-background/50"
              />
            </div>

            <Button onClick={resetGraph} variant="outline" className="w-full gap-2 bg-transparent" disabled={isLoading}>
              <RotateCcw className="h-4 w-4" />
              Reset Graph
            </Button>

            <div className="pt-4 border-t border-border/50 space-y-2">
              <p className="text-xs text-muted-foreground">Graph Statistics</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">Entities</p>
                  <p className="text-2xl font-bold text-primary">{nodes.length}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">Relations</p>
                  <p className="text-2xl font-bold text-secondary">{edges.length}</p>
                </div>
              </div>
            </div>

            {nodes.length > 0 && (
              <div className="pt-4 border-t border-border/50 space-y-3">
                <p className="text-xs font-medium text-foreground">Entity Categories</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(
                    nodes.reduce(
                      (acc, node) => {
                        acc[node.type] = (acc[node.type] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>,
                    ),
                  ).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center gap-2 rounded-md bg-background/50 px-2 py-1.5 border border-border/30"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: typeColors[type] || typeColors.other }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium capitalize truncate">{type}</p>
                        <p className="text-[10px] text-muted-foreground">{count} nodes</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* 3D Visualization */}
          <Card className="lg:col-span-2 relative overflow-hidden border-border/50 bg-card/30 backdrop-blur">
            <div className="h-[600px] w-full">
              <KnowledgeGraph3D key={graphKey} nodes={nodes} edges={edges} onNodeSelect={handleNodeSelect} />
            </div>

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Network className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                  <p className="text-muted-foreground text-sm">
                    Enter a question to generate an AI-powered knowledge graph
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {selectedNode && (
          <Card className="p-6 border-border/50 bg-card/50 backdrop-blur animate-in slide-in-from-bottom-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: typeColors[selectedNode.node.type] || typeColors.other }}
                    />
                    <h3 className="text-xl font-semibold text-foreground">{selectedNode.node.label}</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selectedNode.node.type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNode(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </Button>
              </div>

              {selectedNode.node.description && (
                <p className="text-sm text-muted-foreground">{selectedNode.node.description}</p>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    Outgoing Relations ({selectedNode.relationships.outgoing.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedNode.relationships.outgoing.length > 0 ? (
                      selectedNode.relationships.outgoing.map((edge, i) => {
                        const targetNode = nodes.find((n) => n.id === edge.target)
                        return (
                          <div key={i} className="text-xs bg-background/50 rounded p-2 border border-border/30">
                            <span className="text-primary font-medium">{edge.label}</span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="text-foreground">{targetNode?.label}</span>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground">No outgoing relations</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    Incoming Relations ({selectedNode.relationships.incoming.length})
                  </h4>
                  <div className="space-y-1.5">
                    {selectedNode.relationships.incoming.length > 0 ? (
                      selectedNode.relationships.incoming.map((edge, i) => {
                        const sourceNode = nodes.find((n) => n.id === edge.source)
                        return (
                          <div key={i} className="text-xs bg-background/50 rounded p-2 border border-border/30">
                            <span className="text-foreground">{sourceNode?.label}</span>
                            <span className="text-muted-foreground"> → </span>
                            <span className="text-primary font-medium">{edge.label}</span>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground">No incoming relations</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
