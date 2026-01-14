const pinyin = require('pinyin');

/**
 * 获取标题的排序键
 * 中文转换为拼音首字母，其他字符保持原样
 * @param {string} title - 标题
 * @returns {string} - 用于排序的键
 */
function getTitleSortKey(title) {
  if (!title) return '';

  // 转换为拼音，STYLE_FIRST_LETTER 表示只取首字母
  const pinyinArray = pinyin(title, {
    style: pinyin.STYLE_FIRST_LETTER,
    heteronym: false
  });

  // 将拼音数组扁平化并转换为大写
  const sortKey = pinyinArray.map(item => item[0]).join('').toUpperCase();

  return sortKey;
}

/**
 * 对搜索结果进行排序
 * 排序规则：
 * 1. 首先按播放次数（views）降序排列
 * 2. 播放次数相同时，按标题字母顺序（A-Z, 0-9）升序排列
 *    中文按拼音首字母排序
 *
 * @param {Array} results - 搜索结果数组
 * @returns {Array} - 排序后的结果数组
 */
function sortSearchResults(results) {
  if (!Array.isArray(results) || results.length === 0) {
    return results;
  }

  return results.sort((a, b) => {
    // 1. 首先按播放次数降序排列（播放次数多的在前）
    const viewsDiff = (b.views || 0) - (a.views || 0);
    if (viewsDiff !== 0) {
      return viewsDiff;
    }

    // 2. 播放次数相同时，按标题字母顺序升序排列
    const titleA = getTitleSortKey(a.title || '');
    const titleB = getTitleSortKey(b.title || '');

    return titleA.localeCompare(titleB, 'en', { numeric: true, sensitivity: 'base' });
  });
}

module.exports = {
  getTitleSortKey,
  sortSearchResults
};
