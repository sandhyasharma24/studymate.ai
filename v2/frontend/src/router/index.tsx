import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Shell } from '../components/Shell';

// Lazy load pages
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Dashboard } from '../pages/Dashboard';
import { PDFs } from '../pages/PDFs';
import { Chat } from '../pages/Chat';
import { Study } from '../pages/Study';
import { Flashcards } from '../pages/Flashcards';
import { Quizzes } from '../pages/Quizzes';
import { Plans } from '../pages/Plans';
import { Settings } from '../pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Shell />,
        children: [
          {
            path: '/',
            element: <Dashboard />,
          },
          {
            path: '/pdfs',
            element: <PDFs />,
          },
          {
            path: '/chat',
            element: <Chat />,
          },
          {
            path: '/chat/:sessionId',
            element: <Chat />,
          },
          {
            path: '/study',
            element: <Study />,
          },
          {
            path: '/flashcards',
            element: <Flashcards />,
          },
          {
            path: '/flashcards/:deckId',
            element: <Flashcards />,
          },
          {
            path: '/quizzes',
            element: <Quizzes />,
          },
          {
            path: '/plans',
            element: <Plans />,
          },
          {
            path: '/settings',
            element: <Settings />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
