"use client"

import { useEffect, useRef, useState } from 'react'
import { Network } from 'vis-network'

interface PlayerNetworkGraphProps {
  allOpponentPairs: Array<{
    pair: string;
    count: number;
  }>;
  allPlayers: string[];
}

export default function PlayerNetworkGraph({ 
  allOpponentPairs, 
  allPlayers 
}: PlayerNetworkGraphProps) {
  const networkRef = useRef<HTMLDivElement>(null)
  const networkInstance = useRef<Network | null>(null)
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string }>({
    visible: false,
    x: 0,
    y: 0,
    text: ''
  })

  useEffect(() => {
    if (!networkRef.current) return

    // Define colors for each player
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4',
      '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#a78bfa',
      '#fbbf24', '#34d399', '#f87171', '#60a5fa', '#a3e635', '#fde047',
      '#c084fc', '#22d3ee', '#86efac', '#fbbf24', '#fb7185', '#a78bfa'
    ]

    // Create nodes for all players with unique colors
    const nodes = allPlayers.map((player, index) => ({
      id: player,
      label: '', // No labels inside nodes
      title: player, // Show player name on hover
      color: {
        background: colors[index % colors.length],
        border: '#1f2937',
        highlight: {
          background: colors[index % colors.length],
          border: '#374151'
        }
      },
      shape: 'circle',
      size: 75 // 3x larger (25 * 3 = 75)
    }))

    // Create edges for played together
    const playedEdges = allOpponentPairs.map(opponent => {
      const [player1, player2] = opponent.pair.split(' & ')
      const maxGames = Math.max(...allOpponentPairs.map(o => o.count))
      const thickness = Math.max(1, (opponent.count / maxGames) * 18) // Scale thickness 1-18px (3x variation)
      
      // Calculate attraction strength based on game count
      // More games = stronger attraction = shorter spring length
      const baseSpringLength = 500
      const minSpringLength = 100
      const springLength = Math.max(minSpringLength, baseSpringLength - (opponent.count / maxGames) * (baseSpringLength - minSpringLength))
      
      // Calculate spring constant (higher = stronger attraction)
      const baseSpringConstant = 0.02
      const maxSpringConstant = 0.1
      const springConstant = baseSpringConstant + (opponent.count / maxGames) * (maxSpringConstant - baseSpringConstant)
      
      return {
        from: player1,
        to: player2,
        width: thickness,
        color: {
          color: '#10b981',
          highlight: '#34d399',
          hover: '#6ee7b7'
        },
        label: opponent.count > 5 ? `${opponent.count}` : '', // Only show labels for frequent pairs
        font: {
          color: '#374151',
          size: 10
        },
        springLength: springLength, // Shorter for more frequent pairs
        springConstant: springConstant // Higher for more frequent pairs
      }
    })

    const edges = playedEdges

    const data = { nodes, edges }

    const options = {
      nodes: {
        borderWidth: 2,
        shadow: true
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          forceDirection: 'none',
          roundness: 0.2
        }
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 200 },
        barnesHut: {
          gravitationalConstant: -8000, // Strong repulsion to keep nodes apart
          centralGravity: 0.02, // Very low central gravity
          springLength: 300, // Base spring length (edges will override this)
          springConstant: 0.05, // Base spring constant (edges will override this)
          damping: 0.2 // Higher damping for stability with variable forces
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        hoverConnectedEdges: true
      }
    }

    // Clean up previous instance
    if (networkInstance.current) {
      networkInstance.current.destroy()
    }

    // Create new network
    networkInstance.current = new Network(networkRef.current, data, options)

    // Add custom hover event handlers
    networkInstance.current.on('hoverNode', (params) => {
      const nodeId = params.node
      const playerName = allPlayers.find(player => player === nodeId)
      if (playerName && networkRef.current) {
        const rect = networkRef.current.getBoundingClientRect()
        // Convert viewport coordinates to container-relative coordinates
        setTooltip({
          visible: true,
          x: (params.event.clientX || 0) - rect.left,
          y: (params.event.clientY || 0) - rect.top - 20,
          text: playerName
        })
      }
    })

    networkInstance.current.on('blurNode', () => {
      setTooltip(prev => ({ ...prev, visible: false }))
    })

    // Cleanup on unmount
    return () => {
      if (networkInstance.current) {
        networkInstance.current.destroy()
      }
    }
  }, [allOpponentPairs, allPlayers])

  // Define colors for the legend (same as in useEffect)
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4',
    '#84cc16', '#f97316', '#ec4899', '#6366f1', '#14b8a6', '#a78bfa',
    '#fbbf24', '#34d399', '#f87171', '#60a5fa', '#a3e635', '#fde047',
    '#c084fc', '#22d3ee', '#86efac', '#fbbf24', '#fb7185', '#a78bfa'
  ]

  return (
    <div className="w-full relative">
      <div className="w-full h-96 border rounded-lg bg-white">
        <div ref={networkRef} className="w-full h-full" />
      </div>
      
      {/* Custom Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute z-50 px-2 py-1 bg-gray-900 text-white text-sm rounded shadow-lg pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.text}
        </div>
      )}
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
        {allPlayers.map((player, index) => (
          <div key={player} className="flex items-center space-x-2 text-sm">
            <div 
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-gray-700 truncate">{player}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
