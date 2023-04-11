import { createHashRouter } from 'react-router-dom';
import Home from './components/home';

export const router = createHashRouter([
  {
    path: '/',
    element: <Home />,
  },
]);
