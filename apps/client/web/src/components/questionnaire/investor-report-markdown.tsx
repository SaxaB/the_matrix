"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
  className?: string;
};

/**
 * Renders stored Markdown (informe IA) with readable typography for the profile page.
 */
export function InvestorReportMarkdown({ markdown, className }: Props) {
  return (
    <div
      className={
        className ??
        "investor-report-md max-h-[min(560px,70vh)] overflow-y-auto rounded-lg border bg-card p-5 sm:p-6"
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-0 mb-3 border-b border-border pb-2 text-xl font-bold tracking-tight text-foreground first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-8 text-lg font-semibold text-foreground first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-5 text-base font-semibold text-foreground">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 ml-4 list-disc space-y-1.5 text-sm text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 ml-4 list-decimal space-y-1.5 text-sm text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed [&>p]:mb-0">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="my-6 border-border" />,
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-4 border-violet-400/80 pl-4 text-sm text-muted-foreground dark:border-violet-500/60">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[20rem] border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/70">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 align-top text-muted-foreground">
              {children}
            </td>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-md bg-muted/80 p-3 text-xs leading-relaxed font-mono text-foreground">
              {children}
            </pre>
          ),
          code: (props) => {
            const { className, children, ...rest } = props;
            const inline = !className?.includes("language-");
            if (inline) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem] text-foreground"
                  {...rest}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-violet-600 underline underline-offset-2 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
