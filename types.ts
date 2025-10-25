// Fix: Defining types and exporting them to resolve module errors.
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  profilePictureUrl?: string;
  linkedinId?: string;
  linkedinAccessToken?: string;
  linkedinTokenExpiry?: string;
  linkedinConnected: boolean;
}

export interface UserSettings {
  id?: string;
  toneOfVoice: string;
  industry: string;
  position: string;
  audience: string;
  postGoal: string;
  keywords: string;
  contentExamples: string[];
  timeZone: string;
  preferredTime: string;
  profilePictureUrl?: string;
  englishVariant: 'American' | 'British' | 'Australian' | string;
  updatedAt?: string;
}

export interface DraftPost {
  id: string;
  title: string;
  text: string;
  imageUrl?: string;
  isPublishing?: boolean; // New property to track publishing state
  createdAt?: string;
  updatedAt?: string;
}

export interface PublishedPost extends DraftPost {
  publishedAt: string;
}

export interface ScheduledPost {
  id: string;
  userId: string;
  title: string;
  text: string;
  imageUrl?: string;
  scheduledFor: string; // ISO date string
  status: 'scheduled' | 'published' | 'cancelled' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}
