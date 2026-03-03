# 微信小程序部署说明（乌龟服天赋）

## 已完成内容

- 已生成微信小程序工程基础文件：
  - `app.js`
  - `app.json`
  - `app.wxss`
  - `sitemap.json`
  - `project.config.json`
- 已生成小程序页面：
  - `wxapp/pages/index/index.js`
  - `wxapp/pages/index/index.wxml`
  - `wxapp/pages/index/index.wxss`
  - `wxapp/pages/index/index.json`
- 已将原网页数据转换为小程序可读模块：
  - `wxapp/data/talent-data.js`
  - 生成脚本：`build_wx_talent_data.js`

## 本地预览

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：`C:\Users\xicer\Desktop\opencode\乌龟服天赋`
4. AppID 先填“测试号”或你自己的真实 AppID。
5. 进入后直接预览首页。

## 更新数据

当你更新 `talent_data_official_full.js` 后，执行：

```bash
node build_wx_talent_data.js
```

会自动重建：`wxapp/data/talent-data.js`

## 你需要授权/提供的项（发布到线上必需）

1. 微信小程序 `AppID`（当前 `project.config.json` 使用的是 `touristappid`，只能本地体验）。
2. 你的微信开发者账号需要加入该小程序项目成员（开发者/体验者权限）。
3. 如需我帮你“命令行上传代码”，还需要：
   - 小程序后台生成的 `private key` 文件（如 `private.XXXX.key`）
   - 对应的 `机器人/CI` 上传权限（微信后台“开发管理 > 开发设置”）。

## 当前限制说明

- 我已完成工程改造与本地可运行结构。
- 由于微信发布链路依赖你的账号体系，我无法在当前环境替你完成最终“上传审核/发布”动作，除非你提供上面的 AppID 与 CI 授权材料。
