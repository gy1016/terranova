function Feature() {
  return (
    <div className="feature">
      <div>
        <h3>模块化设计</h3>
        <p>
          采用模块化设计，将引擎架构分为将引擎架构划分为图元渲染、场景控制、地理处理、基于WASM的高性能空间分析和辅助工具五个功能模块。
        </p>
      </div>
      <div>
        <h3>图层渲染</h3>
        <p>基于LOD瓦片机制，实现了各种影像图层的渲染，并且利用LERC光栅图像加载了全球地形。</p>
      </div>
      <div>
        <h3>高性能空间分析</h3>
        <p>基于Wasm技术在浏览器中实现了高性能的空间分析功能。</p>
      </div>
    </div>
  );
}

export default Feature;
