import { useContext } from 'react';
import { IntlProvider } from 'react-intl';
import { RouterProvider } from 'react-router-dom';
import { AppContext } from './contexts';
import { translationsData } from './constants/locale';
import { router } from './routes';

function App() {
  const context = useContext(AppContext);
  const lang = context.lang === 'cn' ? 'zh-CN' : 'en';

  return (
    <IntlProvider locale={lang} messages={translationsData[lang]}>
      <RouterProvider router={router}></RouterProvider>
    </IntlProvider>
  );
}

export default App;
