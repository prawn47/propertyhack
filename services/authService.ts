import { getApiUrl } from './apiConfig';

const API_BASE_URL = getApiUrl('/api');

interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName?: string;
  newsletterOptIn: boolean;
}

interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    avatarUrl: string | null;
    emailVerified: boolean;
    newsletterOptIn: boolean;
    preferences: Record<string, unknown> | null;
    superAdmin: boolean;
    createdAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.loadTokensFromStorage();
  }

  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  public saveTokensToStorage(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokensFromStorage(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('user');
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getAuthHeaders(): Record<string, string> {
    return this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {};
  }

  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  public async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401 && this.refreshToken) {
      try {
        await this.refreshAccessToken();
        response = await fetch(url, {
          ...options,
          headers: { ...headers, 'Authorization': `Bearer ${this.accessToken}` },
        });
      } catch {
        this.clearTokensFromStorage();
        throw new Error('Session expired. Please log in again.');
      }
    }

    return response;
  }

  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();
    this.saveTokensToStorage(data.accessToken, data.refreshToken);
    return data;
  }

  public async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Registration failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    const result: AuthResponse = await response.json();
    this.saveTokensToStorage(result.accessToken, result.refreshToken);
    return result;
  }

  public async verifyEmail(email: string, otpCode: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode }),
    });

    if (!response.ok) {
      let errorMessage = 'Verification failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }
  }

  public async resendOtp(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to resend code';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }
  }

  public async forgotPassword(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to send reset email';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }
  }

  public async resetPassword(email: string, otpCode: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otpCode, newPassword }),
    });

    if (!response.ok) {
      let errorMessage = 'Password reset failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.accessToken}` },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearTokensFromStorage();
    }
  }

  public async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Token refresh failed');
    }

    const data: RefreshResponse = await response.json();
    this.saveTokensToStorage(data.accessToken, data.refreshToken);
  }
}

export const authService = new AuthService();
export default authService;
