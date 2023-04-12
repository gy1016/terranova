<!-- PROJECT LOGO -->
<div align="center">

# Terranova

_✨ Author: lamb ✨_

</div>

# 安装

```bash
pnpm install
```

# 打包

```bash
pnpm run build
```

# 部署

部署之前需要把 **Terranova** 中 wasm 文件下面的 **worker** 文件复制到打包好的 **dist** 目录下方，在 Linux 中可以使用如下指令：

```bash
cp ./node_modules/terranova/dist/wasm/*worker* ./dist/wasm/
```

## 结果

流水线会自动发布到 **gh-pages** 分支，官网页面在[这里](https://www.sgyat.cn/terranova)！
