import React, { useState } from 'react';
import { Train, Clock, MapPin, Plus, Trash2, Calendar, ShieldCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { TrainJourneyRecord, upsertTrainJourney, assignSeat, TrainSeatAssignmentRecord, SquadMemberRecord } from '../../lib/supabase';

interface TrainJourneyModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  direction: 'onward' | 'return';
  journey: TrainJourneyRecord | null;
  seatAssignments: TrainSeatAssignmentRecord[];
  members: SquadMemberRecord[];
  isAdmin: boolean;
  onSaved: () => void;
  onShowToast: (msg: string) => void;
}

export const TrainJourneyModal: React.FC<TrainJourneyModalProps> = ({
  groupId,
  isOpen,
  onClose,
  direction,
  journey,
  seatAssignments,
  members,
  isAdmin,
  onSaved,
  onShowToast,
}) => {
  const [trainName, setTrainName] = useState(journey?.train_name || '');
  const [trainNumber, setTrainNumber] = useState(journey?.train_number || '');
  const [boardingStation, setBoardingStation] = useState(journey?.boarding_station || '');
  const [destinationStation, setDestinationStation] = useState(journey?.destination_station || '');
  const [departureTime, setDepartureTime] = useState(journey?.departure_time ? journey.departure_time.slice(0, 16) : '');
  const [arrivalTime, setArrivalTime] = useState(journey?.arrival_time ? journey.arrival_time.slice(0, 16) : '');
  const [notes, setNotes] = useState(journey?.notes || '');

  // Intermediate halts
  const [halts, setHalts] = useState<Array<{ station: string; arrival: string; departure: string }>>(
    journey?.intermediate_halts || []
  );

  // New Halt Form
  const [newHaltStation, setNewHaltStation] = useState('');
  const [newHaltArr, setNewHaltArr] = useState('');
  const [newHaltDep, setNewHaltDep] = useState('');

  // Seat Assignments Form State
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.user_id || '');
  const [seatCoach, setSeatCoach] = useState('B2');
  const [seatBerth, setSeatBerth] = useState('');
  const [seatType, setSeatType] = useState<'LB' | 'MB' | 'UB' | 'SL' | 'SU'>('LB');

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleAddHalt = () => {
    if (!newHaltStation.trim()) return;
    setHalts((prev) => [
      ...prev,
      { station: newHaltStation.trim(), arrival: newHaltArr, departure: newHaltDep },
    ]);
    setNewHaltStation('');
    setNewHaltArr('');
    setNewHaltDep('');
  };

  const handleRemoveHalt = (idx: number) => {
    setHalts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainName.trim() || !trainNumber.trim() || !boardingStation.trim() || !departureTime) {
      onShowToast('Please complete mandatory train details (Name, Number, Boarding, Departure).');
      return;
    }

    setSaving(true);
    const res = await upsertTrainJourney({
      group_id: groupId,
      direction,
      train_name: trainName.trim(),
      train_number: trainNumber.trim(),
      boarding_station: boardingStation.trim(),
      destination_station: destinationStation.trim(),
      departure_time: new Date(departureTime).toISOString(),
      arrival_time: arrivalTime ? new Date(arrivalTime).toISOString() : undefined,
      intermediate_halts: halts,
      notes: notes.trim(),
    });
    setSaving(false);

    if (res.success) {
      onShowToast(`${direction === 'onward' ? 'Onward' : 'Return'} train itinerary updated!`);
      onSaved();
      onClose();
    } else {
      onShowToast(res.error || 'Failed to save train itinerary.');
    }
  };

  const handleAssignSeat = async () => {
    if (!journey?.id) {
      onShowToast('Please save train schedule first before assigning seats.');
      return;
    }
    if (!selectedMemberId || !seatCoach.trim() || !seatBerth.trim()) {
      onShowToast('Please select member, coach and berth number.');
      return;
    }

    const res = await assignSeat({
      journey_id: journey.id,
      user_id: selectedMemberId,
      coach: seatCoach.trim().toUpperCase(),
      berth_number: seatBerth.trim(),
      berth_type: seatType,
    });

    if (res.success) {
      onShowToast('Seat berth assigned successfully!');
      onSaved();
    } else {
      onShowToast(res.error || 'Failed to assign seat.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Train className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-tight">
                {direction === 'onward' ? 'Onward Train Expedition' : 'Return Journey Train'}
              </h3>
              <p className="text-xs text-slate-400">Live railway schedule, stations &amp; berth roster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          <form id="trainForm" onSubmit={handleSaveJourney} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Train Number</label>
                <input
                  type="text"
                  placeholder="e.g. 12345"
                  value={trainNumber}
                  onChange={(e) => setTrainNumber(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1">Train Name</label>
                <input
                  type="text"
                  placeholder="e.g. Saraighat Express"
                  value={trainName}
                  onChange={(e) => setTrainName(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Boarding Station</label>
                <input
                  type="text"
                  placeholder="e.g. Howrah Jn (HWH)"
                  value={boardingStation}
                  onChange={(e) => setBoardingStation(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1">Destination Station</label>
                <input
                  type="text"
                  placeholder="e.g. New Jalpaiguri (NJP)"
                  value={destinationStation}
                  onChange={(e) => setDestinationStation(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Scheduled Departure
                </label>
                <input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-300 font-medium block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> Scheduled Arrival
                </label>
                <input
                  type="datetime-local"
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Intermediate Stations List */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-slate-300 font-semibold block flex items-center justify-between">
                <span>Intermediate Halts &amp; Stations</span>
                <span className="text-[10px] text-slate-400">({halts.length} stations)</span>
              </label>

              {halts.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {halts.map((h, i) => (
                    <div
                      key={i}
                      className="p-2 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="font-semibold text-white">{h.station}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
                        <span>Arr: {h.arrival || '—'}</span>
                        <span>Dep: {h.departure || '—'}</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveHalt(i)}
                            className="p-1 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Station Name"
                    value={newHaltStation}
                    onChange={(e) => setNewHaltStation(e.target.value)}
                    className="col-span-2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white placeholder-slate-500 text-xs"
                  />
                  <input
                    type="time"
                    value={newHaltArr}
                    onChange={(e) => setNewHaltArr(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddHalt}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Coach & Seat Assignment Matrix */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Coach &amp; Berth Roster</span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {seatAssignments.length} Assigned
              </span>
            </div>

            {seatAssignments.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {seatAssignments.map((sa) => (
                  <div
                    key={sa.id}
                    className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{sa.member_name}</div>
                      <div className="text-[10px] text-slate-400">
                        Coach <strong className="text-emerald-400">{sa.coach}</strong> · Berth{' '}
                        <strong className="text-emerald-400">{sa.berth_number}</strong>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                      {sa.berth_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-center text-slate-500 text-[11px]">
                No coach or berth reservations assigned yet.
              </div>
            )}

            {/* Admin Add Seat Assignment */}
            {isAdmin && journey && (
              <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 block">
                  Assign Coach / Berth to Member
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white text-xs"
                  >
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.profile?.full_name || 'Squad Member'}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Coach (e.g. B2)"
                    value={seatCoach}
                    onChange={(e) => setSeatCoach(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-xs"
                  />

                  <input
                    type="text"
                    placeholder="Berth #"
                    value={seatBerth}
                    onChange={(e) => setSeatBerth(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">Type:</span>
                    {(['LB', 'MB', 'UB', 'SL', 'SU'] as const).map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setSeatType(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                          seatType === t
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAssignSeat}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Assign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            Close
          </button>
          {isAdmin && (
            <button
              type="submit"
              form="trainForm"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Railway Schedule'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
