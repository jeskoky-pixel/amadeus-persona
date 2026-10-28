# Amadeus Persona 0.1.0 开发候选验收（2026-10-29）

## 范围与版本

- 官方 DSH Desktop：`0.2.1-rc.3`。实现核对的是这一版本的 `systemPrompt.section()`、`assemble({agent,scope:agent})`、`workspaceRegistry` 与 Session Header 契约。
- 隔离 Profile：`private/persona-v01-acceptance`，仅安装 Persona，没有安装 QQ、Memory、State 或 Life，也没有接入生产数据。
- 插件经 Desktop 自带的“添加插件”表单从本地目录安装并启用；原生设置页与 Web Console 均在真实 Edge Chromium 中打开。
- 这是供审查的开发候选，不代表已完成两群真实 QQ 或模型行为验收。
- `npm run build:client`、`npm test`（38/38）和 `npm pack --dry-run --json` 通过；安装包包含 25 个文件，约 83 kB。报告及截图保留在 Git 仓库供审查，不作为运行时资产装入插件包。

## 实测结果

| 项目 | 结果与证据 |
| --- | --- |
| 单独安装和原生设置 | 通过。Desktop 插件管理器显示运行中；设置弹窗中有 Amadeus Persona 健康状态、Workspace 和打开控制台入口。见 [原生设置](screenshots/native-settings.png)。 |
| Owner API | 通过。已认证 Desktop 页面读取 `/overview` 返回 200；无认证请求返回 401。写入必须经 Host `connection.admit(req)` Owner 身份，且同源与写入标记测试通过。 |
| 五页控制台 | 通过。总览、人格库、场景绑定、注入诊断、全局设置均由真实 Host API 提供数据。见 [总览](screenshots/overview.png)、[人格库](screenshots/library.png)、[场景绑定](screenshots/bindings.png)。 |
| 配置写入 | 通过。浏览器中选择真实 `default-workspace`，保存核心人格、创建风格卡、设为默认、给真实 Workspace Session 保存“仅核心”覆盖。无手工 JSON/数据库修改。 |
| 主题和窄屏 | 通过 Edge 渲染检查。见 [深色诊断](screenshots/diagnostics-dark.png) 和 [390 px 视图](screenshots/diagnostics-mobile.png)。 |
| 编辑冲突 | 通过。两个已认证标签页的旧 revision 写入返回 409，旧草稿保留并展示重载选项。见 [冲突提示](screenshots/editor-conflict.png)。 |
| 备份与恢复 | 通过。真实控制台创建备份、临时改写核心、输入 `RESTORE` 恢复，核心恢复原文，写入前安全备份保留。 |
| 重启恢复 | 通过。隔离 Desktop 重启后 Workspace ID、核心卡、风格卡、默认风格和 revision 持续存在。 |
| Markdown 文件 | 单元测试验证 `SOUL.md` 与 `styles/{styleId}.md` 的原子投影及删除同步。事务权威源为 `persona.json`；手工改 Markdown 不会改动运行人格。 |
| 回归测试 | `npm test`：38/38 通过。覆盖 Workspace 隔离、普通 fork 与子代理区分、两组 QQ Scene、撤权、版本回滚、原子存储、Owner API、Section 组装与工具列表不变、Memory 状态未知时的告警。QQ 场景部分使用可信 Host 契约的测试替身。 |
| 最终 Section 探测 | 代码与单元测试可区分保留和 `complete` 覆盖；真实 Desktop 的默认 Session 尚无活跃 Agent，实际探测返回 `agent_not_live`，因此没有声称真实模型提示词已验证。 |

## 与交互原型的差异

- 控制台沿用侧边导航、卡片、五页布局、浅色/深色主题和响应式结构；当前界面文案主要为英文。
- 原型中的 QQ 号、场景、人物卡和本地浏览器存储均未迁入。未安装 QQ 时绑定页只列真实 Workspace Session；QQ 场景需要 QQ Host 的可信映射。
- 原型“保存成功”仅改 localStorage；候选版通过 Owner API、revision 乐观锁与原子文件写入保存。
- 诊断将配置、回调观测和最终 Section 可见性分开。最终检查由管理员显式触发，只返回脱敏的可见性状态。
- DSH 原生设置页只保留健康状态和入口，详细设置位于独立 Web Console。

## 尚未实机验证

1. 此隔离 Profile 未接入 NapCat 或 QQ 插件，两个真实 QQ 群及 Owner 私聊的人格差异仍需联合实机测试；单元测试不能替代这项结论。
2. 此隔离 Profile 无可用模型路由，因此没有完成真实模型回合、工具实际调用、提示词改动对请求系列/KV 缓存的成本测量。Section 注册与工具 Schema 不变已作代码及单元测试检查。
3. 普通 fork、子代理和另一 Workspace 的隔离由契约测试覆盖，尚未在此 Desktop Profile 创建对应真实 Agent 来重复验证。
4. Memory 的 `personaEnabled` 当前代码默认 `false`，但 Memory 没有公开可信的有效人格状态读取契约；检测到 Memory Host 服务时 Persona 会明确提示人工核对。Persona 不修改 Memory 配置。

## 安装、升级与回滚

按 [README](../README.md) 从 DSH 插件管理器安装。首次设置只需选一个 Workspace、编辑核心、创建/选择默认风格；QQ 是可选项。升级前从设置页创建备份。回滚配置时输入 `RESTORE` 选择备份；回滚代码时重新安装前一候选包。Persona 不删除 DSH Session，不切换 Agent Preset，不改四个现有插件或生产 Profile。
