<!-- PROJECT LOGO -->
<div align="center">

# Terranova

<!-- _✨ Author: lamb ✨_ -->

</div>

<p align="center">
  <a href="https://github.com/gy1016/terranova">
    <img src="https://img.shields.io/badge/Github-terranova-brightgreen?logo=github" alt="repo_terranova">
  </a>
  <a href="https://www.npmjs.com/package/terranova">
    <img src="https://img.shields.io/npm/v/terranova" alt="npm_terranova">
  </a>
  <a href="stargazers">
    <img src="https://img.shields.io/github/stars/gy1016/terranova?color=yellow&label=Github%20Stars" alt="star_terranova">
  </a>
</p>

<!-- ABOUT THE PROJECT -->

# 介绍

使用 TypeScript 编写的三维数字地球引擎，并利用 WebAssembly 实现了高性能的空间分析。 对 WebGL 进行渲染上下文的封装，并增添 GIS 领域算法与模块，实现新的三维虚拟地球应用。

# 文档

Terranova 的[官网](http://www.sgyat.cn/terranova/)在这里！

# 案例

## 简单使用

首先我们使用 pnpm 来安装：

```bash
pnpm install terranova
```

然后我们创建一个画布标签并指定 id：

```html
<canvas id="lamb"> Your browser does not support canvas~ </canvas>
```

最后，我们写一段 js 代码：

```js
import { Engine } from "terranova";

const terranova = new Engine("lamb");
terranova.run();
```

我们来看看效果：

![Engine Architecture](http://121.199.160.202/images/project/lamb3d/earth.png)

## 热力图计算

热力图层使用 WASM 进行生成，有着足够好的运算性能，我们模拟武汉边界内的一些热力点位，使用方式如下：

```js
import { Engine } from "terranova";

// 实例化引擎
const terranova = new Engine(
  "lamb",
  {
    cameraPos: new Vector3(0, 0, 6378137 * 3),
  },
  {
    alpha: true,
  }
);

// 实例化热力图层
const heatMapLayer = new HeatMapLayer(terranova, {
  // 热力点的影响半径
  radius: 10,
  // 热力瓦片的大小
  tileSize: 256,
  // 色带渐变色设置
  gradient: ["00AAFF", "00FF00", "FFFF00", "FF8800", "FF0000"],
  // 最大热力值
  maxIntensity: 50,
});

// 模拟热力点位信息
const heatPoints = [];
for (let i = 0; i < 10000; i++)
  heatPoints.push({
    lat: 29.58 + (Math.random() * 5) / 100,
    lng: 113.41 + (Math.random() * 8) / 100,
    weight: Math.random() * 30,
  });

// 将点位增加到热力图层当中
heatMapLayer.addPoints(heatPoints);
// 将热力图层增加到引擎场景当中
terranova.scene.addLayer(heatMapLayer);
terranova.run();
```

我们来看看效果：

![WASM热力图生成效果](http://121.199.160.202/images/project/lamb3d/heatMap.png)

# 参考仓库

- WebGlobe: https://github.com/iSpring/WebGlobe

- OpenGlobe: https://github.com/virtualglobebook/OpenGlobe

- oasis: https://github.com/oasis-engine/engine

- Cesium: https://github.com/CesiumGS/cesium
