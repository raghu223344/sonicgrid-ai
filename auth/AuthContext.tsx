import React, { createContext, useContext, useState, useEffect } from 'react';
import users from './users.json';

interface AuthContextType {
    isAuthenticated: boolean;
    user: string | null;
    login: (username: string, key: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('sonicgrid_user');
        if (storedUser) {
            setIsAuthenticated(true);
            setUser(storedUser);
        }
    }, []);

    const login = (username: string, key: string) => {
        const validUser = users.find(u => u.username === username && u.key === key);
        if (validUser) {
            setIsAuthenticated(true);
            setUser(validUser.username);
            localStorage.setItem('sonicgrid_user', validUser.username);
            return true;
        }
        return false;
    };

    const logout = () => {
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('sonicgrid_user');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
