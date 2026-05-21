interface ContinueButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export default function ContinueButton({ onClick, disabled = false, label = "Continue →" }: ContinueButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full sticky bottom-6 z-10 text-base font-semibold rounded-xl py-[15px] border-none cursor-pointer transition-opacity duration-200 text-white"
      style={{
        maxWidth: 600,
        background: '#111',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
