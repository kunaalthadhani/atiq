import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (supabase) {
        // Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch user details from users table
          const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (userData && !error) {
            // Trim role to remove any whitespace
            const trimmedRole = userData.role?.trim() || userData.role;
            
            console.log('=== USER DATA LOADED ===');
            console.log('User data from database:', userData);
            console.log('Role value (raw):', JSON.stringify(userData.role));
            console.log('Role value (trimmed):', JSON.stringify(trimmedRole));
            console.log('Role type:', typeof trimmedRole);
            console.log('Is admin?', trimmedRole === 'admin');
            console.log('========================');
            
            setUser({
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: trimmedRole,
            });
          }
        }
      } else {
        // Fallback: check localStorage
        const storedUser = localStorage.getItem('auth_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (supabase) {
        // Use Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          // Fetch user details from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          // Add detailed logging
          console.log('=== USER QUERY DEBUG ===');
          console.log('User ID from auth:', data.user.id);
          console.log('User email from auth:', data.user.email);
          console.log('Query result - userData:', userData);
          console.log('Query result - userError:', userError);
          if (userError) {
            console.log('Error code:', userError.code);
            console.log('Error message:', userError.message);
            console.log('Error details:', JSON.stringify(userError, null, 2));
          }
          console.log('========================');

          if (userError) {
            // Show the actual error message
            return { 
              success: false, 
              error: `Database error: ${userError.message || 'Unknown error'}. Code: ${userError.code || 'N/A'}` 
            };
          }

          if (userData) {
            // Trim role to remove any whitespace
            const trimmedRole = userData.role?.trim() || userData.role;
            
            const userObj = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              role: trimmedRole,
            };
            setUser(userObj);
            return { success: true };
          } else {
            return { success: false, error: 'User not found in database' };
          }
        }
      } else {
        // Fallback: simple localStorage auth (for development)
        const storedUsers = JSON.parse(localStorage.getItem('auth_users') || '[]');
        const foundUser = storedUsers.find((u: any) => u.email === email && u.password === password);
        
        if (foundUser) {
          const userObj = {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
          };
          setUser(userObj);
          localStorage.setItem('auth_user', JSON.stringify(userObj));
          return { success: true };
        } else {
          return { success: false, error: 'Invalid email or password' };
        }
      }

      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem('auth_user');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

