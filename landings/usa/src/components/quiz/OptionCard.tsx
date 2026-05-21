interface OptionCardProps {
  label: string;
  emoji?: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  type: "radio" | "checkbox";
}

export default function OptionCard({ label, emoji, desc, selected, onClick, type }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left flex items-center justify-between gap-3 rounded-xl border px-5 py-[18px] mb-[10px] transition-all duration-150 min-h-[56px] cursor-pointer"
      style={{
        background: selected ? '#F5F5F5' : '#FFFFFF',
        borderColor: selected ? '#111' : '#E5E5E5',
        borderWidth: selected ? '1.5px' : '1px',
      }}
    >
      <div className="flex items-center gap-[14px] min-w-0">
        {emoji && <span className="text-[22px] flex-shrink-0">{emoji}</span>}
        <div className="min-w-0">
          <span className="block text-[16px] leading-snug" style={{ color: '#111', fontWeight: selected ? 500 : 400 }}>
            {label}
          </span>
          {desc && <span className="block text-[13px] mt-[3px]" style={{ color: '#888' }}>{desc}</span>}
        </div>
      </div>
      <div className="flex-shrink-0">
        {type === "radio" ? (
          <div
            className="flex items-center justify-center w-[22px] h-[22px] rounded-full"
            style={{
              background: selected ? '#111' : 'transparent',
              border: selected ? 'none' : '1.5px solid #CCC',
            }}
          >
            {selected && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ) : (
          <div
            className="flex items-center justify-center w-[20px] h-[20px] rounded-[6px]"
            style={{
              background: selected ? '#111' : 'transparent',
              border: selected ? 'none' : '1.5px solid #CCC',
            }}
          >
            {selected && (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
