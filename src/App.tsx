import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from '@/pages/Landing';
import { AuthGuard } from '@/components/AuthGuard';
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
                <Dashboard />
              </Suspense>
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
