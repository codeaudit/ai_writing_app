import matter from 'gray-matter';

/**
 * Extracts frontmatter metadata from a markdown document
 * @param content Markdown content with optional frontmatter
 * @returns Object containing separated frontmatter and content
 */
export function extractFrontmatter(content: string): { 
  frontmatter: Record<string, unknown>;
  content: string;
} {
  try {
    const { data, content: markdownContent } = matter(content);
    return {
      frontmatter: data,
      content: markdownContent,
    };
  } catch (error) {
    console.error('Error extracting frontmatter:', error);
    return {
      frontmatter: {},
      content,
    };
  }
}

/**
 * Combines frontmatter with markdown content
 * @param frontmatter The metadata to include
 * @param content The markdown content
 * @returns Combined string with frontmatter and content
 */
export function combineFrontmatterAndContent(
  frontmatter: Record<string, unknown>,
  content: string
): string {
  try {
    return matter.stringify(content, frontmatter);
  } catch (error) {
    console.error('Error combining frontmatter and content:', error);
    return content;
  }
}

/**
 * Calculates word count from a markdown string
 * @param content Markdown content
 * @returns Number of words
 */
export function calculateWordCount(content: string): number {
  // Remove code blocks, which shouldn't count towards the word count
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
  
  // Remove inline code, which should count as a single word
  const withoutInlineCode = withoutCodeBlocks.replace(/`([^`]+)`/g, 'code');
  
  // Remove HTML tags
  const withoutHtml = withoutInlineCode.replace(/<[^>]*>/g, '');
  
  // Remove markdown links, count as a single word
  const withoutLinks = withoutHtml.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Split by whitespace and filter out empty items
  const words = withoutLinks.split(/\s+/).filter(word => word.length > 0);
  
  return words.length;
} 