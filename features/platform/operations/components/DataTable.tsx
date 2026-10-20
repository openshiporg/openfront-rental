import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const hiddenBelow: Record<Breakpoint, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
};

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Hide the column on narrow screens; surface its value in the primary cell with SubLine instead. */
  hideBelow?: Breakpoint;
  className?: string;
  headerClassName?: string;
}

/**
 * Server-rendered data table. Rows become fully clickable when the primary cell renders a
 * RowLink (stretched link); interactive cells wrap their controls in RowAction.
 */
export function DataTable<T>({ rows, columns, getKey, rowClassName, caption, footer, dense }: {
  rows: T[];
  columns: Array<Column<T>>;
  getKey: (row: T) => string;
  rowClassName?: (row: T) => string | false | null | undefined;
  caption?: string;
  footer?: ReactNode;
  dense?: boolean;
}) {
  return <div className="min-w-0 overflow-x-auto">
    <table className="w-full border-collapse text-sm [&_tbody_tr:last-child>td]:border-b-0">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column) => <th key={column.id} scope="col" className={cn(
            'h-9 whitespace-nowrap border-b bg-muted/40 px-4 text-xs font-medium text-muted-foreground',
            column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left',
            column.hideBelow && hiddenBelow[column.hideBelow],
            column.headerClassName,
          )}>{column.header}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => <tr key={getKey(row)} className={cn('relative transition-colors hover:bg-muted/40', rowClassName?.(row))}>
          {columns.map((column) => <td key={column.id} className={cn(
            'border-b px-4 align-middle',
            dense ? 'py-2' : 'py-3',
            column.align === 'right' ? 'text-right tabular-nums' : column.align === 'center' ? 'text-center' : 'text-left',
            column.hideBelow && hiddenBelow[column.hideBelow],
            column.className,
          )}>{column.cell(row)}</td>)}
        </tr>)}
      </tbody>
      {footer}
    </table>
  </div>;
}
