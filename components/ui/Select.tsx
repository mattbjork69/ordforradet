
import React from 'react'
export function Select({ value, onChange, children }: any) {
  return <select value={value} onChange={onChange} className="input">{children}</select>
}
export function SelectItem({ value, children }: any) {
  return <option value={value}>{children}</option>
}
export function SelectTrigger({ children }: any) { return <>{children}</> }
export function SelectValue({ placeholder }: any) { return <span className="muted">{placeholder}</span> }
export function SelectContent({ children }: any) { return <>{children}</> }
