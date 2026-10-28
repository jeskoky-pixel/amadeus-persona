# Amadeus Persona 0.1.0 候选验收（2026-10-29）

## 结论

**尚未达到合并门槛。** Persona 的可信注入、配置、界面和五插件同装已取得下列证据，但一个反复切换风格的长期 Session 仍出现旧风格自述。最终 DSH System Prompt 已更新，模型表达却没有稳定跟随。Persona PR #1 和 QQ Host 契约 PR #3 应保持开放；Amadeus-dsh 首页不能提前标记 Persona 已交付。

本轮全部运行在隔离 DSH Desktop `0.2.1-rc.3` Profile。未连接生产 QQ、NapCat、Memory 数据、Life 数据或生产 Profile。模型凭证只由既有授权配置传给隔离进程，未写入仓库。原始模型日志、会话正文和测试账户标识保留在未跟踪的私有目录，不上传 GitHub。

## 版本与来源

| 插件 | 隔离安装版本 | 来源 |
| --- | --- | --- |
| Persona | `@amadeus/persona@0.1.0` | 本 PR 候选工作树 |
| QQ | `@amadeus/qq@1.1.0` | QQ PR #3，`9288ef474d25905816212662513911a294351681` |
| Memory | `@amadeus/memory@1.0.1` | main，`218244c1f510bbbf59781c1a0019393f1e76be3b`，从 `dsh-mneme/` 安装 |
| State | `@amadeus/state@1.1.0` | main，`73c8ded7d0850fd50293ce10f8d4177b69244f40` |
| Life | `@amadeus/life@1.1.0` | main，`ad8863e7b520410faa2f3c7fad49ad580083b079` |

五包均通过隔离 Desktop 的插件管理界面安装并启用。重启后，五个 Owner HTTP 入口均返回 200，Persona 的 Workspace、卡片、绑定和 revision 保持。QQ 通过断开的本机测试端口以 `connect:false` 运行，绝无 QQ 外发。Memory、State 和 Life 的实际数据库均在隔离 Profile 内。

## 分层验收

| 层级 | 结果 |
| --- | --- |
| 自动化 | Persona `49/49` 通过；QQ 只读 Scene 契约 `2/2` 通过。覆盖旧 v0.1 配置迁移、Workspace 绑定归属、切换前安全备份、QQ 撤权、完整群与私聊授权容量、默认风格、子 Agent 排除、原子写入、Owner API、i18n 与最终 Section 比较。 |
| 真实 Host | Persona 在两个独立 Section 注入；QQ 的两个隔离测试群 Scene 分别保存温柔、泼辣绑定。撤销其中一个 QQ Scene 后，Persona 立即报告 `qq_revoked`；重新授权后恢复有效。重启后五插件 Owner 接口均可用。QQ 授权时会预建 Session，所以这次 Host 联测没有出现“已授权但尚无 Session”的自然状态；该状态由契约单元测试覆盖。 |
| 真实浏览器 | Edge Chromium 中检查中文、英文 Web Console 及中文原生设置页。五页导航、场景编辑、冲突提示、备份恢复、主题和窄屏已操作；见下方截图。 |
| 真实模型 | `opencode-go/deepseek-v4.1-flash` 在同一普通 DSH Session 完成核心 A→B、禁用、恢复及温柔→泼辣→默认的模型回合。新的三轮风格 Session 中，模型语气分别随温柔、泼辣、温柔变化；切回默认的一次回答把当前标记误写成不存在的 `WARM_883`，下一轮明确询问当前系统设定后准确返回 `GENTLE_411`。另一个被多次失败探针污染的长期 Session，最终 System Prompt 已为温柔；在五插件同装后再次明确要求“只依据本轮有效的系统提示词”时，模型仍返回旧的 `SPICY_622` 并使用泼辣语气。因此不能宣称热更新表达稳定通过。 |
| 实际工具 | 人格切换前后真实 `read` 工具均成功读取隔离测试文件；五插件同装后又完成一次。最终同装回合的 `request/header` 记录模型可见工具 72 项，调用 `read` 并得到工具结果。此前 Persona 单装回合为 32 项。Persona 没有新增或删除工具；数量增加来自其他四个插件。 |
| 真实 QQ/NapCat | 本轮未验证。只发现非隔离的 NapCat Desktop 进程，未将隔离 Profile 接入它，也未向真实群聊或私聊发送消息。此前 QQ 版本的历史实测不能充当本轮 Persona+QQ 联测。 |

DSH 持久 Session 日志记录了每次 `system/message` 和 `request/header`。在温柔→泼辣→默认三轮中，最终系统消息依次只含 `GENTLE_411`、`SPICY_622`、`GENTLE_411`；请求系列变化，Session ID、Preset、历史均未重建或清空。模型错误属于最终响应层，不能把正确的 System Prompt 日志等同于模型表达通过。修改后的中文优先级说明改善了新 Session 的风格切换，但未证明所有长期历史都能可靠覆盖。

## 界面与数据验证

- [中文控制台](screenshots/console-zh-v01-final.png)、[英文控制台](screenshots/console-en-v01-final.png)、[中文原生设置](screenshots/native-zh-v01-final.png) 均来自真实 Edge 渲染；语言和主题偏好独立，简体中文为默认。
- [深色诊断](screenshots/diagnostics-dark.png)、[390 px 布局](screenshots/diagnostics-mobile.png)、[编辑冲突](screenshots/editor-conflict.png) 与 [绑定页](screenshots/bindings.png) 覆盖主要界面状态。
- 核心与风格内容由 Owner API 保存到独立 `persona.json`，revision 冲突返回 409；备份、历史恢复和重启后的卡片持久性已在隔离 Profile 验证。工作区切换的归档与旧数据兼容有回归测试，但本轮五插件 Profile 只有一个实际 Workspace，尚未完成双 Workspace 的 GUI 实测。
- Memory 的可选人格卡默认配置为关闭；当前没有可信的跨插件“有效人格卡”读取契约。Persona 检测到 Memory 时显示状态未知告警，不修改 Memory 配置或数据库。
- State 和 Life 的 Owner 接口在同一 Host 正常响应；本轮没有制造状态演化或自主唤醒，也没有将接口健康误报为活动链路通过。

## 安装包与剩余验收

`npm pack --dry-run --json` 检查了 `@amadeus/persona@0.1.0` 的运行文件，包含 Host、客户端、五页控制台、共享 i18n 字典和测试入口。报告及截图保留在仓库，非运行时资源。`src/section-text.js` 为最终提示词与诊断共用的精确格式化函数；回归测试要求原始卡片正文不能被误报为完整 Section 可见。

合并前仍需完成：

1. 对长期 Session 的风格切回做稳定真实模型复测，或明确找到可接受且不篡改历史、工具、Preset 的兼容方案。
2. 在确实隔离且授权的 NapCat 测试实例中，验证两个 QQ Scene 的实际模型表达和首次消息继承；本轮仅证明离线 Host 授权与撤权路径。
3. 用第二个真实隔离 Workspace 实测切换后的旧绑定归档与恢复；补齐子 Agent、普通 fork 和 Workspace 外 Session 的 Desktop 级检查。
4. 如要宣称五插件行为联合通过，还需分别触发 State 演化、Life 自主唤醒及可选 Memory 检索，并确认不会重复外发。

本候选未创建 Release、npm 发布或 DSH Market 上架。生产部署须另行备份和验收，当前不建议替换日常 Profile。
