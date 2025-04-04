"use client";

import { useCallback, useState } from "react";
import { useDocumentStore } from "@/lib/store";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrism from "rehype-prism-plus";
import "katex/dist/katex.min.css";
import { useToast } from "@/components/ui/use-toast";
import matter from "gray-matter";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useMemo } from "react";
import React from "react";

// Define custom components that can be used in MDX
interface MDXComponentProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

const components = {
  h1: ({ children, ...props }: MDXComponentProps) => <h1 className="text-3xl font-bold mb-4" {...props}>{children}</h1>,
  h2: ({ children, ...props }: MDXComponentProps) => <h2 className="text-2xl font-bold mb-3" {...props}>{children}</h2>,
  h3: ({ children, ...props }: MDXComponentProps) => <h3 className="text-xl font-bold mb-2" {...props}>{children}</h3>,
  p: ({ children, ...props }: MDXComponentProps) => <p className="mb-4" {...props}>{children}</p>,
  ul: ({ children, ...props }: MDXComponentProps) => <ul className="list-disc ml-5 mb-4" {...props}>{children}</ul>,
  ol: ({ children, ...props }: MDXComponentProps) => <ol className="list-decimal ml-5 mb-4" {...props}>{children}</ol>,
  blockquote: ({ children, ...props }: MDXComponentProps) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic" {...props}>{children}</blockquote>
  ),
  code: ({ className, children, ...rest }: MDXComponentProps) => {
    const match = /language-(\w+)/.exec(className || "");
    
    return match ? (
      <pre className={`${className} p-4 rounded bg-gray-800 overflow-x-auto`}>
        <code {...rest}>{children}</code>
      </pre>
    ) : (
      <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded" {...rest}>
        {children}
      </code>
    );
  },
  // Custom component for Alert
  Alert: ({ children, variant = "info", ...props }: MDXComponentProps & { variant?: "info" | "warning" | "error" | "success" }) => {
    const styles = {
      info: "bg-blue-50 border-blue-400 text-blue-800",
      warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
      error: "bg-red-50 border-red-400 text-red-800",
      success: "bg-green-50 border-green-400 text-green-800"
    };
    
    return (
      <div className={`${styles[variant]} border-l-4 p-4 mb-4 rounded-r`} {...props}>
        {children}
      </div>
    );
  },
  // Custom component for Highlight
  Highlight: ({ children, color = "yellow", ...props }: MDXComponentProps & { color?: string }) => {
    const colorMap: Record<string, string> = {
      yellow: "bg-yellow-200 dark:bg-yellow-800",
      blue: "bg-blue-200 dark:bg-blue-800",
      green: "bg-green-200 dark:bg-green-800",
      red: "bg-red-200 dark:bg-red-800",
      purple: "bg-purple-200 dark:bg-purple-800"
    };
    
    const bgColor = colorMap[color] || colorMap.yellow;
    
    return (
      <span className={`${bgColor} px-1 rounded transition-colors duration-300 hover:bg-opacity-70`} {...props}>
        {children}
      </span>
    );
  },
  // Custom component for Box
  Box: ({ children, className = "", ...props }: MDXComponentProps) => (
    <div className={`p-4 border rounded shadow-sm mb-4 ${className}`} {...props}>
      {children}
    </div>
  ),
  // Custom component for SimpleButton
  SimpleButton: ({ children, onClick, ...props }: MDXComponentProps) => {
    const [isPressed, setIsPressed] = useState(false);
    
    const handleClick = (e: React.MouseEvent) => {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 200);
      if (typeof onClick === 'function') onClick(e);
    };
    
    return (
      <button 
        className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow-sm transition-all duration-200 mb-4 ${isPressed ? 'transform scale-95' : ''}`} 
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
  // Custom component for Card
  Card: ({ 
    title, 
    image, 
    bordered = false, 
    children, 
    ...props 
  }: MDXComponentProps & { title?: string; image?: string; bordered?: boolean }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`overflow-hidden rounded-lg shadow-md mb-4 transition-all duration-300 ${bordered ? 'border border-gray-300' : ''} ${isHovered ? 'shadow-lg transform -translate-y-1' : ''}`} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {image && (
          <div className="w-full overflow-hidden">
            <img 
              src={image} 
              alt={title || 'Card image'} 
              className={`w-full h-auto transition-transform duration-500 ${isHovered ? 'transform scale-105' : ''}`} 
            />
          </div>
        )}
        <div className="p-4">
          {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
          <div>{children}</div>
        </div>
      </div>
    );
  },
  // Custom components for Tabs
  Tabs: ({ children, ...props }: MDXComponentProps) => {
    const [activeTabIndex, setActiveTabIndex] = useState(0);
    const childrenArray = React.Children.toArray(children);
    
    return (
      <div className="mb-4" {...props}>
        <div className="border-b border-gray-200 mb-4">
          <div className="flex space-x-4">
            {React.Children.map(children, (child, index) => {
              if (React.isValidElement(child) && 
                  typeof child.props === 'object' && 
                  child.props !== null && 
                  'label' in child.props) {
                const label = String(child.props.label || '');
                return (
                  <button
                    onClick={() => setActiveTabIndex(index)}
                    className={`pb-2 px-1 transition-colors duration-200 ${
                      index === activeTabIndex 
                        ? 'border-b-2 border-blue-500 text-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              }
              return null;
            })}
          </div>
        </div>
        <div className="tab-content-container">
          {/* Show active tab content */}
          {childrenArray[activeTabIndex]}
        </div>
      </div>
    );
  },
  // The label prop is used by the parent Tabs component to display tab titles
  Tab: ({ children, ...props }: MDXComponentProps) => (
    <div className="tab-content" {...props}>
      {children}
    </div>
  ),
  // Custom component for CallToAction
  CallToAction: ({ children, ...props }: MDXComponentProps) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        className={`bg-gradient-to-r from-purple-500 to-blue-500 text-white p-6 rounded-lg shadow-lg text-center mb-4 cursor-pointer transition-all duration-300 ${
          isHovered ? 'transform scale-105 shadow-xl' : ''
        }`} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => alert('Action triggered!')}
        {...props}
      >
        <div className="text-xl font-bold mb-2">{children}</div>
      </div>
    );
  },
  // Callout component for notes, warnings, tips
  Callout: ({ children, type = "note", ...props }: MDXComponentProps & { type?: "note" | "warning" | "tip" }) => {
    const styles = {
      note: "bg-blue-50 border-blue-400 text-blue-800",
      warning: "bg-yellow-50 border-yellow-400 text-yellow-800",
      tip: "bg-green-50 border-green-400 text-green-800"
    };
    
    const iconMap = {
      note: "ℹ️",
      warning: "⚠️",
      tip: "💡"
    };
    
    return (
      <div className={`${styles[type]} border-l-4 p-4 mb-4 rounded-r`} {...props}>
        <div className="flex items-start">
          <span className="mr-2">{iconMap[type]}</span>
          <div>{children}</div>
        </div>
      </div>
    );
  },
  // Table of Contents Component
  TableOfContents: ({...props}: MDXComponentProps) => {
    // This is a simplified implementation - an actual TOC would parse heading elements
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded mb-4 border border-gray-200 dark:border-gray-700" {...props}>
        <h3 className="text-lg font-bold mb-2">Table of Contents</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li><a href="#practical-mdx-component-examples" className="text-blue-600 hover:underline">Practical MDX Component Examples</a></li>
          <li><a href="#callouts-and-admonitions" className="text-blue-600 hover:underline">Callouts and Admonitions</a></li>
          <li><a href="#table-of-contents" className="text-blue-600 hover:underline">Table of Contents</a></li>
          <li><a href="#expandable-sections" className="text-blue-600 hover:underline">Expandable Sections</a></li>
          {/* Simplified - a real implementation would be dynamic */}
        </ul>
      </div>
    );
  },
  // Expandable Component
  Expandable: ({ children, title, ...props }: MDXComponentProps & { title: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded mb-4" {...props}>
        <button 
          className="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="font-semibold">{title}</span>
          <span>{isExpanded ? '▲' : '▼'}</span>
        </button>
        {isExpanded && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            {children}
          </div>
        )}
      </div>
    );
  },
  // Image Gallery Component
  ImageGallery: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" {...props}>
        {children}
      </div>
    );
  },
  // Image Component
  Image: ({ src, alt, caption, ...props }: MDXComponentProps & { src: string, alt: string, caption?: string }) => {
    return (
      <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700" {...props}>
        <img src={src} alt={alt} className="w-full h-auto object-cover" />
        {caption && (
          <div className="p-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {caption}
          </div>
        )}
      </div>
    );
  },
  // Equation Component
  Equation: ({ children, display = false, ...props }: MDXComponentProps & { display?: boolean }) => {
    return (
      <div className={`${display ? 'my-4 text-center' : 'inline'}`} {...props}>
        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {children}
        </code>
        {/* Note: A real implementation would use KaTeX or MathJax */}
      </div>
    );
  },
  // Citation Component
  Citation: ({ id, ...props }: MDXComponentProps & { id: string }) => {
    return (
      <sup className="text-blue-600 cursor-help" title={`Citation: ${id}`} {...props}>
        [<a href={`#ref-${id}`}>{id}</a>]
      </sup>
    );
  },
  // References Container
  References: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700" {...props}>
        <h2 className="text-xl font-bold mb-4">References</h2>
        <div className="space-y-2">
          {children}
        </div>
      </div>
    );
  },
  // Reference Component
  Reference: ({ id, type, children, ...props }: MDXComponentProps & { id: string, type: string }) => {
    return (
      <div id={`ref-${id}`} className="text-sm" {...props}>
        <span className="text-gray-500">[{id}]</span> {children}
      </div>
    );
  },
  // Sidenote Component
  Sidenote: ({ children, ...props }: MDXComponentProps) => {
    return (
      <span className="inline-block cursor-help relative group" {...props}>
        <sup className="text-blue-600">*</sup>
        <span className="hidden group-hover:block absolute left-full ml-2 top-0 w-48 p-2 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
          {children}
        </span>
      </span>
    );
  },
  // Definitions Container
  Definitions: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="hidden" {...props}>{children}</div>
    );
  },
  // Define Component
  Define: ({ term, children, ...props }: MDXComponentProps & { term: string }) => {
    return (
      <div data-term={term} data-definition={typeof children === 'string' ? children : 'Complex definition'} {...props}></div>
    );
  },
  // Tooltip Component
  Tooltip: ({ term, children, ...props }: MDXComponentProps & { term: string }) => {
    const displayText = children || term;
    
    return (
      <span className="border-dotted border-b-2 border-blue-400 cursor-help relative group" {...props}>
        {displayText}
        <span className="hidden group-hover:block absolute left-1/2 transform -translate-x-1/2 bottom-full mb-1 w-48 p-2 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-10">
          {term}
        </span>
      </span>
    );
  },
  // CodeBlock Component
  CodeBlock: ({ language, filename, lineNumbers, highlight, children, ...props }: MDXComponentProps & { 
    language: string, 
    filename?: string, 
    lineNumbers?: boolean, 
    highlight?: string 
  }) => {
    return (
      <div className="mb-4 rounded-lg overflow-hidden" {...props}>
        {filename && (
          <div className="bg-gray-700 text-gray-200 px-4 py-1 text-sm">
            {filename}
          </div>
        )}
        <pre className={`language-${language} ${lineNumbers ? 'line-numbers' : ''} p-4 bg-gray-800 text-gray-100 overflow-x-auto`}>
          <code className={`language-${language}`}>
            {children}
          </code>
        </pre>
      </div>
    );
  },
  // Chart Component
  Chart: ({ type, data, ...props }: MDXComponentProps & { type: string, data: any }) => {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 mb-4" {...props}>
        <div className="text-center">
          <h4 className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)} Chart</h4>
          <p className="text-gray-500 text-sm italic">(Chart visualization placeholder)</p>
          <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mt-2">
            <p className="text-gray-400">Chart would render here</p>
          </div>
        </div>
      </div>
    );
  },
  // FlowChart Component
  FlowChart: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 mb-4" {...props}>
        <div className="text-center">
          <h4 className="font-medium">Flow Chart</h4>
          <p className="text-gray-500 text-sm italic">(Flow chart visualization placeholder)</p>
          <div className="h-48 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center mt-2">
            <p className="text-gray-400">Flow chart would render here</p>
          </div>
        </div>
      </div>
    );
  },
  // Quiz Component
  Quiz: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4" {...props}>
        <div className="bg-blue-50 dark:bg-blue-900 p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-blue-800 dark:text-blue-200">Quiz</h3>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    );
  },
  // Question Component
  Question: ({ prompt, children, ...props }: MDXComponentProps & { prompt: string }) => {
    const [answered, setAnswered] = useState(false);
    const [correct, setCorrect] = useState(false);
    
    const handleAnswer = (isCorrect: boolean) => {
      setAnswered(true);
      setCorrect(isCorrect);
    };
    
    return (
      <div className="mb-4 last:mb-0" {...props}>
        <p className="font-medium mb-2">{prompt}</p>
        <div className="space-y-2">
          {React.Children.map(children, child => {
            if (React.isValidElement(child) && typeof child.props === 'object' && child.props !== null) {
              return React.cloneElement(child, { 
                onAnswer: handleAnswer,
                disabled: answered
              });
            }
            return child;
          })}
        </div>
        {answered && (
          <div className={`mt-3 p-2 rounded ${correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {correct ? 'Correct!' : 'Incorrect. Try again.'}
          </div>
        )}
      </div>
    );
  },
  // Option Component
  Option: ({ children, correct, onAnswer, disabled, ...props }: MDXComponentProps & { 
    correct?: boolean,
    onAnswer?: (isCorrect: boolean) => void,
    disabled?: boolean
  }) => {
    const handleClick = () => {
      if (!disabled && onAnswer) {
        onAnswer(!!correct);
      }
    };
    
    return (
      <button
        className={`block w-full text-left px-3 py-2 rounded border ${
          disabled 
            ? correct 
              ? 'bg-green-50 border-green-300'
              : 'bg-gray-50 border-gray-300'
            : 'bg-white hover:bg-gray-50 border-gray-300'
        }`}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  },
  // Spreadsheet Component
  Spreadsheet: ({ data, editable = false, ...props }: MDXComponentProps & { 
    data: string[][] | React.ReactNode[][], 
    editable?: boolean 
  }) => {
    return (
      <div className="overflow-x-auto mb-4" {...props}>
        <table className="min-w-full border border-gray-200 dark:border-gray-700">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {Array.isArray(data) && data[0] && Array.isArray(data[0]) && data[0].map((cell, i) => (
                <th key={i} className="p-2 border border-gray-200 dark:border-gray-700 font-medium text-sm">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) && data.slice(1).map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'}>
                {Array.isArray(row) && row.map((cell, j) => (
                  <td key={j} className="p-2 border border-gray-200 dark:border-gray-700 text-sm">
                    {editable ? (
                      <input 
                        type="text" 
                        defaultValue={String(cell)} 
                        className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded"
                      />
                    ) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <div className="text-xs text-gray-500 mt-1 text-right italic">
            This spreadsheet is editable (demo only)
          </div>
        )}
      </div>
    );
  },
  // Audio Player Component
  AudioPlayer: ({ src, title, showControls = true, ...props }: MDXComponentProps & { 
    src: string, 
    title?: string, 
    showControls?: boolean 
  }) => {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded p-4 mb-4 border border-gray-200 dark:border-gray-700" {...props}>
        {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
        <audio 
          className="w-full" 
          controls={showControls} 
          src={src} 
        >
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  },
  // Timeline Component
  Timeline: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="relative pl-8 mb-4 space-y-6 before:absolute before:left-4 before:top-0 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700" {...props}>
        {children}
      </div>
    );
  },
  // Timeline Event Component
  TimelineEvent: ({ date, title, children, ...props }: MDXComponentProps & { date: string, title: string }) => {
    return (
      <div className="relative" {...props}>
        <div className="absolute left-[-24px] top-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 z-10"></div>
        <div className="mb-1">
          <span className="text-xs text-gray-500">{date}</span>
        </div>
        <h3 className="text-lg font-bold mb-1">{title}</h3>
        <div>{children}</div>
      </div>
    );
  },
  // Kanban Board Component
  KanbanBoard: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 overflow-x-auto" {...props}>
        {children}
      </div>
    );
  },
  // Column Component for Kanban
  Column: ({ title, children, ...props }: MDXComponentProps & { title: string }) => {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 min-w-[250px]" {...props}>
        <h3 className="font-bold mb-3 text-center pb-2 border-b border-gray-200 dark:border-gray-700">{title}</h3>
        <div className="space-y-2">
          {children}
        </div>
      </div>
    );
  },
  // Card Component for Kanban
  KanbanCard: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="bg-white dark:bg-gray-700 p-3 rounded shadow border border-gray-200 dark:border-gray-600" {...props}>
        {children}
      </div>
    );
  },
  // Counter Component
  Counter: ({ startValue = 0, ...props }: MDXComponentProps & { startValue?: number }) => {
    const [count, setCount] = useState(startValue);
    
    return (
      <div className="flex items-center space-x-4 mb-4 p-4 border rounded" {...props}>
        <button 
          onClick={() => setCount(count - 1)}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          -
        </button>
        <span className="text-xl font-bold">{count}</span>
        <button 
          onClick={() => setCount(count + 1)}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          +
        </button>
      </div>
    );
  },
  // ColorPicker Component
  ColorPicker: ({ defaultColor = "#000000", ...props }: MDXComponentProps & { defaultColor?: string }) => {
    const [color, setColor] = useState(defaultColor);
    
    return (
      <div className="mb-4 p-4 border rounded" {...props}>
        <div 
          className="w-full h-12 mb-2 rounded border"
          style={{ backgroundColor: color }}
        ></div>
        <div className="flex items-center space-x-2">
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)} 
            className="cursor-pointer"
          />
          <span className="font-mono">{color}</span>
        </div>
      </div>
    );
  },
  // TwoColumnLayout Component
  TwoColumnLayout: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="flex flex-col md:flex-row gap-4 mb-4" {...props}>
        {children}
      </div>
    );
  },
  // TabPanel Component
  TabPanel: ({ children, label, ...props }: MDXComponentProps & { label: string }) => {
    return (
      <div className="tab-panel" data-label={label} {...props}>
        {children}
      </div>
    );
  },
  // RestrictedContent Component
  RestrictedContent: ({ children, ...props }: MDXComponentProps) => {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 border-l-4 border-purple-500 p-4 rounded-r mb-4" {...props}>
        <div className="flex items-center mb-2">
          <span className="mr-2">🔒</span>
          <span className="font-bold">Restricted Content</span>
        </div>
        <div>{children}</div>
      </div>
    );
  },
  // CodeEditor Component
  CodeEditor: ({ code, language = "javascript", ...props }: MDXComponentProps & { code: string, language?: string }) => {
    const [editorCode, setEditorCode] = useState(code);
    
    return (
      <div className="mb-4 border rounded overflow-hidden" {...props}>
        <div className="bg-gray-100 dark:bg-gray-800 p-2 border-b flex justify-between items-center">
          <span className="font-mono text-sm">{language}</span>
          <button 
            onClick={() => {
              try {
                // Just for demonstration - would not actually run in a real app
                alert('Code execution simulated: ' + editorCode);
              } catch (error) {
                alert('Error: ' + error);
              }
            }}
            className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
          >
            Run
          </button>
        </div>
        <textarea
          value={editorCode}
          onChange={(e) => setEditorCode(e.target.value)}
          className="w-full h-32 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none"
        />
      </div>
    );
  },
  // Column Component
  Column: ({ children, width = "50%", ...props }: MDXComponentProps & { width?: string }) => {
    return (
      <div className="flex-1" style={{ flexBasis: width }} {...props}>
        {children}
      </div>
    );
  },
};

interface MDXRendererProps {
  content: string;
  className?: string;
}

export function MDXRenderer({ content, className = "" }: MDXRendererProps) {
  const { documents, selectDocument, addDocument } = useDocumentStore();
  const { toast } = useToast();
  const [showCreateDocumentDialog, setShowCreateDocumentDialog] = useState(false);
  const [pendingDocument, setPendingDocument] = useState<{name: string, currentDocId: string | null}>({name: "", currentDocId: null});
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Strip frontmatter before rendering
  const stripFrontmatter = (content: string) => {
    try {
      // Use gray-matter to parse the content and extract the body without frontmatter
      const { content: bodyContent } = matter(content);
      return bodyContent;
    } catch (error) {
      console.error("Error parsing frontmatter:", error);
      return content;
    }
  };

  // Process and compile the MDX content
  useMemo(async () => {
    try {
      setIsLoading(true);
      
      // First strip frontmatter
      const contentWithoutFrontmatter = stripFrontmatter(content);
      
      // Process internal links
      const processedContent = contentWithoutFrontmatter.replace(
        /\[\[(.*?)\]\]/g,
        (match, linkText) => `[${linkText}](#internal-link-${encodeURIComponent(linkText)})`
      );
      
      // Compile the MDX content - use minimal configuration to avoid plugin conflicts
      const mdxSource = await serialize(processedContent, {
        mdxOptions: {
          remarkPlugins: [remarkGfm, remarkMath],
          // Keep only essential rehype plugins to avoid conflicts with JSX
          rehypePlugins: [
            rehypeKatex, 
            [rehypePrism, { ignoreMissing: true }]
          ],
          development: process.env.NODE_ENV === 'development',
        },
        // Don't parse frontmatter again since we already handled it
        parseFrontmatter: false
      });
      
      setMdxSource(mdxSource);
    } catch (error) {
      console.error("Error compiling MDX:", error);
      toast({
        title: "Error",
        description: `Failed to compile MDX content: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [content, toast]);

  // Get current document ID from store
  const { selectedDocumentId } = useDocumentStore();

  // Handler for creating a new document
  const handleCreateNewDocument = async () => {
    if (!pendingDocument.name) return;

    try {
      // Create new document in the same folder as the current document
      let folderId = null;
      
      // If we have a current document, get its folder ID
      if (pendingDocument.currentDocId) {
        const currentDoc = documents.find(doc => doc.id === pendingDocument.currentDocId);
        if (currentDoc) {
          folderId = currentDoc.folderId;
        }
      }

      // Create initial content with title and frontmatter
      const initialContent = `---
title: ${pendingDocument.name}
created: ${new Date().toISOString()}
---

# ${pendingDocument.name}

`;

      // Create the new document with the initial content
      const newDocId = await addDocument(pendingDocument.name, initialContent, folderId);
      
      // Select the new document without navigating
      selectDocument(newDocId);
      
      // Update the URL without a full page refresh
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `/documents/${newDocId}`);
      }
      
      toast({
        title: "Document created",
        description: `Created and navigated to "${pendingDocument.name}"`,
      });
    } catch (error) {
      console.error("Error creating document:", error);
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive"
      });
    } finally {
      setShowCreateDocumentDialog(false);
    }
  };

  // Handle link clicks (especially internal links)
  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      const href = e.currentTarget.getAttribute("href");
      console.log("Link clicked:", href);
      
      if (!href) return;
      
      // Handle internal links in the format [[Link Name]]
      if (href.startsWith("#internal-link-")) {
        e.preventDefault();
        const linkText = decodeURIComponent(href.replace("#internal-link-", ""));
        console.log("Internal link detected:", linkText);
        
        // Find the document with the matching name
        const targetDoc = documents.find(doc => doc.name === linkText);
        console.log("Target document found:", targetDoc);
        
        if (targetDoc) {
          console.log("Selecting document:", targetDoc.id);
          // Select the document without navigating
          selectDocument(targetDoc.id);
          
          // Update the URL without a full page refresh
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', `/documents/${targetDoc.id}`);
          }
          
          toast({
            title: "Document opened",
            description: `Navigated to "${targetDoc.name}"`,
          });
        } else {
          // Show dialog to create the document
          setPendingDocument({
            name: linkText,
            currentDocId: selectedDocumentId
          });
          setShowCreateDocumentDialog(true);
        }
      } 
      // Handle external links (http/https)
      else if (href.startsWith("http://") || href.startsWith("https://")) {
        // For external links, we'll open them in a new tab
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
        
        toast({
          title: "External link",
          description: "Opened external link in a new tab",
        });
      }
      // All other links will use their default behavior
    },
    [documents, selectDocument, toast, selectedDocumentId]
  );

  // Custom components with link handling
  const mdxComponents = {
    ...components,
    a: ({ children, href, ...props }: MDXComponentProps & { href?: string }) => (
      <a href={href} {...props} onClick={handleLinkClick}>
        {children}
      </a>
    )
  };

  return (
    <>
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : mdxSource ? (
          <MDXRemote {...mdxSource} components={mdxComponents} />
        ) : (
          <p>Failed to render MDX content.</p>
        )}
      </div>

      <AlertDialog 
        open={showCreateDocumentDialog} 
        onOpenChange={setShowCreateDocumentDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Document</AlertDialogTitle>
            <AlertDialogDescription>
              Document &ldquo;{pendingDocument.name}&rdquo; doesn&apos;t exist. Would you like to create it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateNewDocument}>
              Create Document
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 