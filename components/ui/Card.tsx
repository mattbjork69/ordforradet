
import React from 'react'
export function Card({ className='', children }: { className?: string, children: React.ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>
}
export function CardHeader({ children, className='' }: any) { return <div className={`p-4 border-b ${className}`}>{children}</div> }
export function CardTitle({ children, className='' }: any) { return <h2 className={`text-xl font-semibold ${className}`}>{children}</h2> }
export function CardContent({ children, className='' }: any) { return <div className={`p-4 ${className}`}>{children}</div> }
