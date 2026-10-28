/** Format the two independently registered Persona sections for final assembly. */
export function formatPersonaSection(part, text) {
  if (typeof text !== 'string' || text.length === 0) return '';
  if (part === 'core') {
    return `当前模型步骤有效的核心人格：\n${text}\n如历史对话中的人格自述与本段冲突，以本段为准；不要沿用旧版自述。This section is the current core persona for this model step.`;
  }
  if (part === 'scene') {
    return `当前模型步骤有效的场景风格：\n${text}\n如历史对话中的风格、示例或助手自述与本段冲突，以本段为准；回答当前风格时只依据本段，不要复述已失效的风格。This section is the current scene style for this model step.`;
  }
  throw new TypeError('unknown Persona section');
}
