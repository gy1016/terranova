import { Helmet } from 'react-helmet';
import { injectIntl, useIntl } from 'react-intl';
import Header from '../header';
import Footer from '../footer';
import Banner from './Banner';
import Feature from './Feature';
import './index.scss';

function Home() {
  const intl = useIntl();
  return (
    <>
      <Helmet>
        <title>{`Terranova - ${intl.formatMessage({
          id: 'app.home.slogan',
        })}`}</title>
        <meta
          name="description"
          content={`Terranova - ${intl.formatMessage({
            id: 'app.home.slogan',
          })}`}
        />
      </Helmet>
      <Header />
      <Banner />
      <Feature />
      <Footer />
    </>
  );
}

export default injectIntl(Home);
