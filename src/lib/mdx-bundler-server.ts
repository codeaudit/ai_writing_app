'use server';

import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import matter from 'gray-matter';
import { serialize } from 'next-mdx-remote/serialize';
// Import highlight.js languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import { visit } from 'unist-util-visit';

// Create a custom remark plugin to normalize code language tags
function remarkNormalizeCodeLanguage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(tree, 'code', (node: any) => {
      // Replace jsx with javascript
      if (node.lang === 'jsx') {
        node.lang = 'javascript';
      }
      
      // Handle missing/unknown languages
      if (!node.lang || node.lang === '') {
        node.lang = 'text'; // Default to text
      }
    });
  };
}

// Server-side utility to process MDX content
export async function bundleMDXContent(content: string) {
  try {
    // Extract frontmatter
    const { data: frontmatter, content: contentWithoutFrontmatter } = matter(content);
    
    // Use next-mdx-remote/serialize which is designed for Next.js
    const mdxSource = await serialize(contentWithoutFrontmatter, {
      mdxOptions: {
        remarkPlugins: [
          remarkGfm,
          remarkMath,
          remarkNormalizeCodeLanguage
        ],
        rehypePlugins: [
          rehypeKatex,
          [rehypeHighlight, {
            languages: {
              jsx: javascript,
              js: javascript,
              javascript: javascript,
              typescript: typescript
            },
            subset: false,
            ignoreMissing: true
          }]
        ],
        development: process.env.NODE_ENV === 'development'
      },
      scope: {}, // You can pass variables to the MDX content here
      parseFrontmatter: false, // We've already parsed it
    });
    
    return { 
      mdxSource,
      frontmatter 
    };
  } catch (error) {
    console.error("Error compiling MDX:", error);
    throw new Error(`Failed to compile MDX content: ${error instanceof Error ? error.message : String(error)}`);
  }
} 