<!-- PROJECT LOGO -->
<div align="center">

# whuer3d

_✨ Author: lamb ✨_

</div>

<p align="center">
  <a href="https://github.com/gy1016/whuer3d">
    <img src="https://img.shields.io/badge/Github-whuer3d-brightgreen?logo=github" alt="repo_whuer3d">
  </a>
  <a href="https://www.npmjs.com/package/whuer3d">
    <img src="https://img.shields.io/npm/v/whuer3d" alt="npm_whuer3d">
  </a>
  <a href="stargazers">
    <img src="https://img.shields.io/github/stars/gy1016/whuer3d?color=yellow&label=Github%20Stars" alt="star_whuer3d">
  </a>
</p>

<!-- ABOUT THE PROJECT -->

# 介绍

由空间信息工程研究所使用 TypeScript 编写的三维数字地球引擎，并利用 WebAssembly 实现了高性能的空间分析。借鉴 [oasis](https://github.com/oasis-engine/engine) 对渲染上下文的封装，并增添 GIS 领域算法与模块，实现新的三维虚拟地球应用。

# 文档

你可以在这个[语雀文档](https://www.yuque.com/shengaoyang-rl1fl/apm3zh)中看到引擎中各个模块的设计构思，以及我的一些想法，由 Typedoc 生成的引擎文档在[这](http://www.sgyat.cn/lamb3d/)！

## 深度冲突

众所周知 z<sub>eye</sub> 与 z<sub>window</sub> 并不是线性映射关系，而是呈现一个反比例函数关系，故在远平面会出现深度冲突的问题。whuer3d 选用的解决方案是在顶点 shader 中采用对数深度缓冲方案来进行解决，其核心是根据常数 constant 和远平面距离 f 来进行深度值改写，代码如下：

```glsl
uniform float u_Far;

vec4 modelToClipCoordinates(vec4 position, mat4 mvpMat, bool enable, float constant, float far)
{
  vec4 clip = mvpMat * position;
  if(enable)
  {
    clip.z = ((2.0 * log(constant * clip.z + 1.0) / log(constant * far + 1.0)) - 1.0) * clip.w;
  }
  return clip;
}
```

## 顶点精度冲突

目前，大部分的 GPU 只支持 32 位浮点精度，这对于大范围的类似于 WGS84 坐标系来说是不够的。我们可以看一段 C 语言代码：

```c
float f1 = 6378137.0;
printf("%f\n", f1);     // 6378137.000000

float f2 = 6378137.05;  
printf("%f\n", f2);     // 6378137.000000

float f3 = 6378137.5;  
printf("%f\n", f3);     // 6378137.500000

float f4 = 6378137.9;  
printf("%f\n", f4);     // 6378138.000000

float f5 = 996378137.9;  
printf("%f\n", f5);     // 996378112.000000
```

我们可以发现 32 浮点输出结果和我们预想的差很多，因为 32 位浮点数有效位数是“7 或 8 位”，这个可以看 IEEE754 中浮点数的存储结构，这里有一篇我觉得不错的[文章](https://zhuanlan.zhihu.com/p/343033661)。CPU 支持 64 位双精度，能够提供足够的精度支持，因此，在很多应用中，都采用 CPU 使用双精度计算替换 GPU 计算来消除抖动。我们来看一个具体的抖动案例：

假设顶点的坐标是(6378137.0, 0, 0)，当视点离它有 800m 远，且视点绕着这个点旋转时，顶点开始抖动，当视点逐渐拉近时，抖动越来越明显。为什么会有抖动？为什么视点拉近时，抖动会越来越明显？根据当前位置计算出来的视图矩阵如下所示：

$$
 \left[
 \begin{matrix}
   0.78 & 0.63 & 0.00 & -4946218.10 \\
   0.20 & -0.25 & 0.95 & -13304368.35 \\
   0.60 & -0.73 & -0.32 & -3810548.19 \\
   0.00 & 0.00 & 0.00 & 1.00 \\
  \end{matrix}
  \right]
$$

我们注意观察第四列，该矩阵在 CPU 当中我们可以使用双精度浮点来进行表示，但当该矩阵上传至 GPU 的时候，就会出现 64 位到 32 位的跳变失真，这就是在虚拟地球应用中顶点位置抖动的根本原因，在 whuer3d 中我们会采用 GPU RTE 的方式去解决这个问题。

# 架构

whuer3d 目前包含六大模块，架构图如下所示：

![Engine Architecture](http://121.199.160.202/images/project/lamb3d/struct.png)

引擎最重要和最基本的模块是程序如何组织和管理数据以及如何与 GPU 进行通信。 图形模块用于创建缓冲区对象并存储顶点和索引数据。 架构如下：

![Graphic Module](http://121.199.160.202/images/project/lamb3d/graphic.png)

着色器模块用于管理 WebGL 程序上下文和数据上传。 架构如下：

![Shader Module](http://121.199.160.202/images/project/lamb3d/shader.png)

# 案例

## 简单使用

首先我们使用 pnpm 来安装：

```bash
pnpm install whuer3d
```

然后我们创建一个画布标签并指定 id：

```html
<canvas id="lamb"> Your browser does not support canvas~ </canvas>
```

最后，我们写一段 js 代码：

```js
import { Engine } from "whuer3d";

const whuer3d = new Engine("lamb");
whuer3d.run();
```

我们来看看效果：

![Engine Architecture](http://121.199.160.202/images/project/lamb3d/earth.png)

## 热力图计算

热力图层使用 WASM 进行生成，有着足够好的运算性能，我们模拟武汉边界内的一些热力点位，使用方式如下：

```js
import { Engine } from "whuer3d";

// 实例化引擎
const whuer3d = new Engine(
  "lamb",
  {
    cameraPos: new Vector3(0, 0, 6378137 * 3),
  },
  {
    alpha: true,
  }
);

// 实例化热力图层
const heatMapLayer = new HeatMapLayer(whuer3d, {
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
whuer3d.scene.addLayer(heatMapLayer);
whuer3d.run();
```

我们来看看效果：

![WASM热力图生成效果](http://121.199.160.202/images/project/lamb3d/heatMap.png)

# 参考仓库

- WebGlobe: https://github.com/iSpring/WebGlobe

- OpenGlobe: https://github.com/virtualglobebook/OpenGlobe

- oasis: https://github.com/oasis-engine/engine

- Cesium: https://github.com/CesiumGS/cesium
