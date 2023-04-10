import ReactDOM from 'react-dom/client';
import App from './App';
import AppContextProvider from './contexts';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <AppContextProvider>
    <App />
  </AppContextProvider>
);
