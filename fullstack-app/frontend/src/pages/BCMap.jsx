// BCMap_Enhanced.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const API_URL = 'http://127.0.0.1:8000/api';

// Tighter bounds that focus on your actual locations
const BC_CENTER = [42.3365, -71.170];
const BC_BOUNDS = [
  [42.3320, -71.1775],  // Southwest corner
  [42.3410, -71.1640],  // Northeast corner
];

const BC_LOCATIONS = [
  { name: 'Claver Hall', coords: [42.333147687075574, -71.1761562920212] },
  { name: 'Xavier Hall', coords: [42.333661666021186, -71.175857647586532] },
  { name: 'Loyola Hall', coords: [42.333437447534564, -71.1759976371653] },
  { name: 'Fenwick Hall', coords: [42.334320518794854, -71.17572232432707] },
  { name: 'Cheverus Hall', coords: [42.334375710339444, -71.17517169866777] },
  { name: 'Kostka Hall', coords: [42.33322012731801, -71.17444375285824] },
  { name: 'Welch Hall', coords: [42.33397212107015, -71.17326784039668] },
  { name: 'Roncalli Hall', coords: [42.333627170923954, -71.17299719387776] },
  { name: 'Gabelli Hall', coords: [42.3387723149792, -71.16945064908424] },
  { name: 'Stayer Hall', coords: [42.33881830221958, -71.16625984869545] },
  { name: '90 St. Thomas More', coords: [42.33866802694776, -71.16813114310135] },
  { name: 'Ignacio Hall', coords: [42.337790010392375, -71.16986945676592] },
  { name: 'Rubenstein Hall', coords: [42.33826431591039, -71.16971055902336] },
  { name: 'Voute Hall', coords: [42.33811149358272, -71.17057820822723] },
  { name: 'The Mods', coords: [42.33782434929166, -71.16655997605928] },
  { name: 'Thomas More Apartments', coords: [42.339414577535436, -71.16489182033531] },
  { name: 'Walsh Hall', coords: [42.338362951162125, -71.1653338344307] },
];

const EventIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -34],
});

// No custom SmartPopup needed - using standard Popup with safe settings

function HeatmapLayer({ points, options = {} }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points.length) return;
    let cancelled = false;
    let heatLayer;

    const initLayer = () => {
      if (cancelled) return;
      const { clientHeight, clientWidth } = map.getContainer();
      if (!clientHeight || !clientWidth) {
        setTimeout(initLayer, 300);
        return;
      }
      try {
        heatLayer = L.heatLayer(points, {
          radius: 25,
          blur: 18,
          maxZoom: 17,
          minOpacity: 0.4,
          gradient: {
            0.2: '#69b3ff',
            0.4: '#00ffb3',
            0.7: '#ffaa00',
            1.0: '#ff0000',
          },
          ...options,
        }).addTo(map);
      } catch (err) {
        console.error('Heat layer error:', err);
      }
    };

    map.whenReady(initLayer);
    return () => {
      cancelled = true;
      if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
    };
  }, [map, points, options]);

  return null;
}

function MapBounds({ locations }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !locations.length) return;
    const bounds = L.latLngBounds(locations.map(l => l.coords));
    // Fit bounds with padding to ensure all locations are visible
    map.fitBounds(bounds, { 
      padding: [50, 50],
      maxZoom: 16 
    });
  }, [map, locations]);
  return null;
}

export default function BCMap() {
  const [events, setEvents] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [filteredEvents, setFilteredEvents] = useState([]);

  // Filter events to only show those in the next 24 hours
  const filterNext24Hours = (eventsList) => {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return eventsList.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate >= now && eventDate <= next24Hours;
    });
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/events`);
        const data = await res.json();
        const allEvents = Array.isArray(data) ? data : data.events || [];
        setEvents(allEvents);
        
        // Filter to next 24 hours
        const upcoming = filterNext24Hours(allEvents);
        setFilteredEvents(upcoming);
        
        // AI Use Case: Fetch smart suggestions and success predictions
        try {
          const aiRes = await fetch(`${API_URL}/ai/event-insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ events: upcoming })
          });
          const insights = await aiRes.json();
          setAiSuggestions(insights);
        } catch (err) {
          console.log('AI suggestions unavailable');
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 120000);
    return () => clearInterval(interval);
  }, []);

  const heatPoints = filteredEvents
    .map(e => {
      const loc = BC_LOCATIONS.find(l => l.name.toLowerCase() === (e.location || '').toLowerCase());
      if (!loc) return null;
      const intensity = Math.max(0.2, Math.min(1.0, (e.rsvp_count || 0) / (e.max_capacity || 50)));
      return [...loc.coords, intensity];
    })
    .filter(Boolean);

  // Group events by location for better display
  const eventsByLocation = filteredEvents.reduce((acc, event) => {
    const loc = BC_LOCATIONS.find(l =>
      (event.location || '').toLowerCase().includes(l.name.toLowerCase())
    );
    if (loc) {
      if (!acc[loc.name]) acc[loc.name] = [];
      acc[loc.name].push(event);
    }
    return acc;
  }, {});

  return (
    <div style={{ height: '90vh', width: '100%', position: 'relative' }}>
      {/* 24-Hour Event Header */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '12px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px' }}>⏰</span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>
              Next 24 Hours
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} happening now through {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {aiSuggestions && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxWidth: '320px',
        }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600 }}>
            🤖 AI Insights
          </h4>
          
          {/* Success Predictions */}
          {aiSuggestions.successPredictions && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#555' }}>
                Event Success Predictions:
              </div>
              {aiSuggestions.successPredictions.map((pred, idx) => (
                <div key={idx} style={{
                  fontSize: '11px',
                  padding: '6px 8px',
                  marginBottom: '4px',
                  background: pred.score > 80 ? '#d4edda' : pred.score > 60 ? '#fff3cd' : '#f8d7da',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${pred.score > 80 ? '#28a745' : pred.score > 60 ? '#ffc107' : '#dc3545'}`
                }}>
                  <strong>{pred.eventName}</strong>: {pred.score}% success
                  <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>
                    {pred.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* General Recommendation */}
          <p style={{ fontSize: '12px', margin: '4px 0', lineHeight: '1.5' }}>
            {aiSuggestions.recommendation}
          </p>
        </div>
      )}

      <div style={{ height: '100%', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
        <MapContainer
          center={BC_CENTER}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          minZoom={15}
          maxZoom={17}
          maxBounds={L.latLngBounds(BC_BOUNDS)}
          maxBoundsViscosity={0.8}  // Less rigid bounds
          scrollWheelZoom={true}
          doubleClickZoom={false}
          touchZoom={true}
          dragging={true}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          <MapBounds locations={BC_LOCATIONS} />

          {/* 🔥 Heatmap Layer */}
          <HeatmapLayer points={heatPoints} />

          {/* 🏢 Location Labels - Show all locations with names */}
          {BC_LOCATIONS.map((location, idx) => {
            const hasEvents = eventsByLocation[location.name]?.length > 0;
            return (
              <CircleMarker
                key={`loc-${idx}`}
                center={location.coords}
                radius={hasEvents ? 8 : 5}
                pathOptions={{
                  fillColor: hasEvents ? '#ff6b6b' : '#4a90e2',
                  fillOpacity: hasEvents ? 0.8 : 0.4,
                  color: hasEvents ? '#d63031' : '#2d7ab9',
                  weight: 2,
                }}
              >
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -10]}
                  className="location-label"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    fontSize: '11px',
                    fontWeight: hasEvents ? '600' : '500',
                    color: hasEvents ? '#2d3436' : '#636e72',
                    textShadow: '1px 1px 2px white, -1px -1px 2px white',
                  }}
                >
                  {location.name}
                  {hasEvents && ` (${eventsByLocation[location.name].length})`}
                </Tooltip>
              </CircleMarker>
            );
          })}

          {/* 📍 Event markers with smart popups */}
          {filteredEvents.map((event, i) => {
            const loc = BC_LOCATIONS.find(l =>
              (event.location || '').toLowerCase().includes(l.name.toLowerCase())
            );
            if (!loc) return null;

            // Get AI success prediction for this event
            const successPrediction = aiSuggestions?.successPredictions?.find(
              p => p.eventId === event.id
            );

            return (
              <Marker key={i} position={loc.coords} icon={EventIcon}>
                <Popup
                  maxWidth={280}
                  minWidth={220}
                  autoPan={false}  // Disable autoPan to prevent infinite loop
                  closeButton={true}
                  className="event-popup"
                >
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '15px', margin: '0 0 8px', fontWeight: '600' }}>
                      {event.emoji_vibe?.join(' ') || '🎉'} {event.function_name}
                    </h3>
                    
                    {/* AI Success Prediction Badge */}
                    {successPrediction && (
                      <div style={{
                        padding: '8px 10px',
                        marginBottom: '10px',
                        background: successPrediction.score > 80 ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                   successPrediction.score > 60 ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' :
                                   'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span>🎯 AI Success Score</span>
                          <span style={{ fontSize: '18px', fontWeight: '700' }}>{successPrediction.score}%</span>
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.95, lineHeight: '1.4' }}>
                          {successPrediction.reason}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                      <p style={{ margin: '4px 0' }}>
                        <strong>📍 Location:</strong> {event.location}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>👤 Organizer:</strong> {event.organizer_alias || 'Anonymous'}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>📅 Date:</strong> {event.date ? new Date(event.date).toLocaleString() : 'TBD'}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        <strong>👥 RSVPs:</strong> {event.rsvp_count || 0} / {event.max_capacity || 50}
                      </p>
                      {event.club_affiliated && (
                        <p style={{ margin: '4px 0' }}>
                          <strong>🎯 Club:</strong> {event.club_name}
                        </p>
                      )}
                      
                      {/* AI-powered popularity indicator */}
                      {event.rsvp_count && event.max_capacity && (
                        <p style={{ 
                          margin: '8px 0 4px', 
                          padding: '6px', 
                          background: event.rsvp_count / event.max_capacity > 0.8 ? '#ffe0e0' : '#e0f7ff',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {event.rsvp_count / event.max_capacity > 0.8 
                            ? '🔥 High demand! RSVP soon' 
                            : '✨ Spots available'}
                        </p>
                      )}
                    </div>

                    {event.invitation_image && (
                      <img
                        src={event.invitation_image}
                        alt="Event Invitation"
                        style={{
                          width: '100%',
                          height: 'auto',
                          marginTop: '8px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                          maxHeight: '160px',
                        }}
                      />
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <style>{`
        .location-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-size: 11px;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .leaflet-popup-tip {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        /* Ensure popup content is scrollable if too tall */
        .event-popup .leaflet-popup-content {
          margin: 12px;
          max-height: 70vh;
          overflow-y: auto;
        }
        /* Smart positioning for edge popups */
        .leaflet-popup {
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}