const OpenCC = require('opencc-js');

// Initialize converters
const s2t = OpenCC.Converter({ from: 'cn', to: 'tw' }); // Simplified to Traditional
const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' }); // Traditional to Simplified

/**
 * Check if query has minimum required characters
 * Chinese: 1 character minimum
 * English: 1 character minimum
 * Numbers: 1 character minimum
 */
function hasMinimumLength(query) {
  const chineseChars = query.match(/[\u4e00-\u9fa5]/g) || [];
  const englishChars = query.match(/[a-zA-Z]/g) || [];
  const numberChars = query.match(/[0-9]/g) || [];

  if (chineseChars.length >= 1) return true;
  if (englishChars.length >= 1) return true;
  if (numberChars.length >= 1) return true;

  return false;
}

/**
 * Clean query string by removing symbols and spaces
 * Keep only Chinese characters, English letters, and numbers
 */
function cleanQuery(query) {
  // Remove all symbols and spaces, keep only Chinese, English, and numbers
  return query.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
}

/**
 * Generate all possible variants of the query
 * - Original query
 * - Cleaned query (without symbols and spaces)
 * - Lowercase version
 * - Uppercase version
 * - Simplified Chinese version
 * - Traditional Chinese version
 */
function generateQueryVariants(query) {
  const variants = new Set();

  // Clean the query first (remove symbols and spaces)
  const cleaned = cleanQuery(query);

  // Add original
  variants.add(query);

  // Add cleaned version
  if (cleaned !== query) {
    variants.add(cleaned);
  }

  // Add case variants for English
  variants.add(query.toLowerCase());
  variants.add(query.toUpperCase());
  variants.add(cleaned.toLowerCase());
  variants.add(cleaned.toUpperCase());

  // Add Chinese conversion variants
  try {
    variants.add(s2t(query)); // Simplified to Traditional
    variants.add(t2s(query)); // Traditional to Simplified
    variants.add(s2t(cleaned));
    variants.add(t2s(cleaned));
  } catch (error) {
    // If conversion fails, just use original
  }

  return Array.from(variants);
}

/**
 * Create a flexible regex pattern that matches characters in order
 * but allows other characters in between
 * Example: "abc" -> /a.*b.*c/i
 */
function createFlexiblePattern(query) {
  // Escape special regex characters
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Split into individual characters and join with .*
  const chars = escaped.split('');
  const pattern = chars.join('.*');

  return new RegExp(pattern, 'i');
}

/**
 * Create fuzzy match patterns that allow some characters to be skipped
 * BUT maintains the original order of characters
 * For query "我不恨你", generates patterns like:
 * - 我.*不.*恨.*你 (all chars)
 * - 我.*不.*你 (skip 恨, keep order)
 * - 我.*你 (skip 不恨, keep order)
 * Will NOT generate: 不.*我 (wrong order)
 */
function createFuzzyPatterns(query) {
  const chars = query.split('');
  const patterns = [];
  const n = chars.length;

  // Generate all possible subsequences using bit mask
  // But only keep those that maintain the original order
  const maxCombinations = Math.pow(2, n);

  for (let mask = 1; mask < maxCombinations; mask++) {
    const subsequence = [];
    const indices = [];

    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subsequence.push(chars[i]);
        indices.push(i);
      }
    }

    // Check if indices are in ascending order (maintains original order)
    let isOrdered = true;
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] <= indices[i-1]) {
        isOrdered = false;
        break;
      }
    }

    // Only keep ordered subsequences with at least 2 characters
    if (isOrdered && subsequence.length >= 2) {
      const escaped = subsequence.map(c => c.replace(/[.*+?^$()|[\]\\]/g, '\\$&'));
      const pattern = escaped.join('.*');
      patterns.push(new RegExp(pattern, 'i'));
    }
  }

  return patterns;
}

/**
 * Check if text matches the query with flexible matching
 * Supports non-continuous matching (characters can be separated)
 */
function flexibleMatch(text, query) {
  if (!text || !query) return false;

  // Check minimum length requirement
  if (!hasMinimumLength(query)) return false;

  // Generate all variants of the query
  const variants = generateQueryVariants(query);

  // Try to match any variant
  for (const variant of variants) {
    const pattern = createFlexiblePattern(variant);
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Build MongoDB query for flexible search with fuzzy matching
 * Searches in both title and description fields
 * Generates subsequences that maintain original character order
 */
function buildSearchQuery(query) {
  if (!query || !hasMinimumLength(query)) {
    return {};
  }

  const variants = generateQueryVariants(query);
  const orConditions = [];

  // For each variant, create fuzzy patterns
  for (const variant of variants) {
    // Limit to reasonable length to avoid performance issues
    if (variant.length >= 2 && variant.length <= 8) {
      const fuzzyPatterns = createFuzzyPatterns(variant);

      fuzzyPatterns.forEach(pattern => {
        orConditions.push({
          title: { $regex: pattern.source, $options: 'i' }
        });
        orConditions.push({
          description: { $regex: pattern.source, $options: 'i' }
        });
      });
    } else {
      // For longer queries, use simple flexible matching
      const chars = variant.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = chars.join('.*');

      orConditions.push({
        title: { $regex: pattern, $options: 'i' }
      });
      orConditions.push({
        description: { $regex: pattern, $options: 'i' }
      });
    }
  }

  return orConditions.length > 0 ? { $or: orConditions } : {};
}

module.exports = {
  hasMinimumLength,
  cleanQuery,
  generateQueryVariants,
  createFlexiblePattern,
  createFuzzyPatterns,
  flexibleMatch,
  buildSearchQuery
};
