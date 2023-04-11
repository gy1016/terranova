import { FileTwoTone, AlertTwoTone } from '@ant-design/icons';
import logo from '@/assets/logo.svg';
import github from '@/assets/github.svg';
import site from '@/assets/site.svg';
import sun from '@/assets/sun.svg';
import moon from '@/assets/moon.svg';
import translate from '@/assets/translate.svg';
import './index.scss';

function Header() {
  return (
    <header id="header">
      <div className="logo">
        <img src={logo} alt="terranova logo" />
      </div>
      <div className="menu">
        <div className="item">
          <div>文档</div>
          <div>示例</div>
        </div>
        <div className="item">
          <div>
            <a href="https://github.com/gy1016/terranova" target="blank">
              <img src={github} alt="terranova github" />
            </a>
          </div>
          <div>
            <a href="https://github.com/gy1016/terranova" target="blank">
              <img src={site} alt="terranova site" style={{ borderRadius: '50%' }} />
            </a>
          </div>
        </div>
        <div className="item">
          <div className="switch-button">
            <img src={sun} alt="terranova sun" />
          </div>
          <div className="switch-button">
            <img src={translate} alt="terranova github" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
