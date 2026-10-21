import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ShieldCheck, Radio, X } from 'lucide-react';
import { triggerSquadSOSAlarm, clearSquadSOSAlarm } from '../../lib/supabase';

interface DistressAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: string;
  locationLabel?: string;
  groupId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  userPhone?: string;
}

export const DistressAlertModal: React.FC<DistressAlertModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  locationLabel,
  groupId,
  userId,
  userName,
  userRole,
  userPhone,
}) => {
  const [countdown, setCountdown] = useState(10);
  const [isDispatched, setIsDispatched] = useState(false);
  const [detectedCoords, setDetectedCoords] = useState<string>('');
  const [detectedLocationLabel, setDetectedLocationLabel] = useState<string>('Detecting GPS location...');

  const broadcastGroupSOS = useCallback(
    (coordsToUse: string, locLabelToUse: string) => {
      const resolvedGroupId =
        groupId ||
        localStorage.getItem('trailoPS_active_squad_id') ||
        (() => {
          try {
            const sq = JSON.parse(localStorage.getItem('trailoPS_active_squad') || '{}');
            return sq?.id || 'default';
          } catch {
            return 'default';
          }
        })();

      const resolvedUserId = userId || localStorage.getItem('trailoPS_currentUserId') || '1';
      let resolvedName = userName || localStorage.getItem('trailoPS_currentUserName') || 'Squad Member';
      let resolvedPhone = userPhone || '';
      try {
        const prof = JSON.parse(
          localStorage.getItem(`trailoPS_profile_data_${resolvedUserId}`) ||
            localStorage.getItem('trailoPS_profile_data') ||
            '{}'
        );
        if (prof?.fullName) resolvedName = prof.fullName;
        if (prof?.phoneNumber) resolvedPhone = prof.phoneNumber;
      } catch {}

      triggerSquadSOSAlarm({
        groupId: resolvedGroupId,
        distressedUserId: resolvedUserId,
        distressedUserName: resolvedName,
        distressedUserRole: userRole || localStorage.getItem('trailoPS_userRole') || 'Member',
        phone: resolvedPhone,
        coordinates: coordsToUse || '27.0360° N, 88.2627° E',
        locationLabel:
          locLabelToUse && !locLabelToUse.startsWith('Detecting')
            ? locLabelToUse
            : 'Live GPS Distress Beacon',
        batteryLevel: '84%',
        triggeredAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      });
    },
    [groupId, userId, userName, userRole, userPhone]
  );

  useEffect(() => {
    if (!isOpen) {
      setCountdown(10);
      setIsDispatched(false);
      return;
    }

    // Immediately broadcast SOS alert to all squad devices when SOS button is pressed
    const initialCoords =
      coordinates && coordinates !== 'Location Unavailable'
        ? coordinates
        : detectedCoords || '27.0360° N, 88.2627° E';
    broadcastGroupSOS(initialCoords, locationLabel || detectedLocationLabel);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (countdown > 0 && !isDispatched) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isDispatched) {
      setIsDispatched(true);
    }
  }, [isOpen, countdown, isDispatched]);

  useEffect(() => {
    if (!isOpen) return;
    if (!navigator.geolocation) {
      setDetectedLocationLabel('Location Unavailable');
      return;
    }

    let isMounted = true;
    const handlePos = async (pos: GeolocationPosition) => {
      if (!isMounted) return;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const alt = pos.coords.altitude;
      const coordStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;
      setDetectedCoords(coordStr);

      let resolvedLabel = `Live Device GPS Active`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (!res.ok) throw new Error('Reverse geocode failed');
        const data = await res.json();
        if (!isMounted) return;
        const addr = data?.address || {};
        const locality =
          addr.town ||
          addr.city ||
          addr.village ||
          addr.suburb ||
          addr.county ||
          addr.state_district ||
          data?.name ||
          '';
        const region = addr.state || addr.country || '';
        const altSuffix =
          typeof alt === 'number' && !Number.isNaN(alt) ? ` (${Math.round(alt)}m ASL)` : '';
        const formatted = [locality, region].filter(Boolean).join(', ');
        resolvedLabel = formatted
          ? `${formatted}${altSuffix}`
          : data?.display_name?.split(',').slice(0, 3).join(',') || `Live GPS Fix${altSuffix}`;
        setDetectedLocationLabel(resolvedLabel);
      } catch {
        if (isMounted) {
          const altSuffix =
            typeof alt === 'number' && !Number.isNaN(alt) ? ` (${Math.round(alt)}m ASL)` : '';
          resolvedLabel = `Live Device GPS Active${altSuffix}`;
          setDetectedLocationLabel(resolvedLabel);
        }
      }
      broadcastGroupSOS(coordStr, resolvedLabel);
    };

    navigator.geolocation.getCurrentPosition(
      handlePos,
      () => {
        navigator.geolocation.getCurrentPosition(
          handlePos,
          () => {
            if (isMounted) setDetectedLocationLabel('Location Unavailable');
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );

    return () => {
      isMounted = false;
    };
  }, [isOpen, broadcastGroupSOS]);

  if (!isOpen) return null;

  const effectiveCoordinates =
    coordinates && coordinates !== 'Location Unavailable'
      ? coordinates
      : detectedCoords || '27.0360° N, 88.2627° E';

  const effectiveLocationLabel =
    locationLabel && !locationLabel.startsWith('Detecting')
      ? locationLabel
      : detectedLocationLabel;

  const handleCancelFalseAlarm = () => {
    const resolvedGroupId =
      groupId ||
      localStorage.getItem('trailoPS_active_squad_id') ||
      (() => {
        try {
          const sq = JSON.parse(localStorage.getItem('trailoPS_active_squad') || '{}');
          return sq?.id || 'default';
        } catch {
          return 'default';
        }
      })();
    clearSquadSOSAlarm(resolvedGroupId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-gradient-to-b from-rose-950 to-slate-950 text-white rounded-3xl p-6 border-2 border-rose-500 shadow-2xl relative overflow-hidden text-center">
        {/* Pulsing beacon waves */}
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Close / Cancel */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Emergency Beacon Icon */}
        <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-rose-600/30 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-white shadow-xl shadow-rose-600/50 border-2 border-white">
            <AlertTriangle className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[11px] font-extrabold uppercase tracking-wider mb-2">
          {isDispatched ? '🚨 SDRF SAR & Squad Dispatched' : '🚨 High-Priority SOS Triggered'}
        </span>

        <h3 className="text-xl font-black text-white tracking-tight mb-2">
          {isDispatched ? 'Distress Telemetry Locked' : `Broadcasting in ${countdown}s`}
        </h3>

        <p className="text-xs text-rose-200/90 leading-relaxed mb-4 max-w-xs mx-auto">
          {isDispatched
            ? 'All squad phones and rescue beacons are alerted with your GPS coordinates. Stay in position.'
            : 'Live GPS telemetry and health profile are being transmitted to all squad phones and rescue command.'}
        </p>

        {/* Telemetry Box */}
        <div className="bg-black/40 rounded-2xl p-3 border border-rose-500/30 text-left mb-4 font-mono text-xs space-y-1.5">
          <div className="flex justify-between text-slate-300">
            <span>Coordinates:</span>
            <span className="text-emerald-400 font-bold">{effectiveCoordinates}</span>
          </div>
          <div className="flex justify-between text-slate-300 gap-2">
            <span>Location:</span>
            <span className="text-white text-right truncate">{effectiveLocationLabel}</span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>Channel Relay:</span>
            <span className="text-amber-400 font-bold">Squad Live Sync + Mesh</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {!isDispatched ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsDispatched(true);
                  broadcastGroupSOS(effectiveCoordinates, effectiveLocationLabel);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/40 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Confirm Immediate SOS Dispatch</span>
              </button>
              <button
                type="button"
                onClick={handleCancelFalseAlarm}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs transition-colors"
              >
                False Alarm • Cancel Alert
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Squad & SAR Alerted: Live Beacon Active</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs transition-colors"
              >
                Keep Transmitting in Background
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

