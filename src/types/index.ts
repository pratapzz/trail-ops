export type ScreenType = 'signin' | 'profile' | 'gateway' | 'feed' | 'squad' | 'sos' | 'settings';

export type UserRole = 'super_admin' | 'subgroup_admin' | 'member';

export interface AllergyItem {
  id: string;
  name: string;
  severity: 'high' | 'medium' | 'low';
  color: 'rose' | 'amber' | 'blue';
}

export interface ProfileFormData {
  fullName: string;
  guardianName: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  countryCode: string;
  phoneNumber: string;
  emergencyNumber: string;
  bloodGroup: string;
  allergies: AllergyItem[];
  medications: string;
  medsPacked: boolean;
  heightCm: number;
  weightKg: number;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  healthNotes: string;
  avatarUrl: string;
  userRole?: UserRole;
  tripBudget?: number;
  amountPaid?: number;
  amountPending?: number;
  subGroupId?: string;
  subGroupName?: string;
  subGroupColor?: string;
}

export interface SquadMember {
  id: string;
  name: string;
  role: string;
  roleHierarchy: UserRole;
  status: 'present' | 'missing' | 'excursion';
  avatar: string;
  distance: string;
  battery: number;
  lastPing: string;
  channel?: number;
  subGroupId?: string;
  subGroupName?: string;
  subGroupColor?: string;
  amountPaid?: number;
  amountPending?: number;
}

export interface ExcursionRequest {
  id: string;
  trailName: string;
  leadName: string;
  membersCount: number;
  returnTime: string;
  distance: string;
  batteryAvg: number;
  avatars: string[];
  status: 'pending' | 'approved' | 'rejected';
}

export interface ContactLead {
  id: string;
  name: string;
  title: string;
  phone: string;
  avatar: string;
  online: boolean;
  type: 'faculty' | 'medical' | 'guide';
}

export interface HelplineItem {
  id: string;
  name: string;
  subtext: string;
  phone: string;
  iconType: 'emergency' | 'police' | 'park' | 'medical';
}

export interface FeedPost {
  id: string;
  author: string;
  role: string;
  avatar: string;
  timestamp: string;
  content: string;
  type: 'text' | 'image' | 'audio';
  imageUrl?: string;
  audioDuration?: string;
  isAnnouncement?: boolean;
  announcementPriority?: 'critical' | 'advisory' | 'info';
  likes: number;
  commentsCount: number;
  isLiked?: boolean;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  time: string;
  priority: 'high' | 'normal';
  read: boolean;
}

export interface FacultyDocument {
  id: string;
  name: string;
  category: 'ticket' | 'bill' | 'permit' | 'medical' | 'sop';
  uploadedBy: string;
  uploaderRole: UserRole;
  date: string;
  size: string;
  status: 'approved' | 'pending';
  fileType: 'pdf' | 'img' | 'doc';
  notes?: string;
}

export interface ExpenseSplit {
  id: string;
  title: string;
  totalAmount: number;
  paidBy: string;
  date: string;
  category: string;
  splitType: 'all' | 'custom';
  memberIds: string[];
  amountPerMember: number;
  settledMemberIds: string[];
}

export interface SubGroup {
  id: string;
  name: string;
  color: string;
  colorName: string;
  adminId: string;
  adminName: string;
  memberIds: string[];
}

export interface Waypoint {
  id: string;
  name: string;
  elevation: string;
  type: 'start' | 'pass' | 'camp' | 'summit';
  isRedMarked: boolean;
  lat?: number;
  lng?: number;
}

export interface PersonalTodoItem {
  id: string;
  text: string;
  completed: boolean;
  category?: 'document' | 'clothes' | 'electronics' | 'snack' | 'other';
  priority?: 'high' | 'normal';
}

export interface MedicineItem {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  indication: string;
  pngUrl: string;
  isPacked: boolean;
  isRescue: boolean;
}

export type WeatherConditionType =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'light_rain'
  | 'heavy_rain'
  | 'snow'
  | 'windy'
  | 'fog';

export interface HourlyWeatherItem {
  time: string;
  temp: number;
  condition: string;
  conditionType: WeatherConditionType;
  rainChance: number;
  windSpeed: number;
}

export interface DailyForecastItem {
  day: string;
  date: string;
  high: number;
  low: number;
  condition: string;
  conditionType: WeatherConditionType;
  rainChance: number;
  windSpeed: number;
}

export interface WeatherData {
  destinationName: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  elevationMeters: number;
  temperature: number;
  feelsLike: number;
  condition: string;
  conditionType: WeatherConditionType;
  highTemp: number;
  lowTemp: number;
  humidity: number;
  windSpeedKmH: number;
  windDirection: string;
  visibilityKm: number;
  precipitationChance: number;
  uvIndex: number;
  pressureHpa: number;
  airQualityIndex: number;
  sunrise: string;
  sunset: string;
  safetyAdvisory: {
    level: 'optimal' | 'warning' | 'severe';
    title: string;
    description: string;
  };
  hourly: HourlyWeatherItem[];
  daily: DailyForecastItem[];
  lastUpdated: string;
}

export interface TripDestinationData {
  id: string;
  name: string;
  fromLocation: string;
  destination: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  departureDate: string;
  returnDate: string;
  budgetPerMember: number;
  coverBg: string;
  passkey: string;
  waypoints?: Waypoint[];
}

