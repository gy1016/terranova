import { Helmet } from 'react-helmet';
import { injectIntl, useIntl } from 'react-intl';
import Header from '../header';
import Footer from '../footer';

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
      <div style={{ height: '1000px' }}>haha</div>
      <Footer />
    </>
  );
}

export default injectIntl(Home);
