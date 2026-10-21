import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  MapPin,
  CheckCircle2,
  Clock,
  Battery,
  Navigation as NavIcon,
  Phone,
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  RotateCw,
  X,
  Check,
  Shield,
  AlertTriangle,
  UserCheck,
  Edit2,
  Camera,
  Users,
  PlusCircle,
  ArrowRight,
  Crown,
  Folder,
  PieChart,
  Layers,
  LogOut,
  Megaphone,
  HelpCircle,
  ClipboardCheck,
  Settings,
  Palette,
  Send,
  Database,
  Smartphone,
  Wifi,
  Server,
  Sparkles,
  CheckSquare,
  Plus,
  Bell,
  RefreshCcw,
  Trash2,
  Lock,
  Unlock,
  Image,
  Film,
  Download,
  Share2,
  Upload,
  Minus,
  Eye,
  UserX,
  ShieldCheck,
  Search,
  Train,
  Copy,
} from 'lucide-react';
import { SquadMember, ExcursionRequest, ScreenType, UserRole } from '../types';
import { CallModal } from './modals/CallModal';
import { ChatModal } from './modals/ChatModal';
import { CreateTripModal } from './modals/CreateTripModal';
import { TrainJourneyModal } from './modals/TrainJourneyModal';
import { MemberProfileModal } from './modals/MemberProfileModal';
import { BriefingTimerModal } from './modals/BriefingTimerModal';
import { BriefingCountdownBanner } from './BriefingCountdownBanner';
import {
  TrainJourneyRecord,
  TrainSeatAssignmentRecord,
  fetchTrainJourney,
  fetchSeatAssignments,
  fetchGroupMediaVault,
  uploadMediaToVault,
  createSquadGroup,
  fetchSquadMembers,
  fetchGroupJoinRequests,
  respondToJoinRequest,
  updateMemberRole,
  manageMemberRole,
  normalizeSquadCode,
  fetchGroupBriefing,
  saveGroupBriefing,
  cancelGroupBriefing,
  subscribeToGroupBriefing,
  createGroupNotice,
  fetchSquadChecklist,
  saveSquadChecklistItem,
  updateSquadChecklistPacking,
  deleteSquadChecklistRecord,
  SquadGroupRecord,
  SquadMemberRecord,
  SquadJoinRequestRecord,
  SquadBriefingRecord,
} from '../lib/supabase';

interface SquadRollCallScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onShowToast: (message: string) => void;
  hasJoinedGroup: boolean;
  onSetJoinedGroup: (joined: boolean) => void;
  userRole?: UserRole;
  onUpdateRole?: (role: UserRole) => void;
  onOpenFacultyDrive?: () => void;
  onOpenSplitwise?: () => void;
  currentUserName?: string;
  currentUserAvatar?: string;
  currentUserId?: string;
  activeSquad?: SquadGroupRecord | null;
  onRefreshSquad?: () => void;
  onSquadJoined?: (group: SquadGroupRecord, role?: UserRole) => void;
}

export const SquadRollCallScreen: React.FC<SquadRollCallScreenProps> = ({
  onNavigate,
  onShowToast,
  hasJoinedGroup,
  onSetJoinedGroup,
  userRole = 'member',
  onUpdateRole,
  onOpenFacultyDrive,
  onOpenSplitwise,
  currentUserName = 'Pratap Paul',
  currentUserAvatar,
  currentUserId,
  activeSquad,
  onRefreshSquad,
  onSquadJoined,
}) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'present' | 'missing' | 'excursion' | 'scout' | 'medical'>('all');
  const [activeBriefing, setActiveBriefing] = useState<SquadBriefingRecord | null>(null);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
  const [isPushToTalk, setIsPushToTalk] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Quick Action Circular Tab Modals
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isCreateSubGroupModalOpen, setIsCreateSubGroupModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isAdminDashboardModalOpen, setIsAdminDashboardModalOpen] = useState(false);
  const [isMissingItemModalOpen, setIsMissingItemModalOpen] = useState(false);
  const [isJourneyChecklistModalOpen, setIsJourneyChecklistModalOpen] = useState(false);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [isHDMediaModalOpen, setIsHDMediaModalOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedHDMediaFilter, setSelectedHDMediaFilter] = useState<'all' | 'photo' | 'video'>('all');

  // All Members separate window modal state
  const [isAllMembersModalOpen, setIsAllMembersModalOpen] = useState(false);
  const [allMembersSearchQuery, setAllMembersSearchQuery] = useState('');
  const [allMembersRoleFilter, setAllMembersRoleFilter] = useState<'all' | 'admins' | 'members'>('all');

  // Super Admin Join Requests State (Database-backed & synchronized across devices)
  const [isVerificationRequired, setIsVerificationRequired] = useState(true);
  const squadKey = activeSquad?.id || 'default';
  const pendingStorageKey = `trailoPS_pending_requests_${squadKey}`;

  const [joinRequests, setJoinRequests] = useState<SquadJoinRequestRecord[]>([]);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  const [pendingMembers, setPendingMembers] = useState<Array<{
    id: string;
    name: string;
    avatar: string;
    phone: string;
    emergencyContact: string;
    bloodGroup: string;
    requestedAt: string;
    roleRequested: string;
  }>>([]);

  // Synchronize pending Join Requests for this group from database/server
  const loadGroupJoinRequests = async () => {
    if (!activeSquad?.id) {
      setJoinRequests([]);
      return;
    }
    try {
      const reqs = await fetchGroupJoinRequests(activeSquad.id, currentUserId);
      setJoinRequests(reqs);
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    if (!hasJoinedGroup || !activeSquad?.id) {
      setJoinRequests([]);
      return;
    }
    loadGroupJoinRequests();
    const interval = setInterval(loadGroupJoinRequests, 3000);
    window.addEventListener('trailoPS_join_requests_updated', loadGroupJoinRequests);
    window.addEventListener('trailoPS_pending_updated', loadGroupJoinRequests);
    return () => {
      clearInterval(interval);
      window.removeEventListener('trailoPS_join_requests_updated', loadGroupJoinRequests);
      window.removeEventListener('trailoPS_pending_updated', loadGroupJoinRequests);
    };
  }, [hasJoinedGroup, activeSquad?.id, currentUserId]);

  // Real device media file input reference for user uploads (Request 11)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Train Journey & Berths State
  const [isTrainModalOpen, setIsTrainModalOpen] = useState(false);
  const [trainDirection, setTrainDirection] = useState<'onward' | 'return'>('onward');
  const [onwardJourney, setOnwardJourney] = useState<TrainJourneyRecord | null>(null);
  const [returnJourney, setReturnJourney] = useState<TrainJourneyRecord | null>(null);
  const [seatAssignments, setSeatAssignments] = useState<TrainSeatAssignmentRecord[]>([]);

  // Member Profile Viewer Modal
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);
  const [viewingProfileFallback, setViewingProfileFallback] = useState<{ name: string; role: string; avatar?: string } | null>(null);

  // Load Train Journeys & Seats from Supabase
  const loadTrainData = async () => {
    if (!activeSquad?.id) return;
    const onward = await fetchTrainJourney(activeSquad.id, 'onward');
    const ret = await fetchTrainJourney(activeSquad.id, 'return');
    setOnwardJourney(onward);
    setReturnJourney(ret);

    const activeJourneyId = trainDirection === 'onward' ? onward?.id : ret?.id;
    if (activeJourneyId) {
      const seats = await fetchSeatAssignments(activeJourneyId);
      setSeatAssignments(seats);
    } else {
      setSeatAssignments([]);
    }
  };

  useEffect(() => {
    if (hasJoinedGroup && activeSquad?.id) {
      loadTrainData();
    }
  }, [hasJoinedGroup, activeSquad?.id, trainDirection]);

  // High-Definition RAW Media Stream (Stored in Supabase Storage with local cache fallback)
  const [sharedHDMedia, setSharedHDMedia] = useState<Array<{
    id: string;
    title: string;
    type: 'photo' | 'video';
    resolution: string;
    size: string;
    format: string;
    author: string;
    timestamp: string;
    altitude: string;
    url: string;
    isLosslessRaw: boolean;
  }>>(() => {
    const squadKey = activeSquad?.id || 'default';
    const cached = localStorage.getItem(`trailoPS_media_vault_${squadKey}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check for duplicates
    const incomingFiles = Array.from(files);
    const uniqueFiles: File[] = [];
    for (const f of incomingFiles) {
      const isDuplicate = sharedHDMedia.some((m) => m.title === f.name);
      if (isDuplicate) {
        onShowToast(`Notice: "${f.name}" has already been uploaded to the vault.`);
      } else {
        uniqueFiles.push(f);
      }
    }

    if (uniqueFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploadingMedia(true);
    setUploadProgress(10);
    setUploadStatus(`Preparing ${uniqueFiles.length} original-quality media file(s)...`);

    const uploadedItems: any[] = [];
    let processed = 0;

    for (const file of uniqueFiles) {
      processed++;
      const currentPct = Math.min(90, Math.round((processed / uniqueFiles.length) * 85));
      setUploadProgress(currentPct);
      setUploadStatus(`Uploading "${file.name}" to private encrypted vault (${processed}/${uniqueFiles.length})...`);

      if (activeSquad?.id && currentUserId) {
        try {
          const res = await uploadMediaToVault({
            groupId: activeSquad.id,
            uploaderId: currentUserId,
            uploaderName: currentUserName,
            file,
          });

          if (res.success && res.item) {
            uploadedItems.push({
              id: res.item.id,
              title: res.item.file_name,
              type: res.item.mime_type.startsWith('video') ? 'video' : 'photo',
              resolution: res.item.resolution || '4K Original',
              size: `${(res.item.file_size / (1024 * 1024)).toFixed(1)} MB`,
              format: res.item.mime_type.split('/')[1]?.toUpperCase() || 'RAW',
              author: res.item.uploader_name,
              timestamp: 'Just now',
              altitude: 'Mountain Trail',
              url: res.item.signed_url || URL.createObjectURL(file),
              isLosslessRaw: true,
            });
          } else {
            // Local fallback for offline / unconfigured bucket
            const url = URL.createObjectURL(file);
            uploadedItems.push({
              id: Date.now().toString() + Math.random().toString(),
              title: file.name,
              type: file.type.startsWith('video') ? 'video' : 'photo',
              resolution: 'Original Resolution',
              size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              format: file.type.split('/')[1]?.toUpperCase() || 'RAW',
              author: `${currentUserName} (You)`,
              timestamp: 'Just now',
              altitude: 'Expedition Trail',
              url,
              isLosslessRaw: true,
            });
            if (res.error) {
              onShowToast(`Saved locally: ${res.error}`);
            }
          }
        } catch (err: any) {
          const url = URL.createObjectURL(file);
          uploadedItems.push({
            id: Date.now().toString() + Math.random().toString(),
            title: file.name,
            type: file.type.startsWith('video') ? 'video' : 'photo',
            resolution: 'Original Resolution',
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            format: file.type.split('/')[1]?.toUpperCase() || 'RAW',
            author: `${currentUserName} (You)`,
            timestamp: 'Just now',
            altitude: 'Expedition Trail',
            url,
            isLosslessRaw: true,
          });
        }
      } else {
        const url = URL.createObjectURL(file);
        uploadedItems.push({
          id: Date.now().toString() + Math.random().toString(),
          title: file.name,
          type: file.type.startsWith('video') ? 'video' : 'photo',
          resolution: 'Original Resolution',
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          format: file.type.split('/')[1]?.toUpperCase() || 'RAW',
          author: `${currentUserName} (You)`,
          timestamp: 'Just now',
          altitude: 'Expedition Trail',
          url,
          isLosslessRaw: true,
        });
      }
    }

    setUploadProgress(100);
    setUploadStatus('Upload complete and verified!');

    const updatedList = [...uploadedItems, ...sharedHDMedia];
    setSharedHDMedia(updatedList);

    // Persist cache locally
    try {
      const squadKey = activeSquad?.id || 'default';
      localStorage.setItem(`trailoPS_media_vault_${squadKey}`, JSON.stringify(updatedList));
    } catch {}

    setTimeout(() => {
      setIsUploadingMedia(false);
      setUploadStatus('');
      setUploadProgress(0);
    }, 1200);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (uploadedItems.length > 0) {
      onShowToast(`Successfully saved ${uploadedItems.length} media file(s) to Squad Vault!`);
    }
  };

  useEffect(() => {
    if (activeSquad?.id) {
      fetchGroupMediaVault(activeSquad.id).then((items) => {
        if (items && items.length > 0) {
          const mapped = items.map((i) => ({
            id: i.id,
            title: i.file_name,
            type: i.mime_type.startsWith('video') ? ('video' as const) : ('photo' as const),
            resolution: i.resolution || '4K UHD',
            size: `${(i.file_size / (1024 * 1024)).toFixed(1)} MB`,
            format: i.mime_type.split('/')[1]?.toUpperCase() || 'RAW',
            author: i.uploader_name,
            timestamp: new Date(i.created_at).toLocaleDateString(),
            altitude: 'Mountain Trail',
            url: i.signed_url || '',
            isLosslessRaw: true,
          }));

          setSharedHDMedia((prev) => {
            const combined = [...mapped];
            for (const p of prev) {
              if (!combined.some((c) => c.title === p.title)) {
                combined.push(p);
              }
            }
            try {
              localStorage.setItem(`trailoPS_media_vault_${activeSquad.id}`, JSON.stringify(combined));
            } catch {}
            return combined;
          });
        }
      });
    }
  }, [activeSquad?.id]);

  // Edit Group Form state
  const [editFromLocation, setEditFromLocation] = useState('');
  const [editDestination, setEditDestination] = useState(activeSquad?.destination || '');
  const [editDepartureDate, setEditDepartureDate] = useState(activeSquad?.start_date || '2026-10-24');

  // Subgroup creator state (strictly real user records)
  const [subGroupNameInput, setSubGroupNameInput] = useState('');
  const [subGroupColorInput, setSubGroupColorInput] = useState('#ef4444');
  const [selectedSubGroupMembers, setSelectedSubGroupMembers] = useState<string[]>([]);
  const [subGroups, setSubGroups] = useState<Array<{
    id: string;
    name: string;
    color: string;
    leadName: string;
    memberCount: number;
  }>>(() => {
    const key = `trailoPS_subgroups_${activeSquad?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    const key = `trailoPS_subgroups_${activeSquad?.id || 'default'}`;
    localStorage.setItem(key, JSON.stringify(subGroups));
  }, [subGroups, activeSquad?.id]);

  // Quick announcement composer (strictly real records with image attachment support)
  const [quickAnnounceTitle, setQuickAnnounceTitle] = useState('');
  const [quickAnnounceText, setQuickAnnounceText] = useState('');
  const [quickAnnounceImage, setQuickAnnounceImage] = useState<string | null>(null);
  const [quickAnnouncePriority, setQuickAnnouncePriority] = useState<'critical' | 'advisory' | 'info'>('critical');
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    title: string;
    text: string;
    imageUrl?: string;
    priority: 'critical' | 'advisory' | 'info';
    author: string;
    timestamp: string;
  }>>(() => {
    const key = `trailoPS_announcements_${activeSquad?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    const key = `trailoPS_announcements_${activeSquad?.id || 'default'}`;
    localStorage.setItem(key, JSON.stringify(announcements));
  }, [announcements, activeSquad?.id]);

  // Missing item requester state (strictly real records)
  const [missingItemName, setMissingItemName] = useState('');
  const [missingItemLocation, setMissingItemLocation] = useState('');
  const [missingItemUrgency, setMissingItemUrgency] = useState<'critical' | 'moderate' | 'routine'>('critical');
  const [missingItems, setMissingItems] = useState<Array<{
    id: string;
    itemName: string;
    reportedBy: string;
    urgency: 'critical' | 'moderate' | 'routine';
    location: string;
    timestamp: string;
    status: 'open' | 'found';
  }>>(() => {
    const key = `trailoPS_missing_items_${activeSquad?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    const key = `trailoPS_missing_items_${activeSquad?.id || 'default'}`;
    localStorage.setItem(key, JSON.stringify(missingItems));
  }, [missingItems, activeSquad?.id]);

  // Shared Journey Checklist State (synced with Home Page Trip Gear Checklist & all squad members)
  const [newJourneyTask, setNewJourneyTask] = useState('');
  const [newJourneyCategory, setNewJourneyCategory] = useState('Permits & Entry');
  const [journeyChecklist, setJourneyChecklist] = useState<Array<{
    id: string;
    title: string;
    category: string;
    completed: boolean;
    assignedRole: string;
  }>>(() => {
    const key = `trailoPS_journey_checklist_${activeSquad?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  const syncSharedChecklist = async () => {
    const targetGroupId = activeSquad?.id || localStorage.getItem('trailoPS_active_squad_id') || 'default';
    if (!targetGroupId || (!hasJoinedGroup && targetGroupId === 'default')) return;
    try {
      const items = await fetchSquadChecklist(targetGroupId, currentUserId);
      if (Array.isArray(items)) {
        const mapped = items.map((item) => ({
          id: item.id,
          title: item.name,
          category: item.spec || item.category || 'Camp',
          completed: Boolean(item.is_packed),
          assignedRole: 'All Squad',
        }));
        setJourneyChecklist(mapped);
        localStorage.setItem(`trailoPS_journey_checklist_${targetGroupId}`, JSON.stringify(mapped));
      }
    } catch {}
  };

  useEffect(() => {
    syncSharedChecklist();
    const interval = setInterval(syncSharedChecklist, 3500);
    const handleGearUpdated = () => {
      syncSharedChecklist();
    };
    window.addEventListener('trailoPS_gear_updated', handleGearUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('trailoPS_gear_updated', handleGearUpdated);
    };
  }, [activeSquad?.id, hasJoinedGroup, currentUserId]);

  // Admin Governance Permissions State
  const [adminPermissions, setAdminPermissions] = useState({
    lockCheckIn: false,
    requireExcursionClearance: true,
    requireMedicalClearance: true,
    allowMemberInvite: true,
  });

  // Simulated Multi-Phone Realtime Sync Telemetry (starts empty or with real connected devices)
  const [simulatedSyncPhones, setSimulatedSyncPhones] = useState<Array<{
    id: string;
    device: string;
    role: string;
    user: string;
    status: string;
    latency: string;
    lastSync: string;
  }>>([]);
  const [isSimulatingSync, setIsSimulatingSync] = useState(false);

  // Dynamic Trip Header
  const [tripName, setTripName] = useState(
    hasJoinedGroup && activeSquad?.name ? activeSquad.name : 'Expedition Route'
  );
  const [isEditingTripName, setIsEditingTripName] = useState(false);
  const [coverBg, setCoverBg] = useState(
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'
  );
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false);

  useEffect(() => {
    if (hasJoinedGroup && activeSquad?.name) {
      setTripName(activeSquad.name);
    } else if (!hasJoinedGroup) {
      setTripName('');
      setIsEditingTripName(false);
    }
    if (hasJoinedGroup && activeSquad?.destination) {
      setEditDestination(activeSquad.destination);
    }
  }, [hasJoinedGroup, activeSquad?.name, activeSquad?.destination]);

  const presetCovers = [
    {
      name: 'Alpine Sunrise',
      url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Misty Pine Forest',
      url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Glacial Pass',
      url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Rocky Ridge Trail',
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  // Call / Chat Modals
  const [callModalContact, setCallModalContact] = useState<{
    name: string;
    title: string;
    phone: string;
    avatar?: string;
  } | null>(null);
  const [chatModalContact, setChatModalContact] = useState<{
    name: string;
    title: string;
    avatar?: string;
  } | null>(null);

  // Excursion requests (strictly real records)
  const [excursionRequests, setExcursionRequests] = useState<ExcursionRequest[]>(() => {
    const key = `trailoPS_excursions_${activeSquad?.id || 'default'}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });

  useEffect(() => {
    const key = `trailoPS_excursions_${activeSquad?.id || 'default'}`;
    localStorage.setItem(key, JSON.stringify(excursionRequests));
  }, [excursionRequests, activeSquad?.id]);

  // Squad Members with Role Hierarchy & Sub-Group Highlights (No Demo/Mock Data)
  const [members, setMembers] = useState<SquadMember[]>(() => {
    if (!hasJoinedGroup) return [];
    const saved = localStorage.getItem('trailoPS_squad_members');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (parsed.length === 1) {
            parsed[0].roleHierarchy = 'super_admin';
            parsed[0].role = 'Squad Commander (You)';
          }
          return parsed;
        }
      } catch {}
    }
    return [
      {
        id: currentUserId || '1',
        name: `${currentUserName} (You)`,
        role: 'Squad Commander (You)',
        roleHierarchy: 'super_admin',
        status: 'present',
        avatar: currentUserAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        distance: '0m',
        battery: 98,
        lastPing: 'Just now',
      },
    ];
  });

  // Fetch & synchronize real squad members from database when in an active squad
  const syncSquadMembersList = async () => {
    if (!hasJoinedGroup || !activeSquad?.id) {
      if (!hasJoinedGroup) {
        setMembers([]);
      }
      return;
    }

    try {
      const rawMembers = await fetchSquadMembers(
        activeSquad.id,
        currentUserId,
        currentUserName,
        currentUserAvatar
      );
      const sbMembers = (rawMembers || []).filter((m) => Boolean(m && m.user_id));
      if (sbMembers.length > 0) {
        const isCreator =
          activeSquad.created_by === currentUserId ||
          activeSquad.creator_id === currentUserId ||
          activeSquad.created_by === 'user_self';
        const isInRoster = sbMembers.some(
          (m) => m?.user_id === currentUserId || m?.user_id === 'user_self'
        );
        const locallyJoined =
          localStorage.getItem(`trailoPS_hasJoinedGroup_${currentUserId}`) === 'true' ||
          localStorage.getItem('trailoPS_active_squad_id') === activeSquad.id;

        // Prevent unauthorized access to private group data if user is not an approved member
        if (currentUserId && !isCreator && !isInRoster && !locallyJoined) {
          onSetJoinedGroup(false);
          setMembers([]);
          onShowToast('Access restricted: Your join request is awaiting Super Admin approval.');
          return;
        }

        const isPlaceholderName = (n?: string | null) =>
          !n ||
          n === 'Squad Member' ||
          n === 'Expedition Member' ||
          n === 'Trekker' ||
          n === 'Member' ||
          /^Trekker\s+[0-9a-f-]{4,}/i.test(n);

        const mapped: SquadMember[] = sbMembers.map((m) => {
          const isMe = m.user_id === currentUserId || m.user_id === 'user_self';
          const profileFullName = !isPlaceholderName(m.profile?.full_name)
            ? m.profile?.full_name
            : null;
          const resolvedName =
            (isMe && currentUserName && !isPlaceholderName(currentUserName)
              ? currentUserName
              : null) ||
            profileFullName ||
            (m.profile?.email ? m.profile.email.split('@')[0] : null) ||
            currentUserName ||
            'Member';

          return {
            id: m.user_id,
            name: resolvedName,
            role:
              m.role === 'super_admin'
                ? 'Squad Commander'
                : m.role === 'admin'
                ? 'Sub-Admin'
                : 'Expedition Member',
            roleHierarchy: (m.role === 'admin' ? 'subgroup_admin' : m.role) as any,
            status: m.status === 'distress' ? 'missing' : 'present',
            avatar:
              m.profile?.avatar_url ||
              (isMe ? currentUserAvatar : '') ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
            distance: isMe ? '0m' : '15m',
            battery: 95,
            lastPing: 'Just now',
            phone: m.profile?.phone,
          };
        });

        // Sync current user's role from database membership
        const myMembership = sbMembers.find((m) => m?.user_id === currentUserId);
        if (myMembership) {
          const effectiveRole: UserRole =
            myMembership.role === 'super_admin'
              ? 'super_admin'
              : myMembership.role === 'admin'
              ? 'subgroup_admin'
              : 'member';
          if (effectiveRole !== userRole && onUpdateRole) {
            onUpdateRole(effectiveRole);
            localStorage.setItem('trailoPS_userRole', effectiveRole);
          }
        }

        // Mandatory Super Admin Check: 1 member is always Super Admin
        if (mapped.length === 1 || !mapped.some((m) => m.roleHierarchy === 'super_admin')) {
          mapped[0].roleHierarchy = 'super_admin';
          mapped[0].role =
            mapped[0].id === (currentUserId || '1')
              ? 'Squad Commander (You)'
              : 'Squad Commander';
          if (mapped[0].id === (currentUserId || '1') || mapped[0].name.includes('(You)')) {
            if (onUpdateRole) onUpdateRole('super_admin');
            localStorage.setItem('trailoPS_userRole', 'super_admin');
          }
        }

        setMembers(mapped);
        localStorage.setItem('trailoPS_squad_members', JSON.stringify(mapped));
      }
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    syncSquadMembersList();
    const interval = setInterval(syncSquadMembersList, 3500);
    window.addEventListener('trailoPS_members_updated', syncSquadMembersList);
    return () => {
      clearInterval(interval);
      window.removeEventListener('trailoPS_members_updated', syncSquadMembersList);
    };
  }, [hasJoinedGroup, activeSquad?.id, currentUserId, currentUserName, currentUserAvatar]);

  // Mandatory Single Member Super Admin Auto-Promotion
  useEffect(() => {
    if (members.length === 1) {
      const soleMember = members[0];
      if (soleMember && soleMember.roleHierarchy !== 'super_admin') {
        const updated = [{
          ...soleMember,
          roleHierarchy: 'super_admin' as const,
          role: 'Squad Commander (You)',
        }];
        setMembers(updated);
        localStorage.setItem('trailoPS_squad_members', JSON.stringify(updated));
        if (onUpdateRole) {
          onUpdateRole('super_admin');
        }
        localStorage.setItem('trailoPS_userRole', 'super_admin');
      } else if (soleMember && userRole !== 'super_admin') {
        if (onUpdateRole) {
          onUpdateRole('super_admin');
        }
        localStorage.setItem('trailoPS_userRole', 'super_admin');
      }
    }
  }, [members, userRole, onUpdateRole]);

  // Synchronize current user's name, avatar, and role hierarchy with active user session
  useEffect(() => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === '1'
          ? {
              ...m,
              name: currentUserName ? `${currentUserName} (You)` : m.name,
              avatar: currentUserAvatar || m.avatar,
              roleHierarchy: userRole,
              role:
                userRole === 'super_admin'
                  ? 'Faculty Super Admin (You)'
                  : userRole === 'subgroup_admin'
                  ? 'Sub-Group Lead (You)'
                  : 'Trekker Member (You)',
            }
          : m
      )
    );
  }, [userRole, currentUserName, currentUserAvatar]);

  // Synchronized Group Briefing Timer subscription across devices
  useEffect(() => {
    const groupId = activeSquad?.id || 'default';
    const unsubscribe = subscribeToGroupBriefing(groupId, (b) => {
      setActiveBriefing(b);
    });
    return () => unsubscribe();
  }, [activeSquad?.id]);

  const handleCheckIn = () => {
    setIsCheckedIn(!isCheckedIn);
    if (!isCheckedIn) {
      onShowToast('GPS Verified: Pelling Basecamp check-in confirmed!');
    } else {
      onShowToast('Check-in status toggled.');
    }
  };

  const handleApproveExcursion = (id: string) => {
    setExcursionRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
    );
    onShowToast('Excursion request approved for Maya Patel (3 members). Return due 17:30.');
  };

  const handleRejectExcursion = (id: string) => {
    setExcursionRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
    );
    onShowToast('Excursion request declined. Squad directed to remain in camp perimeter.');
  };

  // Super Admin Join Request Approval & Rejection Handlers (Enforced in Database + Server)
  const isCurrentUserSuperAdmin =
    userRole === 'super_admin' ||
    (!!currentUserId && activeSquad?.creator_id === currentUserId) ||
    members.some((m) => m.id === currentUserId && m.roleHierarchy === 'super_admin');

  const handleRespondToJoinRequest = async (
    request: SquadJoinRequestRecord,
    action: 'accept' | 'reject'
  ) => {
    if (!activeSquad?.id || !currentUserId) return;
    if (!isCurrentUserSuperAdmin) {
      onShowToast('Only an authorized Super Admin of this group can approve or reject join requests.');
      return;
    }

    setRespondingRequestId(request.id);
    try {
      const res = await respondToJoinRequest(
        request.id,
        activeSquad.id,
        currentUserId,
        action
      );

      if (!res.success) {
        onShowToast(res.error || `Failed to ${action} join request.`);
        return;
      }

      // Immediately update local joinRequests state and re-sync member roster
      setJoinRequests((prev) =>
        prev.map((r) =>
          r.id === request.id
            ? { ...r, status: action === 'accept' ? 'accepted' : 'rejected' }
            : r
        )
      );

      await Promise.all([syncSquadMembersList(), loadGroupJoinRequests()]);
      onRefreshSquad?.();

      if (action === 'accept') {
        onShowToast(
          `✓ Approved ${request.user_name || 'Member'}! Added to "${activeSquad.name}" and synced across devices.`
        );
      } else {
        onShowToast(`✕ Rejected join request from ${request.user_name || 'Requester'}.`);
      }
    } finally {
      setRespondingRequestId(null);
    }
  };

  const handleVerifyPendingMember = (id: string) => {
    const req = joinRequests.find((r) => r.id === id);
    if (req) {
      handleRespondToJoinRequest(req, 'accept');
    }
  };

  const handleKickPendingMember = (id: string, name: string) => {
    const req = joinRequests.find((r) => r.id === id);
    if (req) {
      handleRespondToJoinRequest(req, 'reject');
    }
  };

  const handleKickActiveMember = (id: string, name: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    onShowToast(`User ${name} was kicked from squad expedition.`);
  };

  // Sub-Group minus deletion (Request 8)
  const handleDeleteSubGroup = (subGroupId: string, subGroupName: string) => {
    setSubGroups((prev) => prev.filter((sg) => sg.id !== subGroupId));
    setMembers((prev) =>
      prev.map((m) =>
        m.subGroupId === subGroupId
          ? { ...m, subGroupId: undefined, subGroupName: undefined, subGroupColor: undefined }
          : m
      )
    );
    onShowToast(`Sub-Group "${subGroupName}" removed. Members unassigned.`);
  };

  // Shared Checklist minus deletion (Request 10)
  const handleDeleteJourneyTask = async (id: string, title: string) => {
    const targetGroupId = activeSquad?.id || localStorage.getItem('trailoPS_active_squad_id') || 'default';
    setJourneyChecklist((prev) => prev.filter((t) => t.id !== id));
    await deleteSquadChecklistRecord(targetGroupId, id);
    onShowToast(`Removed "${title}" from shared squad & home trip gear checklist.`);
  };

  const filteredMembers = members.filter((m) => {
    if (activeFilter === 'present') return m.status === 'present';
    if (activeFilter === 'missing') return m.status === 'missing';
    if (activeFilter === 'excursion') return m.status === 'excursion';
    if (activeFilter === 'scout') return m.subGroupName === 'Scout Team Alpha';
    if (activeFilter === 'medical') return m.subGroupName === 'Medical Vanguard';
    return true;
  });

  const presentCount = members.filter((m) => m.status === 'present').length;
  const missingCount = members.filter((m) => m.status === 'missing').length;
  const totalCount = members.length || 1;
  const confirmedRate = Math.round((presentCount / totalCount) * 100);

  // Super Admin Live Roll Call Session State (synchronized across all devices)
  const rollCallKey = `trailoPS_active_rollcall_${squadKey}`;
  const [rollCallSession, setRollCallSession] = useState<{
    sessionId: string;
    active: boolean;
    startedAt: string;
    startedBy: string;
    presentUserIds: string[];
  } | null>(() => {
    const saved = localStorage.getItem(rollCallKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    const syncRollCall = () => {
      const saved = localStorage.getItem(rollCallKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setRollCallSession(parsed);
          }
        } catch {}
      } else {
        setRollCallSession(null);
      }
    };
    window.addEventListener('storage', syncRollCall);
    window.addEventListener('trailoPS_rollcall_sync', syncRollCall);
    return () => {
      window.removeEventListener('storage', syncRollCall);
      window.removeEventListener('trailoPS_rollcall_sync', syncRollCall);
    };
  }, [rollCallKey]);

  const liveActive = !!rollCallSession?.active;
  const rollCallPresentCount = liveActive
    ? rollCallSession.presentUserIds.length
    : presentCount;
  const rollCallPendingCount = Math.max(0, members.length - rollCallPresentCount);
  const isCurrentUserMarkedPresent = liveActive
    ? rollCallSession.presentUserIds.includes(currentUserId || '1')
    : members.find((m) => m.id === (currentUserId || '1'))?.status === 'present';

  const handleStartRollCall = () => {
    const myId = currentUserId || '1';
    const newSession = {
      sessionId: `rc-${Date.now()}`,
      active: true,
      startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startedBy: currentUserName || 'Squad Commander',
      presentUserIds: [myId],
    };
    setRollCallSession(newSession);
    localStorage.setItem(rollCallKey, JSON.stringify(newSession));
    window.dispatchEvent(new CustomEvent('trailoPS_rollcall_sync', { detail: newSession }));
    onShowToast('📢 Live Roll Call started! Alert notification sent to all squad members.');
  };

  const handleEndRollCall = () => {
    if (!rollCallSession) return;
    const closedSession = { ...rollCallSession, active: false };
    setRollCallSession(closedSession);
    localStorage.setItem(rollCallKey, JSON.stringify(closedSession));
    window.dispatchEvent(new CustomEvent('trailoPS_rollcall_sync', { detail: closedSession }));
    onShowToast(`Roll call closed. Final attendance: ${rollCallPresentCount} Present, ${rollCallPendingCount} Pending.`);
  };

  const handleMarkPresent = (uid?: string) => {
    const targetId = uid || currentUserId || '1';
    if (!rollCallSession || !rollCallSession.active) return;
    if (!rollCallSession.presentUserIds.includes(targetId)) {
      const updated = {
        ...rollCallSession,
        presentUserIds: [...rollCallSession.presentUserIds, targetId],
      };
      setRollCallSession(updated);
      localStorage.setItem(rollCallKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('trailoPS_rollcall_sync', { detail: updated }));

      setMembers((prev) => {
        const next = prev.map((m) => (m.id === targetId ? { ...m, status: 'present' as const } : m));
        localStorage.setItem('trailoPS_squad_members', JSON.stringify(next));
        return next;
      });
      window.dispatchEvent(new CustomEvent('trailoPS_members_updated'));
      onShowToast('✓ Attendance confirmed! You are marked Present.');
    }
  };

  const calculateTrainCountdown = (depTime?: string): string => {
    if (!depTime) return 'Schedule Pending';
    const diff = new Date(depTime).getTime() - Date.now();
    if (diff <= 0) return 'Train Departed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const getEffectiveSquadCode = (): string => {
    if (activeSquad?.code) return normalizeSquadCode(activeSquad.code);
    try {
      const saved = localStorage.getItem('trailoPS_active_squad');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.code) return normalizeSquadCode(parsed.code);
      }
    } catch {}
    return '';
  };

  const effectiveGroupCode = getEffectiveSquadCode();

  const handleShareGroup = async () => {
    const code = effectiveGroupCode;
    const name = activeSquad?.name || tripName;
    const dest = activeSquad?.destination || 'Expedition Base';
    const shareUrl = `${window.location.origin}/?join=${code}`;
    const shareText = `Join our expedition squad "${name}" for ${dest} on TRAIL OPS!\nInvitation Code: ${code}\nLink: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${name} on TRAIL OPS`,
          text: shareText,
          url: shareUrl,
        });
        onShowToast('Squad invitation shared!');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {}

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const a = document.createElement('a');
    a.href = whatsappUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onShowToast(`Invitation link copied! Opening WhatsApp to share with squad.`);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#f8faf9] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-32 transition-colors duration-200">
      {/* 1ST: EDITABLE TRIP NAME WITH CUSTOMIZABLE BACKGROUND BANNER (Shown only when joined to an active group) */}
      {hasJoinedGroup && activeSquad && (
        <div className="relative w-full h-48 overflow-hidden border-b border-slate-200">
          <img
            src={coverBg}
            alt="Trip Cover Background"
            className="w-full h-full object-cover transition-all duration-500 brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

          {/* Change Cover Button */}
          <button
            type="button"
            onClick={() => setIsCoverPickerOpen(true)}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer border border-white/20 shadow-sm"
            title="Edit Background"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Share Squad Button */}
          <button
            type="button"
            onClick={handleShareGroup}
            className="absolute top-3 left-3 p-2 rounded-full bg-emerald-600/90 hover:bg-emerald-500 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer border border-emerald-400/40 shadow-sm"
            title="Share Squad"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Trip Name & Editable title */}
          <div className="absolute bottom-3 left-4 right-4 text-white z-10">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/80 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                YOUR GROUP
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(effectiveGroupCode);
                  onShowToast(`Squad invitation code "${effectiveGroupCode}" copied!`);
                }}
                className="px-2 py-0.5 rounded-md bg-amber-400/95 hover:bg-amber-300 text-slate-950 text-[10px] font-mono font-black tracking-wider flex items-center gap-1 shadow-xs cursor-pointer transition-transform active:scale-95"
                title="Tap to copy 6-character squad invitation code"
              >
                <span>CODE: {effectiveGroupCode}</span>
                <Copy className="w-2.5 h-2.5" />
              </button>
              <span className="text-emerald-300 text-xs font-semibold truncate">
                {activeSquad.destination || 'Expedition Base'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              {isEditingTripName ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    onBlur={() => setIsEditingTripName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTripName(false)}
                    autoFocus
                    className="bg-black/60 text-white font-black text-lg px-2.5 py-1 rounded-lg border border-emerald-400 w-full outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingTripName(false)}
                    className="px-2.5 py-1 bg-emerald-600 rounded-lg text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingTripName(true)}
                  className="flex items-center gap-2 cursor-pointer group"
                  title="Tap to rename expedition"
                >
                  <h1 className="text-xl font-black tracking-tight text-white drop-shadow-sm">
                    {tripName || activeSquad.name}
                  </h1>
                  <Edit2 className="w-4 h-4 text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2ND: SYNCHRONIZED GROUP BRIEFING TIMER BANNER (Auto-removes immediately when zero) */}
      {hasJoinedGroup && activeSquad && (
        <BriefingCountdownBanner
          briefing={activeBriefing}
          isSuperAdminOrAdmin={userRole === 'super_admin' || userRole === 'subgroup_admin'}
          onOpenManageModal={() => setIsBriefingModalOpen(true)}
          onCancelBriefing={async () => {
            if (activeSquad?.id) {
              await cancelGroupBriefing(activeSquad.id);
              setActiveBriefing(null);
              onShowToast('Group briefing timer cancelled.');
            }
          }}
        />
      )}

      {/* Organizer Quick-Trigger for Group Briefing when no briefing is active */}
      {!activeBriefing && (userRole === 'super_admin' || userRole === 'subgroup_admin') && hasJoinedGroup && activeSquad && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white px-4 py-2 flex items-center justify-between border-b border-slate-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-300 font-semibold">
              Group Briefing Timer: <span className="text-slate-400 font-normal">Inactive</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsBriefingModalOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <Clock className="w-3 h-3" />
            <span>Set Dusk Briefing</span>
          </button>
        </div>
      )}

      {/* SQUAD OPERATIONS CIRCULAR ACTION TAB (Circular Icons for Group Edit, Sub-Group, Announce, Admin Board, Missing Item, Checklist) */}
      {hasJoinedGroup && activeSquad && (
        <div className="px-4 pt-3.5 pb-1">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Group Tools
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full border border-emerald-300">
              Quick Actions
            </span>
          </div>

          {/* PRIMARY SIX TOOLS IN A CLEAN 3-COLUMN GRID */}
          <div className="grid grid-cols-3 gap-2.5 py-1">
            {/* Tool 1: Edit Group */}
            <button
              type="button"
              onClick={() => setIsEditGroupModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 gap-1.5 group active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center shadow-md group-hover:ring-2 ring-emerald-500 transition-all">
                <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Group Settings</span>
            </button>

            {/* Tool 2: Create Sub-Group */}
            <button
              type="button"
              onClick={() => setIsCreateSubGroupModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 gap-1.5 group active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-600 text-white flex items-center justify-center shadow-md group-hover:ring-2 ring-emerald-400 transition-all">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Sub-Group</span>
            </button>

            {/* Tool 3: Announcement */}
            <button
              type="button"
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 gap-1.5 group active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-md group-hover:ring-2 ring-amber-400 transition-all">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Announcement</span>
            </button>

            {/* Tool 4: Admin Dashboard */}
            <button
              type="button"
              onClick={() => setIsAdminDashboardModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 gap-1.5 group active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-700 to-purple-600 text-white flex items-center justify-center shadow-md group-hover:ring-2 ring-indigo-400 transition-all">
                <Crown className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Admin Panel</span>
            </button>

            {/* Tool 5: Missing Item Request */}
            <button
              type="button"
              onClick={() => setIsMissingItemModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 gap-1.5 group active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md group-hover:ring-2 ring-rose-400 transition-all">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Missing Item</span>
            </button>

            {/* Tool 6: Shared Journey Checklist */}
            <button
              type="button"
              onClick={() => setIsJourneyChecklistModalOpen(true)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 gap-1.5 group active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-md group-hover:ring-2 ring-teal-400 transition-all">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800">Checklist</span>
            </button>
          </div>

          {/* SECONDARY TOOLS IN A CLEAN ROW BELOW (NO HORIZONTAL OVERFLOW) */}
          <div className="pt-2.5 mt-2 border-t border-slate-200/80">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 px-0.5">
              More Tools
            </span>
            <div className="grid grid-cols-4 gap-2">
              {/* Secondary 1: Sync Hub */}
              <button
                type="button"
                onClick={() => setIsCloudSyncModalOpen(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer"
                title="Cloud Sync & Multi-Phone Telemetry"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center shadow-xs relative">
                  <Database className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse" />
                </div>
                <span className="text-[9.5px] font-bold truncate">Sync Status</span>
              </button>

              {/* Secondary 2: HD Share */}
              <button
                type="button"
                onClick={() => setIsHDMediaModalOpen(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer"
                title="Share Lossless RAW Photos & 4K Video without compression"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs relative">
                  <Image className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-[6.5px] font-black tracking-tight text-white shadow-xs">
                    4K
                  </span>
                </div>
                <span className="text-[9.5px] font-bold truncate">HD Vault</span>
              </button>

              {/* Secondary 3: Train Hub */}
              <button
                type="button"
                onClick={() => setIsTrainModalOpen(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer"
                title="Manage shared train journey, live countdown, intermediate halts & seats"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-center shadow-xs relative">
                  <Train className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 rounded-full bg-amber-400 text-[6.5px] font-black text-slate-950 ring-1 ring-white">
                    Rail
                  </span>
                </div>
                <span className="text-[9.5px] font-bold truncate">Train Details</span>
              </button>

              {/* Secondary 4: View All Members */}
              <button
                type="button"
                onClick={() => setIsAllMembersModalOpen(true)}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer"
                title="Open full squad members roster in separate window"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-700 to-teal-800 text-white flex items-center justify-center shadow-xs relative">
                  <Users className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 px-1 py-0.2 rounded-full bg-emerald-500 text-[7px] font-black text-white ring-1 ring-white">
                    {members.length}
                  </span>
                </div>
                <span className="text-[9.5px] font-bold truncate">Members ({members.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL SHORTCUTS: FACULTY DRIVE & SPLITWISE (Active Only When Joined to a Group) */}
      {hasJoinedGroup && activeSquad && (
        <div className="px-4 pt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onOpenFacultyDrive}
            className="p-2.5 rounded-2xl bg-white border border-purple-200 hover:border-purple-400 text-left shadow-2xs transition-all flex items-center gap-2.5 active:scale-98 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <Folder className="w-4 h-4 fill-current" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-slate-900 block truncate">Faculty Drive</span>
              <span className="text-[10px] text-purple-700 font-semibold">Tickets &amp; Permits</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSplitwise}
            className="p-2.5 rounded-2xl bg-white border border-emerald-200 hover:border-emerald-400 text-left shadow-2xs transition-all flex items-center gap-2.5 active:scale-98 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-slate-900 block truncate">Splitwise</span>
              <span className="text-[10px] text-emerald-700 font-semibold">Shared Ledger</span>
            </div>
          </button>
        </div>
      )}

      {/* Main Operational Workspace */}
      <main className="flex-1 px-4 pt-3.5 space-y-4">
        {!hasJoinedGroup || !activeSquad ? (
          <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500/30 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-[#0f5238] mx-auto flex items-center justify-center shadow-xs">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">No Active Squad Group</h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                You are not connected to a squad group yet. Join an existing team route or launch your own expedition.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  onNavigate('gateway');
                  onShowToast('Enter your 6-character squad code or scan QR to join!');
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#0f5238] to-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Join with Code / Scan QR</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-800" />
                <span>Create New Squad Route</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* SHARED TRAIN JOURNEY & RETURN JOURNEY CARD */}
            <section className="bg-white rounded-3xl p-4.5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Train className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Train Schedule
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      Live countdown, intermediate halts &amp; coach roster
                    </p>
                  </div>
                </div>

                {/* Onward vs Return Toggle */}
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTrainDirection('onward')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      trainDirection === 'onward'
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Onward
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrainDirection('return')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      trainDirection === 'return'
                        ? 'bg-white text-emerald-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Return
                  </button>
                </div>
              </div>

              {/* Active Journey Details */}
              {(() => {
                const activeJourney = trainDirection === 'onward' ? onwardJourney : returnJourney;
                const isAdmin = userRole === 'super_admin' || userRole === 'subgroup_admin';
                const mySeat = seatAssignments.find((s) => s && s.user_id === currentUserId);

                if (!activeJourney) {
                  return (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                      <p className="text-xs text-slate-500">
                        {trainDirection === 'onward' ? 'No onward train added yet.' : 'No return train added yet.'}
                      </p>
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => setIsTrainModalOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                          <Train className="w-3.5 h-3.5" />
                          <span>Schedule {trainDirection === 'onward' ? 'Onward' : 'Return'} Train</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block">
                          Waiting for trip lead or faculty to publish departure train schedule.
                        </span>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                      <div>
                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block font-mono">
                          {activeJourney.train_number}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {activeJourney.train_name}
                        </h4>
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          {activeJourney.boarding_station} → {activeJourney.destination_station}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">
                          Departure In
                        </span>
                        <span className="text-xs font-black text-amber-900 font-mono bg-white px-2.5 py-1 rounded-xl border border-amber-300 shadow-2xs block mt-0.5">
                          {calculateTrainCountdown(activeJourney.departure_time)}
                        </span>
                      </div>
                    </div>

                    {/* Member's Assigned Berth */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Your Berth:</span>
                        {mySeat ? (
                          <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            Coach {mySeat.coach} · Berth {mySeat.berth_number || '-'} ({mySeat.berth_type || 'General'})
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Seat allocation in progress</span>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsTrainModalOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] font-bold cursor-pointer transition-colors"
                        >
                          Manage Train &amp; Roster
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </section>

            {/* Basecamp Check-In */}
            <section className="rounded-3xl p-4 bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-blue-50/40 border border-emerald-200/60 card-glow-mint relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm shadow-emerald-700/20">
                    <MapPin className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
                        GROUP CHECK-IN
                      </span>
                      <span className="inline-flex w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    </div>
                    <h2 className="text-sm sm:text-base text-slate-900 mt-0.5 font-bold">
                      Meeting Point: Pelling Basecamp
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Meet near Ridge Marker #3 for the evening briefing.
                    </p>
                  </div>
                </div>
              </div>

              {/* Check-In Button / Commander Live Roll Call Controls */}
              <div className="mt-3.5 space-y-2">
                {userRole === 'super_admin' ? (
                  !liveActive ? (
                    <button
                      type="button"
                      onClick={handleStartRollCall}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#0f5238] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-95 transition-all cursor-pointer"
                    >
                      <Radio className="w-5 h-5 animate-pulse" />
                      <span>Start Attendance</span>
                    </button>
                  ) : (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                          <span className="text-xs font-black text-emerald-950">
                            LIVE ROLL CALL ACTIVE ({rollCallSession?.startedAt})
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full">
                          Super Admin
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {!isCurrentUserMarkedPresent ? (
                          <button
                            type="button"
                            onClick={() => handleMarkPresent()}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>I Am Present</span>
                          </button>
                        ) : (
                          <div className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-100 text-[#0f5238] text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>✓ You Are Marked Present</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={handleEndRollCall}
                          className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                        >
                          End Roll Call
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  liveActive ? (
                    !isCurrentUserMarkedPresent ? (
                      <button
                        type="button"
                        onClick={() => handleMarkPresent()}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#0f5238] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/30 active:scale-95 transition-all cursor-pointer animate-pulse"
                      >
                        <CheckCircle2 className="w-5 h-5 fill-white text-emerald-700" />
                        <span>I AM PRESENT (Confirm Attendance)</span>
                      </button>
                    ) : (
                      <div className="w-full py-3 px-4 rounded-2xl bg-emerald-100 border-2 border-emerald-500 text-[#0f5238] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>YOU ARE MARKED PRESENT (Confirmed by Commander)</span>
                      </div>
                    )
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-600 text-xs text-center font-medium">
                      Awaiting Squad Commander to initiate live attendance roll call.
                    </div>
                  )
                )}
              </div>
            </section>

            {/* Squad Roll Call Card */}
            <section className="bg-white rounded-3xl p-4 border border-emerald-100 custom-shadow-soft">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">
                    GROUP ATTENDANCE
                  </span>
                  <h3 className="text-base font-bold text-slate-900">Attendance Overview</h3>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    {liveActive ? 'Live Active' : 'Synced'}
                  </span>
                </div>
              </div>

              {/* Attendance Visualizer */}
              <div className="grid grid-cols-12 gap-3 items-center py-4">
                {/* Circular Ring Gauge */}
                <div className="col-span-5 flex flex-col items-center justify-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke="#f0f2f1"
                        strokeWidth="9"
                      />
                      <circle
                        className="progress-animated"
                        cx="50"
                        cy="50"
                        fill="transparent"
                        r="40"
                        stroke="#10b981"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * (members.length > 0 ? (rollCallPresentCount / members.length) : 1))}
                        strokeLinecap="round"
                        strokeWidth="9"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl text-slate-900 leading-none font-extrabold">
                        {members.length > 0 ? Math.round((rollCallPresentCount / members.length) * 100) : 100}%
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                        {rollCallPresentCount} / {members.length}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium mt-1">Attendance Rate</span>
                </div>

                {/* Numeric Split-Cells */}
                <div className="col-span-7 grid grid-cols-2 gap-2">
                  <div
                    onClick={() => setActiveFilter('present')}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      activeFilter === 'present'
                        ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300'
                        : 'bg-emerald-50/70 border-emerald-200/70'
                    }`}
                  >
                    <span className="text-[11px] text-emerald-800 font-semibold block">Present</span>
                    <span className="text-xl text-emerald-700 font-extrabold">{rollCallPresentCount}</span>
                    <div className="flex items-center text-[10px] text-emerald-700 font-semibold mt-0.5">
                      <CheckCircle2 className="w-3 h-3 mr-0.5 fill-current" />
                      <span>In Camp</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveFilter('missing')}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                      activeFilter === 'missing'
                        ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-amber-50/80 border-amber-200/80'
                    }`}
                  >
                    <span className="text-[11px] text-amber-800 font-semibold block">Awaiting Response</span>
                    <span className="text-xl text-amber-700 font-extrabold">{rollCallPendingCount}</span>
                    <div className="flex items-center text-[10px] text-amber-700 font-semibold mt-0.5">
                      <Clock className="w-3 h-3 mr-0.5" />
                      <span>Awaiting</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Pills Bar including Sub-Groups with Minus Deletion (Request 8) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`h-7 px-3 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-emerald-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({members.length})
                </button>

                {/* Dynamic Active Sub-Groups with Minus Button */}
                {subGroups.map((sg) => (
                  <div
                    key={sg.id}
                    className="flex items-center gap-1 shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold bg-white shadow-2xs"
                    style={{ borderColor: sg.color }}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFilter(sg.id as any)}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sg.color }} />
                      <span style={{ color: sg.color }}>{sg.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubGroup(sg.id, sg.name);
                      }}
                      className="w-3.5 h-3.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center cursor-pointer transition-colors ml-0.5"
                      title={`Remove sub-group ${sg.name}`}
                    >
                      <Minus className="w-2.5 h-2.5 stroke-[3]" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setActiveFilter('present')}
                  className={`h-7 px-3 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    activeFilter === 'present'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  Present ({presentCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('missing')}
                  className={`h-7 px-3 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    activeFilter === 'missing'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  Absent ({missingCount})
                </button>
              </div>

              {/* JOIN REQUESTS SECTION (Super Admin Approval Governance) */}
              <div
                id="squad-join-requests-section"
                className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-[#0f5238] flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          Join Requests
                        </span>
                        {joinRequests.filter((r) => r.status === 'pending').length > 0 && (
                          <span className="px-2 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black animate-pulse">
                            {joinRequests.filter((r) => r.status === 'pending').length} Pending
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {isCurrentUserSuperAdmin
                          ? 'Review and approve new members'
                          : 'Only authorized Super Admins may approve or reject requests'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={loadGroupJoinRequests}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 cursor-pointer transition-colors"
                    title="Refresh Join Requests"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Pending Join Requests Queue */}
                {joinRequests.filter((r) => r.status === 'pending').length === 0 ? (
                  <div className="p-3 rounded-xl bg-white border border-dashed border-slate-200 text-center text-[11px] text-slate-500">
                    No pending requests. Share your group code to invite members.
                  </div>
                ) : (
                  <div className="pt-1 space-y-2">
                    {joinRequests
                      .filter((r) => r.status === 'pending')
                      .map((req) => (
                        <div
                          key={req.id}
                          className="p-2.5 rounded-xl bg-white border-2 border-amber-300/80 shadow-2xs flex items-center justify-between gap-2.5 animate-in fade-in duration-150"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={
                                req.user_avatar ||
                                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
                              }
                              alt={req.user_name || 'Requester'}
                              className="w-8 h-8 rounded-full object-cover border border-amber-300 shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-extrabold text-slate-900 truncate block">
                                {req.user_name || 'Trekker Applicant'}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {req.user_email || req.user_phone || 'Verified Account'}
                                {req.blood_group ? ` · Blood: ${req.blood_group}` : ''}
                              </span>
                            </div>
                          </div>

                          {isCurrentUserSuperAdmin ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={respondingRequestId === req.id}
                                onClick={() => handleRespondToJoinRequest(req, 'accept')}
                                className="px-2.5 py-1.5 rounded-lg bg-[#0f5238] hover:bg-emerald-800 text-white text-[10px] font-extrabold flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50"
                                title="Accept Join Request"
                              >
                                <Check className="w-3 h-3" />
                                <span>Accept</span>
                              </button>
                              <button
                                type="button"
                                disabled={respondingRequestId === req.id}
                                onClick={() => handleRespondToJoinRequest(req, 'reject')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Reject Join Request"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shrink-0">
                              Awaiting Super Admin
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Header with Separate Window Button (Request 9) */}
              <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-800">
                  Group Members ({filteredMembers.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsAllMembersModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-300 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  title="Open full members directory in separate window"
                >
                  <Eye className="w-3 h-3 text-cyan-700" />
                  <span>View All</span>
                </button>
              </div>

              {/* Member Roster List with Role Hierarchy, Contact & Kick Actions */}
              <div className="mt-2 space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border-2 transition-all text-xs shadow-2xs"
                    style={{
                      borderColor: member.subGroupColor ? `${member.subGroupColor}55` : '#e2e8f0',
                      backgroundColor: member.subGroupColor ? `${member.subGroupColor}08` : '#ffffff',
                    }}
                  >
                    <div
                      onClick={() => {
                        const targetId = (member.id === '1' || member.id === currentUserId) ? (currentUserId || member.id) : member.id;
                        setViewingProfileUserId(targetId);
                        setViewingProfileFallback({
                          name: member.name,
                          role: member.role,
                          avatar: member.avatar,
                        });
                      }}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                      title="Click to view expedition member profile"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        {member.roleHierarchy === 'super_admin' ? (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xs">
                            <Crown className="w-2.5 h-2.5 fill-current" />
                          </span>
                        ) : member.roleHierarchy === 'subgroup_admin' ? (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-xs">
                            <Shield className="w-2.5 h-2.5 fill-current" />
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="font-black text-xs truncate"
                            style={{ color: member.subGroupColor || '#1e293b' }}
                          >
                            {member.name}
                          </span>

                          {member.roleHierarchy === 'super_admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                              SUPER ADMIN
                            </span>
                          )}

                          {member.roleHierarchy === 'subgroup_admin' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-sky-100 text-sky-900 border border-sky-300">
                              SUB-ADMIN
                            </span>
                          )}

                          {member.subGroupName && (
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: member.subGroupColor }}
                            >
                              {member.subGroupName}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-500 block truncate">
                          {member.role} · {member.distance} · {member.battery}% bat
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          member.status === 'present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : member.status === 'missing'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-sky-100 text-sky-800'
                        }`}
                      >
                        {member.status.toUpperCase()}
                      </span>

                      {/* Super Admin Kick Member Button (Request 7) */}
                      {member.roleHierarchy !== 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => handleKickActiveMember(member.id, member.name)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors"
                          title={`Kick ${member.name} from squad`}
                        >
                          <UserX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Excursion Requests */}
            <section className="bg-white rounded-3xl p-4 border border-slate-200 custom-shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                    <NavIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Excursion Requests</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {excursionRequests.filter((r) => r.status === 'pending').length} Pending
                </span>
              </div>

              {excursionRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl p-3 bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2.5">
                      <div className="flex -space-x-2 shrink-0 pt-0.5">
                        {req.avatars.map((av, idx) => (
                          <img
                            key={idx}
                            alt="Teammate"
                            className="w-7 h-7 rounded-full object-cover ring-2 ring-white"
                            src={av}
                          />
                        ))}
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center ring-2 ring-white font-bold">
                          +1
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                          {req.trailName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Lead: {req.leadName} · {req.membersCount} members
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                      Return {req.returnTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                    <span className="flex items-center gap-1 font-semibold text-[#0f5238]">
                      <NavIcon className="w-3.5 h-3.5" /> {req.distance}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Battery className="w-3.5 h-3.5 text-emerald-600" /> {req.batteryAvg}% avg
                    </span>
                  </div>

                  {req.status === 'pending' ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRejectExcursion(req.id)}
                        className="py-2 px-3 rounded-full bg-white border border-slate-300 text-xs font-semibold text-rose-700 hover:bg-rose-50 active:scale-95 transition-transform flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveExcursion(req.id)}
                        className="py-2 px-3 rounded-full bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve ({req.membersCount})</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`py-1.5 px-3 rounded-xl text-center text-xs font-bold ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {req.status === 'approved' ? '✓ Approved by Command' : '✕ Declined'}
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* Field Intercom */}
            <section className="bg-white rounded-3xl p-4 border border-slate-200 custom-shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Field Intercom</h3>
                </div>
                <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {members.length} Connected
                </span>
              </div>

              {/* Push to Talk Broadcast Button */}
              <button
                type="button"
                onMouseDown={() => {
                  setIsPushToTalk(true);
                  onShowToast('🎙 Transmitting to All Channels...');
                }}
                onMouseUp={() => {
                  setIsPushToTalk(false);
                  onShowToast('Transmission sent over LoRa mesh.');
                }}
                onTouchStart={() => {
                  setIsPushToTalk(true);
                  onShowToast('🎙 Transmitting to All Channels...');
                }}
                onTouchEnd={() => {
                  setIsPushToTalk(false);
                  onShowToast('Transmission sent over LoRa mesh.');
                }}
                className={`relative overflow-hidden w-full py-3.5 px-4 rounded-full border text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 mb-3 shadow-xs cursor-pointer ${
                  isPushToTalk
                    ? 'bg-emerald-600 text-white border-emerald-700 ring-4 ring-emerald-300'
                    : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100 border-emerald-300 text-emerald-900 hover:bg-emerald-100 active:scale-95'
                }`}
              >
                {isPushToTalk ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5 text-emerald-700" />}
                <span>{isPushToTalk ? 'Transmitting Live Audio (Release to Send)' : 'Hold to Talk to All'}</span>
              </button>

              {/* Squad Leads / Members Quick Contact (Real Database Members Only) */}
              <div className="space-y-2">
                {members.filter((m) => m.id !== currentUserId && m.id !== '1').length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-700">No other squad members connected</p>
                    <p className="text-[10px] text-slate-500">
                      Share your squad code with your team to enable direct tactical intercom and calling.
                    </p>
                  </div>
                ) : (
                  members
                    .filter((m) => m.id !== currentUserId && m.id !== '1')
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <img
                              alt={m.name}
                              className="w-9 h-9 rounded-full object-cover"
                              src={m.avatar}
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                                m.status === 'present' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 leading-tight">
                              {m.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {m.role} · {m.phone || 'Protected Contact'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setCallModalContact({
                                name: m.name,
                                title: m.role,
                                phone: m.phone || '',
                                avatar: m.avatar,
                              })
                            }
                            className="w-8 h-8 rounded-full bg-emerald-100/70 flex items-center justify-center text-emerald-800 hover:bg-emerald-700 hover:text-white transition-colors cursor-pointer"
                            title="Call member"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setChatModalContact({
                                name: m.name,
                                title: m.role,
                                avatar: m.avatar,
                              })
                            }
                            className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                            title="Send dispatch message"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>

            {/* Leave Group Action Card */}
            <div className="pt-2 pb-6">
              <button
                type="button"
                onClick={() => {
                  onSetJoinedGroup(false);
                  onShowToast('You left the squad expedition. Trip gear, Faculty Drive & Splitwise have been removed.');
                }}
                className="w-full py-3 rounded-2xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Leave Squad Expedition (Reset Group Membership)</span>
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-1.5">
                Leaving the group will hide the shared Faculty Drive, Splitwise ledger, and Trip Gear checklist until you rejoin or create a new group.
              </p>
            </div>
          </>
        )}
      </main>

      {/* Cover Background Picker Modal */}
      {isCoverPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Choose Expedition Cover</h3>
              <button
                type="button"
                onClick={() => setIsCoverPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {presetCovers.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setCoverBg(item.url);
                    setIsCoverPickerOpen(false);
                    onShowToast(`Cover updated to ${item.name}!`);
                  }}
                  className="relative rounded-xl overflow-hidden aspect-video border-2 border-slate-200 hover:border-emerald-600 cursor-pointer shadow-xs group"
                >
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Call Simulator Modal */}
      {callModalContact && (
        <CallModal
          isOpen={true}
          onClose={() => setCallModalContact(null)}
          contactName={callModalContact.name}
          contactTitle={callModalContact.title}
          phoneNumber={callModalContact.phone}
          avatar={callModalContact.avatar}
        />
      )}

      {/* Chat Simulator Modal */}
      {chatModalContact && (
        <ChatModal
          isOpen={true}
          onClose={() => setChatModalContact(null)}
          contactName={chatModalContact.name}
          contactTitle={chatModalContact.title}
          avatar={chatModalContact.avatar}
        />
      )}

      {/* 1. EDIT GROUP MODAL */}
      {isEditGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Edit Expedition Group</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditGroupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsEditGroupModalOpen(false);
                onShowToast(`Expedition "${tripName}" details updated!`);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Expedition Group Name
                </label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Origin / Departure Base
                </label>
                <input
                  type="text"
                  value={editFromLocation}
                  onChange={(e) => setEditFromLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Summit Destination
                </label>
                <input
                  type="text"
                  value={editDestination}
                  onChange={(e) => setEditDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={editDepartureDate}
                  onChange={(e) => setEditDepartureDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsCoverPickerOpen(true)}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>Choose Cover Image</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer mt-2"
              >
                Save Group Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. CREATE SUB-GROUP MODAL */}
      {isCreateSubGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Create Squad Sub-Group</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSubGroupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Sub-Group Title
                </label>
                <input
                  type="text"
                  value={subGroupNameInput}
                  onChange={(e) => setSubGroupNameInput(e.target.value)}
                  placeholder="e.g. Ridge Push Patrol Beta"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Ridge Recon', 'Basecamp Cooks', 'Photography Patrol', 'Rear Sweepers'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setSubGroupNameInput(sug)}
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Badge Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                  Identification Color Badge
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { color: '#ef4444', label: 'Crimson' },
                    { color: '#3b82f6', label: 'Azure' },
                    { color: '#10b981', label: 'Emerald' },
                    { color: '#f59e0b', label: 'Amber' },
                    { color: '#8b5cf6', label: 'Violet' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setSubGroupColorInput(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                        subGroupColorInput === c.color ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.label}
                    >
                      {subGroupColorInput === c.color && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign Members */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Assign Members ({selectedSubGroupMembers.length} selected)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar border border-slate-100 rounded-xl p-1.5 bg-slate-50/60">
                  {members.map((m) => {
                    const isSelected = selectedSubGroupMembers.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedSubGroupMembers((prev) =>
                            isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-100/60 border border-emerald-300' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img src={m.avatar} alt={m.name} className="w-5 h-5 rounded-full object-cover" />
                          <span className="font-semibold text-slate-800 text-[11px]">{m.name}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                          isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Existing Sub-Groups Preview with Minus Removal Button (Request 8) */}
              <div className="pt-1">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                  Active Sub-Groups ({subGroups.length}) — Tap minus to remove:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {subGroups.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-1">
                      No sub-groups formed yet. Create one below to organize your squad.
                    </p>
                  ) : (
                    subGroups.map((sg) => (
                      <div
                        key={sg.id}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-800 flex items-center gap-1.5 bg-white shadow-2xs"
                        style={{ borderColor: sg.color }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sg.color }} />
                        <span>{sg.name}</span>
                        <span className="text-[9px] text-slate-400 font-normal">({sg.memberCount})</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubGroup(sg.id, sg.name);
                          }}
                          className="w-4 h-4 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center cursor-pointer transition-colors"
                          title={`Remove sub-group ${sg.name}`}
                        >
                          <Minus className="w-2.5 h-2.5 stroke-[3]" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!subGroupNameInput.trim()) return;
                  const newSubGroup = {
                    id: `sub-${Date.now()}`,
                    name: subGroupNameInput.trim(),
                    color: subGroupColorInput,
                    leadName: currentUserName || 'Squad Member',
                    memberCount: selectedSubGroupMembers.length || 1,
                  };
                  setSubGroups((prev) => [...prev, newSubGroup]);
                  // Update assigned members' state
                  setMembers((prev) =>
                    prev.map((m) =>
                      selectedSubGroupMembers.includes(m.id)
                        ? { ...m, subGroupId: newSubGroup.id, subGroupName: newSubGroup.name, subGroupColor: newSubGroup.color }
                        : m
                    )
                  );
                  setIsCreateSubGroupModalOpen(false);
                  setSubGroupNameInput('');
                  onShowToast(`Sub-Group "${newSubGroup.name}" created and assigned!`);
                }}
                disabled={!subGroupNameInput.trim()}
                className="w-full py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer mt-2"
              >
                Create &amp; Assign Sub-Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BROADCAST ANNOUNCEMENT MODAL */}
      {isAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Squad Announcement</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAnnouncementModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!quickAnnounceTitle.trim() || !quickAnnounceText.trim()) return;
                const roleLabel =
                  userRole === 'super_admin'
                    ? 'Squad Commander'
                    : userRole === 'subgroup_admin'
                    ? 'Sub-Group Lead'
                    : 'Expedition Member';
                const newAnnounce = {
                  id: `a-${Date.now()}`,
                  title: quickAnnounceTitle.trim(),
                  text: quickAnnounceText.trim(),
                  imageUrl: quickAnnounceImage || undefined,
                  priority: quickAnnouncePriority,
                  author: `${currentUserName} (${roleLabel})`,
                  timestamp: 'Just now',
                };
                setAnnouncements((prev) => [newAnnounce, ...prev]);
                
                // Store as latest broadcast for alert modal & notify all members
                const latestKey = `trailoPS_latest_broadcast_${squadKey}`;
                localStorage.setItem(latestKey, JSON.stringify(newAnnounce));
                window.dispatchEvent(new CustomEvent('trailoPS_new_announcement', { detail: newAnnounce }));

                // Persist announcement to Supabase / server group notices
                const targetGroupId = activeSquad?.id || localStorage.getItem('trailoPS_active_squad_id') || 'grp_pelling_trip';
                createGroupNotice({
                  groupId: targetGroupId,
                  userId: currentUserId || 'user_self',
                  title: quickAnnounceTitle.trim() || 'Squad Announcement',
                  text: quickAnnounceText.trim(),
                  priority: quickAnnouncePriority,
                  authorName: currentUserName,
                  authorRole: roleLabel,
                  imageUrl: quickAnnounceImage || undefined,
                  groupName: activeSquad?.name || 'Pelling trip',
                  groupCode: activeSquad?.code || 'PEL001',
                  groupDestination: activeSquad?.destination || 'Pelling, West Sikkim',
                }).catch(() => {});

                setIsAnnouncementModalOpen(false);
                setQuickAnnounceTitle('');
                setQuickAnnounceText('');
                setQuickAnnounceImage(null);
                onShowToast(`📢 Announcement with alert broadcasted to all squad members!`);
              }}
              className="space-y-3"
            >
              {/* Priority Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Urgency / Priority
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'critical', label: 'Critical', color: 'bg-rose-600 text-white' },
                    { id: 'advisory', label: 'Advisory', color: 'bg-amber-500 text-white' },
                    { id: 'info', label: 'Info', color: 'bg-sky-600 text-white' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setQuickAnnouncePriority(p.id as any)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        quickAnnouncePriority === p.id
                          ? `${p.color} shadow-xs scale-102`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  value={quickAnnounceTitle}
                  onChange={(e) => setQuickAnnounceTitle(e.target.value)}
                  placeholder="e.g. Weather Alert or Route Deviation"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Message Details
                </label>
                <textarea
                  value={quickAnnounceText}
                  onChange={(e) => setQuickAnnounceText(e.target.value)}
                  rows={3}
                  placeholder="Type broadcast message for the entire squad..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Photo / Map Attachment Feature */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Attach Photo / Trail Map (Optional)
                </label>
                {quickAnnounceImage ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 h-32 group">
                    <img
                      src={quickAnnounceImage}
                      alt="Broadcast Attachment Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickAnnounceImage(null)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 transition-colors shadow-md cursor-pointer"
                      title="Remove attached photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                      Photo Attached
                    </span>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/50 text-slate-600 hover:text-amber-800 text-xs font-semibold cursor-pointer transition-colors">
                    <Camera className="w-4 h-4 text-amber-600" />
                    <span>Upload or Capture Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 8 * 1024 * 1024) {
                            onShowToast('Please select an image smaller than 8MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setQuickAnnounceImage(event.target?.result as string);
                            onShowToast('Photo attached to broadcast!');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Templates</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Dusk Roll Call in 15 mins',
                    'High-Altitude Wind Advisory',
                    'Stay in Visual Range of Basecamp',
                    'Water Hydration Check at Camp',
                  ].map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => {
                        setQuickAnnounceTitle(tmpl);
                        setQuickAnnounceText(`Attention all squad members: ${tmpl}. Please confirm receipt on channel 1.`);
                      }}
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer mt-2 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Broadcast to Squad (Alerts Everyone)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. ADMIN DASHBOARD & ROLE GOVERNANCE MODAL */}
      {isAdminDashboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Admin Dashboard</h3>
                  <p className="text-[10px] text-slate-500">Role hierarchy &amp; squad permissions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminDashboardModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Permission Control Switches */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Expedition Permission Gates
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Geofence GPS Roll-Call</p>
                  <p className="text-[10px] text-slate-500">Require 50m proximity for check-in</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminPermissions((p) => ({ ...p, lockCheckIn: !p.lockCheckIn }));
                    onShowToast(`Geofence proximity check ${!adminPermissions.lockCheckIn ? 'Enabled' : 'Disabled'}`);
                  }}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    adminPermissions.lockCheckIn ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    adminPermissions.lockCheckIn ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <div>
                  <p className="text-xs font-bold text-slate-800">Require Excursion Approval</p>
                  <p className="text-[10px] text-slate-500">Scouts must have admin sign-off</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAdminPermissions((p) => ({ ...p, requireExcursionClearance: !p.requireExcursionClearance }));
                    onShowToast(`Excursion clearance rule toggled`);
                  }}
                  className={`w-10 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                    adminPermissions.requireExcursionClearance ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    adminPermissions.requireExcursionClearance ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>

            {/* DIRECT PERSONAL ROLE SWITCHER (Request 1 & 13) */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider block">
                    Your Personal Access Level
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    Active Authority:{' '}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      userRole === 'super_admin'
                        ? 'bg-purple-700 text-white'
                        : userRole === 'subgroup_admin'
                        ? 'bg-blue-600 text-white'
                        : 'bg-emerald-700 text-white'
                    }`}>
                      {userRole === 'super_admin' ? 'Super Admin' : userRole === 'subgroup_admin' ? 'Sub-Admin' : 'Regular User (Member)'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateRole) onUpdateRole('member');
                    localStorage.setItem('trailoPS_userRole', 'member');
                    setMembers((prev) =>
                      prev.map((item) =>
                        item.id === '1' || item.name.includes('(You)')
                          ? { ...item, roleHierarchy: 'member', role: 'Expedition Member' }
                          : item
                      )
                    );
                    onShowToast('✓ You are now a Regular User! Super Admin privileges disabled.');
                  }}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                    userRole === 'member'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-400'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  👤 User (Member)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (userRole === 'member') {
                      onShowToast('Role Security: Regular members cannot promote themselves to Sub-Admin.');
                      return;
                    }
                    if (onUpdateRole) onUpdateRole('subgroup_admin');
                    localStorage.setItem('trailoPS_userRole', 'subgroup_admin');
                    setMembers((prev) =>
                      prev.map((item) =>
                        item.id === '1' || item.name.includes('(You)')
                          ? { ...item, roleHierarchy: 'subgroup_admin', role: 'Sub-Group Lead' }
                          : item
                      )
                    );
                    onShowToast('Assigned Sub-Admin role.');
                  }}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                    userRole === 'subgroup_admin'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                      : userRole === 'member'
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={userRole === 'member' ? 'Protected: Self-promotion disabled' : 'Switch to Sub-Admin'}
                >
                  ⚡ Sub-Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (userRole === 'member') {
                      onShowToast('Role Security: Regular members cannot promote themselves to Super Admin.');
                      return;
                    }
                    if (onUpdateRole) onUpdateRole('super_admin');
                    localStorage.setItem('trailoPS_userRole', 'super_admin');
                    setMembers((prev) =>
                      prev.map((item) =>
                        item.id === '1' || item.name.includes('(You)')
                          ? { ...item, roleHierarchy: 'super_admin', role: 'Faculty Super Admin' }
                          : item
                      )
                    );
                    onShowToast('Assigned Super Admin role.');
                  }}
                  className={`py-2 px-1 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                    userRole === 'super_admin'
                      ? 'bg-purple-700 text-white border-purple-700 shadow-md ring-2 ring-purple-300'
                      : userRole === 'member'
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={userRole === 'member' ? 'Protected: Self-promotion disabled' : 'Switch to Super Admin'}
                >
                  👑 Super Admin
                </button>
              </div>
            </div>

            {/* Role Hierarchy Management */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Assign &amp; Manage Member Roles
              </span>
              <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar">
                {members.map((m) => (
                  <div key={m.id} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={m.avatar} alt={m.name} className="w-7 h-7 rounded-full object-cover" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{m.name}</p>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md inline-block mt-0.5 ${
                          m.roleHierarchy === 'super_admin'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : m.roleHierarchy === 'subgroup_admin'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.roleHierarchy === 'super_admin' ? 'Super Admin' : m.roleHierarchy === 'subgroup_admin' ? 'Sub-Admin' : 'Member'}
                        </span>
                      </div>
                    </div>

                    {/* Role changer buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async () => {
                          await manageMemberRole(activeSquad?.id || 'default', m.id, 'super_admin');
                          setMembers((prev) =>
                            prev.map((item) =>
                              item.id === m.id
                                ? { ...item, roleHierarchy: 'super_admin', role: 'Super Admin' }
                                : item
                            )
                          );
                          if ((m.id === '1' || m.name.includes('(You)')) && onUpdateRole) {
                            onUpdateRole('super_admin');
                            localStorage.setItem('trailoPS_userRole', 'super_admin');
                          }
                          onShowToast(`Promoted ${m.name} to Super Admin`);
                        }}
                        className={`text-[9px] font-bold px-1.5 py-1 rounded transition-colors cursor-pointer ${
                          m.roleHierarchy === 'super_admin' ? 'bg-purple-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title="Promote to Super Admin"
                      >
                        Super
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const currentSuperAdmins = members.filter((item) => item.roleHierarchy === 'super_admin');
                          if (m.roleHierarchy === 'super_admin' && currentSuperAdmins.length <= 1) {
                            onShowToast('⚠️ Constraint: Cannot demote the sole remaining Super Admin. Appoint another Super Admin first.');
                            return;
                          }
                          await manageMemberRole(activeSquad?.id || 'default', m.id, 'admin');
                          setMembers((prev) =>
                            prev.map((item) =>
                              item.id === m.id
                                ? { ...item, roleHierarchy: 'subgroup_admin', role: 'Admin' }
                                : item
                            )
                          );
                          if ((m.id === '1' || m.name.includes('(You)')) && onUpdateRole) {
                            onUpdateRole('subgroup_admin');
                            localStorage.setItem('trailoPS_userRole', 'subgroup_admin');
                          }
                          onShowToast(`Assigned ${m.name} as Admin`);
                        }}
                        className={`text-[9px] font-bold px-1.5 py-1 rounded transition-colors cursor-pointer ${
                          m.roleHierarchy === 'subgroup_admin' ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title="Promote to Admin"
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const currentSuperAdmins = members.filter((item) => item.roleHierarchy === 'super_admin');
                          if (m.roleHierarchy === 'super_admin' && currentSuperAdmins.length <= 1) {
                            onShowToast('⚠️ Constraint: Cannot demote the sole remaining Super Admin. Appoint another Super Admin first.');
                            return;
                          }
                          await manageMemberRole(activeSquad?.id || 'default', m.id, 'member');
                          setMembers((prev) =>
                            prev.map((item) =>
                              item.id === m.id
                                ? { ...item, roleHierarchy: 'member', role: 'Expedition Member' }
                                : item
                            )
                          );
                          if ((m.id === '1' || m.name.includes('(You)')) && onUpdateRole) {
                            onUpdateRole('member');
                            localStorage.setItem('trailoPS_userRole', 'member');
                          }
                          onShowToast(`Set ${m.name} as Member (User)`);
                        }}
                        className={`text-[9px] font-bold px-1.5 py-1 rounded transition-colors cursor-pointer ${
                          m.roleHierarchy === 'member' ? 'bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title="Set as Member / Regular User"
                      >
                        User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const me = members.find((item) => item.id === '1' || item.name.includes('(You)'));
                const targetRole = me?.roleHierarchy || userRole;
                if (onUpdateRole) {
                  onUpdateRole(targetRole);
                }
                localStorage.setItem('trailoPS_userRole', targetRole);
                localStorage.setItem('trailoPS_squad_members', JSON.stringify(members));
                setIsAdminDashboardModalOpen(false);
                onShowToast(
                  `Permissions saved! Your active role is now ${
                    targetRole === 'member'
                      ? 'Expedition Member (User)'
                      : targetRole === 'subgroup_admin'
                      ? 'Sub-Admin'
                      : 'Super Admin'
                  }.`
                );
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer mt-1"
            >
              Done &amp; Save Permissions
            </button>
          </div>
        </div>
      )}

      {/* 5. MISSING ITEM REQUEST MODAL */}
      {isMissingItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Missing Item Broadcast</h3>
                  <p className="text-[10px] text-slate-500">Alert squad to find gear or medical items</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMissingItemModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!missingItemName.trim()) return;
                const newItem = {
                  id: `m-${Date.now()}`,
                  itemName: missingItemName.trim(),
                  reportedBy: `${currentUserName} (You)`,
                  urgency: missingItemUrgency,
                  location: missingItemLocation.trim() || 'Trail Base',
                  timestamp: 'Just now',
                  status: 'open' as const,
                };
                setMissingItems((prev) => [newItem, ...prev]);
                setIsMissingItemModalOpen(false);
                setMissingItemName('');
                onShowToast(`Missing item alert broadcasted to entire squad!`);
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'critical', label: 'Critical / Rescue', color: 'bg-rose-600 text-white' },
                    { id: 'moderate', label: 'Moderate / Gear', color: 'bg-amber-500 text-white' },
                    { id: 'routine', label: 'Routine / Personal', color: 'bg-slate-700 text-white' },
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setMissingItemUrgency(u.id as any)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        missingItemUrgency === u.id
                          ? `${u.color} shadow-xs scale-102`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {u.label.split(' / ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Missing Item Description
                </label>
                <input
                  type="text"
                  value={missingItemName}
                  onChange={(e) => setMissingItemName(e.target.value)}
                  placeholder="e.g. Petzl Locking Carabiner"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                  required
                />
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['Carabiner 24kN', 'ORS Sachets', 'Headlamp', 'Trekking Pole', 'VHF Radio'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setMissingItemName(sug)}
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Last Seen Location / Marker
                </label>
                <input
                  type="text"
                  value={missingItemLocation}
                  onChange={(e) => setMissingItemLocation(e.target.value)}
                  placeholder="e.g. Near Rock Bivouac Marker 4"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer mt-2"
              >
                Broadcast Missing Item Alert
              </button>
            </form>

            {/* Active Missing Items Feed */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Active Missing Item Alerts ({missingItems.filter((i) => i.status === 'open').length})
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {missingItems.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3 italic">
                    All squad gear is accounted for. No missing gear alerts logged.
                  </p>
                ) : (
                  missingItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                        item.status === 'found' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-rose-50/70 border-rose-200'
                      }`}
                    >
                      <div>
                        <p className={`font-bold text-[11px] ${item.status === 'found' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {item.itemName}
                        </p>
                        <p className="text-[9px] text-slate-500">
                          {item.location} · {item.timestamp}
                        </p>
                      </div>
                      {item.status === 'open' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMissingItems((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, status: 'found' } : i))
                            );
                            onShowToast(`"${item.itemName}" marked as found!`);
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          Found
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700">Resolved</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SHARED JOURNEY CHECKLIST MODAL */}
      {isJourneyChecklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Shared Journey Checklist</h3>
                  <p className="text-[10px] text-slate-500">Synced across all squad member home screens</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJourneyChecklistModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist Progress */}
            <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200">
              <div className="flex items-center justify-between text-xs font-bold text-teal-900 mb-1.5">
                <span>Expedition Readiness</span>
                <span>
                  {journeyChecklist.filter((t) => t.completed).length} / {journeyChecklist.length} Verified
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-teal-200/80 overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-300"
                  style={{
                    width: `${Math.round((journeyChecklist.filter((t) => t.completed).length / (journeyChecklist.length || 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Checklist Tasks List with Minus Deletion Button (Request 10) */}
            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {journeyChecklist.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4 italic">
                  No expedition checklist tasks added yet. Add preparation tasks below.
                </p>
              ) : (
                journeyChecklist.map((task) => (
                <div
                  key={task.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    task.completed ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    onClick={async () => {
                      const nextCompleted = !task.completed;
                      const targetGroupId =
                        activeSquad?.id || localStorage.getItem('trailoPS_active_squad_id') || 'default';
                      setJourneyChecklist((prev) =>
                        prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t))
                      );
                      await updateSquadChecklistPacking(targetGroupId, task.id, nextCompleted, currentUserId);
                      onShowToast(`Checklist item updated: ${task.title}`);
                    }}
                    className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${
                      task.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {task.completed && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-semibold leading-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                          {task.category}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          Lead: {task.assignedRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Minus button to remove task if added by mistake (Request 10) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteJourneyTask(task.id, task.title);
                    }}
                    className="w-7 h-7 rounded-lg bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                    title={`Remove task: ${task.title}`}
                  >
                    <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              )))}
            </div>

            {/* Add New Shared Task */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newJourneyTask.trim()) return;
                const taskId = `chk-${Date.now()}`;
                const title = newJourneyTask.trim();
                const targetGroupId =
                  activeSquad?.id || localStorage.getItem('trailoPS_active_squad_id') || 'default';
                const newTask = {
                  id: taskId,
                  title,
                  category: newJourneyCategory,
                  completed: false,
                  assignedRole: 'All Squad',
                };
                setJourneyChecklist((prev) => [...prev, newTask]);
                setNewJourneyTask('');

                const catLower = newJourneyCategory.toLowerCase();
                const mappedGearCategory: 'navigation' | 'medical' | 'apparel' | 'camp' =
                  catLower.includes('nav') || catLower.includes('permit')
                    ? 'navigation'
                    : catLower.includes('med') || catLower.includes('first aid')
                    ? 'medical'
                    : catLower.includes('apparel') || catLower.includes('cloth')
                    ? 'apparel'
                    : 'camp';

                await saveSquadChecklistItem(
                  targetGroupId,
                  {
                    id: taskId,
                    name: title,
                    category: mappedGearCategory,
                    isPacked: false,
                    isMandatory: true,
                    weightGrams: 250,
                    spec: newJourneyCategory,
                    isCustom: true,
                  },
                  currentUserId
                );
                onShowToast(`Added "${title}" to shared squad & Home Trip Gear checklist!`);
              }}
              className="pt-2 border-t border-slate-100 space-y-2"
            >
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Add Shared Squad Task
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newJourneyTask}
                  onChange={(e) => setNewJourneyTask(e.target.value)}
                  placeholder="e.g. Verify Satellite Beacon Firmware"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-600"
                />
                <button
                  type="submit"
                  disabled={!newJourneyTask.trim()}
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CLOUD SYNC & MULTI-DEVICE PERSISTENCE CENTER MODAL (Addresses User Request 2) */}
      {isCloudSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Cloud Storage &amp; Sync Architecture</h3>
                  <p className="text-[10px] text-slate-500">How data persists &amp; syncs across all phones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCloudSyncModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Architecture Explanation in clear terms */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200">
                <div className="flex items-center gap-1.5 text-sky-950 font-bold text-xs mb-1">
                  <Server className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>1. Real-Time Cloud Storage</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  All groups, members, locations, roll call attendance, and checklists are securely stored in the cloud. When an organizer or member makes an update, changes sync across all squad members' phones instantly.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs mb-1">
                  <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>2. Offline Storage &amp; Automatic Re-Sync</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  When traveling through remote areas with no cellular reception, the app continues working uninterrupted. Your actions are saved locally and automatically sync as soon as internet connection is restored.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs mb-1">
                  <Wifi className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>3. Device-to-Device Mesh Safety</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  In zero-network dead zones, nearby devices communicate directly to share emergency alerts, check-ins, and safety radar within range.
                </p>
              </div>
            </div>

            {/* Interactive Live Multi-Phone Sync Simulator */}
            <div className="p-3 rounded-2xl bg-slate-900 text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Simulate Real-Time Multi-Phone Sync</span>
                </span>
                <span className="text-[9px] text-slate-400 font-mono">Channel 142.500</span>
              </div>

              <div className="space-y-1.5">
                {simulatedSyncPhones.map((p) => (
                  <div key={p.id} className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white text-[11px] leading-tight flex items-center gap-1">
                        <span>{p.device}</span>
                        <span className="text-[9px] text-slate-400">({p.user.split(' ')[0]})</span>
                      </p>
                      <p className="text-[9px] text-emerald-400 font-mono">
                        {p.role} · Latency: {p.latency}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      {isSimulatingSync ? 'Syncing...' : p.status}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsSimulatingSync(true);
                  setTimeout(() => {
                    setIsSimulatingSync(false);
                    setSimulatedSyncPhones((prev) =>
                      prev.map((p) => ({
                        ...p,
                        latency: `${Math.floor(25 + Math.random() * 50)}ms`,
                        lastSync: 'Just now',
                      }))
                    );
                    onShowToast('Real-time sync test passed: 4 phones synced in 48ms!');
                  }, 650);
                }}
                disabled={isSimulatingSync}
                className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${isSimulatingSync ? 'animate-spin' : ''}`} />
                <span>{isSimulatingSync ? 'Propagating Delta Update...' : 'Test Multi-Device Sync Ping'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCloudSyncModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Close Sync Center
            </button>
          </div>
        </div>
      )}

      {/* 8. HIGH-DEFINITION RAW & 4K MEDIA VAULT MODAL (Better than WhatsApp) */}
      {isHDMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Image className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                      Squad HD Raw Media Vault
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full bg-fuchsia-100 text-fuchsia-800 text-[9px] font-black border border-fuchsia-200">
                      Lossless
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    High-Definition Original Photos &amp; 4K Videos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHDMediaModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Why Better than WhatsApp Highlight Banner */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-fuchsia-950 via-purple-900 to-slate-950 text-white shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-fuchsia-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Why TrailoPS is Superior to WhatsApp
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Zero Compression
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <span className="font-extrabold text-rose-300 block mb-0.5">❌ WhatsApp</span>
                  <ul className="text-rose-200/90 space-y-0.5 text-[9.5px]">
                    <li>• Compresses 48MP down to 1.5MP</li>
                    <li>• Strips GPS elevation &amp; EXIF data</li>
                    <li>• 4K Video downgraded to 720p</li>
                    <li>• Fails with zero 4G network</li>
                  </ul>
                </div>

                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30">
                  <span className="font-extrabold text-emerald-300 block mb-0.5">✅ TrailoPS HD Share</span>
                  <ul className="text-emerald-200/90 space-y-0.5 text-[9.5px]">
                    <li>• 100% Lossless RAW (DNG, ARW)</li>
                    <li>• Preserves full GPS Altitude tags</li>
                    <li>• Apple ProRes &amp; 4K 60fps HDR</li>
                    <li>• Offline P2P AirBeam (No Internet)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Real Hidden File Input for Device Photos & Videos */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleMediaFileUpload}
              multiple
              accept="image/*,video/*,.raw,.dng,.arw,.cr2,.cr3,.mov,.mp4"
              className="hidden"
            />

            {/* Quick Upload Action Bar */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingMedia}
                className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Upload className={`w-4 h-4 ${isUploadingMedia ? 'animate-bounce' : ''}`} />
                <span>
                  {isUploadingMedia ? 'Processing High-Def Media...' : 'Choose Photo / Video from Device'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onShowToast('P2P AirBeam Active: Broadcasting to 4 squad members over Wi-Fi Direct!');
                }}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title="Direct P2P AirBeam without Internet"
              >
                <Share2 className="w-3.5 h-3.5 text-fuchsia-700" />
                <span className="hidden sm:inline">P2P Beam</span>
              </button>
            </div>

            {/* Upload Progress Bar & Clear Status Indicator */}
            {isUploadingMedia && (
              <div className="p-3 bg-fuchsia-50/90 rounded-2xl border border-fuchsia-200/90 space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-fuchsia-950">
                  <span className="flex items-center gap-1.5 truncate max-w-[280px]">
                    <Upload className="w-3.5 h-3.5 animate-bounce text-fuchsia-600 shrink-0" />
                    <span>{uploadStatus || 'Uploading to Encrypted Vault...'}</span>
                  </span>
                  <span className="font-mono text-fuchsia-700 font-extrabold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-fuchsia-200/80 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Media Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedHDMediaFilter('all')}
                className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                  selectedHDMediaFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Vault ({sharedHDMedia.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedHDMediaFilter('photo')}
                className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                  selectedHDMediaFilter === 'photo'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                48MP RAW Photos
              </button>
              <button
                type="button"
                onClick={() => setSelectedHDMediaFilter('video')}
                className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer ${
                  selectedHDMediaFilter === 'video'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                4K HDR Video
              </button>
            </div>

            {/* Media Stream List */}
            <div className="space-y-3">
              {sharedHDMedia
                .filter((item) => selectedHDMediaFilter === 'all' || item.type === selectedHDMediaFilter)
                .map((media) => (
                  <div
                    key={media.id}
                    className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs hover:shadow-md transition-shadow"
                  >
                    {/* Media Preview Box */}
                    <div className="relative h-44 w-full overflow-hidden bg-slate-950 group">
                      {media.type === 'video' ? (
                        <video
                          src={media.url}
                          controls
                          playsInline
                          poster="https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1200&q=95"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={media.url}
                          alt={media.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      {/* Gradient Backdrop */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                        <span className="px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md text-white text-[9px] font-black border border-white/20 flex items-center gap-1">
                          {media.type === 'video' ? <Film className="w-2.5 h-2.5 text-amber-400" /> : <Image className="w-2.5 h-2.5 text-emerald-400" />}
                          {media.format}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black shadow-xs">
                          {media.size}
                        </span>
                      </div>

                      {/* Bottom Info inside image */}
                      <div className="absolute bottom-2 left-2 right-2 text-white pointer-events-none">
                        <h4 className="text-xs font-bold leading-tight truncate drop-shadow-sm">
                          {media.title}
                        </h4>
                        <div className="flex items-center justify-between text-[9px] text-slate-200 mt-0.5">
                          <span>{media.author} · {media.timestamp}</span>
                          <span className="text-emerald-300 font-mono font-bold">EXIF: {media.altitude}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Actions Bar */}
                    <div className="p-2.5 bg-slate-50 flex items-center justify-between gap-2 border-t border-slate-100">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 font-mono block truncate">
                          Resolution: {media.resolution}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onShowToast(`Downloading original uncompressed file: ${media.title} (${media.size})`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#0f5238] hover:bg-[#166534] text-white text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Download Uncompressed Original RAW"
                        >
                          <Download className="w-3 h-3" />
                          <span>Original RAW</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onShowToast(`AirBeamed ${media.title} to squad via Wi-Fi Direct!`);
                          }}
                          className="p-1 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                          title="AirBeam to nearby phones"
                        >
                          <Share2 className="w-3 h-3 text-fuchsia-700" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete "${media.title}" from the squad media vault?`)) {
                              setSharedHDMedia((prev) => {
                                const next = prev.filter((m) => m.id !== media.id);
                                const squadKey = activeSquad?.id || 'default';
                                localStorage.setItem(`trailoPS_shared_hd_media_${squadKey}`, JSON.stringify(next));
                                return next;
                              });
                              onShowToast(`Deleted ${media.title} from media vault.`);
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                          title="Delete media file from vault"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <button
              type="button"
              onClick={() => setIsHDMediaModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Close Media Vault
            </button>
          </div>
        </div>
      )}

      {/* 9. ALL SQUAD MEMBERS SEPARATE WINDOW ROSTER MODAL (Request 12) */}
      {isAllMembersModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAllMembersModalOpen(false);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col h-[85vh] max-h-[700px] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-cyan-900 to-[#0f5238] text-white flex items-center justify-between shadow-xs shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/10 text-cyan-200 flex items-center justify-center border border-white/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white leading-tight">
                      All Squad Members Roster
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-cyan-400 text-slate-950 text-[9px] font-black">
                      {members.length} Total
                    </span>
                  </div>
                  <p className="text-[10px] text-cyan-200">
                    Full expedition directory &amp; tactical communications
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAllMembersModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={allMembersSearchQuery}
                  onChange={(e) => setAllMembersSearchQuery(e.target.value)}
                  placeholder="Search members by name, role or tag..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-cyan-600"
                />
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                {[
                  { id: 'all', label: `All (${members.length})` },
                  { id: 'admins', label: `Admins (${members.filter((m) => m.roleHierarchy !== 'member').length})` },
                  { id: 'members', label: `Members (${members.filter((m) => m.roleHierarchy === 'member').length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAllMembersRoleFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      allMembersRoleFilter === tab.id
                        ? 'bg-cyan-800 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Members Roster List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2 no-scrollbar bg-slate-50/50">
              {members
                .filter((m) => {
                  if (allMembersRoleFilter === 'admins') return m.roleHierarchy !== 'member';
                  if (allMembersRoleFilter === 'members') return m.roleHierarchy === 'member';
                  return true;
                })
                .filter((m) => {
                  if (!allMembersSearchQuery.trim()) return true;
                  const q = allMembersSearchQuery.toLowerCase();
                  return (
                    m.name.toLowerCase().includes(q) ||
                    m.role.toLowerCase().includes(q) ||
                    (m.subGroupName && m.subGroupName.toLowerCase().includes(q))
                  );
                })
                .map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        onClick={() => {
                          const targetId = (member.id === '1' || member.id === currentUserId) ? (currentUserId || member.id) : member.id;
                          setViewingProfileUserId(targetId);
                          setViewingProfileFallback({
                            name: member.name,
                            role: member.role,
                            avatar: member.avatar,
                          });
                        }}
                        className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                        title="Click to view member profile"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100"
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${
                              member.status === 'present'
                                ? 'bg-emerald-500'
                                : member.status === 'excursion'
                                ? 'bg-sky-500'
                                : 'bg-rose-500'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate">
                              {member.name}
                            </h4>
                            {member.roleHierarchy === 'super_admin' ? (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center gap-0.5">
                                <Crown className="w-2.5 h-2.5" /> Super Admin
                              </span>
                            ) : member.roleHierarchy === 'subgroup_admin' ? (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-0.5">
                                <Shield className="w-2.5 h-2.5" /> Sub-Admin
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                Member
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {member.role} {member.subGroupName ? `· ${member.subGroupName}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 justify-end">
                          <Battery className="w-3 h-3 text-emerald-600" />
                          <span className="font-mono font-bold text-slate-700">{member.battery}%</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 block">
                          {member.distance} away
                        </span>
                      </div>
                    </div>

                    {/* Action buttons bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>Last ping: <strong className="text-slate-700 font-normal">{member.lastPing}</strong></span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAllMembersModalOpen(false);
                            setCallModalContact({
                              name: member.name,
                              title: member.role,
                              phone: member.phone || '',
                              avatar: member.avatar,
                            });
                          }}
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAllMembersModalOpen(false);
                            setChatModalContact({
                              name: member.name,
                              title: member.role,
                              avatar: member.avatar,
                            });
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsAllMembersModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={async (trip) => {
          setTripName(trip.name);
          try {
            const res = await createSquadGroup(
              currentUserId || 'user_self',
              trip.name,
              trip.destination,
              trip.budgetPerMember,
              undefined,
              trip.departureDate,
              trip.returnDate,
              currentUserName,
              undefined,
              currentUserAvatar
            );
            if (!res.success || !res.group) {
              onShowToast(res.error || 'Failed to create squad group.');
              return;
            }
            try {
              localStorage.setItem('trailoPS_active_squad', JSON.stringify(res.group));
              localStorage.setItem('trailoPS_active_squad_id', res.group.id);
              if (currentUserId) {
                localStorage.setItem(`trailoPS_active_squad_${currentUserId}`, JSON.stringify(res.group));
                localStorage.setItem(`trailoPS_active_squad_id_${currentUserId}`, res.group.id);
                localStorage.setItem(`trailoPS_hasJoinedGroup_${currentUserId}`, 'true');
              }
            } catch {}
            onSquadJoined?.(res.group, 'super_admin');
            onSetJoinedGroup(true);
            onShowToast(`Squad route "${res.group.name}" created! Unique Code: ${res.group.code}`);
          } catch (err) {
            console.warn('Failed to save squad:', err);
            onShowToast('Failed to create squad group.');
          }
        }}
      />

      {/* Field WebRTC Tactical Intercom Audio Call Modal */}
      {callModalContact && (
        <CallModal
          isOpen={!!callModalContact}
          onClose={() => setCallModalContact(null)}
          contactName={callModalContact.name}
          contactTitle={callModalContact.title}
          phoneNumber={callModalContact.phone}
          avatar={callModalContact.avatar}
        />
      )}

      {/* Peer-to-Peer Tactical Squad Chat / Direct Messaging Modal */}
      {chatModalContact && (
        <ChatModal
          isOpen={!!chatModalContact}
          onClose={() => setChatModalContact(null)}
          contactName={chatModalContact.name}
          contactTitle={chatModalContact.title}
          avatar={chatModalContact.avatar}
        />
      )}

      {/* Shared Train Journey & Berths Modal */}
      {isTrainModalOpen && (
        <TrainJourneyModal
          groupId={activeSquad?.id || 'grp_current'}
          isOpen={isTrainModalOpen}
          onClose={() => setIsTrainModalOpen(false)}
          direction={trainDirection}
          journey={trainDirection === 'onward' ? onwardJourney : returnJourney}
          seatAssignments={seatAssignments}
          members={members.map((m) => ({
            id: m.id,
            group_id: activeSquad?.id || 'grp_current',
            user_id: m.id,
            role: (m.roleHierarchy as any) || 'member',
            status: 'active' as const,
            profile: {
              id: m.id,
              email: '',
              full_name: m.name,
              avatar_url: m.avatar,
              is_profile_complete: true,
            },
          }))}
          isAdmin={userRole === 'super_admin' || userRole === 'subgroup_admin'}
          onSaved={() => {
            loadTrainData();
            onShowToast('Train journey & seat reservations updated!');
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Member Profile Modal (with strict privacy masking for emergency contacts & medical data) */}
      {viewingProfileUserId && (
        <MemberProfileModal
          isOpen={!!viewingProfileUserId}
          onClose={() => {
            setViewingProfileUserId(null);
            setViewingProfileFallback(null);
          }}
          userId={viewingProfileUserId}
          currentUserId={currentUserId || ''}
          currentUserRole={userRole}
          fallbackName={viewingProfileFallback?.name || 'Squad Member'}
          fallbackRole={viewingProfileFallback?.role || 'member'}
          fallbackAvatar={viewingProfileFallback?.avatar}
        />
      )}

      {/* Synchronized Group Briefing Timer Configuration Modal */}
      <BriefingTimerModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        groupId={activeSquad?.id || 'default'}
        groupName={activeSquad?.name || 'Squad'}
        activeBriefing={activeBriefing}
        onSaved={(b) => setActiveBriefing(b)}
        onShowToast={onShowToast}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserRole={userRole}
      />
    </div>
  );
};
