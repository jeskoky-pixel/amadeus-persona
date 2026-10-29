# Persona 升级与数据保留政策

适用包：`@amadeus/persona`；运行时插件 ID：`amadeus-persona`。v1.2.0 从 `0.1.0` 升级。本政策从 v1.2.0 起用于后续 v1.2.1、v1.3.0 和主版本发布。

## 代码、配置与数据

安装包只放程序及资源，可在升级时替换。用户数据位于插件包之外：`$DSH_HOME/amadeus-persona/persona.json`（或显式数据目录）、SOUL/STYLE 投影、历史和 `backups/`；DSH Profile 中的 Bundle 配置。 不能把唯一副本放进 `node_modules`、插件包或可被 Market 清理的安装目录。升级时记录并沿用原 Profile、Bundle ID 和数据路径；若升级后看似空白，先核对路径和 Workspace，不能初始化覆盖。

## 四种操作

| 操作 | 约定 |
| --- | --- |
| 安装 | 创建缺失的结构；发现既有数据时先校验，绝不以空默认值覆盖。 |
| 升级 | 只替换代码；保留 Profile 配置和外部数据。支持的迁移先备份、校验、执行、复核，失败即停止启用。 |
| 禁用 | 停止监听、定时器和写入，数据仍留在原目录。 |
| 卸载 | 插件自身不删除用户数据；DSH Market/Plugin Manager 对 Profile 配置的实际保留行为须在目标 Desktop 版本实测，卸载前导出 Profile。彻底清除数据是独立人工操作。 |

## 固定升级步骤

1. 记录旧包版本/ SHA-256、DSH 版本、数据路径、Schema Version 与跨插件组合；保留旧 `.tgz`。
2. 在 Persona 控制台的设置 → 备份创建快照，并备份 DSH Profile；Workspace 切换与恢复前也应保存现场。
3. 在隔离 Profile 用官方 Plugin Manager 或已验收的 Market 更新入口安装候选包，不执行用户侧构建脚本。
4. 重启并检查原有内容、关系、权限、Session/Workspace 绑定、配置及关键功能；重点：核心人格、所有风格、默认风格、显式 Scene 绑定、历史版本、子代理排除和 System Prompt Section 注入。
5. 通过后再在目标 Profile 分批升级。若失败，先禁用，保存故障现场，按 `DATA_MIGRATION.md` 恢复兼容数据库和旧包；不能假设旧代码一定能读已迁移的新数据。

每个新版本的 CI 必须从上一稳定版的合成真实格式数据升级到当前版，测试关键字段、关联、权限、重启和失败恢复。跨插件 Host 契约不兼容时应先适配或限制组合版本。小版本不得无说明删除既有能力；弃用需标记、替代方案和兼容周期。
