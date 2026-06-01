import React from "react";
import { useQuiz } from "./QuizContext";

export default function StartQuizButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open } = useQuiz();
  return (
    <button
      type="button"
      onClick={open}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
}
