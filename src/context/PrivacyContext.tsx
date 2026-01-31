import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PrivacyContextType {
    anonymousMode: boolean;
    setAnonymousMode: (value: boolean) => void;
    anonymizeName: (name: string, id?: string) => string;
    anonymizeInitials: (name: string, id?: string) => string;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

// Generate a consistent pseudonym based on ID
const generatePseudonym = (id: string, index: number): string => {
    const pseudonyms = [
        'Mitarbeiter', 'Person', 'Teammitglied', 'Kollege', 'Angestellter'
    ];
    const baseIndex = id ? id.charCodeAt(0) % pseudonyms.length : 0;
    return `${pseudonyms[baseIndex]} ${index + 1}`;
};

// Store mapping for consistent pseudonyms within a session
const pseudonymMap = new Map<string, number>();
let pseudonymCounter = 0;

const getPseudonymIndex = (id: string): number => {
    if (!pseudonymMap.has(id)) {
        pseudonymMap.set(id, pseudonymCounter++);
    }
    return pseudonymMap.get(id)!;
};

export const PrivacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [anonymousMode, setAnonymousModeState] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('qtrack-anonymous-mode');
            return saved ? JSON.parse(saved) : false;
        } catch {
            return false;
        }
    });

    const setAnonymousMode = (value: boolean) => {
        setAnonymousModeState(value);
        try {
            localStorage.setItem('qtrack-anonymous-mode', JSON.stringify(value));
        } catch (e) {
            console.error('Failed to save anonymous mode setting', e);
        }
    };

    const anonymizeName = (name: string, id?: string): string => {
        if (!anonymousMode) return name;
        const key = id || name;
        const index = getPseudonymIndex(key);
        return generatePseudonym(key, index);
    };

    const anonymizeInitials = (name: string, id?: string): string => {
        if (!anonymousMode) {
            return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        }
        const key = id || name;
        const index = getPseudonymIndex(key);
        return `M${index + 1}`;
    };

    return (
        <PrivacyContext.Provider value={{
            anonymousMode,
            setAnonymousMode,
            anonymizeName,
            anonymizeInitials,
        }}>
            {children}
        </PrivacyContext.Provider>
    );
};

export const usePrivacy = (): PrivacyContextType => {
    const context = useContext(PrivacyContext);
    if (!context) {
        throw new Error('usePrivacy must be used within a PrivacyProvider');
    }
    return context;
};
