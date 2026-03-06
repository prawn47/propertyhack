import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Loader from './components/Loader';
import ArticlesList from './components/admin/ArticlesList';
import ArticleEditor from './components/admin/ArticleEditor';
import PublicArticlesGrid from './components/public/PublicArticlesGrid';
import type { Article, AuthState } from './types';
import authService from './services/authService';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [creatingArticle, setCreatingArticle] = useState(false);
  const [articlesRefreshTrigger, setArticlesRefreshTrigger] = useState(0);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          setAuthState({
            isAuthenticated: true,
            user,
            isLoading: false,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        await authService.logout();
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      localStorage.setItem('user', JSON.stringify(response.user));
      setAuthState({
        isAuthenticated: true,
        user: response.user,
        isLoading: false,
      });
      setShowLogin(false);
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
      setShowLogin(false);
    }
  };

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article);
    setCreatingArticle(false);
  };

  const handleCreateArticle = () => {
    setEditingArticle(null);
    setCreatingArticle(true);
  };

  const handleCloseArticleEditor = () => {
    setEditingArticle(null);
    setCreatingArticle(false);
  };

  const handleArticleSaved = () => {
    setEditingArticle(null);
    setCreatingArticle(false);
    setArticlesRefreshTrigger(prev => prev + 1);
  };

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <Loader className="h-10 w-10 text-brand-primary" />
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    if (showLogin) {
      return (
        <LoginPage
          onLogin={handleLogin}
          onBack={() => setShowLogin(false)}
        />
      );
    }
    return <PublicArticlesGrid onAdminClick={() => setShowLogin(true)} />;
  }

  return (
    <div className="bg-base-200 min-h-screen text-content font-sans">
      <header className="bg-brand-primary text-white px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">PropertyHack Admin</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Log out
        </button>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">
        <ArticlesList
          onEditArticle={handleEditArticle}
          onCreateNew={handleCreateArticle}
          refreshTrigger={articlesRefreshTrigger}
        />
        {(editingArticle || creatingArticle) && (
          <ArticleEditor
            article={editingArticle}
            onClose={handleCloseArticleEditor}
            onSaved={handleArticleSaved}
          />
        )}
      </main>
    </div>
  );
};

export default App;
