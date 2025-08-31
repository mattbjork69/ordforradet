
import React from 'react'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'ghost'|'outline'|'destructive' }
export function Button({ className='', variant='primary', ...rest }: Props) {
  const base = 'btn'
  const map: Record<string,string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    outline: 'bg-white',
    destructive: 'bg-red-600 text-white border-red-600'
  }
  return <button className={`${base} ${map[variant]} ${className}`} {...rest} />
}
