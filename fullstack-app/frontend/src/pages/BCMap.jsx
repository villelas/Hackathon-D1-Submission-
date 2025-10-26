// BCMap_Enhanced.jsx - Fixed centered popups and improved AI insights
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const API_URL = 'http://127.0.0.1:8000/api';

const BC_CENTER = [42.3365, -71.170];
const BC_BOUNDS = [
  [42.3320, -71.1775],
  [42.3410, -71.1640],
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
  popupAnchor: [0, -45],  // Position popup 45px above pin (increased from -40)
});

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
  const [selectedEvent, setSelectedEvent] = useState(null);

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
        
        const upcoming = filterNext24Hours(allEvents);
        setFilteredEvents(upcoming);
        
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
      {/* Next 24 Hours - Neon Green Glassmorphism */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 200, 100, 0.25) 100%)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '2px solid rgba(0, 255, 136, 0.4)',
        padding: '16px 24px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 255, 136, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', filter: 'drop-shadow(0 0 8px rgba(0, 255, 136, 0.6))' }}>⏰</span>
          <div>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: '800', 
              marginBottom: '4px',
              textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
              color: '#00ff88'
            }}>
              Next 24 Hours
            </div>
            <div style={{ 
              fontSize: '13px', 
              opacity: 0.95,
              color: '#e0ffe0',
              fontWeight: '600'
            }}>
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} happening now through {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights - Black Glassmorphism with Success Predictions */}
      {aiSuggestions && (
        <div style={{
          position: 'absolute',
          top: 20,
          right: 20,
          zIndex: 1000,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(20, 20, 20, 0.8) 100%)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          padding: '20px',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          color: 'white',
          minWidth: '300px',
          maxWidth: '340px',
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: '800', 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textShadow: '0 2px 10px rgba(0, 255, 136, 0.5)',
            color: '#00ff88'
          }}>
            <span style={{ fontSize: '22px' }}>🤖</span>
            AI Insights
          </div>
          
          {/* Top Event with Success Prediction */}
          {aiSuggestions.topEvent && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 212, 170, 0.2) 100%)',
              padding: '14px',
              borderRadius: '12px',
              marginBottom: '12px',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              boxShadow: '0 4px 12px rgba(0, 255, 136, 0.15)'
            }}>
              <div style={{ 
                fontSize: '11px', 
                fontWeight: '700', 
                color: '#00ff88',
                marginBottom: '6px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                🔥 Hottest Event
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: '#ffffff',
                marginBottom: '8px'
              }}>
                {aiSuggestions.topEvent.emoji_vibe?.join(' ')} {aiSuggestions.topEvent.function_name}
              </div>
              
              {/* Success Score */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
                padding: '8px 10px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px'
              }}>
                <span style={{ fontSize: '11px', color: '#e0ffe0', fontWeight: '600' }}>Success Score</span>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '800',
                  color: '#00ff88',
                  textShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
                }}>
                  {aiSuggestions.topEvent.successScore || 85}%
                </span>
              </div>

              <div style={{ 
                fontSize: '11px', 
                color: '#d0d7ff',
                opacity: 0.9
              }}>
                {aiSuggestions.topEvent.rsvp_count || 0} RSVPs • {aiSuggestions.topEvent.location}
              </div>
            </div>
          )}

          {/* Success Predictions Summary */}
          {aiSuggestions.successPredictions && aiSuggestions.successPredictions.length > 0 && (
            <div style={{
              background: 'rgba(255, 217, 61, 0.1)',
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '12px',
              border: '1px solid rgba(255, 217, 61, 0.3)'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#ffd93d', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📊 Success Predictions
              </div>
              {aiSuggestions.successPredictions.slice(0, 3).map((pred, idx) => {
                // Debug: log the prediction and events
                console.log('Prediction:', pred);
                console.log('Filtered Events:', filteredEvents);
                console.log('Looking for eventId:', pred.eventId);
                
                // Try multiple ways to find the event
                let event = filteredEvents.find(e => {
                  console.log('Checking event:', e.id, 'vs', pred.eventId);
                  return String(e.id) === String(pred.eventId) || e.id === pred.eventId;
                });
                
                // If not found by ID, try by index
                if (!event && typeof pred.eventId === 'number' && pred.eventId < filteredEvents.length) {
                  console.log('Trying by index:', pred.eventId);
                  event = filteredEvents[pred.eventId];
                }
                
                // If still not found, just use the first few events
                if (!event && filteredEvents[idx]) {
                  console.log('Using index-based fallback:', idx);
                  event = filteredEvents[idx];
                }
                
                console.log('Found event:', event);
                
                // Get the event name from various possible fields
                const eventName = event?.function_name || 
                                  event?.name || 
                                  event?.title || 
                                  pred.eventName ||
                                  pred.name ||
                                  `Event ${idx + 1}`;
                
                const displayName = eventName.length > 22 ? eventName.slice(0, 22) + '...' : eventName;
                
                return (
                  <div key={idx} style={{ marginBottom: idx < 2 ? '8px' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        color: 'rgba(255, 255, 255, 0.9)', 
                        fontWeight: '600',
                        fontSize: '12px',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {displayName}
                      </span>
                      <span style={{ 
                        color: pred.score >= 75 ? '#00ff88' : pred.score >= 50 ? '#ffd93d' : '#ff6b9d',
                        fontWeight: '800',
                        fontSize: '13px',
                        minWidth: '38px',
                        textAlign: 'right'
                      }}>
                        {pred.score}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Improvement Suggestions */}
          {aiSuggestions.recommendation && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '12px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#a8b4ff', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💡 Suggestion
              </div>
              <p style={{ 
                fontSize: '12px', 
                margin: 0, 
                lineHeight: '1.6',
                color: '#e8e8e8',
                fontWeight: '500'
              }}>
                {aiSuggestions.recommendation}
              </p>
            </div>
          )}

          {/* Vibe Check */}
          {aiSuggestions.overallVibe && (
            <div style={{
              background: 'rgba(0, 255, 136, 0.05)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: '600' }}>
                Vibe: 
              </span>
              <span style={{ fontSize: '13px', color: '#00ff88', fontWeight: '800', marginLeft: '8px' }}>
                {aiSuggestions.overallVibe}
              </span>
            </div>
          )}
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
          maxBoundsViscosity={0.5}
          scrollWheelZoom={true}
          doubleClickZoom={false}
          touchZoom={true}
          dragging={true}
          zoomControl={true}
          preferCanvas={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          <MapBounds locations={BC_LOCATIONS} />

          <HeatmapLayer points={heatPoints} />

          {/* Location Labels */}
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

          {/* Event Markers with Click to Open Centered Modal */}
          {filteredEvents.map((event, i) => {
            const loc = BC_LOCATIONS.find(l =>
              (event.location || '').toLowerCase().includes(l.name.toLowerCase())
            );
            if (!loc) return null;

            return (
              <Marker 
                key={i} 
                position={loc.coords} 
                icon={EventIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedEvent(event);
                  }
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {/* Centered Event Modal Overlay */}
      {selectedEvent && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedEvent(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(0, 0, 0, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#00ff88',
                fontWeight: 'bold',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 255, 136, 0.2)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0, 0, 0, 0.1)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>

            {/* Event Content */}
            <h3 style={{ fontSize: '22px', margin: '0 0 16px', fontWeight: '800', color: '#2d3436', paddingRight: '40px' }}>
              {selectedEvent.emoji_vibe?.join(' ') || '🎉'} {selectedEvent.function_name}
            </h3>
            
            {/* AI Success Prediction Badge */}
            {(() => {
              const successPrediction = aiSuggestions?.successPredictions?.find(
                p => p.eventId === selectedEvent.id
              );
              
              return successPrediction && (
                <>
                  <div style={{
                    padding: '14px 16px',
                    marginBottom: '16px',
                    background: successPrediction.score > 80 ? 'linear-gradient(135deg, #00ff88 0%, #00d4aa 100%)' : 
                               successPrediction.score > 60 ? 'linear-gradient(135deg, #ffd93d 0%, #ffc300 100%)' :
                               'linear-gradient(135deg, #ff6b9d 0%, #ff3366 100%)',
                    color: successPrediction.score > 60 ? '#000' : 'white',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '800' }}>🎯 AI Success Score</span>
                      <span style={{ fontSize: '24px', fontWeight: '900' }}>{successPrediction.score}%</span>
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.95, lineHeight: '1.5', fontWeight: '600' }}>
                      {successPrediction.reason}
                    </div>
                  </div>

                  {/* Improvement Suggestion */}
                  {successPrediction.improvement && (
                    <div style={{
                      padding: '12px 14px',
                      marginBottom: '16px',
                      background: 'rgba(255, 217, 61, 0.15)',
                      borderLeft: '4px solid #ffd93d',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#2d3436',
                      fontWeight: '600',
                      lineHeight: '1.6'
                    }}>
                      <strong>💡 Tip:</strong> {successPrediction.improvement}
                    </div>
                  )}
                </>
              );
            })()}
            
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#2d3436' }}>
              <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                <strong style={{ color: '#00ff88', minWidth: '110px' }}>📍 Location:</strong> 
                <span>{selectedEvent.location}</span>
              </p>
              <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                <strong style={{ color: '#00ff88', minWidth: '110px' }}>👤 Organizer:</strong> 
                <span>{selectedEvent.organizer_alias || 'Anonymous'}</span>
              </p>
              <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                <strong style={{ color: '#00ff88', minWidth: '110px' }}>📅 Date:</strong> 
                <span>{selectedEvent.date ? new Date(selectedEvent.date).toLocaleString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                }) : 'TBD'}</span>
              </p>
              <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                <strong style={{ color: '#00ff88', minWidth: '110px' }}>👥 RSVPs:</strong> 
                <span>{selectedEvent.rsvp_count || 0} / {selectedEvent.max_capacity || 50}</span>
              </p>
              {selectedEvent.club_affiliated && (
                <p style={{ margin: '8px 0', display: 'flex', alignItems: 'flex-start' }}>
                  <strong style={{ color: '#00ff88', minWidth: '110px' }}>🎯 Club:</strong> 
                  <span>{selectedEvent.club_name}</span>
                </p>
              )}
              
              {/* Popularity indicator */}
              {selectedEvent.rsvp_count && selectedEvent.max_capacity && (
                <div style={{ 
                  margin: '16px 0 8px', 
                  padding: '12px', 
                  background: selectedEvent.rsvp_count / selectedEvent.max_capacity > 0.8 ? '#ffe0e0' : '#e0f7ff',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: selectedEvent.rsvp_count / selectedEvent.max_capacity > 0.8 ? '#d63031' : '#0984e3',
                  textAlign: 'center'
                }}>
                  {selectedEvent.rsvp_count / selectedEvent.max_capacity > 0.8 
                    ? '🔥 High demand! RSVP soon' 
                    : '✨ Spots available'}
                </div>
              )}
            </div>

            {selectedEvent.invitation_image && (
              <img
                src={selectedEvent.invitation_image}
                alt="Event Invitation"
                style={{
                  width: '100%',
                  height: 'auto',
                  marginTop: '16px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  maxHeight: '300px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .location-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-size: 11px;
        }
        
        /* Smooth scrollbar for modal */
        div::-webkit-scrollbar {
          width: 8px;
        }
        
        div::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        div::-webkit-scrollbar-thumb {
          background: #00ff88;
          border-radius: 10px;
        }
        
        div::-webkit-scrollbar-thumb:hover {
          background: #00d4aa;
        }
      `}</style>
    </div>
  );
}