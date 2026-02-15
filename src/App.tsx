import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Friends } from './pages/Friends';
import { Home } from './pages/Home';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { InstallPrompt } from './components/ui/InstallPrompt';
import { NotFound } from './pages/NotFound';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/profile/:id?" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          <InstallPrompt />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
