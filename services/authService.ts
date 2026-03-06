import { getApiUrl } from './apiConfig';

const API_BASE_URL = getApiUrl('/api');

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
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

  private saveTokensToStorage(accessToken: string, refreshToken: string): void {
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
  }

  public getAccessToken(): string | null {
    return this.accessToken;
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
