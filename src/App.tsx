import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PresenceProvider } from './context/PresenceContext';
import { CallProvider } from './context/CallContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { InstallPrompt } from './components/ui/InstallPrompt';

// Lazy-loaded Pages
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const Friends = lazy(() => import('./pages/Friends').then(module => ({ default: module.Friends })));
const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Chat = lazy(() => import('./pages/Chat').then(module => ({ default: module.Chat })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Notifications = lazy(() => import('./pages/Notifications').then(module => ({ default: module.Notifications })));
const Directory = lazy(() => import('./pages/Directory').then(module => ({ default: module.Directory })));
const NotFound = lazy(() => import('./pages/NotFound').then(module => ({ default: module.NotFound })));

import { DeviceProvider } from './context/DeviceContext';

function App() {
  return (
    <Router>
      <DeviceProvider>
        <ThemeProvider>
          <AuthProvider>
            <PresenceProvider>
              <CallProvider>
                <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>}>
                  <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<ProtectedRoute />}>
                      <Route element={<Layout />}>
                        <Route path="/" element={<Home />} />
                        <Route path="/friends" element={<Friends />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/directory" element={<Directory />} />
                        <Route path="/profile/:id?" element={<Profile />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <InstallPrompt />
              </CallProvider>
            </PresenceProvider>
          </AuthProvider>
        </ThemeProvider>
      </DeviceProvider>
    </Router>
  );
}

export default App;
