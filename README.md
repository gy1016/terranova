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

由武汉大学空间信息工程研究所使用 TypeScript 编写的三维数字地球引擎，并利用 WebAssembly 实现了高性能的空间分析。

# 文档

你可以在这个[语雀文档](https://www.yuque.com/shengaoyang-rl1fl/apm3zh)中看到引擎中各个模块的设计构思，以及我的一些想法，由 Typedoc 生成的引擎文档在[这](http://www.sgyat.cn/lamb3d/)！

# 架构

whuer3d 目前包含六大模块，架构图如下所示：

![Engine Architecture](http://121.199.160.202/images/project/lamb3d/systemstruct.png)

引擎最重要和最基本的模块是程序如何组织和管理数据以及如何与 GPU 进行通信。 图形模块用于创建缓冲区对象并存储顶点和索引数据。 架构如下：

![Graphic Module](http://121.199.160.202/images/project/lamb3d/graphic.png)

着色器模块用于管理 WebGL 程序上下文和数据上传。 架构如下：

![Shader Module](http://121.199.160.202/images/project/lamb3d/shader.png)

# 使用

首先我们使用 pnpm 来安装：

```bash
pnpm install lamb3d
```

然后我们创建一个画布标签并指定 id：

```html
<canvas id="lamb"> Your browser does not support canvas~ </canvas>
```

最后，我们写一段 js 代码：

```js
import { Engine } from "lamb3d";

const lamb3d = new Engine("lamb");
lamb3d.run();
```

我们来看看效果：

![Engine Architecture](http://121.199.160.202/images/project/lamb3d/earth.png)

# Reference

- WebGlobe: https://github.com/iSpring/WebGlobe

- oasis: https://github.com/oasis-engine/engine

- cesium: https://github.com/CesiumGS/cesium

- MadDream3D: https://github.com/bajieSummer/MadDream3D
