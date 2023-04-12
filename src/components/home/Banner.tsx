import logo from '@/assets/svgs/logo.svg';
import github from '@/assets/svgs/github.svg';
import heart from '@/assets/svgs/heart.svg';

function Banner() {
  return (
    <div className="banner">
      <div className="name">
        <img src={logo} alt="terranova logo" />
      </div>
      <div className="description">开源Web端三维GIS引擎，并借助WASM实现高性能的空间分析。</div>
      <div className="statics">
        <a href="https://github.com/gy1016/terranova/stargazers" target="_blank">
          <img src="https://img.shields.io/github/stars/gy1016/terranova?style=social" alt="github stars" />
        </a>
        <a href="https://www.npmjs.com/package/terranova" target="_blank">
          <img src="https://img.shields.io/npm/dm/terranova.svg" alt="npm download" />
        </a>
      </div>
      <div className="start">
        <button className="using">开始使用→</button>
        <button>
          <img src={github} alt="terranova github" />
          讨论
        </button>
        <button>
          <img src={heart} alt="terranova heart" />
          赞助
        </button>
      </div>
    </div>
  );
}

export default Banner;
