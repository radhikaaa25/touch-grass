import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface OutdoorItem {
  id?: number | string
  name: string
  location?: string
  latitude?: number
  longitude?: number
  difficulty?: string
  length_km?: number
  distance_km?: number
  has_shade?: number | boolean
  has_restrooms?: number | boolean
  allows_dogs?: number | boolean
  meeting_day?: string
  [key: string]: unknown
}

interface LeafletMapProps {
  items: OutdoorItem[]
  selectedItem: OutdoorItem | null
  onSelectItem: (item: OutdoorItem) => void
  onClearSelection?: () => void
}

function getItemType(item: OutdoorItem): { type: 'trail' | 'park' | 'run_club'; label: string; emoji: string; color: string } {
  if (item.difficulty !== undefined || item.length_km !== undefined || String(item.name).toLowerCase().includes('trail') || String(item.name).toLowerCase().includes('trek')) {
    return { type: 'trail', label: 'Trail / Trek', emoji: '🥾', color: '#10b981' }
  }
  if (item.meeting_day !== undefined || item.distance_km !== undefined || String(item.name).toLowerCase().includes('runner') || String(item.name).toLowerCase().includes('pacers') || String(item.name).toLowerCase().includes('club')) {
    return { type: 'run_club', label: 'Run Club', emoji: '🏃', color: '#f59e0b' }
  }
  return { type: 'park', label: 'Park & Garden', emoji: '🌳', color: '#06b6d4' }
}

export default function LeafletMap({ items, selectedItem, onSelectItem }: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map())
  const [mapStyle, setMapStyle] = useState<'osm' | 'topo' | 'satellite'>('osm')

  // Filter items that actually have valid numeric coordinates
  const validItems = items.filter(
    (item) =>
      typeof item.latitude === 'number' &&
      !isNaN(item.latitude) &&
      typeof item.longitude === 'number' &&
      !isNaN(item.longitude),
  )

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const initialCenter: [number, number] = [20.5937, 78.9629] // Center of India
    const initialZoom = 5

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: false,
    })

    // Custom Zoom Control top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    const layerGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = layerGroup
    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Update Tile Layer when style changes
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Remove existing tile layers
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer)
      }
    })

    let tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    let maxZoom = 19

    if (mapStyle === 'topo') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      attribution = 'Tiles &copy; Esri &mdash; Esri, DeLorme, USGS'
      maxZoom = 18
    } else if (mapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS'
      maxZoom = 18
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom,
    }).addTo(map)
  }, [mapStyle])

  // Plot and update markers
  useEffect(() => {
    const map = mapInstanceRef.current
    const layer = markersLayerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    markersMapRef.current.clear()

    const latLngs: L.LatLngExpression[] = []

    validItems.forEach((item) => {
      const lat = item.latitude!
      const lng = item.longitude!
      latLngs.push([lat, lng])

      const { label, emoji, color } = getItemType(item)
      const isSelected = selectedItem?.name === item.name

      // Custom styled pin using L.divIcon
      const icon = L.divIcon({
        className: 'custom-map-icon',
        html: `
          <div class="map-pin ${isSelected ? 'is-selected' : ''}" style="--pin-color: ${color}">
            <div class="pin-pulse"></div>
            <div class="pin-badge">
              <span>${emoji}</span>
            </div>
            <div class="pin-label">${item.name}</div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      })

      const marker = L.marker([lat, lng], { icon })

      // Create rich popup
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      const difficultyBadge = item.difficulty
        ? `<span class="popup-chip badge-${item.difficulty.toLowerCase()}">${item.difficulty}</span>`
        : ''
      const lengthBadge = item.length_km
        ? `<span class="popup-chip">${item.length_km} km</span>`
        : item.distance_km
        ? `<span class="popup-chip">${item.distance_km} km</span>`
        : ''
      const shadeBadge = item.has_shade ? `<span class="popup-chip">🌳 Shaded</span>` : ''
      const dogBadge = item.allows_dogs ? `<span class="popup-chip">🐕 Dog Friendly</span>` : ''
      const meetingBadge = item.meeting_day ? `<span class="popup-chip">📅 ${item.meeting_day}</span>` : ''

      const popupHtml = `
        <div class="custom-popup-body">
          <div class="popup-category" style="color: ${color}">
            ${emoji} ${label}
          </div>
          <h3 class="popup-title">${item.name}</h3>
          <p class="popup-location">📍 ${item.location || 'India'}</p>
          <div class="popup-badges">
            ${difficultyBadge}
            ${lengthBadge}
            ${shadeBadge}
            ${dogBadge}
            ${meetingBadge}
          </div>
          <div class="popup-actions">
            <a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="popup-btn-nav">
              Get Directions ↗
            </a>
          </div>
        </div>
      `

      marker.bindPopup(popupHtml, {
        className: 'outdoor-popup',
        maxWidth: 280,
      })

      marker.on('click', () => {
        onSelectItem(item)
      })

      marker.addTo(layer)
      markersMapRef.current.set(item.name, marker)
    })

    // Auto-fit bounds
    if (latLngs.length > 1) {
      map.fitBounds(L.latLngBounds(latLngs), {
        padding: [60, 60],
        maxZoom: 12,
      })
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], 12, { animate: true })
    }
  }, [items, selectedItem, mapStyle])

  // Center on selected item if clicked externally
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !selectedItem || selectedItem.latitude === undefined || selectedItem.longitude === undefined) return

    map.flyTo([selectedItem.latitude, selectedItem.longitude], 13, { duration: 1.2 })
    const marker = markersMapRef.current.get(selectedItem.name)
    if (marker) {
      marker.openPopup()
    }
  }, [selectedItem])

  function handleResetView() {
    const map = mapInstanceRef.current
    if (!map) return

    if (validItems.length > 1) {
      const latLngs = validItems.map((i) => [i.latitude!, i.longitude!] as [number, number])
      map.fitBounds(L.latLngBounds(latLngs), { padding: [60, 60], maxZoom: 12 })
    } else if (validItems.length === 1) {
      map.setView([validItems[0].latitude!, validItems[0].longitude!], 12)
    } else {
      map.setView([20.5937, 78.9629], 5)
    }
  }

  return (
    <div className="relative w-full h-full min-h-[460px] md:min-h-[520px] rounded-2xl overflow-hidden border border-moss-700/50 shadow-2xl shadow-black/40 bg-moss-950">
      {/* Map Control Toolbar */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-moss-900/85 backdrop-blur-md border border-moss-600/30 px-3 py-1.5 rounded-xl shadow-lg text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Interactive Outdoor Map
        </span>
        <span className="text-moss-500">|</span>
        <span className="text-moss-300 font-mono">
          {validItems.length} {validItems.length === 1 ? 'spot' : 'spots'} mapped
        </span>
      </div>

      {/* Map Style Selector & Reset View */}
      <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2">
        <div className="flex items-center bg-moss-900/85 backdrop-blur-md border border-moss-600/30 p-1 rounded-xl shadow-lg text-xs">
          <button
            type="button"
            onClick={() => setMapStyle('osm')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              mapStyle === 'osm'
                ? 'bg-emerald-600 text-white font-medium shadow'
                : 'text-moss-300 hover:text-white'
            }`}
          >
            🌿 Outdoor
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('topo')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              mapStyle === 'topo'
                ? 'bg-emerald-600 text-white font-medium shadow'
                : 'text-moss-300 hover:text-white'
            }`}
          >
            🏔️ Topo
          </button>
          <button
            type="button"
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              mapStyle === 'satellite'
                ? 'bg-emerald-600 text-white font-medium shadow'
                : 'text-moss-300 hover:text-white'
            }`}
          >
            🛰️ Satellite
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetView}
          title="Reset map view to fit all spots"
          className="bg-moss-900/85 hover:bg-moss-800 backdrop-blur-md border border-moss-600/30 text-moss-200 hover:text-white px-3 py-1.5 rounded-xl shadow-lg text-xs font-medium transition-all"
        >
          🎯 Fit All
        </button>
      </div>

      {/* Leaflet DOM container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] md:min-h-[520px]" />
    </div>
  )
}
