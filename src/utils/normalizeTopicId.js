export default function normalizeTopicId(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-')         // 空格转为连字符
    .replace(/-+/g, '-')           // 多个连字符合并
    .replace(/^-|-$/g, '');        // 去除首尾连字符
} 