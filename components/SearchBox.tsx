"use client";

type SearchBoxProps = { value: string; onChange: (value: string) => void; placeholder: string };

export default function SearchBox({ value, onChange, placeholder }: SearchBoxProps) {
  return <label className="search-box"><span>⌕</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}
